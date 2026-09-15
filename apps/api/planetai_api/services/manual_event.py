"""Turns an approved reader `NewsSubmission` into a real `Event`.

Kept API-local and deliberately lightweight rather than importing
`services/ingest`'s full collect -> dedup -> score pipeline: that package pulls
in a heavier dependency set (httpx, feedparser, rapidfuzz, …) meant for polling
RSS feeds, and its scorer expects a fully-populated event (multi-source counts,
entity hits, novelty history) that a single manually-approved submission will
never have. The scoring here mirrors the shape of
`services/ingest/planetai_ingest/pipeline/score.py` at a much lighter weight —
good enough to rank a reader story by recency; it will generally sit low under
`sort=importance`, which is expected for editorially-reviewed one-off items.
"""

from __future__ import annotations

import hashlib
import uuid
from datetime import UTC, datetime

from planetai_shared.db import models
from planetai_shared.enums import Category, SourceType, importance_band
from planetai_shared.settings import get_settings
from slugify import slugify
from sqlalchemy import select
from sqlalchemy.orm import Session

_settings = get_settings()

READER_SOURCE_SLUG = "okuyucu-haberleri"

# The bucket vocabulary a public submitter picks from (mirrors events.py's
# CATEGORY_BUCKET keys) mapped to one representative Category enum value to
# store on the created Event.
PUBLIC_BUCKETS = [
    "AI",
    "Robotics",
    "Coding",
    "Security",
    "Regulation",
    "Research",
    "Infra",
    "OpenSource",
]
BUCKET_TO_CATEGORY = {
    "AI": Category.MODELS.value,
    "Robotics": Category.ROBOTICS.value,
    "Coding": Category.AI_CODING.value,
    "Security": Category.AI_SAFETY.value,
    "Regulation": Category.REGULATION.value,
    "Research": Category.RESEARCH.value,
    "Infra": Category.INFRASTRUCTURE.value,
    "OpenSource": Category.OPEN_SOURCE.value,
}

# Same shape as score.py's WEIGHTS, duplicated locally to avoid depending on
# the ingest package from the API service.
_WEIGHTS = {
    "source_reliability": 0.15,
    "independent_sources": 0.22,
    "entity_impact": 0.20,
    "novelty": 0.12,
    "market_impact": 0.15,
    "velocity": 0.14,
}


def get_or_create_reader_source(db: Session) -> models.Source:
    """The one fixed Source reader-submitted events attribute to. Disabled so
    the ingest scheduler (which only polls `enabled` sources) never touches it.
    """
    src = db.scalar(select(models.Source).where(models.Source.slug == READER_SOURCE_SLUG))
    if src is not None:
        return src
    src = models.Source(
        slug=READER_SOURCE_SLUG,
        name="Okuyucu Haberleri",
        homepage_url=_settings.site_url,
        feed_url=None,
        kind="html_blog",
        source_type=SourceType.COMMUNITY.value,
        lang="tr",
        trust_weight=0.35,
        enabled=False,
    )
    db.add(src)
    db.flush()
    return src


def _unique_slug(db: Session, title: str) -> str:
    base = slugify(title)[:200] or "haber"
    slug = base
    if db.scalar(select(models.Event).where(models.Event.slug == slug)):
        slug = f"{base}-{uuid.uuid4().hex[:6]}"
    return slug


def _score(source: models.Source) -> float:
    factors = {
        "source_reliability": float(source.trust_weight),
        "independent_sources": 1 / 6,  # exactly one attributed source
        "entity_impact": 0.25,
        "novelty": 1.0,
        "market_impact": 0.4,
        "velocity": 0.3,
    }
    raw = sum(factors[k] * w for k, w in _WEIGHTS.items())
    return round(min(10.0, raw * 10.0), 2)


def create_event_from_submission(db: Session, submission: models.NewsSubmission) -> models.Event:
    """Approve-time conversion: reader submission -> Article + Event (+ turkiye topic).

    The `turkiye` EventTopic link alone satisfies the `region=TR` filter in
    events.py regardless of source language; the reader Source's `lang="tr"`
    additionally satisfies it via the other arm of that union, so region
    filtering stays correct even if one mechanism later changes.
    """
    now = datetime.now(UTC)
    source = get_or_create_reader_source(db)
    slug = _unique_slug(db, submission.title)
    canonical_url = submission.url or f"{_settings.site_url}/news/{slug}"

    gallery = list(submission.image_urls or [])
    if submission.image_url and submission.image_url not in gallery:
        gallery.insert(0, submission.image_url)
    gallery = gallery[:5]
    cover = gallery[0] if gallery else None

    article = models.Article(
        source_id=source.id,
        external_id=f"reader:{submission.id}",
        canonical_url=canonical_url,
        title=submission.title,
        raw_summary=submission.summary,
        clean_summary=submission.summary or ((submission.description or "")[:280] or None),
        body_text=submission.description or submission.summary,
        lang="tr",
        published_at=now,
        fetched_at=now,
        image_url=cover,
        content_hash=hashlib.sha256(f"{submission.title}|{canonical_url}".encode()).hexdigest(),
    )
    db.add(article)
    db.flush()

    category = BUCKET_TO_CATEGORY.get(submission.category, Category.MODELS.value)
    importance = _score(source)
    event = models.Event(
        slug=slug,
        title=submission.title,
        summary=submission.summary or ((submission.description or "")[:280] or None),
        body_text=submission.description,
        image_url=cover,
        image_urls=gallery,
        category=category,
        impact=importance_band(importance).value,
        importance=importance,
        source_count=1,
        first_seen_at=now,
        last_activity_at=now,
        is_top_signal=False,
        status="active",
        lang="tr",
    )
    db.add(event)
    db.flush()
    article.event_id = event.id

    topic = db.scalar(select(models.Topic).where(models.Topic.slug == "turkiye"))
    if topic is not None:
        db.add(models.EventTopic(event_id=event.id, topic_id=topic.id, weight=1.0))

    db.commit()
    db.refresh(event)
    return event
