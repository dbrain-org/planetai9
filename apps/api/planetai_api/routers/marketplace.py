from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from planetai_shared.db import models
from planetai_shared.settings import get_settings
from pydantic import BaseModel, Field, HttpUrl
from slugify import slugify
from sqlalchemy import select
from sqlalchemy.orm import Session

from planetai_api.db import get_db
from planetai_api.ratelimit import limiter

router = APIRouter()
_settings = get_settings()

STATUSES = {"pending", "approved", "rejected"}


def _valid_moderator_author(db: Session, x_author_key: str | None) -> bool:
    """A studio key '<slug>:<secret>' for an author marked moderator (DB or env list)."""
    from planetai_api.author_auth import author_is_moderator, resolve_author_from_key

    author = resolve_author_from_key(db, x_author_key)
    return author is not None and author_is_moderator(author)


def require_admin(
    x_admin_token: str | None = Header(default=None),
    x_author_key: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> None:
    """Guard for the moderation queue.

    Accepts either the /yonetim admin token or a moderator author's /yazar studio key.
    404 when neither channel is configured so the surface stays invisible.
    """
    from planetai_api.author_auth import moderation_channel_configured

    if not moderation_channel_configured(db):
        raise HTTPException(404, "not found")
    if _settings.admin_token and x_admin_token and x_admin_token == _settings.admin_token:
        return
    if _valid_moderator_author(db, x_author_key):
        return
    raise HTTPException(401, "geçersiz yönetim anahtarı")


def _bust_home_cache() -> None:
    try:
        import redis

        client = redis.from_url(_settings.redis_url)
        for pattern in ("home*", "marketplace*"):
            for key in client.scan_iter(match=pattern):
                client.delete(key)
    except Exception:
        pass


CATEGORIES = {"mcp", "llm", "stt", "tts", "agent", "tool", "other"}
CATEGORY_LABEL = {
    "mcp": "MCP Sunucusu",
    "llm": "LLM",
    "stt": "Konuşma → Metin",
    "tts": "Metin → Konuşma",
    "agent": "Ajan",
    "tool": "Araç",
    "other": "Diğer",
}


class AppOut(BaseModel):
    slug: str
    name: str
    tagline: str
    description: str | None
    url: str
    repo_url: str | None
    category: str
    category_label: str
    pricing: str
    logo_url: str | None
    author_name: str
    author_url: str | None
    upvotes: int
    featured: bool


class QueueApp(AppOut):
    status: str
    submitter_email: str | None
    is_turkish_dev: bool
    created_at: datetime


class StatusChange(BaseModel):
    status: str


class AppSubmission(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    tagline: str = Field(min_length=8, max_length=240)
    description: str | None = Field(default=None, max_length=4000)
    url: HttpUrl
    repo_url: HttpUrl  # required — marketplace is scoped to open-source projects
    category: str
    pricing: str = "free"
    author_name: str = Field(min_length=2, max_length=120)
    author_url: HttpUrl | None = None
    submitter_email: str | None = Field(default=None, max_length=200)
    is_turkish_dev: bool = False  # submitter self-declaration, shown to moderators


def _to_out(a: models.MarketplaceApp) -> AppOut:
    return AppOut(
        slug=a.slug,
        name=a.name,
        tagline=a.tagline,
        description=a.description,
        url=a.url,
        repo_url=a.repo_url,
        category=a.category,
        category_label=CATEGORY_LABEL.get(a.category, a.category),
        pricing=a.pricing,
        logo_url=a.logo_url,
        author_name=a.author_name,
        author_url=a.author_url,
        upvotes=a.upvotes,
        featured=a.featured,
    )


@router.get("/marketplace", response_model=list[AppOut])
def list_apps(
    db: Session = Depends(get_db),
    category: str | None = Query(None),
) -> list[AppOut]:
    stmt = select(models.MarketplaceApp).where(models.MarketplaceApp.status == "approved")
    if category and category in CATEGORIES:
        stmt = stmt.where(models.MarketplaceApp.category == category)
    stmt = stmt.order_by(
        models.MarketplaceApp.featured.desc(),
        models.MarketplaceApp.upvotes.desc(),
        models.MarketplaceApp.created_at.desc(),
    )
    return [_to_out(a) for a in db.scalars(stmt).all()]


@router.post("/marketplace", status_code=201)
@limiter.limit(_settings.rate_limit_submit)
def submit_app(request: Request, payload: AppSubmission, db: Session = Depends(get_db)) -> dict:
    if payload.category not in CATEGORIES:
        raise HTTPException(422, f"category must be one of {sorted(CATEGORIES)}")
    if payload.pricing not in {"free", "freemium", "paid"}:
        raise HTTPException(422, "pricing must be free|freemium|paid")

    base = slugify(payload.name)[:120] or "app"
    slug = base
    if db.scalar(select(models.MarketplaceApp).where(models.MarketplaceApp.slug == slug)):
        slug = f"{base}-{uuid.uuid4().hex[:6]}"

    app = models.MarketplaceApp(
        slug=slug,
        name=payload.name.strip(),
        tagline=payload.tagline.strip(),
        description=(payload.description or "").strip() or None,
        url=str(payload.url),
        repo_url=str(payload.repo_url),
        category=payload.category,
        pricing=payload.pricing,
        author_name=payload.author_name.strip(),
        author_url=str(payload.author_url) if payload.author_url else None,
        submitter_email=(payload.submitter_email or "").strip() or None,
        is_turkish_dev=payload.is_turkish_dev,
        status="pending",
    )
    db.add(app)
    db.commit()
    return {"ok": True, "status": "pending", "slug": slug}


# --- moderation panel (X-Admin-Token) ---------------------------------------


def _queue_out(a: models.MarketplaceApp) -> QueueApp:
    return QueueApp(
        **_to_out(a).model_dump(),
        status=a.status,
        submitter_email=a.submitter_email,
        is_turkish_dev=a.is_turkish_dev,
        created_at=a.created_at,
    )


@router.get("/marketplace/queue", response_model=list[QueueApp])
def moderation_queue(
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
    status: str | None = Query(None),
) -> list[QueueApp]:
    stmt = select(models.MarketplaceApp)
    if status in STATUSES:
        stmt = stmt.where(models.MarketplaceApp.status == status)
    rows = sorted(
        db.scalars(stmt).all(),
        key=lambda a: (a.status != "pending", -a.created_at.timestamp()),
    )
    return [_queue_out(a) for a in rows]


@router.post("/marketplace/{slug}/status", response_model=QueueApp)
def set_status(
    slug: str,
    payload: StatusChange,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> QueueApp:
    if payload.status not in STATUSES:
        raise HTTPException(422, f"status must be one of {sorted(STATUSES)}")
    app = db.scalar(select(models.MarketplaceApp).where(models.MarketplaceApp.slug == slug))
    if app is None:
        raise HTTPException(404, "uygulama bulunamadı")
    app.status = payload.status
    db.commit()
    db.refresh(app)
    _bust_home_cache()
    return _queue_out(app)
