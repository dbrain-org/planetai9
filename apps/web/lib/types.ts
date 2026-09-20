// Mirrors apps/api/planetai_api/schemas.py. Regenerate from openapi.json later.

export interface EntityRef {
  slug: string;
  name: string;
  type: string;
  /** Optional alternate spellings used for in-body link matching. */
  aliases?: string[];
}

export interface SourceRef {
  slug: string;
  name: string;
  source_type: string;
  trust_weight: number;
  homepage_url: string;
}

export interface TopicRef {
  slug: string;
  name: string;
}

export interface EventCard {
  slug: string;
  title: string;
  summary: string | null;
  category: string;
  impact: "low" | "medium" | "high" | "critical";
  importance: number;
  source_count: number;
  primary_entity: EntityRef | null;
  top_source: SourceRef | null;
  published_at: string;
  image_url: string | null;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
}

export interface ImportanceFactors {
  source_reliability: number;
  independent_sources: number;
  entity_impact: number;
  novelty: number;
  market_impact: number;
  velocity: number;
  total: number;
}

export interface EventSource {
  source: SourceRef;
  title: string;
  url: string;
  published_at: string;
  is_primary: boolean;
}

export interface EventDetail {
  slug: string;
  title: string;
  summary: string | null;
  body: string[];
  why_it_matters: string | null;
  category: string;
  impact: EventCard["impact"];
  importance: number;
  source_count: number;
  first_seen_at: string;
  last_activity_at: string;
  image_url: string | null;
  image_urls?: string[];
  primary_entity: EntityRef | null;
  topics: TopicRef[];
  entities: { entity: EntityRef; role: string }[];
  sources: EventSource[];
  importance_factors: ImportanceFactors | null;
  related_events: EventCard[];
  related_videos: VideoCard[];
  view_count?: number;
  like_count?: number;
  comment_count?: number;
}

export interface TimelineItem {
  time: string;
  slug: string;
  title: string;
  category: string;
  impact: EventCard["impact"];
}

export interface VideoCard {
  youtube_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  duration_sec: number;
  published_at: string;
  playlist: string | null;
  topics: string[];
}

export interface VideoDetail extends VideoCard {
  related_events: EventCard[];
  related_entities: EntityRef[];
  related_topics: TopicRef[];
}

export interface TopicTrend {
  topic: TopicRef;
  window: string;
  rank: number;
  event_count: number;
  weighted_score: number;
  delta_pct: number;
  sample_events: EventCard[];
}

export interface ColumnCardLite {
  slug: string;
  title: string;
  dek: string | null;
  hero_image_url: string | null;
  published_at: string;
  author_name: string;
  author_slug: string;
}

export interface HomePayload {
  top_signals: EventCard[];
  latest_news: EventCard[];
  popular: EventCard[];
  most_read: EventCard[];
  most_commented: EventCard[];
  trending: TopicTrend[];
  videos: VideoCard[];
  timeline: TimelineItem[];
  columns: ColumnCardLite[];
  sections: Record<string, EventCard[]>;
}

export interface MarketplaceApp {
  slug: string;
  name: string;
  tagline: string;
  description: string | null;
  url: string;
  repo_url: string | null;
  category: string;
  category_label: string;
  pricing: string;
  logo_url: string | null;
  author_name: string;
  author_url: string | null;
  upvotes: number;
  featured: boolean;
}

export interface QueueApp extends MarketplaceApp {
  status: "pending" | "approved" | "rejected";
  submitter_email: string | null;
  is_turkish_dev: boolean;
  created_at: string;
}

export interface QueueSubmission {
  id: string;
  title: string;
  url: string | null;
  description: string | null;
  summary: string | null;
  image_url?: string | null;
  image_urls?: string[];
  category: string;
  submitter_name: string | null;
  submitter_email: string | null;
  submitter_phone?: string | null;
  submitter_profession?: string | null;
  submitter_company?: string | null;
  is_staff?: boolean;
  status: "pending" | "approved" | "rejected";
  event_slug: string | null;
  created_at: string;
}

export interface CuratedShareItem {
  id: string;
  collection: string;
  name: string;
  url: string;
  kind: string;
  note_tr: string | null;
  note_en: string | null;
  sort_order: number;
  enabled: boolean;
}

export interface AuthorApplication {
  slug: string;
  name: string;
  role: string | null;
  bio: string | null;
  email: string | null;
  application_note: string | null;
  status: "pending" | "active" | "rejected";
  has_key: boolean;
  created_at: string;
}

export interface AuthorRef {
  slug: string;
  name: string;
  role: string | null;
  avatar_url: string | null;
}

export interface AuthorDetail extends AuthorRef {
  bio: string | null;
  links: Record<string, string>;
}

export interface ColumnCard {
  slug: string;
  title: string;
  dek: string | null;
  hero_image_url: string | null;
  published_at: string;
  author: AuthorRef;
}

export interface ColumnDetail extends ColumnCard {
  body: string;
}

export interface Page<T = EventCard> {
  data: T[];
  next_cursor: string | null;
  count: number;
}

export interface SearchResult {
  query: string;
  entities: EntityRef[];
  events: Page;
  videos: VideoCard[];
  research: Page;
}

export interface CategoryCount {
  category: string;
  events_24h: number;
  events_total: number;
}

export interface EntityListItem {
  slug: string;
  name: string;
  type: string;
  description: string | null;
  logo_url?: string | null;
  event_count?: number;
  video_count?: number;
}

export interface EntityRelationOut {
  relation: string;
  direction: "in" | "out";
  entity: EntityRef;
}

export interface EntityImage {
  url: string;
  caption: string | null;
  event_slug: string | null;
}

export interface EntityDetail {
  slug: string;
  name: string;
  type: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  relations: EntityRelationOut[];
  latest_events: EventCard[];
  videos: VideoCard[];
  columns?: ColumnCardLite[];
  images?: EntityImage[];
  event_count?: number;
  video_count?: number;
  column_count?: number;
  author_slug?: string | null;
}

export interface ColumnCardLite {
  slug: string;
  title: string;
  dek: string | null;
  hero_image_url: string | null;
  published_at: string;
  author_name: string;
  author_slug: string;
}

export interface Stats {
  entities: number;
  companies: number;
  models: number;
  sources: number;
  articles: number;
  events: number;
  topics: number;
}

export interface CuratedLink {
  id: string;
  collection: "tr_data" | "tr_share" | "tr_ecosystem";
  name: string;
  url: string;
  kind: string;
  note_tr: string | null;
  note_en: string | null;
  sort_order: number;
  enabled: boolean;
}
