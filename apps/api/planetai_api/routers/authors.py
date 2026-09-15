from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from planetai_shared.db import models
from planetai_shared.settings import get_settings
from pydantic import BaseModel, Field
from slugify import slugify
from sqlalchemy import select
from sqlalchemy.orm import Session

from planetai_api.db import get_db

router = APIRouter()
_settings = get_settings()


class AuthorRef(BaseModel):
    slug: str
    name: str
    role: str | None
    avatar_url: str | None


class AuthorDetail(AuthorRef):
    bio: str | None
    links: dict


class ColumnCard(BaseModel):
    slug: str
    title: str
    dek: str | None
    hero_image_url: str | None
    published_at: datetime
    author: AuthorRef


class ColumnDetail(ColumnCard):
    body: str


def _author_ref(a: models.Author) -> AuthorRef:
    return AuthorRef(slug=a.slug, name=a.name, role=a.role, avatar_url=a.avatar_url)


def _card(p: models.OpinionPost) -> ColumnCard:
    return ColumnCard(
        slug=p.slug,
        title=p.title,
        dek=p.dek,
        hero_image_url=p.hero_image_url,
        published_at=p.published_at,
        author=_author_ref(p.author),
    )


@router.get("/authors", response_model=list[AuthorRef])
def list_authors(db: Session = Depends(get_db)) -> list[AuthorRef]:
    rows = db.scalars(select(models.Author).order_by(models.Author.name)).all()
    return [_author_ref(a) for a in rows]


@router.get("/authors/{slug}")
def get_author(slug: str, db: Session = Depends(get_db)) -> dict:
    a = db.scalar(select(models.Author).where(models.Author.slug == slug))
    if a is None:
        raise HTTPException(404, "author not found")
    posts = db.scalars(
        select(models.OpinionPost)
        .where(models.OpinionPost.author_id == a.id, models.OpinionPost.status == "published")
        .order_by(models.OpinionPost.published_at.desc())
    ).all()
    return {
        "author": AuthorDetail(
            slug=a.slug,
            name=a.name,
            role=a.role,
            avatar_url=a.avatar_url,
            bio=a.bio,
            links=a.links or {},
        ).model_dump(),
        "columns": [_card(p).model_dump() for p in posts],
    }


@router.get("/columns", response_model=list[ColumnCard])
def list_columns(
    db: Session = Depends(get_db), limit: int = Query(30, ge=1, le=60)
) -> list[ColumnCard]:
    rows = db.scalars(
        select(models.OpinionPost)
        .where(models.OpinionPost.status == "published")
        .order_by(models.OpinionPost.published_at.desc())
        .limit(limit)
    ).all()
    return [_card(p) for p in rows]


@router.get("/columns/{slug}", response_model=ColumnDetail)
def get_column(slug: str, db: Session = Depends(get_db)) -> ColumnDetail:
    p = db.scalar(select(models.OpinionPost).where(models.OpinionPost.slug == slug))
    if p is None or p.status != "published":
        raise HTTPException(404, "column not found")
    return ColumnDetail(**_card(p).model_dump(), body=p.body)


# --- author studio (X-Author-Key: "<slug>:<secret>") --------------------------


class MyColumn(BaseModel):
    slug: str
    title: str
    dek: str | None
    body: str
    hero_image_url: str | None
    status: str
    published_at: datetime
    updated_at: datetime


class StudioPayload(BaseModel):
    author: AuthorDetail
    columns: list[MyColumn]
    is_moderator: bool  # may also moderate the AI Marketplace queue


class ColumnInput(BaseModel):
    title: str = Field(min_length=4, max_length=200)
    dek: str | None = Field(default=None, max_length=300)
    body: str = Field(min_length=40)
    hero_image_url: str | None = Field(default=None, max_length=600)
    status: str = Field(default="draft", pattern="^(draft|published)$")


