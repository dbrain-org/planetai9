"""Resolve /yazar studio keys against DB (preferred) or legacy AUTHOR_KEYS env."""

from __future__ import annotations

from planetai_shared.author_auth import verify_api_key
from planetai_shared.db import models
from planetai_shared.settings import get_settings
from sqlalchemy import select
from sqlalchemy.orm import Session

_settings = get_settings()


def studio_auth_configured(db: Session) -> bool:
    """True when at least one login path exists (DB hash or legacy env map)."""
    if _settings.author_keys:
        return True
    return (
        db.scalar(
            select(models.Author.id).where(models.Author.api_key_hash.is_not(None)).limit(1)
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
    if author is None:
        return None
    if verify_api_key(secret, author.api_key_hash):
        return author
    # legacy env fallback (local/dev / until seed has written hashes)
    if _settings.author_keys.get(slug.strip()) == secret:
        return author
    return None


def author_is_moderator(author: models.Author) -> bool:
    return bool(author.is_moderator) or author.slug in _settings.moderator_authors


def moderation_channel_configured(db: Session) -> bool:
    if _settings.admin_token or _settings.moderator_authors:
        return True
    return (
        db.scalar(
            select(models.Author.id).where(models.Author.is_moderator.is_(True)).limit(1)
        )
        is not None
    )
