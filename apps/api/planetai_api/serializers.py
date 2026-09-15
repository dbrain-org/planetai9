from __future__ import annotations

import re

from planetai_shared.db import models
from planetai_shared.enums import PRIMARY_SOURCE_TYPES
from sqlalchemy import select
from sqlalchemy.orm import Session

from planetai_api import schemas

_IMAGE_PARA = re.compile(
    r"^(?:https?://\S+)?(/news/|/uploads/).+\.(?:svg|png|jpe?g|webp|gif|avif|bmp|tiff?|heic|heif)$",
    re.IGNORECASE,
)
_IMAGE_ONLY = re.compile(
    r"^/?(?:news|uploads)/.+\.(?:svg|png|jpe?g|webp|gif|avif|bmp|tiff?|heic|heif)$",
    re.IGNORECASE,
)


def _is_image_paragraph(p: str) -> bool:
    s = p.strip()
    return bool(_IMAGE_PARA.match(s) or _IMAGE_ONLY.match(s))


def split_body_and_gallery(
    body_text: str | None,
    image_url: str | None,
    image_urls: list | None,
) -> tuple[list[str], list[str]]:
    """Pull standalone image paths out of body paragraphs into a gallery."""
    paragraphs = [p.strip() for p in (body_text or "").split("\n\n") if p.strip()]
    from_body = [p for p in paragraphs if _is_image_paragraph(p)]
    text = [p for p in paragraphs if not _is_image_paragraph(p)]

    gallery: list[str] = []
    for u in image_urls or []:
        if isinstance(u, str) and u.strip() and u.strip() not in gallery:
            gallery.append(u.strip())
    for u in from_body:
        if u not in gallery:
            gallery.append(u)
    if image_url and image_url not in gallery:
        gallery.insert(0, image_url)
    return text, gallery


def entity_ref(ent: models.Entity | None) -> schemas.EntityRef | None:
    if ent is None:
        return None
    return schemas.EntityRef(slug=ent.slug, name=ent.name, type=ent.type)


def source_ref(src: models.Source) -> schemas.SourceRef:
    return schemas.SourceRef(
        slug=src.slug,
        name=src.name,
        source_type=src.source_type,
        trust_weight=float(src.trust_weight),
        homepage_url=src.homepage_url,
    )


def _top_source(db: Session, event: models.Event) -> models.Source | None:
    row = db.execute(
        select(models.Source)
        .join(models.Article, models.Article.source_id == models.Source.id)
        .where(models.Article.event_id == event.id)
        .order_by(models.Source.trust_weight.desc())
        .limit(1)
    ).scalar_one_or_none()
    return row


def localized_text(
    db: Session, event: models.Event, lang: str | None
) -> tuple[str, str | None, str | None]:
    """(title, summary, body_text) in `lang`, falling back to the stored original.

    A missing or not-yet-`done` translation transparently yields the original, so
    a story is never hidden by a failed translation.
    """
    title, summary, body = event.title, event.summary, event.body_text
    if lang and lang != event.lang:
        tr = db.get(models.EventTranslation, (event.id, lang))
        if tr is not None and tr.status == "done":
            title = tr.title or title
            summary = tr.summary or summary
            body = tr.body_text or body
    return title, summary, body


def event_card(db: Session, event: models.Event, lang: str | None = None) -> schemas.EventCard:
    title, summary, _ = localized_text(db, event, lang)
    return schemas.EventCard(
        slug=event.slug,
        title=title,
        summary=summary,
        category=event.category,
        impact=event.impact,
        importance=float(event.importance),
        source_count=event.source_count,
        primary_entity=entity_ref(event.primary_entity),
        top_source=(lambda s: source_ref(s) if s else None)(_top_source(db, event)),
        published_at=event.last_activity_at,
        image_url=event.image_url,
    )


def video_card(video: models.Video) -> schemas.VideoCard:
    return schemas.VideoCard(
        youtube_id=video.youtube_id,
        title=video.title,
        description=video.description,
        thumbnail_url=video.thumbnail_url,
        duration_sec=video.duration_sec,
        published_at=video.published_at,
        playlist=video.playlist,
        topics=video.topics or [],
    )


