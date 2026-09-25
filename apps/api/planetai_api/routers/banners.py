"""Click counts for static DBrain product banners."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from planetai_shared.db import models
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from planetai_api.db import get_db
from planetai_api.ratelimit import limiter

router = APIRouter()

ALLOWED = frozenset({"home-oppy", "turkiye-llm-gaia", "turkiye-llm-alibaba"})


class BannerStat(BaseModel):
    banner_id: str
    clicks: int


@router.post("/banners/{banner_id}/click", status_code=204)
@limiter.limit("30/minute")
def record_click(request: Request, banner_id: str, db: Session = Depends(get_db)) -> Response:
    if banner_id not in ALLOWED:
        raise HTTPException(status_code=404, detail="unknown banner")
    db.add(models.BannerClick(banner_id=banner_id))
    db.commit()
    return Response(status_code=204)


@router.get("/banners/stats", response_model=list[BannerStat])
def banner_stats(db: Session = Depends(get_db)) -> list[BannerStat]:
    rows = db.execute(
        select(models.BannerClick.banner_id, func.count())
        .group_by(models.BannerClick.banner_id)
        .order_by(models.BannerClick.banner_id)
    ).all()
    counts = {banner_id: int(n) for banner_id, n in rows}
    return [
        BannerStat(banner_id=banner_id, clicks=counts.get(banner_id, 0))
        for banner_id in sorted(ALLOWED)
    ]