def require_author(
    x_author_key: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> models.Author:
    """Guard for the writer studio. 404 when unconfigured so the surface stays invisible."""
    from planetai_api.author_auth import resolve_author_from_key, studio_auth_configured

    if not studio_auth_configured(db):
        raise HTTPException(404, "not found")
    if not x_author_key or ":" not in x_author_key:
        raise HTTPException(401, "geçersiz yazar anahtarı")
    author = resolve_author_from_key(db, x_author_key)
    if author is None:
        # wrong secret vs unknown slug: keep the same 401 for secrets; missing row → 404
        slug = x_author_key.split(":", 1)[0].strip()
        exists = db.scalar(select(models.Author.id).where(models.Author.slug == slug))
        if exists is None:
            raise HTTPException(404, "yazar bulunamadı")
        raise HTTPException(401, "geçersiz yazar anahtarı")
    return author


def _bust_columns_cache() -> None:
    try:
        import redis

        client = redis.from_url(_settings.redis_url)
        for pattern in ("home*", "columns*"):
            for key in client.scan_iter(match=pattern):
                client.delete(key)
    except Exception:  # noqa: BLE001
        pass


def _my_column(p: models.OpinionPost) -> MyColumn:
    return MyColumn(
        slug=p.slug,
        title=p.title,
        dek=p.dek,
        body=p.body,
        hero_image_url=p.hero_image_url,
        status=p.status,
        published_at=p.published_at,
        updated_at=p.updated_at,
    )


def _author_detail(a: models.Author) -> AuthorDetail:
    return AuthorDetail(
        slug=a.slug,
        name=a.name,
        role=a.role,
        avatar_url=a.avatar_url,
        bio=a.bio,
        links=a.links or {},
    )


@router.get("/authors/me/studio", response_model=StudioPayload)
def my_studio(
    author: models.Author = Depends(require_author),
    db: Session = Depends(get_db),
) -> StudioPayload:
    posts = db.scalars(
        select(models.OpinionPost)
        .where(models.OpinionPost.author_id == author.id)
        .order_by(models.OpinionPost.published_at.desc())
    ).all()
    from planetai_api.author_auth import author_is_moderator

    return StudioPayload(
        author=_author_detail(author),
        columns=[_my_column(p) for p in posts],
        is_moderator=author_is_moderator(author),
    )


@router.post("/authors/me/columns", response_model=MyColumn, status_code=201)
def create_my_column(
    payload: ColumnInput,
    author: models.Author = Depends(require_author),
    db: Session = Depends(get_db),
) -> MyColumn:
    slug = f"{slugify(payload.title)[:200] or 'kose'}-{uuid.uuid4().hex[:6]}"
    now = datetime.now(UTC)
    post = models.OpinionPost(
        slug=slug,
        author_id=author.id,
        title=payload.title,
        dek=payload.dek,
        body=payload.body.strip(),
        hero_image_url=payload.hero_image_url,
        status=payload.status,
        published_at=now,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    if post.status == "published":
        _bust_columns_cache()
    return _my_column(post)


@router.patch("/authors/me/columns/{slug}", response_model=MyColumn)
def update_my_column(
    slug: str,
    payload: ColumnInput,
    author: models.Author = Depends(require_author),
    db: Session = Depends(get_db),
) -> MyColumn:
    post = db.scalar(select(models.OpinionPost).where(models.OpinionPost.slug == slug))
    if post is None or post.author_id != author.id:
        raise HTTPException(404, "yazı bulunamadı")
    was_published = post.status == "published"
    post.title = payload.title
    post.dek = payload.dek
    post.body = payload.body.strip()
    post.hero_image_url = payload.hero_image_url
    if payload.status == "published" and not was_published:
        post.published_at = datetime.now(UTC)
    post.status = payload.status
    db.commit()
    db.refresh(post)
    if post.status == "published" or was_published:
        _bust_columns_cache()
    return _my_column(post)
