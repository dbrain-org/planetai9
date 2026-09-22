"""Public Hugging Face repos for a producer (models + datasets).

Classifies open shares into LLM, TTS, and datasets so producer pages and
VeriVatan can list them without a manual seed row per repo.
"""

from __future__ import annotations

import json
import logging
import re
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass

from planetai_shared.settings import get_settings

from planetai_api import cache

log = logging.getLogger(__name__)
_settings = get_settings()

_AUTHOR = re.compile(r"^https?://(?:www\.)?huggingface\.co/([^/?#]+)/?", re.I)
_SKIP_AUTHORS = {"datasets", "models", "spaces", "docs", "blog"}
_TTS = {"text-to-speech", "text-to-audio", "automatic-speech-recognition"}
_CACHE_TTL = 6 * 3600


@dataclass(slots=True)
class HfItem:
    name: str
    url: str
    kind: str
    downloads: int
    pipeline: str | None = None


@dataclass(slots=True)
class HfCatalog:
    llm: list[HfItem]
    tts: list[HfItem]
    datasets: list[HfItem]


def hf_author(url: str | None) -> str | None:
    if not url:
        return None
    match = _AUTHOR.match(url.strip())
    if not match:
        return None
    author = match.group(1)
    if author.casefold() in _SKIP_AUTHORS:
        return None
    return author


def catalog_for(hf_url: str | None) -> HfCatalog:
    author = hf_author(hf_url)
    empty = HfCatalog(llm=[], tts=[], datasets=[])
    if not author:
        return empty
    key = f"hf-catalog:{author.casefold()}"
    cached = cache.get(key)
    if isinstance(cached, dict):
        return _from_cache(cached)
    catalog = _fetch(author)
    cache.set(key, _to_cache(catalog), _CACHE_TTL)
    return catalog


def _fetch(author: str) -> HfCatalog:
    models = _list(
        f"https://huggingface.co/api/models?author={urllib.parse.quote(author)}&limit=500"
    )
    datasets = _list(
        f"https://huggingface.co/api/datasets?author={urllib.parse.quote(author)}&limit=200"
    )
    llm: list[HfItem] = []
    tts: list[HfItem] = []
    data: list[HfItem] = []
    for row in models:
        if row.get("private"):
            continue
        repo_id = (row.get("id") or row.get("modelId") or "").strip()
        if not repo_id or "/" not in repo_id:
            continue
        pipeline = (row.get("pipeline_tag") or "").strip() or None
        item = HfItem(
            name=repo_id.split("/", 1)[1],
            url=f"https://huggingface.co/{repo_id}",
            kind="tts" if pipeline in _TTS else "llm",
            downloads=_downloads(row),
            pipeline=pipeline,
        )
        (tts if item.kind == "tts" else llm).append(item)
    for row in datasets:
        if row.get("private"):
            continue
        repo_id = (row.get("id") or "").strip()
        if not repo_id or "/" not in repo_id:
            continue
        data.append(
            HfItem(
                name=repo_id.split("/", 1)[1],
                url=f"https://huggingface.co/datasets/{repo_id}",
                kind="dataset",
                downloads=_downloads(row),
            )
        )
    llm.sort(key=lambda i: -i.downloads)
    tts.sort(key=lambda i: -i.downloads)
    data.sort(key=lambda i: -i.downloads)
    return HfCatalog(llm=llm, tts=tts, datasets=data)


def _list(url: str) -> list[dict]:
    req = urllib.request.Request(
        url,
        headers={"accept": "application/json", "user-agent": _settings.user_agent},
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:  # noqa: S310
            payload = json.loads(resp.read().decode("utf-8"))
    except (
        urllib.error.URLError,
        urllib.error.HTTPError,
        TimeoutError,
        json.JSONDecodeError,
    ) as exc:
        log.warning("huggingface fetch failed %s: %s", url, exc)
        return []
    return payload if isinstance(payload, list) else []


def _downloads(row: dict) -> int:
    try:
        return int(row.get("downloads") or 0)
    except (TypeError, ValueError):
        return 0


def _to_cache(catalog: HfCatalog) -> dict:
    def dump(items: list[HfItem]) -> list[dict]:
        return [
            {
                "name": i.name,
                "url": i.url,
                "kind": i.kind,
                "downloads": i.downloads,
                "pipeline": i.pipeline,
            }
            for i in items
        ]

    return {"llm": dump(catalog.llm), "tts": dump(catalog.tts), "datasets": dump(catalog.datasets)}


def _from_cache(raw: dict) -> HfCatalog:
    def load(key: str) -> list[HfItem]:
        out: list[HfItem] = []
        for row in raw.get(key) or []:
            if not isinstance(row, dict) or not row.get("url"):
                continue
            out.append(
                HfItem(
                    name=str(row.get("name") or ""),
                    url=str(row["url"]),
                    kind=str(row.get("kind") or key),
                    downloads=int(row.get("downloads") or 0),
                    pipeline=row.get("pipeline"),
                )
            )
        return out

    return HfCatalog(llm=load("llm"), tts=load("tts"), datasets=load("datasets"))
