"""Per-article engagement: views, likes, comments, share metadata."""

from __future__ import annotations

import hashlib
import re
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from planetai_shared.db import models
from planetai_shared.settings import get_settings
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from planetai_api import cache
from planetai_api.db import get_db
from planetai_api.ratelimit import limiter
from planetai_api.reader_auth import client_ip, get_optional_user, require_user

router = APIRouter()
_settings = get_settings()


class EngagementOut(BaseModel):
    slug: str
    view_count: int
    like_count: int
    comment_count: int
    liked_by_me: bool = False
    share_url: str


class CommentIn(BaseModel):
    body: str = Field(min_length=2, max_length=2000)
    parent_id: str | None = Field(default=None, max_length=40)


class CommentOut(BaseModel):
    id: str
    body: str
    created_at: datetime
    author_name: str
    is_mine: bool = False
    parent_id: str | None = None
    reply_to_name: str | None = None
    like_count: int = 0
    liked_by_me: bool = False


class LikeOut(BaseModel):
    liked: bool
    like_count: int


def _event_or_404(db: Session, slug: str) -> models.Event:
    ev = db.scalar(
        select(models.Event).where(models.Event.slug == slug, models.Event.status == "active")
    )
    if ev is None:
        raise HTTPException(404, "haber bulunamadı")
    return ev


def _share_url(slug: str) -> str:
    return f"{_settings.site_url.rstrip('/')}/news/{slug}"


@router.get("/events/{slug}/engagement", response_model=EngagementOut)
def get_engagement(
    slug: str,
    db: Session = Depends(get_db),
    user: models.User | None = Depends(get_optional_user),
) -> EngagementOut:
    ev = _event_or_404(db, slug)
    liked = False
    if user is not None:
        liked = db.get(models.EventLike, (user.id, ev.id)) is not None
    return EngagementOut(
        slug=ev.slug,
        view_count=int(ev.view_count or 0),
        like_count=int(ev.like_count or 0),
        comment_count=int(ev.comment_count or 0),
        liked_by_me=liked,
        share_url=_share_url(ev.slug),
    )


@router.post("/events/{slug}/view", response_model=EngagementOut)
@limiter.limit("60/minute")
def record_view(
    request: Request,
    slug: str,
    db: Session = Depends(get_db),
    user: models.User | None = Depends(get_optional_user),
) -> EngagementOut:
    ev = _event_or_404(db, slug)
    ip = client_ip(request) or "unknown"
    # Dedupe same visitor for 30 minutes (redis). Fail open if redis is down.
    key = f"view:{ev.id}:{hashlib.sha1(ip.encode()).hexdigest()[:16]}"
    try:
        if cache.get(key) is None:
            cache.set(key, "1", 30 * 60)
            ev.view_count = int(ev.view_count or 0) + 1
            db.commit()
            db.refresh(ev)
    except Exception:  # noqa: BLE001
        ev.view_count = int(ev.view_count or 0) + 1
        db.commit()
        db.refresh(ev)

    liked = False
    if user is not None:
        liked = db.get(models.EventLike, (user.id, ev.id)) is not None
    return EngagementOut(
        slug=ev.slug,
        view_count=int(ev.view_count or 0),
        like_count=int(ev.like_count or 0),
        comment_count=int(ev.comment_count or 0),
        liked_by_me=liked,
        share_url=_share_url(ev.slug),
    )


@router.post("/events/{slug}/like", response_model=LikeOut)
@limiter.limit("60/minute")
def toggle_like(
    request: Request,
    slug: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_user),
) -> LikeOut:
    ev = _event_or_404(db, slug)
    existing = db.get(models.EventLike, (user.id, ev.id))
    if existing is not None:
        db.delete(existing)
        ev.like_count = max(0, int(ev.like_count or 0) - 1)
        liked = False
    else:
        db.add(models.EventLike(user_id=user.id, event_id=ev.id))
        ev.like_count = int(ev.like_count or 0) + 1
        liked = True
    db.commit()
    db.refresh(ev)
    return LikeOut(liked=liked, like_count=int(ev.like_count or 0))