def event_detail(db: Session, event: models.Event, lang: str | None = None) -> schemas.EventDetail:
    title, summary, body_text = localized_text(db, event, lang)
    entity_rows = db.execute(
        select(models.EventEntity, models.Entity)
        .join(models.Entity, models.Entity.id == models.EventEntity.entity_id)
        .where(models.EventEntity.event_id == event.id)
    ).all()
    topic_rows = (
        db.execute(
            select(models.Topic)
            .join(models.EventTopic, models.EventTopic.topic_id == models.Topic.id)
            .where(models.EventTopic.event_id == event.id)
        )
        .scalars()
        .all()
    )
    article_rows = db.execute(
        select(models.Article, models.Source)
        .join(models.Source, models.Source.id == models.Article.source_id)
        .where(models.Article.event_id == event.id)
        .order_by(models.Article.published_at.desc())
    ).all()

    sources = [
        schemas.EventSourceOut(
            source=source_ref(src),
            title=art.title,
            url=art.canonical_url,
            published_at=art.published_at,
            is_primary=src.source_type in {str(t) for t in PRIMARY_SOURCE_TYPES},
        )
        for art, src in article_rows
    ]
    sources.sort(key=lambda s: (not s.is_primary, -s.source.trust_weight))

    factors = db.get(models.ImportanceFactors, event.id)
    fout = (
        schemas.ImportanceFactorsOut(
            source_reliability=float(factors.source_reliability),
            independent_sources=float(factors.independent_sources),
            entity_impact=float(factors.entity_impact),
            novelty=float(factors.novelty),
            market_impact=float(factors.market_impact),
            velocity=float(factors.velocity),
            total=float(factors.total),
        )
        if factors
        else None
    )

    related = _related_events(db, event)
    related_videos = _related_videos_for_event(db, event)

    body, gallery = split_body_and_gallery(body_text, event.image_url, event.image_urls)

    return schemas.EventDetail(
        slug=event.slug,
        title=title,
        summary=summary,
        body=body,
        why_it_matters=event.why_it_matters,
        category=event.category,
        impact=event.impact,
        importance=float(event.importance),
        source_count=event.source_count,
        first_seen_at=event.first_seen_at,
        last_activity_at=event.last_activity_at,
        image_url=gallery[0] if gallery else event.image_url,
        image_urls=gallery,
        primary_entity=entity_ref(event.primary_entity),
        topics=[schemas.TopicRef(slug=t.slug, name=t.name) for t in topic_rows],
        entities=[
            schemas.EventEntityOut(entity=entity_ref(ent), role=ee.role) for ee, ent in entity_rows
        ],
        sources=sources,
        importance_factors=fout,
        related_events=[event_card(db, e, lang) for e in related],
        related_videos=[video_card(v) for v in related_videos],
    )


def _related_events(db: Session, event: models.Event, limit: int = 6) -> list[models.Event]:
    entity_ids = db.scalars(
        select(models.EventEntity.entity_id).where(models.EventEntity.event_id == event.id)
    ).all()
    if not entity_ids:
        return []
    query = (
        select(models.Event)
        .join(models.EventEntity, models.EventEntity.event_id == models.Event.id)
        .where(
            models.EventEntity.entity_id.in_(entity_ids),
            models.Event.id != event.id,
            models.Event.status == "active",
        )
        .order_by(models.Event.last_activity_at.desc())
        .limit(limit * 3)
    )
    # keep related list on-topic with the article unless the article itself is research
    if event.category != "Research":
        query = query.where(models.Event.category != "Research")
    rows = db.scalars(query).all()
    seen: set = set()
    out: list[models.Event] = []
    for e in rows:
        if e.id not in seen:
            seen.add(e.id)
            out.append(e)
        if len(out) >= limit:
            break
    return out


def _related_videos_for_event(
    db: Session, event: models.Event, limit: int = 4
) -> list[models.Video]:
    entity_ids = db.scalars(
        select(models.EventEntity.entity_id).where(models.EventEntity.event_id == event.id)
    ).all()
    if not entity_ids:
        return []
    return db.scalars(
        select(models.Video)
        .join(models.VideoLink, models.VideoLink.video_id == models.Video.id)
        .where(
            models.VideoLink.target_type == "entity",
            models.VideoLink.target_id.in_(entity_ids),
        )
        .order_by(models.Video.published_at.desc())
        .limit(limit)
    ).all()
