from __future__ import annotations

import secrets
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from planetai_shared.author_auth import hash_api_key
from planetai_shared.db import models
from planetai_shared.settings import get_settings
from pydantic import BaseModel, Field
from slugify import slugify
from sqlalchemy import select
from sqlalchemy.orm import Session

from planetai_api.db import get_db
from planetai_api.ratelimit import limiter
from planetai_api.routers.marketplace import require_admin

router = APIRouter()
_settings = get_settings()

AUTHOR_STATUSES = {"active", "pending", "rejected"}
# Test / junk slugs that must never appear on /yazarlar
_JUNK_AUTHOR_SLUGS = frozenset({"no-mod", "someone-else", "other"})


class AuthorRef(BaseModel):
    slug: str
    name: str
    role: str | None
    avatar_url: str | None


class AuthorDetail(AuthorRef):
    bio: str | None
    links: dict


class AuthorApplicationOut(BaseModel):
    slug: str
    name: str
    role: str | None
    bio: str | None
    email: str | None
    application_note: str | None
    status: str
    has_key: bool
    created_at: datetime


class AuthorApplyIn(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    email: str = Field(min_length=5, max_length=200)
    role: str | None = Field(default=None, max_length=160)
    bio: str | None = Field(default=None, max_length=4000)
    note: str | None = Field(default=None, max_length=2000)


class AuthorStatusChange(BaseModel):
    status: str


class AuthorKeyIn(BaseModel):
    """Omit secret to auto-generate a one-time key returned in the response."""

    secret: str | None = Field(default=None, min_length=8, max_length=120)


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


def _application_out(a: models.Author) -> AuthorApplicationOut:
    return AuthorApplicationOut(
        slug=a.slug,
        name=a.name,
        role=a.role,
        bio=a.bio,
        email=a.email,
        application_note=a.application_note,
        status=a.status,
        has_key=bool(a.api_key_hash),
        created_at=a.created_at,
    )


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
    rows = db.scalars(
        select(models.Author)
        .where(models.Author.status == "active")
        .order_by(models.Author.name)
    ).all()
    return [_author_ref(a) for a in rows if a.slug not in _JUNK_AUTHOR_SLUGS]


@router.post("/authors/apply", status_code=201)
@limiter.limit(_settings.rate_limit_submit)
def apply_as_author(
    request: Request, payload: AuthorApplyIn, db: Session = Depends(get_db)
) -> dict:
    name = payload.name.strip()
    email = payload.email.strip().lower()
    base = slugify(name)[:100] or "yazar"
    slug = base
    n = 0
    while db.scalar(select(models.Author.id).where(models.Author.slug == slug)):
        n += 1
        slug = f"{base}-{n}"
        if n > 50:
            raise HTTPException(409, "slug alınamadı")

    author = models.Author(
        slug=slug,
        name=name,
        role=(payload.role or "").strip() or None,
        bio=(payload.bio or "").strip() or None,
        email=email,
        application_note=(payload.note or "").strip() or None,
        status="pending",
        links={},
    )
    db.add(author)
    db.commit()
    return {"ok": True, "status": "pending", "slug": slug}


@router.get("/authors/queue", response_model=list[AuthorApplicationOut])
def author_applications_queue(
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
    status: str | None = Query(None),
) -> list[AuthorApplicationOut]:
    stmt = select(models.Author).where(models.Author.slug.notin_(_JUNK_AUTHOR_SLUGS))
    if status in AUTHOR_STATUSES:
        stmt = stmt.where(models.Author.status == status)
    else:
        # Default queue: pending first, then everyone else except pure junk
        pass
    rows = sorted(
        db.scalars(stmt).all(),
        key=lambda a: (a.status != "pending", a.name.lower()),
    )
    return [_application_out(a) for a in rows]


@router.post("/authors/{slug}/status", response_model=AuthorApplicationOut)
def set_author_status(
    slug: str,
    payload: AuthorStatusChange,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AuthorApplicationOut:
    if payload.status not in AUTHOR_STATUSES:
        raise HTTPException(422, f"status must be one of {sorted(AUTHOR_STATUSES)}")
    if slug in _JUNK_AUTHOR_SLUGS:
        raise HTTPException(404, "yazar bulunamadı")
    author = db.scalar(select(models.Author).where(models.Author.slug == slug))
    if author is None:
        raise HTTPException(404, "yazar bulunamadı")
    author.status = payload.status
    db.commit()
    db.refresh(author)
    return _application_out(author)


@router.post("/authors/{slug}/key")
def set_author_key(
    slug: str,
    payload: AuthorKeyIn,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    if slug in _JUNK_AUTHOR_SLUGS:
        raise HTTPException(404, "yazar bulunamadı")
    author = db.scalar(select(models.Author).where(models.Author.slug == slug))
    if author is None:
        raise HTTPException(404, "yazar bulunamadı")
    secret = (payload.secret or "").strip() or secrets.token_urlsafe(18)
    author.api_key_hash = hash_api_key(secret)
    if author.status == "pending":
        author.status = "active"
    db.commit()
    return {
        "ok": True,
        "slug": author.slug,
        "status": author.status,
        "key": f"{author.slug}:{secret}",
    }


@router.get("/authors/{slug}")
def get_author(slug: str, db: Session = Depends(get_db)) -> dict:
    if slug in _JUNK_AUTHOR_SLUGS:
        raise HTTPException(404, "author not found")
    a = db.scalar(
        select(models.Author).where(
            models.Author.slug == slug, models.Author.status == "active"
        )
    )
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
    is_moderator: bool  # may also moderate the TAKYAP queue


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