@router.get("/events/{slug}/comments", response_model=list[CommentOut])
def list_comments(
    slug: str,
    db: Session = Depends(get_db),
    user: models.User | None = Depends(get_optional_user),
    limit: int = Query(100, ge=1, le=200),
) -> list[CommentOut]:
    ev = _event_or_404(db, slug)
    rows = db.execute(
        select(models.EventComment, models.User)
        .join(models.User, models.User.id == models.EventComment.user_id)
        .where(
            models.EventComment.event_id == ev.id,
            models.EventComment.status == "active",
        )
        .order_by(models.EventComment.created_at.asc())
        .limit(limit)
    ).all()

    liked_ids: set = set()
    if user is not None and rows:
        ids = [c.id for c, _ in rows]
        liked_ids = set(
            db.scalars(
                select(models.CommentLike.comment_id).where(
                    models.CommentLike.user_id == user.id,
                    models.CommentLike.comment_id.in_(ids),
                )
            ).all()
        )

    by_id = {c.id: (c, u) for c, u in rows}
    known_names = {uu.display_name for _, uu in by_id.values()}
    out: list[CommentOut] = []
    for c, u in rows:
        reply_to: str | None = None
        if c.parent_id and c.parent_id in by_id:
            parent_name = by_id[c.parent_id][1].display_name
            body_l = c.body.lstrip()
            parent_mention = f"@{parent_name}"
            if body_l.lower().startswith(parent_mention.lower()):
                reply_to = parent_name
            elif body_l.startswith("@"):
                after = body_l[1:]
                matched = next(
                    (
                        n
                        for n in sorted(known_names, key=len, reverse=True)
                        if after.lower() == n.lower() or after.lower().startswith(n.lower() + " ")
                    ),
                    None,
                )
                reply_to = matched or after.split(None, 1)[0]
            else:
                reply_to = parent_name
        out.append(
            CommentOut(
                id=str(c.id),
                body=c.body,
                created_at=c.created_at,
                author_name=u.display_name,
                is_mine=bool(user and u.id == user.id),
                parent_id=str(c.parent_id) if c.parent_id else None,
                reply_to_name=reply_to,
                like_count=int(c.like_count or 0),
                liked_by_me=c.id in liked_ids,
            )
        )
    return out


@router.post("/events/{slug}/comments", response_model=CommentOut, status_code=201)
@limiter.limit("20/hour")
def post_comment(
    request: Request,
    slug: str,
    payload: CommentIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_user),
) -> CommentOut:
    ev = _event_or_404(db, slug)
    body = " ".join(payload.body.split()).strip()
    if len(body) < 2:
        raise HTTPException(422, "yorum çok kısa")

    parent_id = None
    reply_to_name: str | None = None
    if payload.parent_id:
        import uuid as _uuid

        try:
            pid = _uuid.UUID(payload.parent_id)
        except ValueError as exc:
            raise HTTPException(422, "geçersiz yanıt") from exc
        parent = db.get(models.EventComment, pid)
        if parent is None or parent.event_id != ev.id or parent.status != "active":
            raise HTTPException(404, "yanıtlanacak yorum bulunamadı")
        # Flatten to one level: reply-to-reply attaches to the root comment.
        parent_id = parent.parent_id or parent.id
        reply_user = db.get(models.User, parent.user_id)
        reply_to_name = reply_user.display_name if reply_user else None
        if reply_to_name:
            mention = f"@{reply_to_name}"
            if not body.lower().startswith(mention.lower()):
                body = f"{mention} {body}"

    c = models.EventComment(
        event_id=ev.id,
        user_id=user.id,
        parent_id=parent_id,
        body=body,
        status="active",
        like_count=0,
    )
    db.add(c)
    ev.comment_count = int(ev.comment_count or 0) + 1
    db.commit()
    db.refresh(c)
    return CommentOut(
        id=str(c.id),
        body=c.body,
        created_at=c.created_at or datetime.now(UTC),
        author_name=user.display_name,
        is_mine=True,
        parent_id=str(c.parent_id) if c.parent_id else None,
        reply_to_name=reply_to_name,
        like_count=0,
        liked_by_me=False,
    )


