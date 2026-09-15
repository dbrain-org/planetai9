"""PlanetAI ORM models. Mirrors docs/02-data-model.md."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import (
    ARRAY,
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from planetai_shared.db.base import Base, TimestampMixin, uuid_pk


class Source(Base, TimestampMixin):
    __tablename__ = "sources"

    id: Mapped[uuid.UUID] = uuid_pk()
    slug: Mapped[str] = mapped_column(String(120), unique=True)
    name: Mapped[str] = mapped_column(String(200))
    homepage_url: Mapped[str] = mapped_column(Text)
    feed_url: Mapped[str | None] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(String(20))
    source_type: Mapped[str] = mapped_column(String(30))
    lang: Mapped[str] = mapped_column(String(8), default="en")  # feed's publishing language
    trust_weight: Mapped[float] = mapped_column(Numeric(3, 2), default=0.5)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("entities.id", ondelete="SET NULL")
    )
    poll_interval_sec: Mapped[int] = mapped_column(Integer, default=900)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    last_fetched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    etag: Mapped[str | None] = mapped_column(Text)
    last_modified: Mapped[str | None] = mapped_column(Text)
    config: Mapped[dict] = mapped_column(JSONB, default=dict)

    articles: Mapped[list[Article]] = relationship(back_populates="source")


class Entity(Base, TimestampMixin):
    __tablename__ = "entities"

    id: Mapped[uuid.UUID] = uuid_pk()
    type: Mapped[str] = mapped_column(String(20))
    name: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(160), unique=True)
    aliases: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("entities.id", ondelete="SET NULL")
    )
    description: Mapped[str | None] = mapped_column(Text)
    entity_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)
    logo_url: Mapped[str | None] = mapped_column(Text)
    website_url: Mapped[str | None] = mapped_column(Text)
    tier: Mapped[float] = mapped_column(Numeric(3, 2), default=0.4)  # scoring: entity_impact
    first_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (Index("ix_entities_type", "type"),)


class EntityRelation(Base, TimestampMixin):
    __tablename__ = "entity_relations"

    id: Mapped[uuid.UUID] = uuid_pk()
    from_entity_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("entities.id", ondelete="CASCADE"))
    to_entity_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("entities.id", ondelete="CASCADE"))
    relation: Mapped[str] = mapped_column(String(30))
    since: Mapped[date | None] = mapped_column(Date)
    source_note: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (
        UniqueConstraint(
            "from_entity_id", "to_entity_id", "relation", name="entity_relations_edge"
        ),
    )


class Event(Base, TimestampMixin):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = uuid_pk()
    slug: Mapped[str] = mapped_column(String(220), unique=True)
    title: Mapped[str] = mapped_column(Text)
    summary: Mapped[str | None] = mapped_column(Text)
    body_text: Mapped[str | None] = mapped_column(Text)  # best multi-paragraph excerpt
    why_it_matters: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(30))
    primary_entity_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("entities.id", ondelete="SET NULL")
    )
    impact: Mapped[str] = mapped_column(String(10), default="low")
    importance: Mapped[float] = mapped_column(Numeric(4, 2), default=0)
    source_count: Mapped[int] = mapped_column(Integer, default=1)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_activity_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    is_top_signal: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="active")
    merged_into_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("events.id", ondelete="SET NULL")
    )
    image_url: Mapped[str | None] = mapped_column(Text)
    image_urls: Mapped[list] = mapped_column(JSONB, default=list)  # gallery paths/URLs
    lang: Mapped[str] = mapped_column(
        String(8), default="en"
    )  # language of title/summary/body_text

    primary_entity: Mapped[Entity | None] = relationship(foreign_keys=[primary_entity_id])
    articles: Mapped[list[Article]] = relationship(back_populates="event")
    translations: Mapped[list[EventTranslation]] = relationship(
        back_populates="event", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_events_last_activity", "last_activity_at"),
        Index("ix_events_category_importance", "category", "importance"),
        Index("ix_events_top_signal", "is_top_signal", "importance"),
    )


class EventTranslation(Base):
    """An event's title/summary/body in a second language (``target_lang``).

    No translation provider is wired in right now — rows are added out of band.
    The API serves a row here when the reader's locale differs from the event's
    ``lang`` (``?lang=``); the original always stays on the Event row, so a
    missing translation just falls back to the original.
    """

    __tablename__ = "event_translations"

    event_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), primary_key=True
    )
    target_lang: Mapped[str] = mapped_column(String(8), primary_key=True)  # 'tr' | 'en'
    title: Mapped[str | None] = mapped_column(Text)
    summary: Mapped[str | None] = mapped_column(Text)
    body_text: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(12), default="pending")  # pending | done | failed
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(Text)
    source_hash: Mapped[str | None] = mapped_column(String(64))  # detect stale translations
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    event: Mapped[Event] = relationship(back_populates="translations")

    __table_args__ = (Index("ix_event_translations_status", "status", "target_lang"),)


class Article(Base, TimestampMixin):
    __tablename__ = "articles"

    id: Mapped[uuid.UUID] = uuid_pk()
    source_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sources.id", ondelete="CASCADE"))
    external_id: Mapped[str] = mapped_column(String(500))
    canonical_url: Mapped[str] = mapped_column(Text)
    title: Mapped[str] = mapped_column(Text)
    author: Mapped[str | None] = mapped_column(Text)
    raw_summary: Mapped[str | None] = mapped_column(Text)
    clean_summary: Mapped[str | None] = mapped_column(Text)
    body_excerpt: Mapped[str | None] = mapped_column(Text)
    body_text: Mapped[str | None] = mapped_column(Text)  # multi-paragraph excerpt
    lang: Mapped[str] = mapped_column(String(8), default="en")
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    image_url: Mapped[str | None] = mapped_column(Text)
    event_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("events.id", ondelete="SET NULL"))
    content_hash: Mapped[str] = mapped_column(String(64))
    dedup_simhash: Mapped[int | None] = mapped_column(BigInteger)

    source: Mapped[Source] = relationship(back_populates="articles")
    event: Mapped[Event | None] = relationship(back_populates="articles")

    __table_args__ = (
        UniqueConstraint("source_id", "external_id", name="article_source_external"),
        Index("ix_articles_published", "published_at"),
        Index("ix_articles_content_hash", "content_hash"),
    )


class EventEntity(Base):
    __tablename__ = "event_entities"

    event_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), primary_key=True
    )
    entity_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("entities.id", ondelete="CASCADE"), primary_key=True
    )
    role: Mapped[str] = mapped_column(String(20), default="mentioned")
    confidence: Mapped[float] = mapped_column(Numeric(3, 2), default=0.5)

    entity: Mapped[Entity] = relationship()


class Topic(Base, TimestampMixin):
    __tablename__ = "topics"

    id: Mapped[uuid.UUID] = uuid_pk()
    name: Mapped[str] = mapped_column(String(120))
    slug: Mapped[str] = mapped_column(String(140), unique=True)
    kind: Mapped[str] = mapped_column(String(20), default="theme")  # hashtag | theme
    keywords: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)


class EventTopic(Base):
    __tablename__ = "event_topics"

    event_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), primary_key=True
    )
    topic_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("topics.id", ondelete="CASCADE"), primary_key=True
    )
    weight: Mapped[float] = mapped_column(Numeric(4, 2), default=1)

    topic: Mapped[Topic] = relationship()


class TopicTrendSnapshot(Base):
    __tablename__ = "topic_trend_snapshots"

    id: Mapped[uuid.UUID] = uuid_pk()
    topic_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"))
    window: Mapped[str] = mapped_column(String(8))
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    event_count: Mapped[int] = mapped_column(Integer, default=0)
    weighted_score: Mapped[float] = mapped_column(Numeric(8, 2), default=0)
    delta_pct: Mapped[float] = mapped_column(Numeric(8, 2), default=0)
    rank: Mapped[int] = mapped_column(Integer, default=0)

    topic: Mapped[Topic] = relationship()

    __table_args__ = (Index("ix_trend_lookup", "window", "captured_at", "rank"),)


class ImportanceFactors(Base):
    __tablename__ = "importance_factors"

    event_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), primary_key=True
    )
    source_reliability: Mapped[float] = mapped_column(Numeric(4, 3), default=0)
    independent_sources: Mapped[float] = mapped_column(Numeric(4, 3), default=0)
    entity_impact: Mapped[float] = mapped_column(Numeric(4, 3), default=0)
    novelty: Mapped[float] = mapped_column(Numeric(4, 3), default=0)
    market_impact: Mapped[float] = mapped_column(Numeric(4, 3), default=0)
    velocity: Mapped[float] = mapped_column(Numeric(4, 3), default=0)
    total: Mapped[float] = mapped_column(Numeric(4, 2), default=0)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Video(Base, TimestampMixin):
    __tablename__ = "videos"

    id: Mapped[uuid.UUID] = uuid_pk()
    youtube_id: Mapped[str] = mapped_column(String(32), unique=True)
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    thumbnail_url: Mapped[str | None] = mapped_column(Text)
    duration_sec: Mapped[int] = mapped_column(Integer, default=0)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    view_count: Mapped[int | None] = mapped_column(Integer)
    playlist: Mapped[str | None] = mapped_column(String(60))
    topics: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)

    __table_args__ = (Index("ix_videos_published", "published_at"),)


class VideoLink(Base):
    __tablename__ = "video_links"

    id: Mapped[uuid.UUID] = uuid_pk()
    video_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("videos.id", ondelete="CASCADE"))
    target_type: Mapped[str] = mapped_column(String(10))  # event | entity | topic
    target_id: Mapped[uuid.UUID] = mapped_column(nullable=False)

    __table_args__ = (
        UniqueConstraint("video_id", "target_type", "target_id", name="video_link_edge"),
    )


class CuratedLink(Base, TimestampMixin):
    """Editorial link cards for the Türkiye page (open-data resources, ecosystem).

    Bootstrapped from infra/seed/turkiye.yaml into an empty collection; after that
    the /yazar studio (moderator authors) is the source of truth.
    """

    __tablename__ = "curated_links"

    id: Mapped[uuid.UUID] = uuid_pk()
    collection: Mapped[str] = mapped_column(String(30))  # tr_data | tr_ecosystem
    name: Mapped[str] = mapped_column(String(200))
    url: Mapped[str] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(String(30))  # sub-label: portal / nlp / şirket / lab …
    note_tr: Mapped[str | None] = mapped_column(Text)
    note_en: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    __table_args__ = (
        UniqueConstraint("collection", "name", name="curated_links_collection_name"),
        Index("ix_curated_links_collection", "collection", "sort_order"),
    )


class MarketplaceApp(Base, TimestampMixin):
    """Community-submitted AI apps/tools. New rows land as `pending`."""

    __tablename__ = "marketplace_apps"

    id: Mapped[uuid.UUID] = uuid_pk()
    slug: Mapped[str] = mapped_column(String(160), unique=True)
    name: Mapped[str] = mapped_column(String(160))
    tagline: Mapped[str] = mapped_column(String(240))
    description: Mapped[str | None] = mapped_column(Text)
    url: Mapped[str] = mapped_column(Text)
    repo_url: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str] = mapped_column(
        String(20)
    )  # mcp | llm | stt | tts | agent | tool | other
    pricing: Mapped[str] = mapped_column(String(20), default="free")  # free | freemium | paid
    logo_url: Mapped[str | None] = mapped_column(Text)
    author_name: Mapped[str] = mapped_column(String(120))
    author_url: Mapped[str | None] = mapped_column(Text)
    submitter_email: Mapped[str | None] = mapped_column(String(200))
    is_turkish_dev: Mapped[bool] = mapped_column(
        Boolean, default=False
    )  # submitter self-declaration
    status: Mapped[str] = mapped_column(
        String(12), default="pending"
    )  # pending | approved | rejected
    upvotes: Mapped[int] = mapped_column(Integer, default=0)
    featured: Mapped[bool] = mapped_column(Boolean, default=False)

    __table_args__ = (Index("ix_marketplace_status", "status", "category"),)


class NewsSubmission(Base, TimestampMixin):
    """A reader-submitted news tip. Approving one creates a real Event (see
    planetai_api.services.manual_event) so it appears in the normal news feed.
    """

    __tablename__ = "news_submissions"

    id: Mapped[uuid.UUID] = uuid_pk()
    title: Mapped[str] = mapped_column(String(300))
    url: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    summary: Mapped[str | None] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(Text)
    image_urls: Mapped[list] = mapped_column(JSONB, default=list)
    category: Mapped[str] = mapped_column(String(20))
    submitter_name: Mapped[str | None] = mapped_column(String(120))
    submitter_email: Mapped[str | None] = mapped_column(String(200))
    submitter_phone: Mapped[str | None] = mapped_column(String(40))
    submitter_profession: Mapped[str | None] = mapped_column(String(120))
    submitter_company: Mapped[str | None] = mapped_column(String(160))
    status: Mapped[str] = mapped_column(
        String(12), default="pending"
    )  # pending | approved | rejected
    event_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("events.id", ondelete="SET NULL"))

    event: Mapped[Event | None] = relationship()

    __table_args__ = (Index("ix_news_submissions_status", "status"),)


class Author(Base, TimestampMixin):
    __tablename__ = "authors"

    id: Mapped[uuid.UUID] = uuid_pk()
    slug: Mapped[str] = mapped_column(String(120), unique=True)
    name: Mapped[str] = mapped_column(String(160))
    role: Mapped[str | None] = mapped_column(String(160))
    bio: Mapped[str | None] = mapped_column(Text)
    avatar_url: Mapped[str | None] = mapped_column(Text)
    links: Mapped[dict] = mapped_column(JSONB, default=dict)
    email: Mapped[str | None] = mapped_column(String(200))
    application_note: Mapped[str | None] = mapped_column(Text)
    # active | pending | rejected — only active authors appear on /yazarlar
    status: Mapped[str] = mapped_column(String(12), default="active")
    # SHA-256 hex of the /yazar studio secret; None ⇒ this author cannot log in via DB key
    api_key_hash: Mapped[str | None] = mapped_column(String(64))
    # may moderate marketplace / news / curated links from the studio
    is_moderator: Mapped[bool] = mapped_column(Boolean, default=False)

    posts: Mapped[list[OpinionPost]] = relationship(back_populates="author")


class SiteCredential(Base, TimestampMixin):
    """Shared site secrets stored as SHA-256 hashes (e.g. admin panel token)."""

    __tablename__ = "site_credentials"

    id: Mapped[uuid.UUID] = uuid_pk()
    kind: Mapped[str] = mapped_column(String(40), unique=True)  # admin
    secret_hash: Mapped[str] = mapped_column(String(64))


class OpinionPost(Base, TimestampMixin):
    """Köşe yazısı / editorial column."""

    __tablename__ = "opinion_posts"

    id: Mapped[uuid.UUID] = uuid_pk()
    slug: Mapped[str] = mapped_column(String(220), unique=True)
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("authors.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(Text)
    dek: Mapped[str | None] = mapped_column(Text)
    body: Mapped[str] = mapped_column(Text)  # plain text, \n\n paragraphs
    hero_image_url: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(12), default="published")  # draft | published
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    author: Mapped[Author] = relationship(back_populates="posts")

    __table_args__ = (Index("ix_opinion_published", "status", "published_at"),)


class IngestRun(Base):
    """Bookkeeping for scheduler visibility / healthz."""

    __tablename__ = "ingest_runs"

    id: Mapped[uuid.UUID] = uuid_pk()
    job: Mapped[str] = mapped_column(String(60))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ok: Mapped[bool] = mapped_column(Boolean, default=False)
    items_seen: Mapped[int] = mapped_column(Integer, default=0)
    items_written: Mapped[int] = mapped_column(Integer, default=0)
    detail: Mapped[str | None] = mapped_column(Text)
