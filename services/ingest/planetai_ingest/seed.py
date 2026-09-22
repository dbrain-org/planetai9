"""Upsert seed data (entities, relations, sources, topics) into the database.

Idempotent: safe to run on every ingest start."""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from planetai_shared.db import models
from planetai_shared.db.base import session_scope
from planetai_shared.enums import EntityType
from slugify import slugify
from sqlalchemy import select
from sqlalchemy.orm import Session

from planetai_ingest import config

log = logging.getLogger(__name__)


def _upsert_entity(db: Session, *, slug: str, name: str, type_: str, **extra) -> models.Entity:
    ent = db.scalar(select(models.Entity).where(models.Entity.slug == slug))
    if ent is None:
        ent = models.Entity(slug=slug, name=name, type=type_, first_seen_at=datetime.now(UTC))
        db.add(ent)
    ent.name = name
    ent.type = type_
    for key, value in extra.items():
        if value is not None:
            setattr(ent, key, value)
    db.flush()
    return ent


def seed_entities(db: Session) -> None:
    data = config.entities()
    groups = {
        "companies": EntityType.COMPANY,
        "model_families": EntityType.MODEL,
        "products": EntityType.PRODUCT,
        "technologies": EntityType.TECHNOLOGY,
        "people": EntityType.PERSON,
        "institutions": EntityType.INSTITUTION,
    }
    # first pass: create everything so parents resolve
    by_slug: dict[str, models.Entity] = {}
    for group, etype in groups.items():
        for row in data.get(group, []):
            ent = _upsert_entity(
                db,
                slug=row["slug"],
                name=row["name"],
                type_=str(etype),
                aliases=row.get("aliases") or [],
                tier=row.get("tier"),
                description=row.get("desc"),
            )
            by_slug[row["slug"]] = ent
    # second pass: parent links
    for group in groups:
        for row in data.get(group, []):
            parent_slug = row.get("parent")
            if parent_slug and parent_slug in by_slug:
                by_slug[row["slug"]].parent_id = by_slug[parent_slug].id
    db.flush()


def seed_relations(db: Session) -> None:
    slug_to_id = dict(db.execute(select(models.Entity.slug, models.Entity.id)).all())
    existing = {
        (f, t, r)
        for f, t, r in db.execute(
            select(
                models.EntityRelation.from_entity_id,
                models.EntityRelation.to_entity_id,
                models.EntityRelation.relation,
            )
        ).all()
    }
    for frm, rel, to in config.entity_relations():
        fid, tid = slug_to_id.get(frm), slug_to_id.get(to)
        if not fid or not tid or (fid, tid, rel) in existing:
            continue
        db.add(models.EntityRelation(from_entity_id=fid, to_entity_id=tid, relation=rel))
    db.flush()


def seed_topics(db: Session) -> None:
    for row in config.topics():
        topic = db.scalar(select(models.Topic).where(models.Topic.slug == row["slug"]))
        if topic is None:
            topic = models.Topic(slug=row["slug"])
            db.add(topic)
        topic.name = row["name"]
        topic.kind = row.get("kind", "theme")
        topic.keywords = row.get("keywords") or []
    db.flush()


def seed_sources(db: Session) -> None:
    slug_to_id = dict(db.execute(select(models.Entity.slug, models.Entity.id)).all())
    for row in config.sources():
        slug = row.get("slug") or slugify(row["name"])
        src = db.scalar(select(models.Source).where(models.Source.slug == slug))
        if src is None:
            src = models.Source(slug=slug)
            db.add(src)
        src.name = row["name"]
        src.homepage_url = row["homepage_url"]
        src.feed_url = row.get("feed_url")
        src.kind = row["kind"]
        src.source_type = row["source_type"]
        src.lang = row.get("lang", "en")
        src.trust_weight = row.get("trust_weight", 0.5)
        src.poll_interval_sec = row.get("poll_interval_sec", 900)
        src.enabled = row.get("enabled", True)
        src.entity_id = slug_to_id.get(row.get("entity"))
        src.config = row.get("config") or {}
    db.flush()


_JUNK_AUTHOR_SLUGS = ("no-mod", "someone-else", "other")