@router.post("/events/{slug}/comments/{comment_id}/like", response_model=LikeOut)
@limiter.limit("60/minute")
def toggle_comment_like(
    request: Request,
    slug: str,
    comment_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_user),
) -> LikeOut:
    ev = _event_or_404(db, slug)
    import uuid as _uuid

    try:
        cid = _uuid.UUID(comment_id)
    except ValueError as exc:
        raise HTTPException(404, "yorum bulunamadı") from exc
    c = db.get(models.EventComment, cid)
    if c is None or c.event_id != ev.id or c.status != "active":
        raise HTTPException(404, "yorum bulunamadı")

    existing = db.get(models.CommentLike, (user.id, c.id))
    if existing is not None:
        db.delete(existing)
        c.like_count = max(0, int(c.like_count or 0) - 1)
        liked = False
    else:
        db.add(models.CommentLike(user_id=user.id, comment_id=c.id))
        c.like_count = int(c.like_count or 0) + 1
        liked = True
    db.commit()
    db.refresh(c)
    return LikeOut(liked=liked, like_count=int(c.like_count or 0))


@router.delete("/events/{slug}/comments/{comment_id}")
def delete_comment(
    slug: str,
    comment_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_user),
) -> dict:
    ev = _event_or_404(db, slug)
    try:
        import uuid

        cid = uuid.UUID(comment_id)
    except ValueError as exc:
        raise HTTPException(404, "yorum bulunamadı") from exc
    c = db.get(models.EventComment, cid)
    if c is None or c.event_id != ev.id or c.status != "active":
        raise HTTPException(404, "yorum bulunamadı")
    if c.user_id != user.id:
        raise HTTPException(403, "bu yorumu silemezsiniz")
    # Soft-delete replies under this comment too (count each).
    kids = db.scalars(
        select(models.EventComment).where(
            models.EventComment.parent_id == c.id,
            models.EventComment.status == "active",
        )
    ).all()
    removed = 1
    c.status = "deleted"
    for kid in kids:
        kid.status = "deleted"
        removed += 1
    ev.comment_count = max(0, int(ev.comment_count or 0) - removed)
    db.commit()
    return {"ok": True}


def _developer_or_404(db: Session, slug: str) -> models.LlmDeveloper:
    """Resolve a producer row for comments — curated seed or auto stub from Radar."""
    from planetai_api.radar_client import aggregate_orgs, fetch_turkish_models

    needle = (slug or "").strip()
    if not needle:
        raise HTTPException(404, "üretici bulunamadı")

    dev = db.scalar(
        select(models.LlmDeveloper).where(
            models.LlmDeveloper.slug == needle,
            models.LlmDeveloper.published.is_(True),
        )
    )
    if dev is not None:
        return dev

    models_list = fetch_turkish_models(limit=1000)
    orgs = {o.slug.casefold(): o for o in aggregate_orgs(models_list)}
    org = orgs.get(needle.casefold())
    if org is None:
        raise HTTPException(404, "üretici bulunamadı")

    # Auto-publish a lightweight profile so comments work for Radar-only producers.
    ent = models.LlmDeveloper(
        slug=org.slug,
        display_name=org.name,
        kind="org",
        website_url=org.website_url,
        hf_url=org.hf_url,
        radar_slug=org.slug,
        published=True,
        sort_order=9000,
    )
    db.add(ent)
    try:
        db.commit()
    except Exception:  # noqa: BLE001 — concurrent create race
        db.rollback()
        again = db.scalar(
            select(models.LlmDeveloper).where(
                models.LlmDeveloper.slug == org.slug,
                models.LlmDeveloper.published.is_(True),
            )
        )
        if again is None:
            raise HTTPException(404, "üretici bulunamadı") from None
        return again
    db.refresh(ent)
    return ent


