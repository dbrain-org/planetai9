"""Reader authentication — password login + optional magic-link."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from planetai_shared.db import models
from planetai_shared.settings import get_settings
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from planetai_api.db import get_db
from planetai_api.ratelimit import limiter
from planetai_api.reader_auth import (
    SESSION_COOKIE,
    client_ip,
    consume_magic_link,
    create_magic_link,
    get_optional_user,
    login_user,
    magic_link_url,
    normalize_email,
    register_user,
    require_user,
    revoke_session,
    valid_email,
)

router = APIRouter()
_settings = get_settings()
log = logging.getLogger(__name__)


class MagicLinkIn(BaseModel):
    email: str = Field(min_length=5, max_length=200)
    display_name: str | None = Field(default=None, max_length=80)


class VerifyIn(BaseModel):
    token: str = Field(min_length=20, max_length=200)


class PasswordAuthIn(BaseModel):
    email: str = Field(min_length=5, max_length=200)
    password: str = Field(min_length=6, max_length=128)
    display_name: str | None = Field(default=None, max_length=80)


class LoginIn(BaseModel):
    email: str = Field(min_length=5, max_length=200)
    password: str = Field(min_length=6, max_length=128)


class UserOut(BaseModel):
    id: str
    email: str
    display_name: str


def _user_out(u: models.User) -> UserOut:
    return UserOut(id=str(u.id), email=u.email, display_name=u.display_name)


def _set_session_cookie(resp: Response, raw: str) -> None:
    resp.set_cookie(
        key=SESSION_COOKIE,
        value=raw,
        httponly=True,
        secure=_settings.is_prod,
        samesite="lax",
        max_age=_settings.session_ttl_days * 24 * 3600,
        path="/",
    )


def _session_response(user: models.User, raw: str, response: Response) -> UserOut:
    _set_session_cookie(response, raw)
    response.headers["X-Session-Token"] = raw
    return _user_out(user)


@router.post("/auth/register", response_model=UserOut)
@limiter.limit("10/hour")
def register(
    request: Request,
    payload: PasswordAuthIn,
    response: Response,
    db: Session = Depends(get_db),
) -> UserOut:
    user, _session, raw = register_user(
        db,
        email=payload.email,
        password=payload.password,
        display_name=payload.display_name,
        user_agent=request.headers.get("user-agent"),
        ip=client_ip(request),
    )
    db.commit()
    log.info("register email=%s", user.email)
    return _session_response(user, raw, response)


@router.post("/auth/login", response_model=UserOut)
@limiter.limit("20/hour")
def login(
    request: Request,
    payload: LoginIn,
    response: Response,
    db: Session = Depends(get_db),
) -> UserOut:
    user, _session, raw = login_user(
        db,
        email=payload.email,
        password=payload.password,
        user_agent=request.headers.get("user-agent"),
        ip=client_ip(request),
    )
    db.commit()
    return _session_response(user, raw, response)


@router.post("/auth/magic-link")
@limiter.limit("8/hour")
def request_magic_link(
    request: Request,
    payload: MagicLinkIn,
    db: Session = Depends(get_db),
) -> dict:
    email = normalize_email(payload.email)
    if not valid_email(email):
        raise HTTPException(422, "geçerli bir e-posta girin")
    name = (payload.display_name or "").strip() or None
    _, raw = create_magic_link(db, email=email, display_name=name)
    db.commit()
    link = magic_link_url(raw)
    log.info("magic_link email=%s", email)
    out: dict = {
        "ok": True,
        "message": "Giriş bağlantısı e-posta adresinize gönderildi."
        if _settings.is_prod
        else "Geliştirme ortamı — bağlantı yanıtta.",
    }
    if not _settings.is_prod:
        out["dev_link"] = link
        out["dev_token"] = raw
    return out


@router.post("/auth/verify", response_model=UserOut)
@limiter.limit("20/hour")
def verify_magic_link(
    request: Request,
    payload: VerifyIn,
    response: Response,
    db: Session = Depends(get_db),
) -> UserOut:
    user, _session, raw = consume_magic_link(
        db,
        raw_token=payload.token.strip(),
        user_agent=request.headers.get("user-agent"),
        ip=client_ip(request),
    )
    db.commit()
    return _session_response(user, raw, response)


@router.post("/auth/logout")
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> dict:
    raw = request.cookies.get(SESSION_COOKIE) or request.headers.get("X-Session-Token")
    revoke_session(db, raw)
    db.commit()
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"ok": True}


@router.get("/auth/me", response_model=UserOut | None)
def me(user: models.User | None = Depends(get_optional_user)) -> UserOut | None:
    return _user_out(user) if user else None


@router.get("/auth/me/required", response_model=UserOut)
def me_required(user: models.User = Depends(require_user)) -> UserOut:
    return _user_out(user)
