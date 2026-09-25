from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from planetai_shared.observability import init_sentry
from planetai_shared.settings import get_settings
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from planetai_api.ratelimit import limiter
from planetai_api.routers import (
    auth,
    authors,
    banners,
    curated,
    engagement,
    entities,
    events,
    home,
    marketplace,
    meta,
    news_submissions,
    search,
    trends,
    turkiye_llm,
    videos,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

_settings = get_settings()
init_sentry("api")

app = FastAPI(
    title="PlanetAI9 API",
    version="1.0.0",
    description="Read API for the PlanetAI9 platform.",
    docs_url="/docs" if _settings.docs_enabled else None,
    redoc_url=None,
    openapi_url="/openapi.json" if _settings.docs_enabled else None,
)
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def _rate_limited(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse({"detail": "çok fazla istek — biraz sonra tekrar deneyin"}, status_code=429)


app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=3600,
)


@app.middleware("http")
async def _security_headers(request: Request, call_next):
    resp = await call_next(request)
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    resp.headers.setdefault("X-Frame-Options", "DENY")
    return resp


API_V1 = "/api/v1"
app.include_router(banners.router, prefix=API_V1, tags=["banners"])
app.include_router(home.router, prefix=API_V1, tags=["home"])
app.include_router(events.router, prefix=API_V1, tags=["events"])
app.include_router(trends.router, prefix=API_V1, tags=["trends"])
app.include_router(videos.router, prefix=API_V1, tags=["videos"])
app.include_router(search.router, prefix=API_V1, tags=["search"])
app.include_router(entities.router, prefix=API_V1, tags=["entities"])
app.include_router(marketplace.router, prefix=API_V1, tags=["marketplace"])
app.include_router(authors.router, prefix=API_V1, tags=["authors"])
app.include_router(curated.router, prefix=API_V1, tags=["curated"])
app.include_router(news_submissions.router, prefix=API_V1, tags=["news_submissions"])
app.include_router(auth.router, prefix=API_V1, tags=["auth"])
app.include_router(engagement.router, prefix=API_V1, tags=["engagement"])
app.include_router(turkiye_llm.router, prefix=API_V1, tags=["turkiye_llm"])
app.include_router(meta.router, prefix=API_V1, tags=["meta"])


@app.get("/")
def root() -> dict:
    return {"name": "PlanetAI9 API", "version": app.version, "base": API_V1}