def _pack_developer_comments(
    db: Session,
    rows: list,
    user: models.User | None,
) -> list[CommentOut]:
    liked_ids: set = set()
    if user is not None and rows:
        ids = [c.id for c, _ in rows]
        liked_ids = set(
            db.scalars(
                select(models.DeveloperCommentLike.comment_id).where(
                    models.DeveloperCommentLike.user_id == user.id,
                    models.DeveloperCommentLike.comment_id.in_(ids),
                )
            ).all()
        )

    by_id = {c.id: (c, u) for c, u in rows}
    known_names = {uu.display_name for _, uu in by_id.values()}
    out: list[CommentOut] = []
    for c, u in rows:
        reply_to: str | None = None
        if c.parent_id and c.parent_id in by_id:
            parent_name = by_id[c.parent_id][1].display_name
            body_l = c.body.lstrip()
            parent_mention = f"@{parent_name}"
            if body_l.lower().startswith(parent_mention.lower()):
                reply_to = parent_name
            elif body_l.startswith("@"):
                after = body_l[1:]
                matched = next(
                    (
                        n
                        for n in sorted(known_names, key=len, reverse=True)
                        if after.lower() == n.lower() or after.lower().startswith(n.lower() + " ")
                    ),
                    None,
                )
                reply_to = matched or after.split(None, 1)[0]
            else:
                reply_to = parent_name
        out.append(
            CommentOut(
                id=str(c.id),
                body=c.body,
                created_at=c.created_at,
                author_name=u.display_name,
                is_mine=bool(user and u.id == user.id),
                parent_id=str(c.parent_id) if c.parent_id else None,
                reply_to_name=reply_to,
                like_count=int(c.like_count or 0),
                liked_by_me=c.id in liked_ids,
            )
        )
    return out


@router.get("/developers/{slug}/comments", response_model=list[CommentOut])
def list_developer_comments(
    slug: str,
    db: Session = Depends(get_db),
    user: models.User | None = Depends(get_optional_user),
    limit: int = Query(100, ge=1, le=200),
) -> list[CommentOut]:
    dev = _developer_or_404(db, slug)
    rows = db.execute(
        select(models.DeveloperComment, models.User)
        .join(models.User, models.User.id == models.DeveloperComment.user_id)
        .where(
            models.DeveloperComment.developer_id == dev.id,
            models.DeveloperComment.status == "active",
        )
        .order_by(models.DeveloperComment.created_at.asc())
        .limit(limit)
    ).all()
    return _pack_developer_comments(db, rows, user)


@router.post("/developers/{slug}/comments", response_model=CommentOut, status_code=201)
@limiter.limit("20/hour")
def post_developer_comment(
    request: Request,
    slug: str,
    payload: CommentIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_user),
) -> CommentOut:
    import uuid as _uuid

    dev = _developer_or_404(db, slug)
    body = " ".join(payload.body.split()).strip()
    if len(body) < 2:
        raise HTTPException(422, "yorum çok kısa")

    parent_id = None
    reply_to_name: str | None = None
    if payload.parent_id:
        try:
            pid = _uuid.UUID(payload.parent_id)
        except ValueError as exc:
            raise HTTPException(422, "geçersiz yanıt") from exc
        parent = db.get(models.DeveloperComment, pid)
        if parent is None or parent.developer_id != dev.id or parent.status != "active":
            raise HTTPException(404, "yanıtlanacak yorum bulunamadı")
        parent_id = parent.parent_id or parent.id
        reply_user = db.get(models.User, parent.user_id)
        reply_to_name = reply_user.display_name if reply_user else None
        if reply_to_name:
            mention = f"@{reply_to_name}"
            if not body.lower().startswith(mention.lower()):
                body = f"{mention} {body}"

    c = models.DeveloperComment(
        id=_uuid.uuid4(),
        developer_id=dev.id,
        user_id=user.id,
        parent_id=parent_id,
        body=body,
        status="active",
        like_count=0,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return CommentOut(
        id=str(c.id),
        body=c.body,
        created_at=c.created_at or datetime.now(UTC),
        author_name=user.display_name,
        is_mine=True,
        parent_id=str(c.parent_id) if c.parent_id else None,
        reply_to_name=reply_to_name,
        like_count=0,
        liked_by_me=False,
    )


@router.post("/developers/{slug}/comments/{comment_id}/like", response_model=LikeOut)
@limiter.limit("60/minute")
def toggle_developer_comment_like(
    request: Request,
    slug: str,
    comment_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_user),
) -> LikeOut:
    import uuid as _uuid

    dev = _developer_or_404(db, slug)
    try:
        cid = _uuid.UUID(comment_id)
    except ValueError as exc:
        raise HTTPException(404, "yorum bulunamadı") from exc
    c = db.get(models.DeveloperComment, cid)
    if c is None or c.developer_id != dev.id or c.status != "active":
        raise HTTPException(404, "yorum bulunamadı")

    existing = db.get(models.DeveloperCommentLike, (user.id, c.id))
    if existing is not None:
        db.delete(existing)
        c.like_count = max(0, int(c.like_count or 0) - 1)
        liked = False
    else:
        db.add(models.DeveloperCommentLike(user_id=user.id, comment_id=c.id))
        c.like_count = int(c.like_count or 0) + 1
        liked = True
    db.commit()
    db.refresh(c)
    return LikeOut(liked=liked, like_count=int(c.like_count or 0))


