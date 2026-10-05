"""Automatic people / organization discovery, without a hand-written name list."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from unittest.mock import patch

from planetai_shared.db import models
from planetai_shared.db.base import session_scope
from planetai_shared.entity_discover import (
    Resolved,
    discover_for_event,
    extract_mentions,
    lookup_wikidata,
)
from sqlalchemy import select

ORACLE = (
    "900 Milyar Dolarlık Kurumsal Yazılım Devinin Son Dansı\n"
    "Bu tarihi sıçrama, şirketin 81 yaşındaki kurucusu Larry Ellison'ı koltuğa oturtmaya yetti. "
    "Oracle, Wall Street'in en riskli şirketlerinden birine dönüşmüş durumda. "
    "IBM'de çalışan bir mühendis Edgar Codd'un makalesine dayanıyordu. "
    "Oracle bir bulut altyapısı sunmaya başladı."
)

GINOVA = (
    "İTÜ GİNOVA: Fikirden Girişime\n"
    "İTÜ GİNOVA Direktörü Adnan Veysel Ertemel'den aldığımız bilgilerle. "
    "İstanbul Teknik Üniversitesi Girişimcilik merkezi. "
    "GİNOVA, öğrencilerin bu sorulara cevap bulmasına yardımcı oluyor. "
    "GİNOVA'da öğrenciler mentörlerle çalışıyor. "
    "Ortağını Bul etkinliği ve Jump Start programı başlıyor."
)


def test_extracts_role_people_and_repeated_orgs():
    names = {m.name.casefold(): m.hint for m in extract_mentions("", ORACLE)}
    assert names["larry ellison"] == "person"
    assert names["edgar codd"] == "person"
    assert "oracle" in names
    assert "ibm" in names
    assert "wall street" not in names
    assert "wall" not in names


def test_extracts_director_and_university_not_program_names():
    names = {m.name.casefold() for m in extract_mentions("", GINOVA)}
    assert "adnan veysel ertemel" in names
    assert any("üniversitesi" in n for n in names)
    assert "itu" in names or "İtü".casefold() in names
    assert "ortagini bul" not in names
    assert "ortağını bul" not in names
    assert "jump start" not in names
    assert "ali eren aytekin" in {
        m.name.casefold()
        for m in extract_mentions(
            "",
            "örneklerinden biri Ali Eren Aytekin. Jump Start'ı tamamlayan Aytekin öğrencisiydi.",
        )
        if m.hint == "person"
    }


def test_exact_org_with_two_wikipedia_editions_is_kept():
    search = {"search": [{"id": "Q1", "label": "İstanbul Ticaret Odası"}]}
    entity = {
        "entities": {
            "Q1": {
                "sitelinks": {"trwiki": {}, "enwiki": {}},
                "labels": {
                    "tr": {"value": "İstanbul Ticaret Odası"},
                    "en": {"value": "Istanbul Chamber of Commerce"},
                },
                "aliases": {"tr": [{"value": "İTO"}]},
                "claims": {"P31": [{"mainsnak": {"datavalue": {"value": {"id": "Q43229"}}}}]},
            }
        }
    }

    def fake(params):
        if params["action"] == "wbsearchentities":
            return search
        return entity

    from planetai_shared import entity_discover

    entity_discover._cache.pop("istanbul ticaret odası".casefold(), None)
    # Turkish İ casefold is not ASCII "istanbul".
    entity_discover._cache.pop("İstanbul Ticaret Odası".casefold(), None)
    with patch("planetai_shared.entity_discover._get_json", side_effect=fake):
        resolved = lookup_wikidata("İstanbul Ticaret Odası")
    assert resolved is not None
    assert resolved.kind == "company"
    assert resolved.name == "İstanbul Ticaret Odası"


def test_person_with_two_sitelinks_is_dropped():
    search = {"search": [{"id": "Q2", "label": "Ayşe Yılmaz"}]}
    entity = {
        "entities": {
            "Q2": {
                "sitelinks": {"trwiki": {}, "enwiki": {}},
                "labels": {"tr": {"value": "Ayşe Yılmaz"}},
                "aliases": {},
                "claims": {"P31": [{"mainsnak": {"datavalue": {"value": {"id": "Q5"}}}}]},
            }
        }
    }

    def fake(params):
        if params["action"] == "wbsearchentities":
            return search
        return entity

    from planetai_shared import entity_discover

    entity_discover._cache.pop("Ayşe Yılmaz".casefold(), None)
    with patch("planetai_shared.entity_discover._get_json", side_effect=fake):
        assert lookup_wikidata("Ayşe Yılmaz") is None


def test_technopark_without_wikidata_still_links():
    token = uuid.uuid4().hex[:8]
    now = datetime.now(UTC)
    with session_scope() as db:
        event = models.Event(
            slug=f"discover-park-{token}",
            title="Kampüs haberi",
            summary=None,
            body_text="Ekip bu dönem İTÜ Teknopark içinde çalıştı.",
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
            with patch("planetai_shared.entity_discover.lookup_wikidata", return_value=None):
                n = discover_for_event(db, event)
            db.flush()
            linked = db.scalars(
                select(models.Entity)
                .join(models.EventEntity, models.EventEntity.entity_id == models.Entity.id)
                .where(models.EventEntity.event_id == event.id)
            ).all()
            kinds = {e.name: e.type for e in linked}
            assert n >= 1
            assert kinds.get("İTÜ Teknopark") == "institution"
        finally:
            db.query(models.EventEntity).filter_by(event_id=event.id).delete()
            db.delete(event)
            row = db.scalar(select(models.Entity).where(models.Entity.name == "İTÜ Teknopark"))
            still_used = (
                row is not None
                and db.scalar(
                    select(models.EventEntity.entity_id).where(
                        models.EventEntity.entity_id == row.id
                    )
                )
                is not None
            )
            if row is not None and not still_used:
                db.delete(row)


def test_discover_links_person_without_wikidata_and_org_from_wikidata():
    token = uuid.uuid4().hex[:8]

    def fake_lookup(name: str):
        if name.casefold() == "oracle":
            return Resolved("company", "Oracle", ("Oracle Corporation",))
        return None

    now = datetime.now(UTC)
    with session_scope() as db:
        event = models.Event(
            slug=f"discover-{token}",
            title="Kurumsal yazılım",
            summary=None,
            body_text=(
                "Şirketin kurucusu Larry Ellison'ı bu sıçrama öne çıkardı. "
                "Oracle hisseleri yükseldi. Oracle borçlandı."
            ),
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
            with patch("planetai_shared.entity_discover.lookup_wikidata", side_effect=fake_lookup):
                n = discover_for_event(db, event)
            db.flush()
            assert n >= 2
            linked = db.scalars(
                select(models.Entity)
                .join(models.EventEntity, models.EventEntity.entity_id == models.Entity.id)
                .where(models.EventEntity.event_id == event.id)
            ).all()
            kinds = {e.name.casefold(): e.type for e in linked}
            assert kinds["larry ellison"] == "person"
            assert kinds["oracle"] == "company"
        finally:
            db.query(models.EventEntity).filter_by(event_id=event.id).delete()
            db.delete(event)
            for name in ("Larry Ellison", "Oracle"):
                row = db.scalar(select(models.Entity).where(models.Entity.name == name))
                # Only delete the row this test created (no older curated Oracle).
                if (
                    row is not None
                    and row.slug.startswith(("larry-ellison", "oracle"))
                    and not row.description
                    and row.tier in (0.55, 0.45)
                ):
                    db.delete(row)
