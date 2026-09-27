"""Grow VeriVatan, Üniversite, and TAKYAP from public catalogs.

Hugging Face supplies Turkish datasets and models. GitHub supplies open-source
projects and course repositories. Existing cards are left alone; only new URLs
are inserted. The scheduler runs this a few times a day.
"""

from __future__ import annotations

import logging
import re
from urllib.parse import quote

import httpx
from planetai_shared.db import models
from planetai_shared.db.base import session_scope
from slugify import slugify
from sqlalchemy import select
from sqlalchemy.orm import Session

log = logging.getLogger(__name__)

_UA = {"User-Agent": "PlanetAI9 catalog (+https://planetai9.com)"}
_TIMEOUT = httpx.Timeout(20.0, connect=8.0)


def _get_json(client: httpx.Client, url: str):
    try:
        resp = client.get(url, headers=_UA)
        if resp.status_code >= 400:
            log.info("catalog skip %s -> %s", url, resp.status_code)
            return None
        return resp.json()
    except (httpx.HTTPError, ValueError):
        log.info("catalog fetch failed %s", url, exc_info=True)
        return None


def _kind_for_dataset(row: dict) -> str:
    blob = " ".join(
        [
            str(row.get("id") or ""),
            " ".join(row.get("tags") or []),
            str(row.get("description") or ""),
        ]
    ).lower()
    if any(word in blob for word in ("sft", "instruction", "chat", "rlhf")):
        return "sft"
    if any(word in blob for word in ("speech", "audio", "asr")):
        return "medya"
    if any(word in blob for word in ("nlp", "text", "corpus", "language-modeling", "pretraining")):
        return "corpus"
    return "genel"


def _edu_kind(text: str) -> str:
    blob = text.lower()
    if any(word in blob for word in ("101", "giriş", "giris", "intro", "beginner", "temel", "herkes")):
        return "herkes"
    if any(word in blob for word in ("meslek", "kariyer", "bootcamp", "career", "iş", "is hayati")):
        return "meslek"
    return "derin"


def _app_category(text: str, pipeline: str | None) -> str:
    blob = f"{text} {pipeline or ''}".lower()
    if any(word in blob for word in ("text-to-speech", "tts")):
        return "tts"
    if any(word in blob for word in ("speech", "asr", "stt", "whisper")):
        return "stt"
    if any(word in blob for word in ("agent", "mcp")):
        return "agent" if "agent" in blob else "mcp"
    if any(word in blob for word in ("llm", "text-generation", "language model", "language-model")):
        return "llm"
    return "tool"


def _load_links(db: Session, collection: str) -> tuple[set[str], set[str], int]:
    rows = db.scalars(
        select(models.CuratedLink).where(models.CuratedLink.collection == collection)
    ).all()
    urls = {r.url.rstrip("/") for r in rows}
    names = {r.name for r in rows}
    order = max((r.sort_order for r in rows), default=-1)
    return urls, names, order


def _add_link(
    db: Session,
    collection: str,
    name: str,
    url: str,
    kind: str,
    note_tr: str,
    note_en: str,
    urls: set[str],
    names: set[str],
    order: int,
) -> int:
    url = url.rstrip("/")
    if not name or not url or url in urls:
        return order
    base = re.sub(r"\s+", " ", name).strip()[:170] or url[:80]
    label = base
    n = 2
    while label in names:
        label = f"{base[:160]} {n}"
        n += 1
    order += 1
    db.add(
        models.CuratedLink(
            collection=collection,
            name=label[:200],
            url=url,
            kind=kind,
            note_tr=note_tr[:500],
            note_en=note_en[:500],
            sort_order=order,
            enabled=True,
        )
    )
    urls.add(url)
    names.add(label)
    return order


def _harvest_datasets(client: httpx.Client, db: Session) -> int:
    urls, names, order = _load_links(db, "tr_data")
    before = len(urls)
    queries = (
        "https://huggingface.co/api/datasets?filter=language:tr&sort=downloads&limit=100&direction=-1",
        "https://huggingface.co/api/datasets?search=turkish&sort=downloads&limit=100&direction=-1",
        "https://huggingface.co/api/datasets?search=turkce&sort=downloads&limit=50&direction=-1",
    )
    seen: set[str] = set()
    for url in queries:
        rows = _get_json(client, url) or []
        if not isinstance(rows, list):
            continue
        for row in rows:
            if row.get("private") or row.get("disabled") or row.get("gated"):
                continue
            dataset_id = str(row.get("id") or "")
            if not dataset_id or dataset_id in seen:
                continue
            seen.add(dataset_id)
            downloads = int(row.get("downloads") or 0)
            description = (row.get("description") or "").strip().split("\n", 1)[0][:180]
            note_tr = description or f"Türkçe açık veri seti. {downloads:,} indirme.".replace(",", ".")
            note_en = description or f"Turkish open dataset. {downloads:,} downloads."
            order = _add_link(
                db,
                "tr_data",
                dataset_id,
                f"https://huggingface.co/datasets/{dataset_id}",
                _kind_for_dataset(row),
                note_tr,
                note_en,
                urls,
                names,
                order,
            )
    return len(urls) - before