@router.delete("/developers/{slug}/comments/{comment_id}")
def delete_developer_comment(
    slug: str,
    comment_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_user),
) -> dict:
    import uuid as _uuid

    dev = _developer_or_404(db, slug)
    try:
        cid = _uuid.UUID(comment_id)
    except ValueError as exc:
        raise HTTPException(404, "yorum bulunamadı") from exc
    c = db.get(models.DeveloperComment, cid)
    if c is None or c.developer_id != dev.id or c.status != "active":
        raise HTTPException(404, "yorum bulunamadı")
    if c.user_id != user.id:
        raise HTTPException(403, "bu yorumu silemezsiniz")
    kids = db.scalars(
        select(models.DeveloperComment).where(
            models.DeveloperComment.parent_id == c.id,
            models.DeveloperComment.status == "active",
        )
    ).all()
    c.status = "deleted"
    for kid in kids:
        kid.status = "deleted"
    db.commit()
    return {"ok": True}


_PAGE_KEY_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$|^[a-z0-9]$")


def _page_key_or_404(page_key: str) -> str:
    key = (page_key or "").strip().lower()
    if not _PAGE_KEY_RE.match(key):
        raise HTTPException(404, "sayfa bulunamadı")
    return key


def _pack_page_comments(
    db: Session,
    rows: list,
    user: models.User | None,
) -> list[CommentOut]:
    liked_ids: set = set()
    if user is not None and rows:
        ids = [c.id for c, _ in rows]
        liked_ids = set(
            db.scalars(
                select(models.PageCommentLike.comment_id).where(
                    models.PageCommentLike.user_id == user.id,
                    models.PageCommentLike.comment_id.in_(ids),
                )
            ).all()
        )

    by_id = {c.id: (c, u) for c, u in rows}
    known_names = {uu.display_name for _, uu in by_id.values()}
    out: list[CommentOut] = []
    for c, u in rows:
        reply_to: str | None = None
        if c.parent_id and c.parent_id in by_id:
            parent_name = by_id[c.parent_id][1].display_name
            body_l = c.body.lstrip()
            parent_mention = f"@{parent_name}"
            if body_l.lower().startswith(parent_mention.lower()):
                reply_to = parent_name
            elif body_l.startswith("@"):
                after = body_l[1:]
                matched = next(
                    (
                        n
                        for n in sorted(known_names, key=len, reverse=True)
                        if after.lower() == n.lower() or after.lower().startswith(n.lower() + " ")
                    ),
                    None,
                )
                reply_to = matched or after.split(None, 1)[0]
            else:
                reply_to = parent_name
        out.append(
            CommentOut(
                id=str(c.id),
                body=c.body,
                created_at=c.created_at,
                author_name=u.display_name,
                is_mine=bool(user and u.id == user.id),
                parent_id=str(c.parent_id) if c.parent_id else None,
                reply_to_name=reply_to,
                like_count=int(c.like_count or 0),
                liked_by_me=c.id in liked_ids,
            )
        )
    return out


