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
import re
import uuid
from datetime import UTC, datetime

from planetai_shared.db import models
from planetai_shared.enums import Category, SourceType, importance_band
from planetai_shared.settings import get_settings
from slugify import slugify
from sqlalchemy import func, select
from sqlalchemy.orm import Session

_settings = get_settings()

READER_SOURCE_SLUG = "okuyucu-haberleri"
STAFF_SOURCE_SLUG = "planetai9-editorial"
SUMMARY_LIMIT = 280

_SENT_END = re.compile(r"(?<=[.!?…])\s+")


def clip_summary(text: str | None, limit: int = SUMMARY_LIMIT) -> str | None:
    """Short dek — prefer whole sentences; never end mid-word."""
    if not text:
        return None
    t = " ".join(str(text).split())
    if len(t) <= limit:
        return t
    # Pack as many complete sentences as fit (no trailing …).
    out = ""
    for sent in _SENT_END.split(t):
        sent = sent.strip()
        if not sent:
            continue
        cand = f"{out} {sent}".strip() if out else sent
        if len(cand) <= limit:
            out = cand
        else:
            break
    if len(out) >= max(40, limit // 3):
        return out
    cut = t[:limit].rsplit(" ", 1)[0].rstrip(" ,;:.-–—")
    if len(cut) < max(40, limit // 3):
        cut = t[:limit].rstrip()
    return f"{cut}…"


MAX_IMAGES = 12

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
    """Community tips from /haber-giris. Disabled so ingest never polls it."""
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


def get_or_create_staff_source(db: Session) -> models.Source:
    """Site-team stories — shown as PlanetAI9, not Okuyucu Haberleri."""
    src = db.scalar(select(models.Source).where(models.Source.slug == STAFF_SOURCE_SLUG))
    if src is not None:
        return src
    src = models.Source(
        slug=STAFF_SOURCE_SLUG,
        name="PlanetAI9",
        homepage_url=_settings.site_url,
        feed_url=None,
        kind="html_blog",
        source_type=SourceType.OFFICIAL_ANNOUNCEMENT.value,
        lang="tr",
        trust_weight=0.9,
        enabled=False,
    )
    db.add(src)
    db.flush()
    return src


def submission_looks_staff(db: Session, submission: models.NewsSubmission) -> bool:
    if bool(getattr(submission, "is_staff", False)):
        return True
    email = (submission.submitter_email or "").strip().lower()
    name = (submission.submitter_name or "").strip().lower()
    if email:
        hit = db.scalar(
            select(models.Author.id).where(
                models.Author.status == "active",
                func.lower(models.Author.email) == email,
            )
        )
        if hit is not None:
            return True
    if name:
        authors = db.scalars(select(models.Author).where(models.Author.status == "active")).all()
        for a in authors:
            if (a.name or "").strip().lower() == name:
                return True
    return False


def source_for_submission(db: Session, submission: models.NewsSubmission) -> models.Source:
    if submission_looks_staff(db, submission):
        return get_or_create_staff_source(db)
    return get_or_create_reader_source(db)


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
    if submission_looks_staff(db, submission):
        submission.is_staff = True
    source = source_for_submission(db, submission)
    slug = _unique_slug(db, submission.title)
    canonical_url = submission.url or f"{_settings.site_url}/news/{slug}"

    gallery = list(submission.image_urls or [])
    if submission.image_url and submission.image_url not in gallery:
        gallery.insert(0, submission.image_url)
    gallery = gallery[:MAX_IMAGES]
    cover = gallery[0] if gallery else None

    article = models.Article(
        source_id=source.id,
        external_id=f"reader:{submission.id}",
        canonical_url=canonical_url,
        title=submission.title,
        raw_summary=submission.summary,
        clean_summary=submission.summary,
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
        summary=submission.summary,
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

    # Link people / companies / orgs named in the story so the web layer can
    # linkify them (dictionary match on title + summary + body).
    from planetai_api.services.entity_attach import attach_entities_to_event

    attach_entities_to_event(db, event)

    db.commit()
    db.refresh(event)
    return event


def retarget_submission_source(db: Session, submission: models.NewsSubmission) -> None:
    """Keep Article.source in sync when is_staff is toggled after publish."""
    if submission.event_id is None:
        return
    article = db.scalar(
        select(models.Article).where(
            models.Article.external_id == f"reader:{submission.id}",
            models.Article.event_id == submission.event_id,
        )
    )
    if article is None:
        return
    article.source_id = source_for_submission(db, submission).id
