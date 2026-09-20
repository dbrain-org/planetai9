"""Orchestrator: collect → parse → tag → dedup/event → score → persist."""

from __future__ import annotations

import logging
import re
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime, timedelta

import httpx
from planetai_shared.db import models
from planetai_shared.db.base import session_scope
from planetai_shared.enums import PRIMARY_SOURCE_TYPES
from planetai_shared.settings import get_settings
from slugify import slugify
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from planetai_ingest.collectors import RawItem, collector_for
from planetai_ingest.pipeline import classify, dedup
from planetai_ingest.pipeline.entities import (
    EntityHit,
    EntityIndex,
    auto_tag_people,
    choose_primary,
    is_linkable_person_entity,
)
from planetai_ingest.pipeline.score import persist_factors, score_event
from planetai_ingest.text import (
    clean_url,
    content_hash,
    extract_article_paragraphs,
    extract_og_image,
    simhash64,
    strip_html,
    summarize_excerpt,
)

log = logging.getLogger(__name__)
_settings = get_settings()

_AI_TERMS = re.compile(
    r"\b(a\.?i\.?|artificial intelligence|machine learning|deep learning|llm|"
    r"large language model|neural net|transformer|diffusion|gpt|chatgpt|claude|gemini|"
    r"llama|mistral|deepseek|qwen|grok|openai|anthropic|deepmind|hugging ?face|nvidia|"
    r"agent|agentic|chatbot|inference|fine[- ]tun|training run|benchmark|multimodal|"
    r"language model|foundation model|frontier model|reasoning model|open model|robot|"
    r"yapay zek[aâ]|makine öğren|derin öğren|büyük dil model|üretken yapay|sohbet bot|"
    r"dil model|yapay sinir|otonom sürüş|otonom araç)\b",
    re.IGNORECASE,
)
# entity names that are ordinary words / big conglomerates — a bare match here
# does not by itself make a story "about AI".
_AMBIGUOUS_ENTITIES = {"amazon", "microsoft", "google", "meta", "apple"}
_BODY_MIN = 1400  # below this we fetch the article page for fuller text


def collect_source(source_id: uuid.UUID) -> dict:
    """Run one source end-to-end. Returns a small stats dict."""
    stats = {"seen": 0, "written": 0, "source": str(source_id)}
    with session_scope() as db:
        source = db.get(models.Source, source_id)
        if source is None or not source.enabled:
            return stats
        if source.kind == "youtube":
            collector_for(source).fetch()
            link_videos(db)
            backfill_people_on_events(db)
            source.last_fetched_at = datetime.now(UTC)
            return stats
        if not source.feed_url:
            return stats

        try:
            result = collector_for(source).fetch()
        except Exception as exc:  # noqa: BLE001 - keep other sources alive
            log.warning("collect %s failed: %s", source.slug, exc)
            return stats

        source.last_fetched_at = datetime.now(UTC)
        if result.not_modified:
            return stats
        if result.etag:
            source.etag = result.etag
        if result.last_modified:
            source.last_modified = result.last_modified

        index = EntityIndex.from_db(db)
        topics = _topics_payload(db)

        # pre-fetch article pages concurrently for items we haven't seen
        cutoff = datetime.now(UTC) - timedelta(days=_settings.max_article_age_days)
        known = set(
            db.scalars(
                select(models.Article.external_id).where(models.Article.source_id == source.id)
            ).all()
        )
        to_fetch = [
            it
            for it in result.items
            if it.external_id not in known
            and (it.published_at or datetime.now(UTC)) >= cutoff
            and source.kind != "arxiv"
            and len(extract_article_paragraphs(it.extra.get("content_html", ""))) < _BODY_MIN
        ]
        pages: dict[str, tuple[str | None, str]] = {}
        if to_fetch:
            with ThreadPoolExecutor(max_workers=8) as pool:
                futures = {pool.submit(_fetch_page, clean_url(it.url)): it.url for it in to_fetch}
                for fut in as_completed(futures):
                    pages[futures[fut]] = fut.result()

        for item in result.items:
            stats["seen"] += 1
            if _ingest_item(db, source, item, index, topics, pages.get(item.url)):
                stats["written"] += 1
    return stats


def _topics_payload(db: Session) -> list[dict]:
    return [
        {"id": t.id, "keywords": t.keywords or []} for t in db.scalars(select(models.Topic)).all()
    ]


