"""Re-clip event summaries from body_text (sentence-aware).

One-shot / occasional ops fix for mid-word truncations left by tip[:280].

  docker compose … exec -T api python -m planetai_api.repair_summaries
  docker compose … exec -T api python -m planetai_api.repair_summaries --dry-run
"""

from __future__ import annotations

import sys

from planetai_shared.db import models
from planetai_shared.db.base import session_scope
from sqlalchemy import select

from planetai_api.services.manual_event import clip_summary


def _looks_broken(summary: str | None) -> bool:
    if not summary:
        return True
    t = summary.strip()
    if not t:
        return True
    # Hard character-cap leftovers
    if len(t) >= 270 and not t.endswith((".", "!", "?", "…", ".”", '."', '…"')):
        return True
    # Lone trailing letter after a space ("… ülkeden y")
    return len(t) >= 2 and t[-2] == " " and t[-1].isalpha()


def _cache_bust() -> None:
    try:
        import redis
        from planetai_shared.settings import get_settings

        client = redis.from_url(get_settings().redis_url)
        for key in client.scan_iter(match="home*"):
            client.delete(key)
    except Exception:  # noqa: BLE001
        pass


def main(argv: list[str]) -> int:
    dry = "--dry-run" in argv
    fixed = 0
    skipped = 0
    with session_scope() as db:
        rows = db.scalars(select(models.Event)).all()
        for ev in rows:
            if not ev.body_text:
                skipped += 1
                continue
            if not _looks_broken(ev.summary):
                skipped += 1
                continue
            new = clip_summary(ev.body_text)
            if not new or new == ev.summary:
                skipped += 1
                continue
            print(f"{ev.slug}:")
            print(f"  was: …{(ev.summary or '')[-60:]!r}")
            print(f"  now: …{new[-60:]!r}")
            if not dry:
                ev.summary = new
                for art in ev.articles or []:
                    art.clean_summary = new
            fixed += 1
        if dry:
            db.rollback()
        else:
            db.commit()
    if not dry and fixed:
        _cache_bust()
    print(f"{'dry-run ' if dry else ''}fixed={fixed} skipped={skipped}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
