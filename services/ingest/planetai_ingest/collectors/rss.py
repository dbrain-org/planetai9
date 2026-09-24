"""RSS/Atom collector (+ an arXiv variant that reuses the same feed parsing)."""

from __future__ import annotations

import logging
import re
from datetime import UTC, datetime
from time import mktime

import feedparser
from planetai_shared.settings import get_settings

from planetai_ingest.collectors.base import BaseCollector, FetchResult, RawItem, http_client
from planetai_ingest.text import clean_url, normalize_ws, strip_html

log = logging.getLogger(__name__)

_ARXIV_PREFIX = re.compile(
    r"^\s*arXiv:\S+\s*(Announce Type:\s*\S+)?\s*(Abstract:)?\s*", re.IGNORECASE
)


def _clean_arxiv_summary(summary: str) -> str:
    return _ARXIV_PREFIX.sub("", summary.replace("\n", " ")).strip()


def _parsed_datetime(entry) -> datetime | None:
    for key in ("published_parsed", "updated_parsed"):
        value = entry.get(key)
        if value:
            return datetime.fromtimestamp(mktime(value), tz=UTC)
    return None


def _media_width(item: dict) -> int:
    raw = item.get("width")
    try:
        return int(raw) if raw is not None else 0
    except (TypeError, ValueError):
        return 0


def _upgrade_image_url(url: str) -> str:
    """Bump common CDN size params so we keep a usable cover, not a 140px thumb."""
    from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

    try:
        parsed = urlparse(url)
    except ValueError:
        return url
    host = (parsed.hostname or "").lower()
    if not (
        host.endswith("redd.it")
        or host.endswith("redditmedia.com")
        or "preview.redd.it" in host
        or host.endswith("external-preview.redd.it")
    ):
        return url
    qs = dict(parse_qsl(parsed.query, keep_blank_values=True))
    try:
        width = int(qs.get("width") or "0")
    except ValueError:
        width = 0
    if width < 960:
        qs["width"] = "1080"
    return urlunparse(parsed._replace(query=urlencode(qs)))


def _entry_image(entry) -> str | None:
    candidates: list[tuple[int, str]] = []
    for key in ("media_content", "media_thumbnail"):
        media = entry.get(key)
        if not isinstance(media, list):
            continue
        for item in media:
            url = (item or {}).get("url")
            if url:
                candidates.append((_media_width(item), url))
    for link in entry.get("links", []):
        if link.get("rel") == "enclosure" and str(link.get("type", "")).startswith("image"):
            href = link.get("href")
            if href:
                candidates.append((_media_width(link), href))
    if not candidates:
        return None
    candidates.sort(key=lambda c: c[0], reverse=True)
    return _upgrade_image_url(candidates[0][1])


class RssCollector(BaseCollector):
    kind = "rss"

    def fetch(self) -> FetchResult:
        src = self.source
        headers = {}
        if src.etag:
            headers["If-None-Match"] = src.etag
        if src.last_modified:
            headers["If-Modified-Since"] = src.last_modified

        with http_client() as client:
            resp = client.get(src.feed_url, headers=headers)

        if resp.status_code == 304:
            return FetchResult([], not_modified=True)
        resp.raise_for_status()

        feed = feedparser.parse(resp.content)
        items: list[RawItem] = []
        cap = get_settings().max_items_per_fetch
        for entry in feed.entries[:cap]:
            url = clean_url(entry.get("link") or "")
            external_id = entry.get("id") or entry.get("guid") or url
            title = normalize_ws(entry.get("title"))
            if not url or not title:
                continue
            summary = strip_html(entry.get("summary") or entry.get("description"))
            content_html = ""
            if entry.get("content"):
                content_html = entry["content"][0].get("value") or ""
            if not summary and content_html:
                summary = strip_html(content_html)
            items.append(
                RawItem(
                    source_id=str(src.id),
                    external_id=external_id[:500],
                    url=url,
                    title=title,
                    summary=summary or None,
                    published_at=_parsed_datetime(entry),
                    author=normalize_ws(entry.get("author")) or None,
                    image_url=_entry_image(entry),
                    lang=src.lang or "en",
                    extra={"content_html": content_html} if content_html else {},
                )
            )
        return FetchResult(
            items,
            etag=resp.headers.get("ETag"),
            last_modified=resp.headers.get("Last-Modified"),
        )


class ArxivCollector(RssCollector):
    """arXiv's rss endpoint is standard RSS; we just tidy the fields."""

    kind = "arxiv"

    def fetch(self) -> FetchResult:
        result = super().fetch()
        for item in result.items:
            # arXiv ids look like 'oai:arXiv.org:2401.01234' — keep the bare id
            if "arXiv.org:" in item.external_id:
                item.external_id = "arxiv:" + item.external_id.split("arXiv.org:")[-1]
            # titles carry a trailing '. (arXiv:...)' sometimes
            item.title = item.title.split(". (arXiv:")[0].strip()
            if item.summary:
                item.summary = _clean_arxiv_summary(item.summary)
        return result