def seed_editorial(db: Session) -> None:
    from planetai_shared.author_auth import hash_api_key
    from planetai_shared.settings import get_settings

    # Drop leftover test authors so they never show on /yazarlar.
    db.query(models.Author).filter(models.Author.slug.in_(_JUNK_AUTHOR_SLUGS)).delete(
        synchronize_session=False
    )

    data = config.editorial()
    for row in data.get("authors", []):
        author = db.scalar(select(models.Author).where(models.Author.slug == row["slug"]))
        if author is None:
            author = models.Author(slug=row["slug"])
            db.add(author)
        author.name = row["name"]
        author.role = row.get("role")
        author.bio = (row.get("bio") or "").strip() or None
        author.avatar_url = row.get("avatar_url")
        author.links = row.get("links") or {}
        author.status = row.get("status") or "active"
        if row.get("email"):
            author.email = str(row["email"]).strip() or None
        if "is_moderator" in row:
            author.is_moderator = bool(row["is_moderator"])
        # Studio secret hash → DB so /yazar works after seed without AUTHOR_KEYS.
        # Prefer api_key_hash (committed); api_key accepted for one-off local seeds.
        # Omit both to leave an existing hash untouched.
        raw_hash = (row.get("api_key_hash") or "").strip().lower()
        raw_key = (row.get("api_key") or "").strip()
        if raw_hash:
            author.api_key_hash = raw_hash
        elif raw_key:
            author.api_key_hash = hash_api_key(raw_key)
    db.flush()
    for row in data.get("columns", []) or []:
        post = db.scalar(select(models.OpinionPost).where(models.OpinionPost.slug == row["slug"]))
        author = db.scalar(select(models.Author).where(models.Author.slug == row["author"]))
        if author is None:
            continue
        if post is None:
            post = models.OpinionPost(slug=row["slug"])
            db.add(post)
        post.author_id = author.id
        post.title = row["title"]
        post.dek = row.get("dek")
        post.body = row["body"].strip()
        post.hero_image_url = row.get("hero_image_url")
        post.status = row.get("status", "published")
        post.published_at = row.get("published_at") or datetime.now(UTC)
    db.flush()

    # Persist admin panel token hash so /yonetim works from DB (env remains fallback).
    admin_token = (get_settings().admin_token or "").strip()
    if admin_token:
        digest = hash_api_key(admin_token)
        cred = db.scalar(select(models.SiteCredential).where(models.SiteCredential.kind == "admin"))
        if cred is None:
            db.add(models.SiteCredential(kind="admin", secret_hash=digest))
        else:
            cred.secret_hash = digest
    db.flush()


# Retired 2026-09-13 when the Marketplace was scoped to Turkish developers'
# open-source projects only (these were global tools with no Turkish origin).
# Upserting never deletes rows dropped from the YAML, so retire them explicitly
# here — this runs on every ingest start, so it also cleans up prod on deploy.
_RETIRED_MARKETPLACE_SLUGS = {
    "whisper",
    "piper-tts",
    "ollama",
    "filesystem-mcp",
    "llamaindex",
    "open-webui",
}


def seed_marketplace(db: Session) -> None:
    db.query(models.MarketplaceApp).filter(
        models.MarketplaceApp.slug.in_(_RETIRED_MARKETPLACE_SLUGS)
    ).delete(synchronize_session=False)
    for row in config.marketplace().get("apps", []):
        app = db.scalar(
            select(models.MarketplaceApp).where(models.MarketplaceApp.slug == row["slug"])
        )
        if app is None:
            app = models.MarketplaceApp(slug=row["slug"])
            db.add(app)
        app.name = row["name"]
        app.tagline = row["tagline"]
        app.description = row.get("description")
        app.url = row["url"]
        app.repo_url = row.get("repo_url")
        app.category = row["category"]
        app.pricing = row.get("pricing", "free")
        app.logo_url = row.get("logo_url")
        app.author_name = row["author_name"]
        app.author_url = row.get("author_url")
        app.is_turkish_dev = row.get("is_turkish_dev", False)
        app.status = row.get("status", "approved")
        app.featured = row.get("featured", False)
    db.flush()


