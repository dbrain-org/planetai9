from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from planetai_shared.db import models
from planetai_shared.enums import EntityType
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from planetai_api import schemas, serializers
from planetai_api.db import get_db, get_lang

router = APIRouter()


@router.get("/entities")
def list_entities(
    db: Session = Depends(get_db),
    type: str | None = Query(None),
    limit: int = Query(200, ge=1, le=500),
) -> list[dict]:
    stmt = select(models.Entity)
    if type:
        stmt = stmt.where(models.Entity.type.in_(type.split(",")))
    stmt = stmt.order_by(models.Entity.tier.desc(), models.Entity.name).limit(limit)
    rows = db.scalars(stmt).all()

    # For people list: attach lightweight activity counts
    out: list[dict] = []
    for e in rows:
        item = {
            "slug": e.slug,
            "name": e.name,
            "type": e.type,
            "description": e.description,
            "logo_url": e.logo_url,
        }
        if e.type == EntityType.PERSON.value:
            news_n = db.scalar(
                select(func.count())
                .select_from(models.EventEntity)
                .join(models.Event, models.Event.id == models.EventEntity.event_id)
                .where(
                    models.EventEntity.entity_id == e.id,
                    models.Event.status == "active",
                )
            )
            vid_n = db.scalar(
                select(func.count())
                .select_from(models.VideoLink)
                .where(
                    models.VideoLink.target_type == "entity",
                    models.VideoLink.target_id == e.id,
                )
            )
            item["event_count"] = int(news_n or 0)
            item["video_count"] = int(vid_n or 0)
        out.append(item)
    return out


def _match_author(db: Session, ent: models.Entity) -> models.Author | None:
    return db.scalar(
        select(models.Author).where(
            models.Author.status == "active",
            or_(
                models.Author.slug == ent.slug,
                func.lower(models.Author.name) == ent.name.lower(),
            ),
        )
    )


def _collect_images(events: list[models.Event], limit: int = 16) -> list[schemas.EntityImage]:
    seen: set[str] = set()
    images: list[schemas.EntityImage] = []
    for ev in events:
        urls: list[str] = []
        if ev.image_url:
            urls.append(ev.image_url)
        if isinstance(ev.image_urls, list):
            urls.extend(u for u in ev.image_urls if isinstance(u, str) and u)
        for url in urls:
            if url in seen:
                continue
            seen.add(url)
            images.append(schemas.EntityImage(url=url, caption=ev.title, event_slug=ev.slug))
            if len(images) >= limit:
                return images
    return images


@router.get("/entities/{slug}", response_model=schemas.EntityDetail)
def get_entity(
    slug: str,
    db: Session = Depends(get_db),
    lang: str | None = Depends(get_lang),
) -> schemas.EntityDetail:
    ent = db.scalar(select(models.Entity).where(models.Entity.slug == slug))
    if ent is None:
        raise HTTPException(404, "entity not found")

    out_rels = db.execute(
        select(models.EntityRelation, models.Entity)
        .join(models.Entity, models.Entity.id == models.EntityRelation.to_entity_id)
        .where(models.EntityRelation.from_entity_id == ent.id)
    ).all()
    in_rels = db.execute(
        select(models.EntityRelation, models.Entity)
        .join(models.Entity, models.Entity.id == models.EntityRelation.from_entity_id)
        .where(models.EntityRelation.to_entity_id == ent.id)
    ).all()

    relations = [
        schemas.EntityRelationOut(
            relation=r.relation, direction="out", entity=serializers.entity_ref(e)
        )
        for r, e in out_rels
    ] + [
        schemas.EntityRelationOut(
            relation=r.relation, direction="in", entity=serializers.entity_ref(e)
        )
        for r, e in in_rels
    ]

    latest_events = (
        db.scalars(
            select(models.Event)
            .join(models.EventEntity, models.EventEntity.event_id == models.Event.id)
            .where(models.EventEntity.entity_id == ent.id, models.Event.status == "active")
            .order_by(models.Event.last_activity_at.desc())
            .limit(24)
        )
        .unique()
        .all()
    )

    videos = (
        db.scalars(
            select(models.Video)
            .join(models.VideoLink, models.VideoLink.video_id == models.Video.id)
            .where(
                models.VideoLink.target_type == "entity",
                models.VideoLink.target_id == ent.id,
            )
            .order_by(models.Video.published_at.desc())
            .limit(12)
        )
        .unique()
        .all()
    )

    columns: list[schemas.ColumnCardLite] = []
    author_slug: str | None = None
    author = _match_author(db, ent)
    if author is not None:
        author_slug = author.slug
        posts = db.scalars(
            select(models.OpinionPost)
            .where(
                models.OpinionPost.author_id == author.id,
                models.OpinionPost.status == "published",
            )
            .order_by(models.OpinionPost.published_at.desc())
            .limit(12)
        ).all()
        columns = [
            schemas.ColumnCardLite(
                slug=p.slug,
                title=p.title,
                dek=p.dek,
                hero_image_url=p.hero_image_url,
                published_at=p.published_at,
                author_name=author.name,
                author_slug=author.slug,
            )
            for p in posts
        ]

    images = _collect_images(list(latest_events))
    if ent.logo_url and ent.logo_url not in {i.url for i in images}:
        images.insert(0, schemas.EntityImage(url=ent.logo_url, caption=ent.name))

    event_count = db.scalar(
        select(func.count())
        .select_from(models.EventEntity)
        .join(models.Event, models.Event.id == models.EventEntity.event_id)
        .where(
            models.EventEntity.entity_id == ent.id,
            models.Event.status == "active",
        )
    )
    video_count = db.scalar(
        select(func.count())
        .select_from(models.VideoLink)
        .where(
            models.VideoLink.target_type == "entity",
            models.VideoLink.target_id == ent.id,
        )
    )

    return schemas.EntityDetail(
        slug=ent.slug,
        name=ent.name,
        type=ent.type,
        description=ent.description,
        logo_url=ent.logo_url,
        website_url=ent.website_url,
        relations=relations,
        latest_events=[serializers.event_card(db, e, lang) for e in latest_events],
        videos=[serializers.video_card(v) for v in videos],
        columns=columns,
        images=images,
        event_count=int(event_count or 0),
        video_count=int(video_count or 0),
        column_count=len(columns),
        author_slug=author_slug,
    )