def _ingest_item(
    db: Session,
    source: models.Source,
    item: RawItem,
    index: EntityIndex,
    topics: list[dict],
    page: tuple[str | None, str] | None = None,
) -> bool:
    existing = db.scalar(
        select(models.Article).where(
            models.Article.source_id == source.id,
            models.Article.external_id == item.external_id,
        )
    )
    if existing is not None:
        return False

    published = item.published_at or datetime.now(UTC)
    cutoff = datetime.now(UTC) - timedelta(days=_settings.max_article_age_days)
    if published < cutoff:
        return False

    url = clean_url(item.url)
    summary_src = strip_html(item.summary) if item.summary else ""
    clean_summary = summarize_excerpt(summary_src) or None
    body_excerpt = summary_src[:500] or None

    hits = [
        h
        for h in index.match(item.title, summary_src)
        if h.entity_type != "person" or is_linkable_person_entity(h.name, entity_type="person")
    ]
    # Auto-discover people named in the headline / summary (create if missing).
    for person in auto_tag_people(db, title=item.title, body=summary_src, source="news"):
        if any(h.entity_id == str(person.id) for h in hits):
            continue
        in_title = person.name.lower() in item.title.lower()
        hits.append(
            EntityHit(
                str(person.id),
                "person",
                person.name,
                float(person.tier or 0.4),
                in_title,
            )
        )

    title_anchor_ids = frozenset(h.entity_id for h in hits if h.in_title)

    # relevance gate: drop off-topic posts from broad feeds. Keep anything that
    # names a *specific* AI entity or reads as AI. Common-word company names
    # (Amazon, Apple...) alone are not enough — they need an AI term too.
    strong_hit = any(h.name.lower() not in _AMBIGUOUS_ENTITIES for h in hits)
    if (
        source.kind != "arxiv"
        and not strong_hit
        and not _AI_TERMS.search(f"{item.title}\n{summary_src}")
    ):
        return False

    sh = simhash64(f"{item.title} {clean_summary or ''}")

    # article body: prefer the feed's own syndicated content, else the fetched page
    feed_html = item.extra.get("content_html", "")
    body_text = extract_article_paragraphs(feed_html) if feed_html else ""
    image_url = item.image_url

    if source.kind == "arxiv":
        body_text = summary_src  # abstracts are already the full text
    elif len(body_text) < _BODY_MIN or not image_url:
        og, page_html = page if page is not None else _fetch_page(url)
        image_url = image_url or og
        if page_html:
            page_body = extract_article_paragraphs(page_html)
            if len(page_body) > len(body_text):
                body_text = page_body
    body_text = body_text or None

    article = models.Article(
        source_id=source.id,
        external_id=item.external_id,
        canonical_url=url,
        title=item.title,
        author=item.author,
        raw_summary=summary_src or None,
        clean_summary=clean_summary,
        body_excerpt=body_excerpt,
        body_text=body_text,
        lang=item.lang,
        published_at=published,
        fetched_at=datetime.now(UTC),
        image_url=image_url,
        content_hash=content_hash(item.title, url),
        dedup_simhash=sh,
    )
    db.add(article)
    db.flush()

    draft = dedup.ArticleDraft(
        title=item.title,
        canonical_url=url,
        simhash=sh,
        published_at=published,
        anchor_entity_ids=title_anchor_ids,
    )
    event = dedup.find_event(db, draft)
    if event is None:
        event = _create_event(db, source, item, clean_summary, hits, topics, published, image_url)
    else:
        _attach_to_event(db, event, source, hits)
        if not event.image_url and image_url:
            event.image_url = image_url

    article.event_id = event.id
    db.flush()

    _recompute_event(db, event)
    return True


def _create_event(
    db: Session,
    source: models.Source,
    item: RawItem,
    clean_summary: str | None,
    hits: list[EntityHit],
    topics: list[dict],
    published: datetime,
    image_url: str | None = None,
) -> models.Event:
    primary = choose_primary(hits)
    category = classify.classify_category(
        title=item.title,
        summary=clean_summary or "",
        source_kind=source.kind,
        source_slug=source.slug,
        hits=hits,
    )
    event = models.Event(
        slug=_unique_slug(db, item.title),
        title=item.title,
        summary=clean_summary,
        category=category,
        primary_entity_id=uuid.UUID(primary.entity_id) if primary else None,
        first_seen_at=published,
        last_activity_at=published,
        image_url=image_url or item.image_url,
        lang=item.lang or "en",
        source_count=1,
        status="active",
    )
    db.add(event)
    db.flush()

    for hit in hits:
        db.add(
            models.EventEntity(
                event_id=event.id,
                entity_id=uuid.UUID(hit.entity_id),
                role="primary" if (primary and hit.entity_id == primary.entity_id) else "mentioned",
                confidence=0.9 if hit.in_title else 0.6,
            )
        )
    for topic_id, weight in classify.match_topics(
        title=item.title, summary=clean_summary or "", topics=topics
    ):
        db.add(models.EventTopic(event_id=event.id, topic_id=topic_id, weight=weight))
    db.flush()
    return event


