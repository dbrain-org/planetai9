"""PlanetAI ingest CLI.

uv run planetai-ingest seed
uv run planetai-ingest collect [--kinds rss,arxiv]
uv run planetai-ingest trends
uv run planetai-ingest scheduler
"""

from __future__ import annotations

import argparse
import logging
import sys


def _bust_api_cache() -> None:
    """Drop the API's cached list payloads after a data refresh."""
    try:
        import redis
        from planetai_shared.settings import get_settings

        client = redis.from_url(get_settings().redis_url)
        for prefix in ("home", "news", "trending"):
            for key in client.scan_iter(match=f"{prefix}*"):
                client.delete(key)
    except Exception:  # noqa: BLE001
        pass


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
    )
    from planetai_shared.observability import init_sentry

    init_sentry("ingest")

    parser = argparse.ArgumentParser(prog="planetai-ingest")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("seed", help="upsert seed data into the database")
    sub.add_parser("healthz", help="exit 0 if the scheduler ran a job recently (container health)")

    p_collect = sub.add_parser("collect", help="run collectors once")
    p_collect.add_argument("--kinds", help="comma list: rss,arxiv,youtube,html_blog")

    sub.add_parser("trends", help="compute trend snapshots + refresh top signals")
    sub.add_parser("retag", help="re-run topic matching over existing events")
    sub.add_parser(
        "backfill-people",
        help="link seeded/auto people onto existing events (title/summary/body)",
    )
    sub.add_parser("scheduler", help="run the long-lived scheduler")

    args = parser.parse_args(argv)

    if args.cmd == "seed":
        from planetai_ingest.seed import run

        run()
        return 0

    if args.cmd == "healthz":
        from datetime import UTC, datetime, timedelta

        from planetai_shared.db import models
        from planetai_shared.db.base import session_scope
        from sqlalchemy import select

        with session_scope() as db:
            last = db.scalar(
                select(models.IngestRun.finished_at)
                .where(models.IngestRun.finished_at.isnot(None))
                .order_by(models.IngestRun.finished_at.desc())
                .limit(1)
            )
        fresh = last is not None and last >= datetime.now(UTC) - timedelta(minutes=30)
        print(f"last ingest run: {last} — {'ok' if fresh else 'STALE'}")
        return 0 if fresh else 1

    if args.cmd == "collect":
        from planetai_ingest.pipeline.ingest import run_all
        from planetai_ingest.seed import run as seed_run

        seed_run()
        kinds = set(args.kinds.split(",")) if args.kinds else None
        totals = run_all(only_kinds=kinds)
        print(totals)
        _bust_api_cache()
        return 0

    if args.cmd == "trends":
        from planetai_ingest.pipeline.trends import compute_snapshots, refresh_top_signals

        compute_snapshots()
        n = refresh_top_signals()
        print(f"top signals: {n}")
        _bust_api_cache()
        return 0

    if args.cmd == "retag":
        from planetai_ingest.retag import run as retag_run

        print(f"new links: {retag_run()}")
        _bust_api_cache()
        return 0

    if args.cmd == "backfill-people":
        from planetai_shared.db.base import session_scope

        from planetai_ingest.pipeline.ingest import backfill_people_on_events
        from planetai_ingest.seed import run as seed_run

        seed_run()
        with session_scope() as db:
            n = backfill_people_on_events(db)
        print(f"people links: {n}")
        _bust_api_cache()
        return 0

    if args.cmd == "scheduler":
        from planetai_ingest.scheduler import run_scheduler

        run_scheduler()
        return 0

    return 1


if __name__ == "__main__":
    sys.exit(main())
