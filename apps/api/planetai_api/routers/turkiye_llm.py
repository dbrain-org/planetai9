"""Türkiye LLM vitrin — Radar catalogue + curated producers + moderated Q&A."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from planetai_shared.db import models
from planetai_shared.settings import get_settings
from sqlalchemy import ColumnElement, or_, select
from sqlalchemy.orm import Session

from planetai_api import cache, schemas, serializers
from planetai_api.db import get_db, get_lang
from planetai_api.radar_client import (
    aggregate_orgs,
    fetch_turkish_models,
    open_weight_count,
    technique_counts,
    year_counts,
)
from planetai_api.regions import tr_event_ids_subquery

router = APIRouter(prefix="/turkiye-llm")
_settings = get_settings()

# Overview news: prefer dil modeli / LLM + Türkiye sinyali; asla rastgele TR gadget haberi değil.
_LLM_KEYS = (
    "llm",
    "dil model",
    "language model",
    "büyük dil",
    "huggingface",
    "berturk",
    "open-weight",
    "open weight",
    "açık model",
    "open model",
    "foundation model",
    "transformer",
    "embedding",
    "fine-tun",
    "finetun",
    "llama",
    "mistral",
    "qwen",
    "kumru",
    "nlp",
)
_TR_KEYS = (
    "türkiye",
    "turkiye",
    "türkçe",
    "turkce",
    "turkish",
    "planetai",
    "llm radar",
    "ytu",
    "vngrs",
    "turkcell",
    "loodos",
    "wiro",
    "berturk",
    "sabancı",
    "sabanci",
    "bilkent",
    "odtü",
    "odtu",
    "tübitak",
    "tubitak",
    "boğaziçi",
    "bogazici",
)


def _ilike_any(column, keys: tuple[str, ...]) -> ColumnElement[bool]:
    return or_(*[column.ilike(f"%{key}%") for key in keys])


def _related_news(db: Session, *, lang: str | None, limit: int = 6) -> list[schemas.EventCard]:
    """LLM / dil modeli haberleri; mümkünse Türkiye sinyalli + görselli olanlar önce.

    Title ağırlıklı eşleşme: summary'de geçen rastgele 'LLM' (buzdolabı vb.) yetmez.
    """
    pool_n = max(limit * 4, 12)
    seen: set[uuid.UUID] = set()
    rows: list[models.Event] = []

    def _add(candidates: list[models.Event]) -> None:
        for ev in candidates:
            if ev.id in seen:
                continue
            seen.add(ev.id)
            rows.append(ev)
            if len(rows) >= pool_n:
                return

    # Title must carry the LLM signal (summary-only hits are too noisy).
    llm_title = _ilike_any(models.Event.title, _LLM_KEYS)
    tr_title = _ilike_any(models.Event.title, _TR_KEYS)
    tr_body = or_(
        _ilike_any(models.Event.title, _TR_KEYS),
        _ilike_any(models.Event.summary, _TR_KEYS),
    )
    tr_ids = tr_event_ids_subquery()
    noise = _ilike_any(
        models.Event.title,
        (
            "buzdolab",
            "çamaşır",
            "camasir",
            "beyaz eşya",
            "beyaz esya",
            "saç kurut",
            "sac kurut",
            "apple watch",
            "volvo",
            "iphone",
        ),
    )
    # Same as home/events: arXiv papers stay out of the news band.
    arxiv_event_ids = (
        select(models.Article.event_id)
        .join(models.Source, models.Source.id == models.Article.source_id)
        .where(models.Source.kind == "arxiv", models.Article.event_id.isnot(None))
    )
    base = (
        select(models.Event)
        .where(
            models.Event.status == "active",
            ~noise,
            models.Event.category != "Research",
            models.Event.id.not_in(arxiv_event_ids),
        )
        .order_by(models.Event.last_activity_at.desc())
    )

    # 1) Başlıkta LLM + (TR metni veya TR bölgesi)
    _add(
        list(
            db.scalars(
                base.where(llm_title, or_(tr_body, models.Event.id.in_(tr_ids))).limit(pool_n)
            ).all()
        )
    )

    # 2) Başlıkta LLM + Türkiye anahtar kelimesi (bölge yanlış sınıflansa bile)
    if len(rows) < pool_n:
        _add(list(db.scalars(base.where(llm_title, tr_title).limit(pool_n)).all()))

    # 3) open-models ∩ turkiye konuları
    if len(rows) < pool_n:
        topic_ids = {
            t.slug: t.id
            for t in db.scalars(
                select(models.Topic).where(models.Topic.slug.in_(("open-models", "turkiye")))
            ).all()
        }
        if "open-models" in topic_ids and "turkiye" in topic_ids:
            open_ids = select(models.EventTopic.event_id).where(
                models.EventTopic.topic_id == topic_ids["open-models"]
            )
            tr_topic_ids = select(models.EventTopic.event_id).where(
                models.EventTopic.topic_id == topic_ids["turkiye"]
            )
            _add(
                list(
                    db.scalars(
                        base.where(
                            models.Event.id.in_(open_ids),
                            models.Event.id.in_(tr_topic_ids),
                        ).limit(pool_n)
                    ).all()
                )
            )

    # 4) Başlıkta LLM (küresel model haberleri — ChatGPT/gadget TR bandı değil)
    if len(rows) < pool_n:
        _add(list(db.scalars(base.where(llm_title).limit(pool_n)).all()))

    cards = [serializers.event_card(db, ev, lang=lang) for ev in rows]
    with_img = [c for c in cards if c.image_url]
    without = [c for c in cards if not c.image_url]
    return (with_img + without)[:limit]


def _curated_published(db: Session) -> list[models.LlmDeveloper]:
    return list(
        db.scalars(
            select(models.LlmDeveloper)
            .where(models.LlmDeveloper.published.is_(True))
            .order_by(models.LlmDeveloper.sort_order, models.LlmDeveloper.display_name)
        ).all()
    )


def _match_curated(
    curated: list[models.LlmDeveloper], *, slug: str, name: str
) -> models.LlmDeveloper | None:
    slug_l = slug.lower()
    name_l = name.lower()
    for d in curated:
        if d.slug.lower() == slug_l:
            return d
        if d.radar_slug and d.radar_slug.lower() == slug_l:
            return d
        if d.display_name.lower() == name_l:
            return d
        # HF org often differs slightly from display name (e.g. VNGRS / vngrs-ai)
        if d.hf_url and slug_l in d.hf_url.lower():
            return d
    return None


def _developer_card(
    *,
    slug: str,
    name: str,
    model_count: int,
    kind: str = "org",
    bio: str | None = None,
    logo_url: str | None = None,
    website_url: str | None = None,
    hf_url: str | None = None,
    linkedin_url: str | None = None,
    github_url: str | None = None,
    city: str | None = None,
    curated: bool = False,
) -> schemas.LlmDeveloperCard:
    return schemas.LlmDeveloperCard(
        slug=slug,
        display_name=name,
        kind=kind,
        bio=bio,
        logo_url=logo_url,
        website_url=website_url,
        hf_url=hf_url,
        linkedin_url=linkedin_url,
        github_url=github_url,
        city=city,
        model_count=model_count,
        curated=curated,
    )


@router.get("/overview", response_model=schemas.TurkiyeLlmOverview)
def overview(
    db: Session = Depends(get_db),
    lang: str | None = Depends(get_lang),
) -> schemas.TurkiyeLlmOverview:
    cache_key = f"turkiye-llm:overview:{lang or 'tr'}"
    hit = cache.get(cache_key)
    if isinstance(hit, dict):
        return schemas.TurkiyeLlmOverview.model_validate(hit)

    models_list = fetch_turkish_models(limit=1000)
    orgs = aggregate_orgs(models_list)
    curated = _curated_published(db)
    curated_by_slug = {d.slug: d for d in curated}

    top: list[schemas.LlmDeveloperCard] = []
    seen: set[str] = set()
    for org in orgs[:36]:
        c = _match_curated(curated, slug=org.slug, name=org.name)
        slug = c.slug if c else org.slug
        if slug in seen:
            continue
        seen.add(slug)
        top.append(
            _developer_card(
                slug=slug,
                name=c.display_name if c else org.name,
                model_count=org.model_count,
                kind=c.kind if c else "org",
                bio=c.bio if c else None,
                logo_url=c.logo_url if c else None,
                website_url=(c.website_url if c else None) or org.website_url,
                hf_url=(c.hf_url if c else None) or org.hf_url,
                linkedin_url=c.linkedin_url if c else None,
                github_url=c.github_url if c else None,
                city=c.city if c else None,
                curated=c is not None,
            )
        )
        if c:
            curated_by_slug.pop(c.slug, None)

    # Curated-only producers with no Radar models yet still appear (after top).
    for d in curated:
        if d.slug in seen:
            continue
        top.append(
            _developer_card(
                slug=d.slug,
                name=d.display_name,
                model_count=0,
                kind=d.kind,
                bio=d.bio,
                logo_url=d.logo_url,
                website_url=d.website_url,
                hf_url=d.hf_url,
                linkedin_url=d.linkedin_url,
                github_url=d.github_url,
                city=d.city,
                curated=True,
            )
        )
        seen.add(d.slug)
        if len(top) >= 36:
            break

    pins: list[schemas.LlmMapPin] = []
    for d in curated:
        if d.lat is None or d.lng is None:
            continue
        pins.append(
            schemas.LlmMapPin(
                slug=d.slug,
                name=d.display_name,
                city=d.city,
                lat=float(d.lat),
                lng=float(d.lng),
                kind=d.kind,
            )
        )

    # LLM / dil modeli haberleri (rastgele TR gündemi değil)
    news = _related_news(db, lang=lang, limit=6)

    radar_ok = bool(models_list)
    payload = schemas.TurkiyeLlmOverview(
        kpi=schemas.LlmKpi(
            models=len(models_list),
            open_weight=open_weight_count(models_list),
            producers=len(orgs) if orgs else len(curated),
            radar_ok=radar_ok,
        ),
        by_technique=[schemas.LlmChartBucket(**b) for b in technique_counts(models_list)],
        by_year=[schemas.LlmYearBucket(**b) for b in year_counts(models_list)],
        top_producers=top[:24],
        map_pins=pins,
        news=news,
        # Public CTA always points at prod Radar (local API base is only for data fetch).
        radar_url="https://llmradar.planetai9.com/#turkish",
    )
    cache.set(cache_key, payload.model_dump(mode="json"), _settings.cache_ttl_turkiye_llm_sec)
    return payload


@router.get("/developers", response_model=list[schemas.LlmDeveloperCard])
def list_developers(
    db: Session = Depends(get_db),
    q: str | None = None,
    sort: str = Query("models", pattern="^(models|name)$"),
) -> list[schemas.LlmDeveloperCard]:
    models_list = fetch_turkish_models(limit=1000)
    orgs = {o.slug: o for o in aggregate_orgs(models_list)}
    curated = _curated_published(db)

    cards: dict[str, schemas.LlmDeveloperCard] = {}
    for org in orgs.values():
        c = _match_curated(curated, slug=org.slug, name=org.name)
        slug = c.slug if c else org.slug
        cards[slug] = _developer_card(
            slug=slug,
            name=c.display_name if c else org.name,
            model_count=org.model_count,
            kind=c.kind if c else "org",
            bio=c.bio if c else None,
            logo_url=c.logo_url if c else None,
            website_url=(c.website_url if c else None) or org.website_url,
            hf_url=(c.hf_url if c else None) or org.hf_url,
            linkedin_url=c.linkedin_url if c else None,
            github_url=c.github_url if c else None,
            city=c.city if c else None,
            curated=c is not None,
        )

    for d in curated:
        if d.slug in cards:
            continue
        # Match by radar_slug into an existing org card
        if (
            d.radar_slug
            and d.radar_slug in orgs
            and d.radar_slug not in {c.radar_slug for c in curated if c.radar_slug}
        ):
            continue
        cards[d.slug] = _developer_card(
            slug=d.slug,
            name=d.display_name,
            model_count=0,
            kind=d.kind,
            bio=d.bio,
            logo_url=d.logo_url,
            website_url=d.website_url,
            hf_url=d.hf_url,
            linkedin_url=d.linkedin_url,
            github_url=d.github_url,
            city=d.city,
            curated=True,
        )

    out = list(cards.values())
    if q:
        needle = q.strip().casefold()
        out = [
            c
            for c in out
            if needle in c.display_name.casefold()
            or needle in c.slug.casefold()
            or (c.city and needle in c.city.casefold())
        ]
    if sort == "name":
        out.sort(key=lambda c: c.display_name.casefold())
    else:
        out.sort(key=lambda c: (-c.model_count, c.display_name.casefold()))
    return out


@router.get("/developers/{slug}", response_model=schemas.LlmDeveloperDetail)
def get_developer(slug: str, db: Session = Depends(get_db)) -> schemas.LlmDeveloperDetail:
    models_list = fetch_turkish_models(limit=1000)
    orgs = {o.slug: o for o in aggregate_orgs(models_list)}
    curated = db.scalar(
        select(models.LlmDeveloper).where(
            models.LlmDeveloper.slug == slug,
            models.LlmDeveloper.published.is_(True),
        )
    )

    org = None
    if curated and curated.radar_slug and curated.radar_slug in orgs:
        org = orgs[curated.radar_slug]
    elif slug in orgs:
        org = orgs[slug]
    else:
        # try match org name → curated display
        for o in orgs.values():
            if curated and o.name.lower() == curated.display_name.lower():
                org = o
                break
            if o.slug == slug:
                org = o
                break

    if curated is None and org is None:
        raise HTTPException(404, "developer not found")

    model_rows = [
        schemas.LlmModelRow(
            name=m.name,
            technique=m.technique,
            published_at=m.published_at,
            downloads=m.downloads,
            source_url=m.source_url,
            website_url=m.website_url,
        )
        for m in (org.models if org else [])
    ]

    display_name = curated.display_name if curated else (org.name if org else slug)
    return schemas.LlmDeveloperDetail(
        slug=curated.slug if curated else (org.slug if org else slug),
        display_name=display_name,
        kind=curated.kind if curated else "org",
        bio=curated.bio if curated else None,
        logo_url=curated.logo_url if curated else None,
        website_url=(curated.website_url if curated else None)
        or (org.website_url if org else None),
        hf_url=(curated.hf_url if curated else None) or (org.hf_url if org else None),
        linkedin_url=curated.linkedin_url if curated else None,
        github_url=curated.github_url if curated else None,
        city=curated.city if curated else None,
        lat=float(curated.lat) if curated and curated.lat is not None else None,
        lng=float(curated.lng) if curated and curated.lng is not None else None,
        model_count=len(model_rows),
        models=model_rows,
        comments=[],
        curated=curated is not None,
    )
