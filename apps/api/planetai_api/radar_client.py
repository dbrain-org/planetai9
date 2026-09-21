"""Thin LLM Radar HTTP client for the Türkiye LLM vitrin.

Fetches GET /api/v1/models/turkish and normalizes fields PlanetAI needs.
When Radar is down or unconfigured, callers get empty lists (curated + news still work).
"""

from __future__ import annotations

import json
import logging
import re
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from urllib.parse import urlparse

from planetai_shared.settings import get_settings
from slugify import slugify

from planetai_api import cache

log = logging.getLogger(__name__)
_settings = get_settings()

_HF_ORG = re.compile(r"^https?://huggingface\.co/([^/]+)/", re.I)
_CACHE_KEY = "turkiye-llm:turkish-models:v1"


@dataclass(slots=True)
class RadarModel:
    name: str
    organization: str
    company_slug: str
    technique: str | None
    published_at: str | None
    downloads: int
    source_url: str | None
    website_url: str | None
    openness: str | None = None


@dataclass(slots=True)
class RadarOrgAgg:
    slug: str
    name: str
    model_count: int
    website_url: str | None = None
    hf_url: str | None = None
    models: list[RadarModel] = field(default_factory=list)


def _http_get_json(url: str, *, timeout: float = 12.0) -> Any | None:
    req = urllib.request.Request(
        url,
        headers={
            "accept": "application/json",
            "user-agent": _settings.user_agent,
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError) as exc:
        log.warning("llmradar fetch failed %s: %s", url, exc)
        return None


def _company_slug(organization: str, source_url: str | None) -> str:
    if source_url:
        m = _HF_ORG.match(source_url.strip())
        if m:
            return m.group(1).lower()
    return slugify(organization or "unknown")[:160] or "unknown"


def _website_from_source(source_url: str | None) -> str | None:
    if not source_url:
        return None
    try:
        p = urlparse(source_url)
        if p.scheme and p.netloc:
            return f"{p.scheme}://{p.netloc}"
    except Exception:  # noqa: BLE001
        return None
    return None


def _normalize_item(raw: dict[str, Any]) -> RadarModel | None:
    name = (raw.get("name") or "").strip()
    org = (raw.get("organization") or raw.get("company_name") or "").strip() or "Unknown"
    if not name:
        return None
    source_url = (raw.get("source_url") or "").strip() or None
    company_slug = (raw.get("company_slug") or "").strip() or _company_slug(org, source_url)
    website = (raw.get("website_url") or "").strip() or _website_from_source(source_url)
    downloads = raw.get("downloads")
    try:
        downloads_i = int(downloads) if downloads is not None else 0
    except (TypeError, ValueError):
        downloads_i = 0
    technique = raw.get("technique")
    if technique is not None:
        technique = str(technique).strip() or None
    published = raw.get("published_at")
    if published is not None:
        published = str(published)
    openness = raw.get("openness")
    if openness is not None:
        openness = str(openness)
    return RadarModel(
        name=name,
        organization=org,
        company_slug=company_slug,
        technique=technique,
        published_at=published,
        downloads=downloads_i,
        source_url=source_url,
        website_url=website,
        openness=openness,
    )


def fetch_turkish_models(*, limit: int = 1000, use_cache: bool = True) -> list[RadarModel]:
    """Return normalized Turkish-signal models from LLM Radar (cached).

    Public Radar rejects ``limit > 200`` (422); local may allow higher.
    We request up to ``limit`` (capped at 1000) and retry at 200 on failure.
    """
    limit = max(1, min(int(limit), 1000))
    if use_cache:
        cached = cache.get(_CACHE_KEY)
        if isinstance(cached, list):
            out: list[RadarModel] = []
            for x in cached:
                if not isinstance(x, dict):
                    continue
                m = _normalize_item(x)
                if m is not None:
                    out.append(m)
            return out

    base = (_settings.llmradar_api_base or "").rstrip("/")
    if not base:
        return []

    payload = _http_get_json(f"{base}/api/v1/models/turkish?limit={limit}")
    if not isinstance(payload, dict) and limit > 200:
        payload = _http_get_json(f"{base}/api/v1/models/turkish?limit=200")
    if not isinstance(payload, dict):
        return []
    items = payload.get("items") or []
    if not isinstance(items, list):
        return []

    models: list[RadarModel] = []
    raw_out: list[dict[str, Any]] = []
    for row in items:
        if not isinstance(row, dict):
            continue
        m = _normalize_item(row)
        if m is None:
            continue
        models.append(m)
        raw_out.append(
            {
                "name": m.name,
                "organization": m.organization,
                "company_slug": m.company_slug,
                "technique": m.technique,
                "published_at": m.published_at,
                "downloads": m.downloads,
                "source_url": m.source_url,
                "website_url": m.website_url,
                "openness": m.openness,
            }
        )

    cache.set(_CACHE_KEY, raw_out, _settings.cache_ttl_turkiye_llm_sec)
    return models


def aggregate_orgs(models: list[RadarModel]) -> list[RadarOrgAgg]:
    by_slug: dict[str, list[RadarModel]] = defaultdict(list)
    names: dict[str, str] = {}
    websites: dict[str, str | None] = {}
    for m in models:
        by_slug[m.company_slug].append(m)
        names.setdefault(m.company_slug, m.organization)
        if m.website_url and m.company_slug not in websites:
            websites[m.company_slug] = m.website_url
    out: list[RadarOrgAgg] = []
    for slug, rows in by_slug.items():
        rows_sorted = sorted(rows, key=lambda r: r.downloads, reverse=True)
        hf = None
        for r in rows_sorted:
            if r.source_url and "huggingface.co" in r.source_url:
                m = _HF_ORG.match(r.source_url)
                if m:
                    hf = f"https://huggingface.co/{m.group(1)}"
                    break
        out.append(
            RadarOrgAgg(
                slug=slug,
                name=names[slug],
                model_count=len(rows),
                website_url=websites.get(slug),
                hf_url=hf,
                models=rows_sorted,
            )
        )
    out.sort(key=lambda o: (-o.model_count, o.name.lower()))
    return out


def technique_counts(models: list[RadarModel]) -> list[dict[str, Any]]:
    c: Counter[str] = Counter()
    for m in models:
        label = (m.technique or "Diğer").strip() or "Diğer"
        c[label] += 1
    return [{"label": k, "count": v} for k, v in c.most_common(12)]


def year_counts(models: list[RadarModel]) -> list[dict[str, Any]]:
    """Histogram of publish years from 2020 through the latest year present (or now).

    Missing years are filled with 0 so the chart axis matches the 'since 2020' title.
    """
    c: Counter[int] = Counter()
    for m in models:
        if not m.published_at:
            continue
        try:
            year = datetime.fromisoformat(m.published_at.replace("Z", "+00:00")).year
        except ValueError:
            continue
        if year < 2020:
            continue
        c[year] += 1
    end = max(c) if c else datetime.now().year
    end = max(end, datetime.now().year)
    return [{"year": y, "count": c.get(y, 0)} for y in range(2020, end + 1)]


def open_weight_count(models: list[RadarModel]) -> int:
    return sum(1 for m in models if (m.openness or "").lower() in {"open_weight", "open-weight", "open"})
