"""Long-lived APScheduler process (MVP scheduling from docs/03)."""

from __future__ import annotations

import logging

from apscheduler.schedulers.blocking import BlockingScheduler

from planetai_ingest.pipeline.ingest import run_all
from planetai_ingest.pipeline.trends import compute_snapshots, refresh_top_signals
from planetai_ingest.seed import run as seed_run

log = logging.getLogger(__name__)


def _collect(kinds: set[str]):
    def job():
        run_all(only_kinds=kinds)

    return job


def _trends_job():
    compute_snapshots()


def _top_signals_job():
    refresh_top_signals()


def run_scheduler() -> None:
    seed_run()
    run_all(only_kinds={"rss", "html_blog", "youtube"})  # warm start

    sched = BlockingScheduler(timezone="UTC")
    sched.add_job(_collect({"rss", "html_blog"}), "interval", minutes=10, id="collect-news")
    sched.add_job(_collect({"arxiv"}), "interval", minutes=60, id="collect-arxiv")
    sched.add_job(_collect({"youtube"}), "interval", minutes=60, id="collect-youtube")
    sched.add_job(_trends_job, "interval", minutes=30, id="trends")
    sched.add_job(_top_signals_job, "interval", minutes=15, id="top-signals")
    sched.add_job(seed_run, "interval", hours=24, id="seed-sync")

    log.info("scheduler started")
    try:
        sched.start()
    except (KeyboardInterrupt, SystemExit):
        log.info("scheduler stopped")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_scheduler()
