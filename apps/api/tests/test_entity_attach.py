"""Unit tests for dictionary entity attachment on approved news."""

from datetime import UTC, datetime
import uuid

from planetai_api.services.entity_attach import _mentions, attach_entities_to_event
from planetai_shared.db import models
from planetai_shared.db.base import session_scope
from sqlalchemy import select


def test_mentions_respects_word_boundaries():
    assert _mentions(" tubisad toplantisi ", "tubisad")
    assert _mentions(" openai announces ", "openai")
    assert not _mentions(" the openair festival ", "openai")
    assert _mentions(" sam altman'a gore ", "sam altman")


def test_attach_entities_links_people_and_orgs():
    slug = f"tubisad-test-{uuid.uuid4().hex[:8]}"
    now = datetime.now(UTC)
    with session_scope() as db:
        tubisad = models.Entity(
            slug=f"tubisad-{uuid.uuid4().hex[:6]}",
            name="TÜBİSAD",
            type="institution",
            aliases=["Tubisad", "TUBISAD"],
            tier=0.5,
        )
        person = models.Entity(
            slug=f"mehmet-ali-{uuid.uuid4().hex[:6]}",
            name="Mehmet Ali Tombalak",
            type="person",
            aliases=[],
            tier=0.4,
        )
        db.add_all([tubisad, person])
        db.flush()

        event = models.Event(
            slug=slug,
            title="TÜBİSAD yapay zeka zirvesi",
            summary="Sektör buluşması",
            body_text="Mehmet Ali Tombalak ve Tubisad temsilcileri konuştu.",
            category="Models",
            impact="low",
            importance=1.0,
            source_count=1,
            first_seen_at=now,
            last_activity_at=now,
            status="active",
            lang="tr",
        )
        db.add(event)
        db.flush()

        try:
            n = attach_entities_to_event(db, event)
            db.flush()
            assert n >= 2, f"expected >=2 links, got {n}"

            linked_ids = {
                ee.entity_id
                for ee in db.scalars(
                    select(models.EventEntity).where(models.EventEntity.event_id == event.id)
                ).all()
            }
            assert tubisad.id in linked_ids, f"missing tubisad; linked={linked_ids}"
            assert person.id in linked_ids, f"missing person; linked={linked_ids}"
            assert event.primary_entity_id == tubisad.id
        finally:
            db.query(models.EventEntity).filter_by(event_id=event.id).delete()
            db.delete(event)
            db.delete(tubisad)
            db.delete(person)
