from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends
from planetai_shared.db import models
from planetai_shared.enums import Category
from planetai_shared.settings import get_settings
from sqlalchemy import select
from sqlalchemy.orm import Session

from planetai_api import cache, schemas, serializers
from planetai_api.db import get_db, get_lang
from planetai_api.regions import tr_event_ids_subquery
from planetai_api.routers.trends import build_trends

router = APIRouter()
_settings = get_settings()


@router.get("/home", response_model=schemas.HomePayload)
def home(
    db: Session = Depends(get_db),
    lang: str | None = Depends(get_lang),
    region: str | None = None,
) -> schemas.HomePayload:
    region = region.upper() if region and region.upper() in {"TR", "WORLD"} else None
    cache_key = f"home:v7:{lang or 'tr'}:{region or 'all'}"
    cached = cache.get(cache_key)
    if cached:
        return schemas.HomePayload.model_validate(cached)

    def region_filter(stmt):
        if region is None:
            return stmt
        tr_ids = tr_event_ids_subquery()
        return stmt.where(
            models.Event.id.in_(tr_ids) if region == "TR" else models.Event.id.not_in(tr_ids)
        )

    top_signals = db.scalars(
        region_filter(
            select(models.Event).where(
                models.Event.is_top_signal.is_(True), models.Event.status == "active"
            )
        )
        .order_by(models.Event.importance.desc())
        .limit(5)
    ).all()

    research_event_ids = (
        select(models.Article.event_id)
        .join(models.Source, models.Source.id == models.Article.source_id)
        .where(models.Source.kind == "arxiv", models.Article.event_id.isnot(None))
    )
    latest = db.scalars(
        region_filter(
            select(models.Event).where(
                models.Event.status == "active",
                models.Event.category != Category.RESEARCH.value,
                models.Event.id.not_in(research_event_ids),
            )
        )
        .order_by(models.Event.last_activity_at.desc())
        .limit(20)
    ).all()

    videos = db.scalars(
        select(models.Video).order_by(models.Video.published_at.desc()).limit(16)
    ).all()

    week = datetime.now(UTC) - timedelta(days=7)
    popular = db.scalars(
        region_filter(
            select(models.Event).where(
                models.Event.status == "active",
                models.Event.category != Category.RESEARCH.value,
                models.Event.id.not_in(research_event_ids),
                models.Event.last_activity_at >= week,
            )
        )
        .order_by(models.Event.source_count.desc(), models.Event.importance.desc())
        .limit(6)
    ).all()

    most_read = db.scalars(
        region_filter(
            select(models.Event).where(
                models.Event.status == "active",
                models.Event.category != Category.RESEARCH.value,
                models.Event.id.not_in(research_event_ids),
                models.Event.view_count > 0,
            )
        )
        .order_by(models.Event.view_count.desc(), models.Event.last_activity_at.desc())
        .limit(6)
    ).all()

    most_commented = db.scalars(
        region_filter(
            select(models.Event).where(
                models.Event.status == "active",
                models.Event.category != Category.RESEARCH.value,
                models.Event.id.not_in(research_event_ids),
                models.Event.comment_count > 0,
            )
        )
        .order_by(models.Event.comment_count.desc(), models.Event.last_activity_at.desc())
        .limit(6)
    ).all()

    columns = db.execute(
        select(models.OpinionPost, models.Author)
        .join(models.Author, models.Author.id == models.OpinionPost.author_id)
        .where(models.OpinionPost.status == "published")
        .order_by(models.OpinionPost.published_at.desc())
        .limit(3)
    ).all()

    def section(cat: str, limit: int = 4) -> list:
        return db.scalars(
            region_filter(
                select(models.Event).where(
                    models.Event.status == "active",
                    models.Event.category == cat,
                    models.Event.id.not_in(research_event_ids),
                )
            )
            .order_by(models.Event.last_activity_at.desc())
            .limit(limit)
        ).all()

    sections = {
        "models": section("Models"),
        "robotics": section("Robotics"),
        "coding": section("AICoding"),
        "security": section("AISafety"),
    }

    since = datetime.now(UTC) - timedelta(hours=24)
    timeline_events = db.scalars(
        region_filter(
            select(models.Event).where(
                models.Event.last_activity_at >= since,
                models.Event.status == "active",
                models.Event.id.not_in(research_event_ids),
            )
        )
        .order_by(models.Event.last_activity_at.desc())
        .limit(25)
    ).all()

    payload = schemas.HomePayload(
        top_signals=[serializers.event_card(db, e, lang) for e in top_signals],
        latest_news=[serializers.event_card(db, e, lang) for e in latest],
        popular=[serializers.event_card(db, e, lang) for e in popular],
        most_read=[serializers.event_card(db, e, lang) for e in most_read],
        most_commented=[serializers.event_card(db, e, lang) for e in most_commented],
        sections={k: [serializers.event_card(db, e, lang) for e in v] for k, v in sections.items()},
        trending=build_trends(db, window="24h", limit=8, lang=lang),
        videos=[serializers.video_card(v) for v in videos],
        columns=[
            schemas.ColumnCardLite(
                slug=p.slug,
                title=p.title,
                dek=p.dek,
                hero_image_url=p.hero_image_url,
                published_at=p.published_at,
                author_name=a.name,
                author_slug=a.slug,
            )
            for p, a in columns
        ],
        timeline=[
            schemas.TimelineItem(
                time=e.last_activity_at,
                slug=e.slug,
                title=serializers.localized_text(db, e, lang)[0],
                category=e.category,
                impact=e.impact,
            )
            for e in timeline_events
        ],
    )
    cache.set(cache_key, payload.model_dump(), _settings.cache_ttl_home_sec)
    return payload
