from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from planetai_shared.db import models
from planetai_shared.settings import get_settings
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from planetai_api.db import get_db
from planetai_api.ratelimit import limiter
from planetai_api.routers.marketplace import require_admin

router = APIRouter()
_settings = get_settings()

COLLECTIONS = {"tr_data", "tr_share", "tr_ecosystem"}
SHARE_COLLECTION = "tr_share"


class LinkOut(BaseModel):
    id: uuid.UUID
    collection: str
    name: str
    url: str
    kind: str
    note_tr: str | None
    note_en: str | None
    sort_order: int
    enabled: bool


class LinkInput(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    url: str = Field(min_length=4, max_length=600)
    kind: str = Field(default="", max_length=30)
    note_tr: str | None = Field(default=None, max_length=600)
    note_en: str | None = Field(default=None, max_length=600)
    sort_order: int = 0
    enabled: bool = True


def _out(r: models.CuratedLink) -> LinkOut:
    return LinkOut(
        id=r.id,
        collection=r.collection,
        name=r.name,
        url=r.url,
        kind=r.kind,
        note_tr=r.note_tr,
        note_en=r.note_en,
        sort_order=r.sort_order,
        enabled=r.enabled,
    )


def _check_collection(collection: str) -> None:
    if collection not in COLLECTIONS:
        raise HTTPException(404, "unknown collection")


@router.get("/curated/{collection}", response_model=list[LinkOut])
def list_links(collection: str, db: Session = Depends(get_db)) -> list[LinkOut]:
    """Public: enabled cards for a Türkiye-page collection, in display order."""
    _check_collection(collection)
    rows = db.scalars(
        select(models.CuratedLink)
        .where(
            models.CuratedLink.collection == collection,
            models.CuratedLink.enabled.is_(True),
        )
        .order_by(models.CuratedLink.sort_order, models.CuratedLink.name)
    ).all()
    return [_out(r) for r in rows]


# --- moderator management (X-Admin-Token or a moderator author's X-Author-Key) ---


@router.get("/curated/{collection}/manage", response_model=list[LinkOut])
def manage_list(
    collection: str,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[LinkOut]:
    _check_collection(collection)
    rows = db.scalars(
        select(models.CuratedLink)
        .where(models.CuratedLink.collection == collection)
        .order_by(models.CuratedLink.sort_order, models.CuratedLink.name)
    ).all()
    return [_out(r) for r in rows]


@router.post("/curated/{collection}", response_model=LinkOut, status_code=201)
def create_link(
    collection: str,
    payload: LinkInput,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> LinkOut:
    _check_collection(collection)
    if db.scalar(
        select(models.CuratedLink).where(
            models.CuratedLink.collection == collection,
            models.CuratedLink.name == payload.name,
        )
    ):
        raise HTTPException(409, "bu isimde bir kayıt zaten var")
    order = payload.sort_order or (
        db.scalar(
            select(func.coalesce(func.max(models.CuratedLink.sort_order), -1) + 1).where(
                models.CuratedLink.collection == collection
            )
        )
        or 0
    )
    row = models.CuratedLink(collection=collection, **payload.model_dump(exclude={"sort_order"}))
    row.sort_order = order
    db.add(row)
    db.commit()
    db.refresh(row)
    return _out(row)


@router.patch("/curated/{collection}/{link_id}", response_model=LinkOut)
def update_link(
    collection: str,
    link_id: uuid.UUID,
    payload: LinkInput,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> LinkOut:
    _check_collection(collection)
    row = db.get(models.CuratedLink, link_id)
    if row is None or row.collection != collection:
        raise HTTPException(404, "kayıt bulunamadı")
    for k, v in payload.model_dump().items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return _out(row)


@router.delete("/curated/{collection}/{link_id}", status_code=204)
def delete_link(
    collection: str,
    link_id: uuid.UUID,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    _check_collection(collection)
    row = db.get(models.CuratedLink, link_id)
    if row is None or row.collection != collection:
        raise HTTPException(404, "kayıt bulunamadı")
    db.delete(row)
    db.commit()


class ShareSubmitIn(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    url: str = Field(min_length=8, max_length=600)
    note: str = Field(min_length=8, max_length=600)
    submitter_name: str = Field(min_length=2, max_length=120)
    submitter_email: str | None = Field(default=None, max_length=200)
    license: str | None = Field(default=None, max_length=120)
    data_format: str | None = Field(default=None, max_length=120)
    organization: str | None = Field(default=None, max_length=160)


@router.post("/curated/tr_share/submit", status_code=201)
@limiter.limit(_settings.rate_limit_submit)
def submit_data_share(
    request: Request, payload: ShareSubmitIn, db: Session = Depends(get_db)
) -> dict:
    """Public tip for VeriVatan §02 — lands disabled until an admin approves."""
    name = payload.name.strip()
    url = payload.url.strip()
    if db.scalar(
        select(models.CuratedLink.id).where(
            models.CuratedLink.collection == SHARE_COLLECTION,
            models.CuratedLink.name == name,
        )
    ):
        raise HTTPException(409, "bu isimde bir kayıt zaten var")

    note = payload.note.strip()
    who = payload.submitter_name.strip()
    mail = (payload.submitter_email or "").strip()
    lic = (payload.license or "").strip()
    fmt = (payload.data_format or "").strip()
    org = (payload.organization or "").strip()
    # Park metadata in note_en so moderators see it without a schema change.
    meta_bits = [
        b
        for b in (
            who and f"Gönderen: {who}",
            mail and f"E-posta: {mail}",
            org and f"Kurum: {org}",
            lic and f"Lisans: {lic}",
            fmt and f"Format: {fmt}",
        )
        if b
    ]
    note_en = " · ".join(meta_bits) if meta_bits else None

    order = (
        db.scalar(
            select(func.coalesce(func.max(models.CuratedLink.sort_order), -1) + 1).where(
                models.CuratedLink.collection == SHARE_COLLECTION
            )
        )
        or 0
    )
    row = models.CuratedLink(
        collection=SHARE_COLLECTION,
        name=name,
        url=url,
        kind="paylaşım",
        note_tr=note,
        note_en=note_en,
        sort_order=order,
        enabled=False,
    )
    db.add(row)
    db.commit()
    return {"ok": True, "status": "pending"}


class ShareStatusIn(BaseModel):
    enabled: bool


@router.post("/curated/tr_share/{link_id}/status", response_model=LinkOut)
def set_share_status(
    link_id: uuid.UUID,
    payload: ShareStatusIn,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
) -> LinkOut:
    row = db.get(models.CuratedLink, link_id)
    if row is None or row.collection != SHARE_COLLECTION:
        raise HTTPException(404, "kayıt bulunamadı")
    row.enabled = payload.enabled
    if payload.enabled:
        # Newly approved shares float to the top of the public section.
        min_order = db.scalar(
            select(func.coalesce(func.min(models.CuratedLink.sort_order), 0)).where(
                models.CuratedLink.collection == SHARE_COLLECTION,
                models.CuratedLink.enabled.is_(True),
            )
        )
        row.sort_order = (min_order or 0) - 1
    db.commit()
    db.refresh(row)
    return _out(row)
