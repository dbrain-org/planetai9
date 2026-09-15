"""PlanetAI9 YouTube channel collector.

Primary source is the channel's public Atom feed (``feeds/videos.xml`` — no API
key, works from any IP). If ``PLANETAI_YOUTUBE_API_KEY`` is set the Data API v3
then enriches each video with duration / view count / tags. A full channel-page
scrape is kept only as a last resort (YouTube often blocks it from datacenter IPs).
Writes straight into ``videos``."""

from __future__ import annotations

import json
import logging
import re
from datetime import UTC, datetime, timedelta
from time import mktime

import feedparser
from dateutil import parser as dtparser
from planetai_shared.db import models
from planetai_shared.db.base import session_scope
from planetai_shared.settings import get_settings
from sqlalchemy import select

from planetai_ingest.collectors.base import FetchResult, http_client

log = logging.getLogger(__name__)
API = "https://www.googleapis.com/youtube/v3"
_ISO_DUR = re.compile(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?")
_CHANNEL_ID = re.compile(r'"(?:channelId|externalId)":"(UC[\w-]{20,})"')
_HANDLE = re.compile(r"@[\w.-]+")
_YT_INITIAL = re.compile(r"ytInitialData\s*=\s*({.+?})\s*;\s*</script>", re.DOTALL)
_REL = re.compile(
    r"(\d+)\s*(second|minute|hour|day|week|month|year|saniye|dakika|saat|gün|hafta|ay|yıl)"
)


def _duration_seconds(iso: str) -> int:
    m = _ISO_DUR.match(iso or "")
    if not m:
        return 0
    h, mi, s = (int(x) if x else 0 for x in m.groups())
    return h * 3600 + mi * 60 + s


class YouTubeCollector:
    kind = "youtube"

    def __init__(self, source: models.Source):
        self.source = source
        self.settings = get_settings()

    # ---------------------------------------------------------------- resolve

    def _channel_id(self, client) -> str | None:
        s = self.settings
        if s.youtube_channel_id:
            return s.youtube_channel_id
        cfg = self.source.config or {}
        if cfg.get("channel_id"):
            return cfg["channel_id"]
        handle = cfg.get("handle") or s.youtube_channel_id
        if not handle:
            m = _HANDLE.search(self.source.homepage_url or "")
            handle = m.group(0) if m else None
        if not handle:
            return None
        try:
            page = client.get(f"https://www.youtube.com/{handle}")
            hit = _CHANNEL_ID.search(page.text)
            return hit.group(1) if hit else None
        except Exception as exc:  # noqa: BLE001
            log.warning("youtube: could not resolve %s: %s", handle, exc)
            return None

    # ---------------------------------------------------------------- fetch

    def fetch(self) -> FetchResult:
        with http_client() as client:
            cfg = self.source.config or {}
            handle = cfg.get("handle") or "@planetai9"
            channel_id = (
                cfg.get("channel_id")
                or self.settings.youtube_channel_id
                or self._channel_id(client)
            )

            found = 0
            if channel_id:
                found = self._fetch_rss(client, channel_id)
                if self.settings.youtube_api_key:
                    try:
                        self._fetch_api(client, channel_id)  # enrich durations / views
                    except Exception as exc:  # noqa: BLE001
                        log.warning("youtube: Data API enrich failed: %s", exc)

            if found == 0:  # RSS empty or no channel id — last-resort scrape
                try:
                    self._fetch_scrape(client, handle)
                except Exception as exc:  # noqa: BLE001
                    log.warning("youtube: channel-page scrape failed: %s", exc)
        return FetchResult([])  # side-effect collector

    # ---- channel Atom feed (no key, IP-agnostic) ------------------------

    def _fetch_rss(self, client, channel_id: str) -> int:
        url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
        try:
            resp = client.get(url)
            resp.raise_for_status()
        except Exception as exc:  # noqa: BLE001
            log.warning("youtube: channel feed fetch failed: %s", exc)
            return 0

        feed = feedparser.parse(resp.content)
        rows: list[dict] = []
        for e in feed.entries:
            vid = e.get("yt_videoid") or e.get("id", "").rsplit(":", 1)[-1]
            if len(vid) != 11:
                continue
            media = e.get("media_thumbnail") or []
            thumb = media[0].get("url") if media else ""
            published = None
            if e.get("published_parsed"):
                published = datetime.fromtimestamp(mktime(e.published_parsed), tz=UTC)
            rows.append(
                {
                    "id": vid,
                    "title": e.get("title", ""),
                    "description": (e.get("summary") or "")[:5000],
                    "thumbnail": thumb or f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
                    "duration": 0,  # _upsert_scrape keeps any existing value
                    "published": published,
                    "views": None,
                }
            )
        _upsert_scrape(rows)
        log.info("youtube: %d videos from channel feed", len(rows))
        return len(rows)

    # ---- scrape the channel page (no key, no RSS) ------------------------

    def _fetch_scrape(self, client, handle: str) -> None:
        resp = client.get(
            f"https://www.youtube.com/{handle}/videos",
            headers={"User-Agent": "Mozilla/5.0", "Accept-Language": "tr,en"},
        )
        resp.raise_for_status()
        m = _YT_INITIAL.search(resp.text)
        if not m:
            log.warning("youtube: ytInitialData not found for %s", handle)
            return
        try:
            data = json.loads(m.group(1))
        except json.JSONDecodeError:
            log.warning("youtube: could not parse ytInitialData")
            return

        rows = []
        for i, lv in enumerate(_iter_lockups(data)):
            vid = lv.get("contentId")
            if not vid or len(vid) != 11:
                continue
            md = lv.get("metadata", {}).get("lockupMetadataViewModel", {})
            title = (md.get("title") or {}).get("content", "")
            parts = _meta_parts(md)
            views = next(
                (_views(p) for p in parts if "view" in p.lower() or "görüntülenme" in p.lower()),
                None,
            )
            rel = next((p for p in parts if _REL.search(p.lower())), "")
            rows.append(
                {
                    "id": vid,
                    "title": title,
                    "description": "",
                    "thumbnail": f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
                    "duration": _hms_to_seconds(_badge_duration(lv)),
                    "published": _relative_date(rel)
                    if rel
                    else datetime.now(UTC) - timedelta(days=i),
                    "views": views,
                }
            )
        _upsert_scrape(rows)
        log.info("youtube: scraped %d videos for %s", len(rows), handle)

    # ---- Data API (with key) --------------------------------------------

    def _fetch_api(self, client, channel_id: str) -> None:
        key = self.settings.youtube_api_key
        ch = client.get(
            f"{API}/channels", params={"part": "contentDetails", "id": channel_id, "key": key}
        )
        ch.raise_for_status()
        items = ch.json().get("items", [])
        if not items:
            return
        uploads = items[0]["contentDetails"]["relatedPlaylists"]["uploads"]
        video_ids: list[str] = []
        token = None
        while len(video_ids) < 50:
            pl = client.get(
                f"{API}/playlistItems",
                params={
                    "part": "contentDetails",
                    "playlistId": uploads,
                    "maxResults": 50,
                    "pageToken": token or "",
                    "key": key,
                },
            )
            pl.raise_for_status()
            body = pl.json()
            video_ids += [i["contentDetails"]["videoId"] for i in body.get("items", [])]
            token = body.get("nextPageToken")
            if not token:
                break
        det = client.get(
            f"{API}/videos",
            params={
                "part": "snippet,contentDetails,statistics",
                "id": ",".join(video_ids[:50]),
                "key": key,
            },
        )
        det.raise_for_status()
        _upsert_api(det.json().get("items", []))


def _iter_lockups(node):
    if isinstance(node, dict):
        if "lockupViewModel" in node:
            yield node["lockupViewModel"]
        for v in node.values():
            yield from _iter_lockups(v)
    elif isinstance(node, list):
        for v in node:
            yield from _iter_lockups(v)


def _meta_parts(md: dict) -> list[str]:
    try:
        rows = md["metadata"]["contentMetadataViewModel"]["metadataRows"]
        return [
            p["text"]["content"]
            for row in rows
            for p in row.get("metadataParts", [])
            if p.get("text", {}).get("content")
        ]
    except (KeyError, TypeError):
        return []


def _badge_duration(lv: dict) -> str:
    def walk(n):
        if isinstance(n, dict):
            if n.get("badgeStyle") == "THUMBNAIL_OVERLAY_BADGE_STYLE_DEFAULT" and n.get("text"):
                return n["text"]
            for v in n.values():
                r = walk(v)
                if r:
                    return r
        elif isinstance(n, list):
            for v in n:
                r = walk(v)
                if r:
                    return r
        return ""

    return walk(lv.get("contentImage", {}))


def _hms_to_seconds(s: str) -> int:
    parts = [int(p) for p in re.findall(r"\d+", s or "")]
    if not parts:
        return 0
    while len(parts) < 3:
        parts.insert(0, 0)
    h, m, sec = parts[-3:]
    return h * 3600 + m * 60 + sec


def _views(s: str) -> int | None:
    digits = re.sub(r"[^\d]", "", s or "")
    return int(digits) if digits else None


_UNIT_DAYS = {
    "second": 0,
    "saniye": 0,
    "minute": 0,
    "dakika": 0,
    "hour": 0,
    "saat": 0,
    "day": 1,
    "gün": 1,
    "week": 7,
    "hafta": 7,
    "month": 30,
    "ay": 30,
    "year": 365,
    "yıl": 365,
}


def _relative_date(text: str) -> datetime:
    now = datetime.now(UTC)
    m = _REL.search((text or "").lower())
    if not m:
        return now
    n, unit = int(m.group(1)), m.group(2)
    return now - timedelta(days=n * _UNIT_DAYS.get(unit, 0))


def _upsert_scrape(rows: list[dict]) -> None:
    with session_scope() as db:
        for r in rows:
            video = db.scalar(select(models.Video).where(models.Video.youtube_id == r["id"]))
            if video is None:
                video = models.Video(youtube_id=r["id"])
                db.add(video)
                video.published_at = r["published"] or datetime.now(UTC)
            video.title = r["title"]
            if r["description"]:
                video.description = r["description"][:5000]
            video.thumbnail_url = r["thumbnail"]
            if r["duration"]:
                video.duration_sec = r["duration"]
            if r["views"] is not None:
                video.view_count = r["views"]


def _upsert_api(rows: list[dict]) -> None:
    with session_scope() as db:
        for row in rows:
            yid = row["id"]
            snip = row.get("snippet", {})
            stats = row.get("statistics", {})
            video = db.scalar(select(models.Video).where(models.Video.youtube_id == yid))
            if video is None:
                video = models.Video(youtube_id=yid)
                db.add(video)
            video.title = snip.get("title", "")
            video.description = (snip.get("description") or "")[:5000]
            thumbs = snip.get("thumbnails", {})
            video.thumbnail_url = (
                thumbs.get("maxres") or thumbs.get("high") or thumbs.get("default") or {}
            ).get("url")
            video.duration_sec = _duration_seconds(row.get("contentDetails", {}).get("duration"))
            video.published_at = _parse_dt(snip.get("publishedAt"))
            video.view_count = int(stats["viewCount"]) if stats.get("viewCount") else None
            video.topics = snip.get("tags", [])[:20]


def _parse_dt(value: str | None) -> datetime:
    return dtparser.parse(value) if value else datetime.now(UTC)
