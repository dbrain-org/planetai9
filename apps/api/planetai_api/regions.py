"""Region (Türkiye vs world) is not a column on Event — it's derived.

An event counts as Türkiye-region when either its article's source publishes
in Turkish, or it's tagged with the `turkiye` Topic. Shared by events.py
(`?region=`) and home.py (Türkiye-only home page).
"""

from __future__ import annotations

from planetai_shared.db import models
from sqlalchemy import Select, select


def tr_event_ids_subquery() -> Select:
    tr_source_events = (
        select(models.Article.event_id)
        .join(models.Source, models.Source.id == models.Article.source_id)
        .where(models.Source.lang == "tr", models.Article.event_id.isnot(None))
    )
    tr_topic_events = (
        select(models.EventTopic.event_id)
        .join(models.Topic, models.Topic.id == models.EventTopic.topic_id)
        .where(models.Topic.slug == "turkiye")
    )
    return select(tr_source_events.union(tr_topic_events).subquery().c.event_id)
