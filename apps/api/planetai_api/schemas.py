"""API response models — the contract consumed by apps/web."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class EntityRef(BaseModel):
    slug: str
    name: str
    type: str


class SourceRef(BaseModel):
    slug: str
    name: str
    source_type: str
    trust_weight: float
    homepage_url: str


class TopicRef(BaseModel):
    slug: str
    name: str


class EventCard(BaseModel):
    slug: str
    title: str
    summary: str | None
    category: str
    impact: str
    importance: float
    source_count: int
    primary_entity: EntityRef | None
    top_source: SourceRef | None
    published_at: datetime
    image_url: str | None
    view_count: int = 0
    like_count: int = 0
    comment_count: int = 0


class ImportanceFactorsOut(BaseModel):
    source_reliability: float
    independent_sources: float
    entity_impact: float
    novelty: float
    market_impact: float
    velocity: float
    total: float


class EventEntityOut(BaseModel):
    entity: EntityRef
    role: str


class EventSourceOut(BaseModel):
    source: SourceRef
    title: str
    url: str
    published_at: datetime
    is_primary: bool


class EventDetail(BaseModel):
    slug: str
    title: str
    summary: str | None
    body: list[str]
    why_it_matters: str | None
    category: str
    impact: str
    importance: float
    source_count: int
    first_seen_at: datetime
    last_activity_at: datetime
    image_url: str | None
    image_urls: list[str] = []
    primary_entity: EntityRef | None
    topics: list[TopicRef]
    entities: list[EventEntityOut]
    sources: list[EventSourceOut]
    importance_factors: ImportanceFactorsOut | None
    related_events: list[EventCard]
    related_videos: list[VideoCard]
    view_count: int = 0
    like_count: int = 0
    comment_count: int = 0


class TimelineItem(BaseModel):
    time: datetime
    slug: str
    title: str
    category: str
    impact: str


class VideoCard(BaseModel):
    youtube_id: str
    title: str
    description: str | None
    thumbnail_url: str | None
    duration_sec: int
    published_at: datetime
    playlist: str | None
    topics: list[str]


class VideoDetail(VideoCard):
    related_events: list[EventCard]
    related_entities: list[EntityRef]
    related_topics: list[TopicRef]


class TopicTrend(BaseModel):
    topic: TopicRef
    window: str
    rank: int
    event_count: int
    weighted_score: float
    delta_pct: float
    sample_events: list[EventCard]


class ColumnCardLite(BaseModel):
    slug: str
    title: str
    dek: str | None
    hero_image_url: str | None
    published_at: datetime
    author_name: str
    author_slug: str


class HomePayload(BaseModel):
    top_signals: list[EventCard]
    latest_news: list[EventCard]
    popular: list[EventCard]
    most_read: list[EventCard] = []
    most_commented: list[EventCard] = []
    trending: list[TopicTrend]
    videos: list[VideoCard]
    timeline: list[TimelineItem]
    columns: list[ColumnCardLite]
    sections: dict[str, list[EventCard]]


class Page(BaseModel):
    data: list[EventCard]
    next_cursor: str | None
    count: int


class SearchResult(BaseModel):
    query: str
    entities: list[EntityRef]
    events: Page
    videos: list[VideoCard]
    research: Page


class EntityImage(BaseModel):
    url: str
    caption: str | None = None
    event_slug: str | None = None


class EntityDetail(BaseModel):
    slug: str
    name: str
    type: str
    description: str | None
    logo_url: str | None
    website_url: str | None
    relations: list[EntityRelationOut]
    latest_events: list[EventCard]
    videos: list[VideoCard]
    columns: list[ColumnCardLite] = []
    images: list[EntityImage] = []
    event_count: int = 0
    video_count: int = 0
    column_count: int = 0
    author_slug: str | None = None


class EntityRelationOut(BaseModel):
    relation: str
    direction: str
    entity: EntityRef


class CategoryCount(BaseModel):
    category: str
    events_24h: int
    events_total: int = 0


EventDetail.model_rebuild()
VideoDetail.model_rebuild()
EntityDetail.model_rebuild()
