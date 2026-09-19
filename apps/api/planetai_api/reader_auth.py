"""Reader auth: password + optional magic-link, session cookies."""

from __future__ import annotations

import hashlib
import hmac
import logging
import re
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import Cookie, Depends, Header, HTTPException, Request
from planetai_shared.db import models
from planetai_shared.settings import get_settings
from sqlalchemy import select
from sqlalchemy.orm import Session

from planetai_api.db import get_db

log = logging.getLogger(__name__)
_settings = get_settings()

SESSION_COOKIE = "planetai_session"
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_PBKDF2_ITERS = 260_000
_MIN_PASSWORD = 6
_MAX_PASSWORD = 128


def normalize_email(email: str) -> str:
    return email.strip().lower()


def valid_email(email: str) -> bool:
    return bool(_EMAIL_RE.match(email)) and len(email) <= 200


def validate_password(password: str) -> str:
    pw = password or ""
    if len(pw) < _MIN_PASSWORD:
        raise HTTPException(422, f"şifre en az {_MIN_PASSWORD} karakter olmalı")
    if len(pw) > _MAX_PASSWORD:
        raise HTTPException(422, "şifre çok uzun")
    return pw


def hash_token(raw: str) -> str:
    pepper = _settings.effective_session_secret
    return hashlib.sha256(f"{pepper}:{raw}".encode()).hexdigest()


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        _PBKDF2_ITERS,
    ).hex()
    return f"pbkdf2_sha256${_PBKDF2_ITERS}${salt}${digest}"


def verify_password(password: str, stored: str | None) -> bool:
    if not stored or not stored.startswith("pbkdf2_sha256$"):
        return False
    try:
        _, iters_s, salt, expected = stored.split("$", 3)
        iters = int(iters_s)
    except ValueError:
        return False
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iters,
    ).hex()
    return hmac.compare_digest(digest, expected)


def new_token() -> str:
    return secrets.token_urlsafe(32)


def create_session(
    db: Session,
    user: models.User,
    *,
    user_agent: str | None,
    ip: str | None,
) -> tuple[models.UserSession, str]:
    session_raw = new_token()
    session = models.UserSession(
        user_id=user.id,
        token_hash=hash_token(session_raw),
        expires_at=datetime.now(UTC) + timedelta(days=_settings.session_ttl_days),
        user_agent=(user_agent or "")[:300] or None,
        ip=(ip or "")[:64] or None,
    )
    db.add(session)
    db.flush()
    return session, session_raw


def register_user(
    db: Session,
    *,
    email: str,
    password: str,
    display_name: str | None,
    user_agent: str | None,
    ip: str | None,
) -> tuple[models.User, models.UserSession, str]:
    email = normalize_email(email)
    if not valid_email(email):
        raise HTTPException(422, "geçerli bir e-posta girin")
    password = validate_password(password)
    name = (display_name or "").strip() or email.split("@", 1)[0]
    name = name[:80]

    existing = db.scalar(select(models.User).where(models.User.email == email))
    if existing is not None:
        # Allow setting a password on legacy magic-link accounts that have none.
        if existing.password_hash:
            raise HTTPException(409, "bu e-posta zaten kayıtlı")
        if existing.status != "active":
            raise HTTPException(403, "hesap askıda")
        existing.password_hash = hash_password(password)
        if display_name and display_name.strip():
            existing.display_name = display_name.strip()[:80]
        user = existing
    else:
        user = models.User(
            email=email,
            display_name=name,
            password_hash=hash_password(password),
            status="active",
        )
        db.add(user)
        db.flush()

    session, raw = create_session(db, user, user_agent=user_agent, ip=ip)
    return user, session, raw


def login_user(
    db: Session,
    *,
    email: str,
    password: str,
    user_agent: str | None,
    ip: str | None,
) -> tuple[models.User, models.UserSession, str]:
    email = normalize_email(email)
    if not valid_email(email):
        raise HTTPException(422, "geçerli bir e-posta girin")
    password = validate_password(password)

    user = db.scalar(select(models.User).where(models.User.email == email))
    if user is None or not verify_password(password, user.password_hash):
        raise HTTPException(401, "e-posta veya şifre hatalı")
    if user.status != "active":
        raise HTTPException(403, "hesap askıda")

    session, raw = create_session(db, user, user_agent=user_agent, ip=ip)
    return user, session, raw


def create_magic_link(
    db: Session,
    *,
    email: str,
    display_name: str | None,
) -> tuple[models.AuthMagicLink, str]:
    email = normalize_email(email)
    raw = new_token()
    row = models.AuthMagicLink(
        email=email,
        display_name=(display_name or "").strip()[:80] or None,
        token_hash=hash_token(raw),
        expires_at=datetime.now(UTC) + timedelta(minutes=_settings.magic_link_ttl_min),
    )
    db.add(row)
    db.flush()
    return row, raw


def consume_magic_link(
    db: Session,
    *,
    raw_token: str,
    user_agent: str | None,
    ip: str | None,
) -> tuple[models.User, models.UserSession, str]:
    digest = hash_token(raw_token)
    link = db.scalar(select(models.AuthMagicLink).where(models.AuthMagicLink.token_hash == digest))
    if link is None or link.consumed_at is not None:
        raise HTTPException(400, "geçersiz veya kullanılmış giriş bağlantısı")
    if link.expires_at < datetime.now(UTC):
        raise HTTPException(400, "giriş bağlantısının süresi dolmuş")

    user = db.scalar(select(models.User).where(models.User.email == link.email))
    if user is None:
        name = (link.display_name or link.email.split("@", 1)[0])[:80]
        user = models.User(email=link.email, display_name=name, status="active")
        db.add(user)
        db.flush()
    elif user.status != "active":
        raise HTTPException(403, "hesap askıda")
    elif link.display_name and link.display_name.strip():
        user.display_name = link.display_name.strip()[:80]

    link.consumed_at = datetime.now(UTC)
    session, session_raw = create_session(db, user, user_agent=user_agent, ip=ip)
    return user, session, session_raw


def resolve_user(
    db: Session,
    *,
    session_token: str | None,
) -> models.User | None:
    if not session_token:
        return None
    digest = hash_token(session_token)
    row = db.scalar(select(models.UserSession).where(models.UserSession.token_hash == digest))
    if row is None or row.expires_at < datetime.now(UTC):
        return None
    user = db.get(models.User, row.user_id)
    if user is None or user.status != "active":
        return None
    row.last_seen_at = datetime.now(UTC)
    return user


def revoke_session(db: Session, session_token: str | None) -> None:
    if not session_token:
        return
    digest = hash_token(session_token)
    row = db.scalar(select(models.UserSession).where(models.UserSession.token_hash == digest))
    if row is not None:
        db.delete(row)


def get_optional_user(
    request: Request,
    db: Session = Depends(get_db),
    planetai_session: str | None = Cookie(default=None, alias=SESSION_COOKIE),
    x_session_token: str | None = Header(default=None, alias="X-Session-Token"),
) -> models.User | None:
    token = x_session_token or planetai_session
    return resolve_user(db, session_token=token)


def require_user(user: models.User | None = Depends(get_optional_user)) -> models.User:
    if user is None:
        raise HTTPException(401, "giriş yapmanız gerekiyor")
    return user


def client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",", 1)[0].strip()[:64]
    if request.client:
        return (request.client.host or "")[:64] or None
    return None


def magic_link_url(raw_token: str) -> str:
    base = _settings.site_url.rstrip("/")
    return f"{base}/giris?token={raw_token}"
