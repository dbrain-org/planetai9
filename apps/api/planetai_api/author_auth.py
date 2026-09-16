"""Resolve /yazar studio keys and /yonetim admin token against DB (env fallback)."""

from __future__ import annotations

from planetai_shared.author_auth import hash_api_key, verify_api_key
from planetai_shared.db import models
from planetai_shared.settings import get_settings
from sqlalchemy import select
from sqlalchemy.orm import Session

_settings = get_settings()

ADMIN_KIND = "admin"


def studio_auth_configured(db: Session) -> bool:
    """True when at least one login path exists (DB hash or legacy env map)."""
    if _settings.author_keys:
        return True
    return (
        db.scalar(
            select(models.Author.id)
            .where(
                models.Author.api_key_hash.is_not(None),
                models.Author.status == "active",
            )
            .limit(1)
        )
        is not None
    )


def resolve_author_from_key(db: Session, x_author_key: str | None) -> models.Author | None:
    if not x_author_key or ":" not in x_author_key:
        return None
    slug, secret = x_author_key.split(":", 1)
    if not slug.strip() or not secret:
        return None
    author = db.scalar(select(models.Author).where(models.Author.slug == slug.strip()))
    if author is None or author.status != "active":
        return None
    if verify_api_key(secret, author.api_key_hash):
        return author
    if _settings.author_keys.get(slug.strip()) == secret:
        return author
    return None


def author_is_moderator(author: models.Author) -> bool:
    return bool(author.is_moderator) or author.slug in _settings.moderator_authors


def admin_token_ok(db: Session, token: str | None) -> bool:
    if not token:
        return False
    row = db.scalar(select(models.SiteCredential).where(models.SiteCredential.kind == ADMIN_KIND))
    if row is not None and verify_api_key(token, row.secret_hash):
        return True
    return bool(_settings.admin_token and token == _settings.admin_token)


def ensure_admin_credential(db: Session, plaintext: str | None) -> None:
    """Upsert admin secret hash from plaintext (seed / bootstrap)."""
    if not plaintext or not plaintext.strip():
        return
    digest = hash_api_key(plaintext.strip())
    row = db.scalar(select(models.SiteCredential).where(models.SiteCredential.kind == ADMIN_KIND))
    if row is None:
        db.add(models.SiteCredential(kind=ADMIN_KIND, secret_hash=digest))
    else:
        row.secret_hash = digest


def moderation_channel_configured(db: Session) -> bool:
    if _settings.admin_token or _settings.moderator_authors:
        return True
    if db.scalar(
        select(models.SiteCredential.id).where(models.SiteCredential.kind == ADMIN_KIND).limit(1)
    ):
        return True
    return (
        db.scalar(select(models.Author.id).where(models.Author.is_moderator.is_(True)).limit(1))
        is not None
    )