def _attach_to_event(
    db: Session, event: models.Event, source: models.Source, hits: list[EntityHit]
) -> None:
    known = {
        str(r)
        for r in db.scalars(
            select(models.EventEntity.entity_id).where(models.EventEntity.event_id == event.id)
        ).all()
    }
    for hit in hits:
        if hit.entity_id not in known:
            db.add(
                models.EventEntity(
                    event_id=event.id,
                    entity_id=uuid.UUID(hit.entity_id),
                    role="mentioned",
                    confidence=0.5,
                )
            )
    # promote representative title/summary if this source is more authoritative
    if source.source_type in {str(t) for t in PRIMARY_SOURCE_TYPES}:
        newest = db.scalar(
            select(models.Article)
            .where(models.Article.event_id == event.id)
            .order_by(models.Article.published_at.desc())
            .limit(1)
        )
        if newest and newest.source_id == source.id:
            event.title = newest.title
            event.summary = newest.clean_summary or event.summary
            event.lang = source.lang or event.lang


def _recompute_event(db: Session, event: models.Event) -> None:
    agg = db.execute(
        select(
            func.count(func.distinct(models.Article.source_id)),
            func.max(models.Article.published_at),
        ).where(models.Article.event_id == event.id)
    ).one()
    event.source_count = int(agg[0] or 1)
    if agg[1]:
        event.last_activity_at = max(event.last_activity_at, agg[1])

    # keep the richest available body on the event
    bodies = db.scalars(
        select(models.Article.body_text).where(
            models.Article.event_id == event.id, models.Article.body_text.isnot(None)
        )
    ).all()
    if bodies:
        best = max(bodies, key=len)
        if not event.body_text or len(best) > len(event.body_text):
            event.body_text = best

    total, band, factors = score_event(db, event)
    event.importance = total
    event.impact = band
    persist_factors(db, event, factors, total)


def _fetch_page(url: str) -> tuple[str | None, str]:
    """Fetch a page once; return (og_image, full_html). Never raises."""
    try:
        with httpx.Client(
            headers={"User-Agent": _settings.user_agent},
            timeout=httpx.Timeout(8.0, connect=4.0),
            follow_redirects=True,
        ) as client:
            resp = client.get(url)
            if resp.status_code >= 400 or "text/html" not in resp.headers.get("content-type", ""):
                return None, ""
            return extract_og_image(resp.text, base_url=str(resp.url)), resp.text
    except (httpx.HTTPError, ValueError, UnicodeError):
        return None, ""


def _unique_slug(db: Session, title: str) -> str:
    base = slugify(title)[:200] or "event"
    suffix = uuid.uuid4().hex[:6]
    return f"{base}-{suffix}"


# --------------------------------------------------------------------------- videos


def link_videos(db: Session) -> int:
    """Connect videos to entities/topics; auto-create person entities from guest names."""
    topics = db.scalars(select(models.Topic)).all()
    made = 0
    videos = db.scalars(select(models.Video)).all()

    # Pass 1 — discover guests ("X ile", title patterns) and ensure person rows exist.
    for video in videos:
        auto_tag_people(
            db,
            title=video.title,
            body=video.description or "",
            source="video",
        )
    db.flush()

    index = EntityIndex.from_db(db)
    for video in videos:
        text = f"{video.title} {video.description or ''}"
        existing = {
            (r.target_type, str(r.target_id))
            for r in db.scalars(
                select(models.VideoLink).where(models.VideoLink.video_id == video.id)
            ).all()
        }
        # Prefer explicit guest extraction links first.
        for person in auto_tag_people(
            db,
            title=video.title,
            body=video.description or "",
            source="video",
        ):
            key = ("entity", str(person.id))
            if key not in existing:
                db.add(
                    models.VideoLink(
                        video_id=video.id,
                        target_type="entity",
                        target_id=person.id,
                    )
                )
                made += 1
                existing.add(key)
        for hit in index.match(video.title, video.description or ""):
            if hit.entity_type == "person" and not is_linkable_person_entity(
                hit.name, entity_type="person"
            ):
                continue
            key = ("entity", hit.entity_id)
            if key not in existing:
                db.add(
                    models.VideoLink(
                        video_id=video.id,
                        target_type="entity",
                        target_id=uuid.UUID(hit.entity_id),
                    )
                )
                made += 1
                existing.add(key)
        low = text.lower()
        for topic in topics:
            if any(k.lower() in low for k in (topic.keywords or [])):
                key = ("topic", str(topic.id))
                if key not in existing:
                    db.add(
                        models.VideoLink(video_id=video.id, target_type="topic", target_id=topic.id)
                    )
                    made += 1
                    existing.add(key)
    return made


