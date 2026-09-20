"""Attach dictionary entities to an Event from title / summary / body text.

Used by the API when approving reader/staff news (no ingest ahocorasick dep).
Matching is case-insensitive with simple word boundaries + Turkish name suffixes.
"""

from __future__ import annotations

import re
import uuid

from planetai_shared.db import models
from sqlalchemy import select
from sqlalchemy.orm import Session

_WORD = re.compile(r"[a-z0-9çğıöşü]", re.IGNORECASE)
_NAME_SUFFIX = re.compile(
    r"^[''`](?:a|e|ı|i|u|ü|ın|in|un|ün|da|de|ta|te|dan|den)?(?:\b|$)",
    re.IGNORECASE,
)

# Types we surface as in-article links (people hubs + company/org pages).
_LINKABLE = frozenset(
    {
        "person",
        "company",
        "institution",
        "model",
        "product",
        "technology",
    }
)


def _boundary_ok(text: str, start: int, end: int) -> bool:
    before = text[start - 1] if start > 0 else " "
    if _WORD.match(before):
        return False
    rest = text[end + 1 :]
    after = rest[:1] if rest else " "
    if after in "'’`" or _NAME_SUFFIX.match(rest):
        return True
    return not _WORD.match(after)


def _mentions(haystack: str, phrase: str) -> bool:
    """True if ``phrase`` appears in ``haystack`` on a word boundary."""
    if not phrase or len(phrase) < 3:
        return False
    needle = phrase.lower()
    start = 0
    while True:
        idx = haystack.find(needle, start)
        if idx < 0:
            return False
        end = idx + len(needle) - 1
        if _boundary_ok(haystack, idx, end):
            return True
        start = idx + 1


def attach_entities_to_event(db: Session, event: models.Event) -> int:
    """Link known entities whose name/alias appears in the event text. Idempotent."""
    body = " ".join(p for p in (event.summary, event.body_text) if p) or ""
    haystack = f" {event.title.lower()}  {body.lower()} "
    title_l = f" {event.title.lower()} "

    existing = {
        str(r.entity_id)
        for r in db.scalars(
            select(models.EventEntity).where(models.EventEntity.event_id == event.id)
        ).all()
    }

    rows = db.execute(
        select(
            models.Entity.id,
            models.Entity.type,
            models.Entity.name,
            models.Entity.aliases,
            models.Entity.tier,
        ).where(models.Entity.type.in_(tuple(_LINKABLE)))
    ).all()

    made = 0
    primary_id = str(event.primary_entity_id) if event.primary_entity_id else None
    best_primary: tuple[float, uuid.UUID] | None = None

    for eid, etype, name, aliases, tier in rows:
        eid_s = str(eid)
        if eid_s in existing:
            continue
        phrases = [name, *(aliases or [])]
        hit = False
        in_title = False
        for phrase in phrases:
            p = (phrase or "").strip()
            if not p:
                continue
            if _mentions(haystack, p):
                hit = True
                if _mentions(title_l, p):
                    in_title = True
                    break
        if not hit:
            continue

        role = "mentioned"
        conf = 0.85 if in_title else 0.65
        db.add(
            models.EventEntity(
                event_id=event.id,
                entity_id=eid,
                role=role,
                confidence=conf,
            )
        )
        existing.add(eid_s)
        made += 1

        # Promote a title company/institution to primary when event has none.
        if primary_id is None and in_title and etype in {"company", "institution", "model"}:
            score = float(tier or 0.4) + (1.0 if etype == "model" else 0.0)
            if best_primary is None or score > best_primary[0]:
                best_primary = (score, eid)

    if primary_id is None and best_primary is not None:
        event.primary_entity_id = best_primary[1]
        # Mark that entity as primary role.
        for ee in db.scalars(
            select(models.EventEntity).where(models.EventEntity.event_id == event.id)
        ).all():
            if ee.entity_id == best_primary[1]:
                ee.role = "primary"
                break

    return made