def seed_curated_links(db: Session) -> None:
    """Ensure YAML rows exist. Never overwrite cards the /yazar studio already owns —
    only insert names that are still missing (so prod picks up new FineWeb/Kumru cards).

    Exception: a small set of research corpora we manage in YAML — refresh url/notes
    so prod stays correct after deploy without wiping editor-added cards.
    """
    managed = {
        "FineWeb2-HQ (Türkçe)",
        "HPLT 3.0",
        "CulturaX",
        "Cosmos Turkish",
        "Türkçe Vikipedi",
        "vngrs-web-corpus",
        "Kumru (VNGRS)",
        "VNGRS",
        "Hugging Face",
        "Turkish Data Depository (TDD)",
        "Peak / Hazelcast",
    }
    data = config.turkiye()
    for collection in ("tr_data", "tr_ecosystem"):
        rows = data.get(collection) or []
        yaml_names = {row["name"] for row in rows}
        existing = {
            r.name: r
            for r in db.scalars(
                select(models.CuratedLink).where(models.CuratedLink.collection == collection)
            ).all()
        }
        # Veri Vatanı şirket listesini YAML ile hizala — eski ekosistem kartlarını kapat
        if collection == "tr_ecosystem":
            for name, link in existing.items():
                if name not in yaml_names:
                    link.enabled = False
        max_order = max((r.sort_order for r in existing.values()), default=-1)
        next_order = max_order + 1
        for i, row in enumerate(rows):
            name = row["name"]
            if name in existing:
                if name in managed or collection == "tr_ecosystem":
                    link = existing[name]
                    link.url = row["url"]
                    link.kind = row.get("kind", link.kind)
                    link.note_tr = row.get("note_tr")
                    link.note_en = row.get("note_en")
                    link.enabled = True
                    link.sort_order = i
                continue
            db.add(
                models.CuratedLink(
                    collection=collection,
                    name=name,
                    url=row["url"],
                    kind=row.get("kind", ""),
                    note_tr=row.get("note_tr"),
                    note_en=row.get("note_en"),
                    sort_order=next_order if existing else i,
                    enabled=True,
                )
            )
            if existing:
                next_order += 1
            existing[name] = None  # mark present for subsequent loops
    db.flush()


def seed_stories(db: Session) -> None:
    """Upsert canonical PlanetAI9 story bodies (image paths + copy) from stories.yaml."""
    for row in config.stories().get("stories") or []:
        slug = row["slug"]
        body = (row.get("body") or "").strip() or None
        image_url = row.get("image_url")
        event = db.scalar(select(models.Event).where(models.Event.slug == slug))
        if event is None:
            log.warning("seed story skipped — event missing: %s", slug)
            continue
        if body:
            event.body_text = body
        if image_url:
            event.image_url = image_url
        for article in db.scalars(
            select(models.Article).where(models.Article.event_id == event.id)
        ).all():
            if body:
                article.body_text = body
            if image_url:
                article.image_url = image_url
        log.info("seed story updated: %s", slug)
    db.flush()


def fix_llmradar_asset_paths(db: Session) -> None:
    """Replace deleted placeholder SVGs with the JPG screenshots in article bodies."""
    pairs = (
        ("/news/llmradar-benchmarks.svg", "/news/llmradar-benchmarks.jpg"),
        ("/news/llmradar-intel.svg", "/news/llmradar-intel.jpg"),
        ("/news/llmradar-launch.svg", "/news/llmradar-launch.jpg"),
        ("/news/llmradar-market.svg", "/news/llmradar-market.jpg"),
    )
    for model in (models.Event, models.Article):
        rows = db.scalars(
            select(model).where(model.body_text.isnot(None) | model.image_url.isnot(None))
        ).all()
        for row in rows:
            body = row.body_text or ""
            img = row.image_url or ""
            if "llmradar" not in body and "llmradar" not in img:
                continue
            for old, new in pairs:
                body = body.replace(old, new)
                img = img.replace(old, new)
            if row.body_text is not None:
                row.body_text = body
            if row.image_url is not None:
                row.image_url = img or None
    db.flush()


def seed_llm_developers(db: Session) -> None:
    """Upsert curated TR LLM producer profiles for /turkiye-llm."""
    for i, row in enumerate(config.llm_developers().get("developers") or []):
        slug = row["slug"]
        ent = db.scalar(select(models.LlmDeveloper).where(models.LlmDeveloper.slug == slug))
        if ent is None:
            ent = models.LlmDeveloper(slug=slug)
            db.add(ent)
        ent.display_name = row["display_name"]
        ent.kind = row.get("kind") or "org"
        ent.bio = (row.get("bio") or "").strip() or None
        ent.logo_url = row.get("logo_url")
        ent.website_url = row.get("website_url")
        ent.hf_url = row.get("hf_url")
        ent.linkedin_url = (row.get("linkedin_url") or "").strip() or None
        ent.github_url = (row.get("github_url") or "").strip() or None
        ent.city = row.get("city")
        ent.lat = row.get("lat")
        ent.lng = row.get("lng")
        ent.radar_slug = row.get("radar_slug") or slug
        ent.published = bool(row.get("published", True))
        ent.sort_order = int(row.get("sort_order", i * 10))
    db.flush()


def run() -> None:
    with session_scope() as db:
        seed_entities(db)
        seed_relations(db)
        seed_topics(db)
        seed_sources(db)
        seed_editorial(db)
        seed_marketplace(db)
        seed_curated_links(db)
        seed_stories(db)
        seed_llm_developers(db)
        fix_llmradar_asset_paths(db)
    log.info("seed complete")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run()