# Types we link from the dictionary into article bodies (people + firms only).
_BACKFILL_TYPES = frozenset(
    {
        "person",
        "company",
        "institution",
    }
)


def backfill_people_on_events(db: Session, *, limit: int | None = None) -> int:
    """Attach people + companies/orgs to existing events via dictionary + auto-extract.

    Matches title / summary / body_text so names that only appear in the article
    body (common for long PlanetAI9 posts) still get linked.

    Also drops EventEntity links to junk auto-people ("Kuantum Çağrısı", …).
    """
    made = 0
    index = EntityIndex.from_db(db)
    stmt = (
        select(models.Event)
        .where(models.Event.status == "active")
        .order_by(models.Event.last_activity_at.desc())
    )
    if limit is not None:
        stmt = stmt.limit(limit)
    events = db.scalars(stmt).all()
    for ev in events:
        # Prune junk person links first so they stop showing in articles.
        for ee in list(
            db.scalars(select(models.EventEntity).where(models.EventEntity.event_id == ev.id)).all()
        ):
            ent = db.get(models.Entity, ee.entity_id)
            if ent is None:
                continue
            if ent.type == "person" and not is_linkable_person_entity(
                ent.name, entity_type="person"
            ):
                db.delete(ee)

        existing = {
            str(r.entity_id)
            for r in db.scalars(
                select(models.EventEntity).where(models.EventEntity.event_id == ev.id)
            ).all()
        }
        body = " ".join(p for p in (ev.summary, ev.body_text) if p) or ""
        for hit in index.match(ev.title, body):
            if hit.entity_type not in _BACKFILL_TYPES or hit.entity_id in existing:
                continue
            if hit.entity_type == "person" and not is_linkable_person_entity(
                hit.name, entity_type="person"
            ):
                continue
            db.add(
                models.EventEntity(
                    event_id=ev.id,
                    entity_id=hit.entity_id,
                    role="mentioned",
                    confidence=0.8 if hit.in_title else 0.65,
                )
            )
            made += 1
            existing.add(hit.entity_id)
        for person in auto_tag_people(db, title=ev.title, body=body, source="news"):
            if str(person.id) in existing:
                continue
            in_title = person.name.lower() in ev.title.lower()
            db.add(
                models.EventEntity(
                    event_id=ev.id,
                    entity_id=person.id,
                    role="mentioned",
                    confidence=0.7 if in_title else 0.55,
                )
            )
            made += 1
            existing.add(str(person.id))
    return made


# --------------------------------------------------------------------------- entry


def run_all(only_kinds: set[str] | None = None) -> dict:
    started = datetime.now(UTC)
    totals = {"seen": 0, "written": 0, "sources": 0}
    with session_scope() as db:
        source_ids = db.scalars(
            select(models.Source.id).where(models.Source.enabled.is_(True))
        ).all()
        kinds = dict(db.execute(select(models.Source.id, models.Source.kind)).all())

    for sid in source_ids:
        if only_kinds and kinds.get(sid) not in only_kinds:
            continue
        stats = collect_source(sid)
        totals["seen"] += stats["seen"]
        totals["written"] += stats["written"]
        totals["sources"] += 1

    with session_scope() as db:
        people_links = backfill_people_on_events(db)
        totals["people_links"] = people_links
        db.add(
            models.IngestRun(
                job="collect:" + (",".join(sorted(only_kinds)) if only_kinds else "all"),
                started_at=started,
                finished_at=datetime.now(UTC),
                ok=True,
                items_seen=totals["seen"],
                items_written=totals["written"],
                detail=str(totals),
            )
        )
    log.info("ingest run complete: %s", totals)
    return totals
