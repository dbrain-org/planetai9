"""Environment-driven settings shared by the API and ingest services.

Every value can be overridden with an env var prefixed ``PLANETAI_`` (e.g.
``PLANETAI_DATABASE_URL``). In production set these via the platform's secret
store — never commit a populated ``.env``."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # enable_decoding=False: env values for list/dict fields (cors_origins, author_keys)
    # arrive as raw strings for our own `mode="before"` validators to split — no JSON parsing.
    model_config = SettingsConfigDict(
        env_prefix="PLANETAI_", env_file=".env", extra="ignore", enable_decoding=False
    )

    env: Literal["dev", "staging", "production"] = "dev"

    database_url: str = "postgresql+psycopg://planetai:planetai@localhost:5442/planetai"
    redis_url: str = "redis://localhost:6379/0"

    site_url: str = "http://localhost:3010"

    # ingest
    user_agent: str = "PlanetAI9Bot/1.0 (+https://planetai9.com/bot)"
    http_timeout_sec: float = 20.0
    youtube_api_key: str | None = None
    youtube_channel_id: str | None = None
    max_article_age_days: int = 75
    max_items_per_fetch: int = 120
    dedup_lookback_hours: int = 72
    dedup_title_similarity: float = 0.82  # 0..1 rapidfuzz token_set_ratio / 100
    dedup_simhash_max_distance: int = 4

    # api
    cors_origins: list[str] = ["http://localhost:3010"]
    cache_ttl_home_sec: int = 60
    cache_ttl_list_sec: int = 90
    rate_limit_default: str = "120/minute"
    rate_limit_submit: str = "8/hour"
    docs_enabled: bool = True
    # shared secret for the /yonetim moderation panel; unset ⇒ panel disabled
    admin_token: str | None = None
    # per-author keys for the /yazar studio (legacy env fallback; prefer authors.api_key_hash)
    author_keys: dict[str, str] = {}
    # author slugs allowed to moderate (legacy; prefer authors.is_moderator)
    moderator_authors: list[str] = []

    # reader auth (magic link). session_secret signs nothing — we store hashed tokens;
    # keep a dedicated secret so rotating admin_token doesn't wipe sessions.
    session_secret: str | None = None
    magic_link_ttl_min: int = 30
    session_ttl_days: int = 30
    # optional SMTP — unset ⇒ magic link returned in API response when env!=production
    smtp_url: str | None = None

    # observability — error monitoring; unset ⇒ Sentry disabled
    sentry_dsn: str | None = None
    sentry_traces_sample_rate: float = 0.0

    # feature flags
    ai_enrich_enabled: bool = False

    @field_validator("cors_origins", "moderator_authors", mode="before")
    @classmethod
    def _split_origins(cls, v: object) -> object:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    @field_validator("author_keys", mode="before")
    @classmethod
    def _parse_author_keys(cls, v: object) -> object:
        if isinstance(v, str):
            out: dict[str, str] = {}
            for part in v.split(","):
                if ":" in part:
                    slug, key = part.split(":", 1)
                    if slug.strip() and key.strip():
                        out[slug.strip()] = key.strip()
            return out
        return v

    @property
    def is_prod(self) -> bool:
        return self.env == "production"

    @property
    def effective_session_secret(self) -> str:
        return self.session_secret or self.admin_token or "planetai-dev-session-secret"


@lru_cache
def get_settings() -> Settings:
    return Settings()
