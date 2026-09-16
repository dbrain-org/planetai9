from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from planetai_shared.db import models
from planetai_shared.settings import get_settings
from pydantic import BaseModel, Field, HttpUrl, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from planetai_api.db import get_db
from planetai_api.ratelimit import limiter
from planetai_api.routers.marketplace import _bust_home_cache, require_admin
from planetai_api.services.manual_event import (
    PUBLIC_BUCKETS,
    clip_summary,
    create_event_from_submission,
    retarget_submission_source,
    submission_looks_staff,
)

router = APIRouter()
_settings = get_settings()

STATUSES = {"pending", "approved", "rejected"}
MAX_IMAGES = 12
DEFAULT_CATEGORY = "AI"


class SubmissionOut(BaseModel):
    id: uuid.UUID
    title: str
    url: str | None
    description: str | None
    summary: str | None
    image_url: str | None
    image_urls: list[str]
    category: str
    status: str
    submitter_name: str | None
    submitter_email: str | None
    submitter_phone: str | None
    submitter_profession: str | None
    submitter_company: str | None
    is_staff: bool
    event_slug: str | None
    created_at: datetime


class StatusChange(BaseModel):
    status: str


class SubmissionIn(BaseModel):
    """Public tip — konu + içerik + gönderen; kategori yok (varsayılan AI)."""

    title: str = Field(min_length=4, max_length=300)  # haber konusu
    description: str = Field(min_length=40, max_length=8000)  # haber içeriği
    category: str = DEFAULT_CATEGORY
    submitter_name: str = Field(min_length=2, max_length=120)
    submitter_email: str | None = Field(default=None, max_length=200)
    submitter_phone: str | None = Field(default=None, max_length=40)
    submitter_profession: str | None = Field(default=None, max_length=120)
    submitter_company: str | None = Field(default=None, max_length=160)
    image_urls: list[str] = Field(default_factory=list, max_length=MAX_IMAGES)
    url: HttpUrl | None = None
    summary: str | None = Field(default=None, max_length=600)
    image_url: HttpUrl | None = None

    @field_validator("image_urls")
    @classmethod
    def _cap_images(cls, v: list[str]) -> list[str]:
        out: list[str] = []
        for u in v:
            s = (u or "").strip()
            if s and s not in out:
                out.append(s)
            if len(out) >= MAX_IMAGES:
                break
        return out


class SubmissionEdit(BaseModel):
    title: str | None = Field(default=None, min_length=4, max_length=300)
    description: str | None = Field(default=None, min_length=40, max_length=20000)
    category: str | None = None
    image_urls: list[str] | None = None
    submitter_name: str | None = Field(default=None, max_length=120)
    submitter_email: str | None = Field(default=None, max_length=200)
    submitter_phone: str | None = Field(default=None, max_length=40)
    submitter_profession: str | None = Field(default=None, max_length=120)
    submitter_company: str | None = Field(default=None, max_length=160)
    is_staff: bool | None = None


def _gallery_from_submission(s: models.NewsSubmission) -> list[str]:
    urls: list[str] = []
    for u in s.image_urls or []:
        if isinstance(u, str) and u.strip() and u.strip() not in urls:
            urls.append(u.strip())
    if s.image_url and s.image_url not in urls:
        urls.insert(0, s.image_url)
    return urls[:MAX_IMAGES]


def _out(s: models.NewsSubmission) -> SubmissionOut:
    """Admin queue: if already published as an Event, expose the live article
    (full body + photos) so editors aren't stuck with the short tip text."""
    from planetai_api.serializers import split_body_and_gallery

    title = s.title
    description = s.description
    urls = _gallery_from_submission(s)

    ev = s.event
    if ev is not None:
        title = ev.title or title
        if ev.body_text and len(ev.body_text.strip()) >= len((description or "").strip()):
            description = ev.body_text
        _text, gallery = split_body_and_gallery(ev.body_text, ev.image_url, ev.image_urls)
        if gallery:
            urls = gallery[:MAX_IMAGES]
        elif ev.image_url and ev.image_url not in urls:
            urls = [ev.image_url, *urls][:MAX_IMAGES]

    return SubmissionOut(
        id=s.id,
        title=title,
        url=s.url,
        description=description,
        summary=s.summary,
        image_url=urls[0] if urls else s.image_url,
        image_urls=urls,
        category=s.category,
        status=s.status,
        submitter_name=s.submitter_name,
        submitter_email=s.submitter_email,
        submitter_phone=s.submitter_phone,
        submitter_profession=s.submitter_profession,
        submitter_company=s.submitter_company,
        is_staff=bool(s.is_staff),
        event_slug=ev.slug if ev else None,
        created_at=s.created_at,
    )


