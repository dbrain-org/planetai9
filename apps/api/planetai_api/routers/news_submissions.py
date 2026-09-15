from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from planetai_shared.db import models
from planetai_shared.settings import get_settings
from pydantic import BaseModel, Field, HttpUrl, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from planetai_api.db import get_db
from planetai_api.ratelimit import limiter
from planetai_api.routers.marketplace import _bust_home_cache, require_admin
from planetai_api.services.manual_event import PUBLIC_BUCKETS, create_event_from_submission

router = APIRouter()
_settings = get_settings()

STATUSES = {"pending", "approved", "rejected"}


class SubmissionOut(BaseModel):
    id: uuid.UUID
    title: str
    url: str | None
    description: str | None
    summary: str | None
    image_url: str | None
    category: str
    status: str
    submitter_name: str | None
    submitter_email: str | None
    event_slug: str | None
    created_at: datetime


class StatusChange(BaseModel):
    status: str


class SubmissionIn(BaseModel):
    title: str = Field(min_length=8, max_length=300)
    url: HttpUrl | None = None
    description: str | None = Field(default=None, max_length=4000)
    summary: str | None = Field(default=None, max_length=600)
    image_url: HttpUrl | None = None
    category: str
    submitter_name: str | None = Field(default=None, max_length=120)
    submitter_email: str | None = Field(default=None, max_length=200)

    @model_validator(mode="after")
    def _needs_url_or_description(self) -> SubmissionIn:
        if not self.url and not (self.description or "").strip():
            raise ValueError("url ya da description alanlarından biri gerekli")
        return self


def _out(s: models.NewsSubmission) -> SubmissionOut:
    return SubmissionOut(
        id=s.id,
        title=s.title,
        url=s.url,
        description=s.description,
        summary=s.summary,
        image_url=s.image_url,
        category=s.category,
        status=s.status,
        submitter_name=s.submitter_name,
        submitter_email=s.submitter_email,
        event_slug=s.event.slug if s.event else None,
        created_at=s.created_at,
    )


@router.post("/news-submissions", status_code=201)
@limiter.limit(_settings.rate_limit_submit)
def submit_news(request: Request, payload: SubmissionIn, db: Session = Depends(get_db)) -> dict:
    if payload.category not in PUBLIC_BUCKETS:
        raise HTTPException(422, f"category must be one of {PUBLIC_BUCKETS}")

    submission = models.NewsSubmission(
        title=payload.title.strip(),
        url=str(payload.url) if payload.url else None,
        description=(payload.description or "").strip() or None,
        summary=(payload.summary or "").strip() or None,
        image_url=str(payload.image_url) if payload.image_url else None,
        category=payload.category,
        submitter_name=(payload.submitter_name or "").strip() or None,
        submitter_email=(payload.submitter_email or "").strip() or None,
        status="pending",
    )
    db.add(submission)
    db.commit()
    return {"ok": True, "status": "pending"}


# --- moderation (X-Admin-Token or a moderator author's X-Author-Key) --------


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

    if payload.status == "approved" and submission.event_id is None:
        event = create_event_from_submission(db, submission)
        submission.event_id = event.id

    submission.status = payload.status
    db.commit()
    db.refresh(submission)
    _bust_home_cache()
    return _out(submission)