@router.get("/pages/{page_key}/comments", response_model=list[CommentOut])
def list_page_comments(
    page_key: str,
    db: Session = Depends(get_db),
    user: models.User | None = Depends(get_optional_user),
    limit: int = Query(100, ge=1, le=200),
) -> list[CommentOut]:
    key = _page_key_or_404(page_key)
    rows = db.execute(
        select(models.PageComment, models.User)
        .join(models.User, models.User.id == models.PageComment.user_id)
        .where(
            models.PageComment.page_key == key,
            models.PageComment.status == "active",
        )
        .order_by(models.PageComment.created_at.asc())
        .limit(limit)
    ).all()
    return _pack_page_comments(db, rows, user)


@router.post("/pages/{page_key}/comments", response_model=CommentOut, status_code=201)
@limiter.limit("20/hour")
def post_page_comment(
    request: Request,
    page_key: str,
    payload: CommentIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_user),
) -> CommentOut:
    import uuid as _uuid

    key = _page_key_or_404(page_key)
    body = " ".join(payload.body.split()).strip()
    if len(body) < 2:
        raise HTTPException(422, "yorum çok kısa")

    parent_id = None
    reply_to_name: str | None = None
    if payload.parent_id:
        try:
            pid = _uuid.UUID(payload.parent_id)
        except ValueError as exc:
            raise HTTPException(422, "geçersiz yanıt") from exc
        parent = db.get(models.PageComment, pid)
        if parent is None or parent.page_key != key or parent.status != "active":
            raise HTTPException(404, "yanıtlanacak yorum bulunamadı")
        parent_id = parent.parent_id or parent.id
        reply_user = db.get(models.User, parent.user_id)
        reply_to_name = reply_user.display_name if reply_user else None
        if reply_to_name:
            mention = f"@{reply_to_name}"
            if not body.lower().startswith(mention.lower()):
                body = f"{mention} {body}"

    c = models.PageComment(
        id=_uuid.uuid4(),
        page_key=key,
        user_id=user.id,
        parent_id=parent_id,
        body=body,
        status="active",
        like_count=0,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return CommentOut(
        id=str(c.id),
        body=c.body,
        created_at=c.created_at or datetime.now(UTC),
        author_name=user.display_name,
        is_mine=True,
        parent_id=str(c.parent_id) if c.parent_id else None,
        reply_to_name=reply_to_name,
        like_count=0,
        liked_by_me=False,
    )


@router.post("/pages/{page_key}/comments/{comment_id}/like", response_model=LikeOut)
@limiter.limit("60/minute")
def toggle_page_comment_like(
    request: Request,
    page_key: str,
    comment_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_user),
) -> LikeOut:
    import uuid as _uuid

    key = _page_key_or_404(page_key)
    try:
        cid = _uuid.UUID(comment_id)
    except ValueError as exc:
        raise HTTPException(404, "yorum bulunamadı") from exc
    c = db.get(models.PageComment, cid)
    if c is None or c.page_key != key or c.status != "active":
        raise HTTPException(404, "yorum bulunamadı")

    existing = db.get(models.PageCommentLike, (user.id, c.id))
    if existing is not None:
        db.delete(existing)
        c.like_count = max(0, int(c.like_count or 0) - 1)
        liked = False
    else:
        db.add(models.PageCommentLike(user_id=user.id, comment_id=c.id))
        c.like_count = int(c.like_count or 0) + 1
        liked = True
    db.commit()
    db.refresh(c)
    return LikeOut(liked=liked, like_count=int(c.like_count or 0))


@router.delete("/pages/{page_key}/comments/{comment_id}")
def delete_page_comment(
    page_key: str,
    comment_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_user),
) -> dict:
    import uuid as _uuid

    key = _page_key_or_404(page_key)
    try:
        cid = _uuid.UUID(comment_id)
    except ValueError as exc:
        raise HTTPException(404, "yorum bulunamadı") from exc
    c = db.get(models.PageComment, cid)
    if c is None or c.page_key != key or c.status != "active":
        raise HTTPException(404, "yorum bulunamadı")
    if c.user_id != user.id:
        raise HTTPException(403, "bu yorumu silemezsiniz")
    kids = db.scalars(
        select(models.PageComment).where(
            models.PageComment.parent_id == c.id,
            models.PageComment.status == "active",
        )
    ).all()
    c.status = "deleted"
    for kid in kids:
        kid.status = "deleted"
    db.commit()
    return {"ok": True}
