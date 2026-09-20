"""Unit tests for dictionary entity attachment on approved news."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

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
    """Use unique names so CI seed entities (TÜBİSAD, …) cannot steal primary."""
    token = uuid.uuid4().hex[:8]
    org_name = f"Acme Quantum {token}"
    person_name = f"Zeynep Testoglu {token}"
    slug = f"attach-test-{token}"
    now = datetime.now(UTC)

    with session_scope() as db:
        org = models.Entity(
            slug=f"acme-quantum-{token}",
            name=org_name,
            type="institution",
            aliases=[f"AcmeQuantum{token}"],
            tier=0.5,
        )
        person = models.Entity(
            slug=f"zeynep-testoglu-{token}",
            name=person_name,
            type="person",
            aliases=[],
            tier=0.4,
        )
        db.add_all([org, person])
        db.flush()

        event = models.Event(
            slug=slug,
            title=f"{org_name} yapay zeka zirvesi",
            summary="Sektör buluşması",
            body_text=f"{person_name} ve {org_name} temsilcileri konuştu.",
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
            assert org.id in linked_ids, f"missing org; linked={linked_ids}"
            assert person.id in linked_ids, f"missing person; linked={linked_ids}"
            assert event.primary_entity_id == org.id
        finally:
            db.query(models.EventEntity).filter_by(event_id=event.id).delete()
            db.delete(event)
            db.delete(org)
            db.delete(person)