def _harvest_education(client: httpx.Client, db: Session) -> int:
    urls, names, order = _load_links(db, "education")
    before = len(urls)
    queries = (
        "turkish machine learning tutorial OR course",
        "yapay zeka eğitim OR tutorial",
        "topic:deep-learning turkish",
    )
    for query in queries:
        payload = _get_json(
            client,
            "https://api.github.com/search/repositories?q="
            + quote(query)
            + "&sort=stars&per_page=20",
        )
        if not isinstance(payload, dict):
            continue
        for row in payload.get("items") or []:
            if row.get("fork") or row.get("archived"):
                continue
            full = row.get("full_name") or row.get("name") or ""
            html = row.get("html_url") or ""
            text = f"{full} {row.get('description') or ''}"
            desc = (row.get("description") or "Açık eğitim deposu.").strip()[:180]
            stars = int(row.get("stargazers_count") or 0)
            order = _add_link(
                db,
                "education",
                full,
                html,
                _edu_kind(text),
                f"{desc} {stars} yıldız.".strip(),
                f"{desc} {stars} stars.".strip(),
                urls,
                names,
                order,
            )
    return len(urls) - before


def _existing_app_keys(db: Session) -> tuple[set[str], set[str]]:
    rows = db.scalars(select(models.MarketplaceApp)).all()
    slugs = {r.slug for r in rows}
    urls = {(r.url or "").rstrip("/") for r in rows}
    urls |= {(r.repo_url or "").rstrip("/") for r in rows}
    return slugs, urls


def _add_app(
    db: Session,
    *,
    slug: str,
    name: str,
    tagline: str,
    url: str,
    repo_url: str | None,
    category: str,
    author_name: str,
    slugs: set[str],
    urls: set[str],
) -> bool:
    url = url.rstrip("/")
    repo = (repo_url or "").rstrip("/") or None
    if url in urls or (repo and repo in urls):
        return False
    base = slugify(slug)[:140] or "proje"
    label = base
    n = 2
    while label in slugs:
        label = f"{base[:130]}-{n}"
        n += 1
    db.add(
        models.MarketplaceApp(
            slug=label,
            name=name[:160],
            tagline=(tagline or name)[:240],
            description=tagline[:800] if tagline else None,
            url=url,
            repo_url=repo,
            category=category,
            pricing="free",
            author_name=(author_name or "Açık kaynak")[:120],
            author_url=url,
            is_turkish_dev=True,
            status="approved",
            featured=False,
        )
    )
    slugs.add(label)
    urls.add(url)
    if repo:
        urls.add(repo)
    return True


def _harvest_projects(client: httpx.Client, db: Session) -> int:
    slugs, urls = _existing_app_keys(db)
    added = 0
    models_url = (
        "https://huggingface.co/api/models?search=turkish&sort=downloads&limit=60&direction=-1"
    )
    rows = _get_json(client, models_url) or []
    if isinstance(rows, list):
        for row in rows:
            if row.get("private") or row.get("disabled"):
                continue
            model_id = str(row.get("id") or "")
            if not model_id:
                continue
            pipeline = row.get("pipeline_tag")
            downloads = int(row.get("downloads") or 0)
            added += _add_app(
                db,
                slug=f"hf-{model_id}",
                name=model_id,
                tagline=f"Türkçe açık model. {downloads:,} indirme.".replace(",", "."),
                url=f"https://huggingface.co/{model_id}",
                repo_url=f"https://huggingface.co/{model_id}",
                category=_app_category(model_id, pipeline),
                author_name=model_id.split("/")[0],
                slugs=slugs,
                urls=urls,
            )
    queries = (
        "turkish llm OR turkish nlp",
        "türkçe yapay zeka OR turkce dil modeli",
    )
    for query in queries:
        payload = _get_json(
            client,
            "https://api.github.com/search/repositories?q="
            + quote(query + " fork:false")
            + "&sort=stars&per_page=20",
        )
        if not isinstance(payload, dict):
            continue
        for row in payload.get("items") or []:
            full = row.get("full_name") or ""
            if not full:
                continue
            desc = (row.get("description") or "Açık kaynak yapay zekâ projesi.").strip()
            added += _add_app(
                db,
                slug=full,
                name=row.get("name") or full,
                tagline=desc[:240],
                url=row.get("html_url") or "",
                repo_url=row.get("html_url"),
                category=_app_category(f"{full} {desc}", None),
                author_name=(row.get("owner") or {}).get("login") or full.split("/")[0],
                slugs=slugs,
                urls=urls,
            )
    return added


def harvest_catalogs() -> dict[str, int]:
    """Insert new open data, courses, and projects. Does not edit existing cards."""
    stats = {"datasets": 0, "education": 0, "projects": 0}
    with httpx.Client(timeout=_TIMEOUT, follow_redirects=True) as client, session_scope() as db:
        stats["datasets"] = _harvest_datasets(client, db)
        stats["education"] = _harvest_education(client, db)
        stats["projects"] = _harvest_projects(client, db)
    log.info("catalog harvest %s", stats)
    return stats
