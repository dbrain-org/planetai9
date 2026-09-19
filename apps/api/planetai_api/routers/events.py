from __future__ import annotations

import base64
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from planetai_shared.db import models
from sqlalchemy import select
from sqlalchemy.orm import Session

from planetai_api import schemas, serializers
from planetai_api.db import get_db, get_lang
from planetai_api.regions import tr_event_ids_subquery

router = APIRouter()


def _encode_cursor(dt: datetime, id_: str) -> str:
    return base64.urlsafe_b64encode(f"{dt.isoformat()}|{id_}".encode()).decode()


def _decode_cursor(cursor: str) -> tuple[datetime, str]:
    raw = base64.urlsafe_b64decode(cursor.encode()).decode()
    ts, id_ = raw.split("|", 1)
    return datetime.fromisoformat(ts), id_


CATEGORY_BUCKET = {
    "AI": [
        "Models",
        "Companies",
        "Agents",
        "GenerativeAI",
        "VoiceAI",
        "ComputerVision",
        "HealthcareAI",
        "FinanceAI",
    ],
    "Robotics": ["Robotics"],
    "Coding": ["AICoding"],
    "Security": ["AISafety"],
    "Regulation": ["Regulation"],
    "Research": ["Research"],
    "Infra": ["Infrastructure"],
    "OpenSource": ["OpenSource"],
}


# time-window filter for the news surfaces ("Son 24 saat", "Bu hafta"…)
WINDOW_HOURS = {"24h": 24, "7d": 24 * 7, "30d": 24 * 30}


@router.get("/events", response_model=schemas.Page)
def list_events(
    db: Session = Depends(get_db),
    category: str | None = None,
    bucket: str | None = None,
    topic: str | None = None,
    region: str | None = None,
    window: str | None = None,
    entity: str | None = None,
    source: str | None = None,
    origin: str | None = None,
    importance_min: float | None = None,
    impact: str | None = None,
    sort: str = Query("recent", pattern="^(recent|importance|views|comments|likes)$"),
    cursor: str | None = None,
    limit: int = Query(20, ge=1, le=50),
    lang: str | None = Depends(get_lang),
) -> schemas.Page:
    stmt = select(models.Event).where(models.Event.status == "active")

    if bucket and bucket in CATEGORY_BUCKET:
        stmt = stmt.where(models.Event.category.in_(CATEGORY_BUCKET[bucket]))
        if bucket != "Research":
            arxiv_events = (
                select(models.Article.event_id)
                .join(models.Source, models.Source.id == models.Article.source_id)
                .where(models.Source.kind == "arxiv", models.Article.event_id.isnot(None))
            )
            stmt = stmt.where(models.Event.id.not_in(arxiv_events))
    elif category and category.lower() != "all":
        stmt = stmt.where(models.Event.category == category)
    elif not source:
        # the default feed is "news" — papers have their own surface (/research)
        arxiv_events = (
            select(models.Article.event_id)
            .join(models.Source, models.Source.id == models.Article.source_id)
            .where(models.Source.kind == "arxiv", models.Article.event_id.isnot(None))
        )
        stmt = stmt.where(models.Event.category != "Research", models.Event.id.not_in(arxiv_events))
    if topic:
        tp = db.scalar(select(models.Topic).where(models.Topic.slug == topic))
        if tp is None:
            raise HTTPException(404, "unknown topic")
        stmt = stmt.join(models.EventTopic, models.EventTopic.event_id == models.Event.id).where(
            models.EventTopic.topic_id == tp.id
        )
    if region and region.upper() in {"TR", "WORLD"}:
        tr_ids = tr_event_ids_subquery()
        if region.upper() == "TR":
            stmt = stmt.where(models.Event.id.in_(tr_ids))
        else:  # WORLD — AI news that isn't Türkiye-sourced
            stmt = stmt.where(models.Event.id.not_in(tr_ids))
    if origin == "submitted":
        # Events created from an approved /haber-giris submission (see
        # planetai_api.services.manual_event) — used for the "PlanetAI9 Haberleri"
        # rail on the event detail page, regardless of who's shown as the source.
        submitted_events = select(models.Article.event_id).where(
            models.Article.external_id.like("reader:%"), models.Article.event_id.isnot(None)
        )
        stmt = stmt.where(models.Event.id.in_(submitted_events))
    if window in WINDOW_HOURS:
        cutoff = datetime.now(UTC) - timedelta(hours=WINDOW_HOURS[window])
        stmt = stmt.where(models.Event.last_activity_at >= cutoff)
    if importance_min is not None:
        stmt = stmt.where(models.Event.importance >= importance_min)
    if impact:
        stmt = stmt.where(models.Event.impact == impact)
    if entity:
        ent = db.scalar(select(models.Entity).where(models.Entity.slug == entity))
        if ent is None:
            raise HTTPException(404, "unknown entity")
        stmt = stmt.join(models.EventEntity, models.EventEntity.event_id == models.Event.id).where(
            models.EventEntity.entity_id == ent.id
        )
    if source:
        src = db.scalar(select(models.Source).where(models.Source.slug == source))
        if src is None:
            raise HTTPException(404, "unknown source")
        stmt = stmt.join(models.Article, models.Article.event_id == models.Event.id).where(
            models.Article.source_id == src.id
        )

    if sort == "importance":
        stmt = stmt.order_by(models.Event.importance.desc(), models.Event.id.desc())
    elif sort == "views":
        stmt = stmt.order_by(models.Event.view_count.desc(), models.Event.last_activity_at.desc())
    elif sort == "comments":
        stmt = stmt.order_by(
            models.Event.comment_count.desc(), models.Event.last_activity_at.desc()
        )
    elif sort == "likes":
        stmt = stmt.order_by(models.Event.like_count.desc(), models.Event.last_activity_at.desc())
    else:
        stmt = stmt.order_by(models.Event.last_activity_at.desc(), models.Event.id.desc())
        if cursor:
            ts, id_ = _decode_cursor(cursor)
            stmt = stmt.where(models.Event.last_activity_at < ts)

    rows = db.scalars(stmt.limit(limit + 1)).unique().all()
    has_more = len(rows) > limit
    rows = rows[:limit]

    next_cursor = (
        _encode_cursor(rows[-1].last_activity_at, str(rows[-1].id))
        if has_more and sort == "recent"
        else None
    )
    return schemas.Page(
        data=[serializers.event_card(db, e, lang) for e in rows],
        next_cursor=next_cursor,
        count=len(rows),
    )


@router.get("/events/{slug}", response_model=schemas.EventDetail)
def get_event(
    slug: str,
    db: Session = Depends(get_db),
    lang: str | None = Depends(get_lang),
) -> schemas.EventDetail:
    event = db.scalar(select(models.Event).where(models.Event.slug == slug))
    if event is None or event.status != "active":
        raise HTTPException(404, "event not found")
    return serializers.event_detail(db, event, lang)