@router.post("/news-submissions", status_code=201)
@limiter.limit(_settings.rate_limit_submit)
def submit_news(request: Request, payload: SubmissionIn, db: Session = Depends(get_db)) -> dict:
    category = payload.category if payload.category in PUBLIC_BUCKETS else DEFAULT_CATEGORY
    body = payload.description.strip()
    urls = list(payload.image_urls)
    if payload.image_url:
        u = str(payload.image_url)
        if u not in urls:
            urls.insert(0, u)

    submission = models.NewsSubmission(
        title=payload.title.strip(),
        url=str(payload.url) if payload.url else None,
        description=body,
        summary=(payload.summary or "").strip() or None,
        image_url=urls[0] if urls else None,
        image_urls=urls[:MAX_IMAGES],
        category=category,
        submitter_name=payload.submitter_name.strip(),
        submitter_email=(payload.submitter_email or "").strip() or None,
        submitter_phone=(payload.submitter_phone or "").strip() or None,
        submitter_profession=(payload.submitter_profession or "").strip() or None,
        submitter_company=(payload.submitter_company or "").strip() or None,
        status="pending",
    )
    submission.is_staff = submission_looks_staff(db, submission)
    db.add(submission)
    db.commit()
    return {"ok": True, "status": "pending"}


@router.get("/news-submissions/queue", response_model=list[SubmissionOut])
def moderation_queue(
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
    status: str | None = Query(None),
) -> list[SubmissionOut]:
    stmt = select(models.NewsSubmission)
    if status in STATUSES:
        stmt = stmt.where(models.NewsSubmission.status == status)
    rows = sorted(
        db.scalars(stmt).all(),
        key=lambda s: (s.status != "pending", -s.created_at.timestamp()),
    )
    return [_out(s) for s in rows]


@router.patch("/news-submissions/{submission_id}", response_model=SubmissionOut)
def edit_submission(
    submission_id: uuid.UUID,
    payload: SubmissionEdit,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> SubmissionOut:
    submission = db.get(models.NewsSubmission, submission_id)
    if submission is None:
        raise HTTPException(404, "gönderi bulunamadı")

    if payload.title is not None:
        submission.title = payload.title.strip()
    if payload.description is not None:
        submission.description = payload.description.strip()
    if payload.category is not None:
        if payload.category not in PUBLIC_BUCKETS:
            raise HTTPException(422, f"category must be one of {PUBLIC_BUCKETS}")
        submission.category = payload.category
    if payload.image_urls is not None:
        urls = [u.strip() for u in payload.image_urls if u and u.strip()][:MAX_IMAGES]
        submission.image_urls = urls
        submission.image_url = urls[0] if urls else None
    if payload.submitter_name is not None:
        submission.submitter_name = payload.submitter_name.strip() or None
    if payload.submitter_email is not None:
        submission.submitter_email = payload.submitter_email.strip() or None
    if payload.submitter_phone is not None:
        submission.submitter_phone = payload.submitter_phone.strip() or None
    if payload.submitter_profession is not None:
        submission.submitter_profession = payload.submitter_profession.strip() or None
    if payload.submitter_company is not None:
        submission.submitter_company = payload.submitter_company.strip() or None
    if payload.is_staff is not None:
        submission.is_staff = bool(payload.is_staff)

    if submission.event_id and submission.event is not None:
        ev = submission.event
        ev.title = submission.title
        # Prefer the edited body; keep a usable summary without wiping a longer one
        if payload.description is not None:
            ev.body_text = submission.description
            tip = (submission.description or "").strip()
            if tip:
                ev.summary = clip_summary(tip)
        if payload.image_urls is not None:
            ev.image_url = submission.image_url
            ev.image_urls = list(submission.image_urls or [])
        if submission.event.articles:
            art = submission.event.articles[0]
            art.title = submission.title
            if payload.description is not None:
                art.body_text = submission.description
            if payload.image_urls is not None:
                art.image_url = submission.image_url
        if payload.is_staff is not None:
            retarget_submission_source(db, submission)

    db.commit()
    db.refresh(submission)
    _bust_home_cache()
    return _out(submission)


@router.post("/news-submissions/{submission_id}/status", response_model=SubmissionOut)
def set_status(
    submission_id: uuid.UUID,
    payload: StatusChange,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> SubmissionOut:
    if payload.status not in STATUSES:
        raise HTTPException(422, f"status must be one of {sorted(STATUSES)}")
    submission = db.get(models.NewsSubmission, submission_id)
    if submission is None:
        raise HTTPException(404, "gönderi bulunamadı")

    if payload.status == "approved":
        if submission_looks_staff(db, submission):
            submission.is_staff = True
        if submission.event_id is None:
            event = create_event_from_submission(db, submission)
            submission.event_id = event.id
        else:
            _set_reader_event_visibility(db, submission, visible=True)
            retarget_submission_source(db, submission)
    elif payload.status in ("rejected", "pending"):
        # Unpublish the Event created from this tip — seeded/linked stories untouched.
        _set_reader_event_visibility(db, submission, visible=False)

    submission.status = payload.status
    db.commit()
    db.refresh(submission)
    _bust_home_cache()
    return _out(submission)


def _set_reader_event_visibility(
    db: Session, submission: models.NewsSubmission, *, visible: bool
) -> None:
    """Toggle only Events born from this submission (external_id = reader:<id>)."""
    if submission.event_id is None:
        return
    article = db.scalar(
        select(models.Article).where(
            models.Article.external_id == f"reader:{submission.id}",
            models.Article.event_id == submission.event_id,
        )
    )
    if article is None:
        return
    event = db.get(models.Event, submission.event_id)
    if event is None:
        return
    event.status = "active" if visible else "hidden"
