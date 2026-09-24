from planetai_ingest.pipeline import classify
from planetai_ingest.pipeline.entities import EntityHit, EntityIndex, choose_primary
from planetai_ingest.pipeline.score import Factors
from planetai_shared.enums import Impact, importance_band


def test_importance_band_thresholds():
    assert importance_band(9.5) == Impact.CRITICAL
    assert importance_band(7.2) == Impact.HIGH
    assert importance_band(5.0) == Impact.MEDIUM
    assert importance_band(2.0) == Impact.LOW


def test_factors_total_is_bounded():
    f = Factors(
        source_reliability=1,
        independent_sources=1,
        entity_impact=1,
        novelty=1,
        market_impact=1,
        velocity=1,
    )
    assert 0 <= f.total() <= 10
    assert Factors().total() == 0.0


def test_classify_category_rules():
    hits = [EntityHit("x", "model", "GPT", 1.0, True)]
    cat = classify.classify_category(
        title="OpenAI launches GPT-6, a new frontier model",
        summary="benchmark results improve",
        source_kind="rss",
        source_slug="openai-news",
        hits=hits,
    )
    assert cat == "Models"

    robo = classify.classify_category(
        title="Figure unveils a new humanoid robot for warehouses",
        summary="the robot can walk and manipulate objects",
        source_kind="rss",
        source_slug="the-robot-report",
        hits=[],
    )
    assert robo == "Robotics"

    arxiv = classify.classify_category(
        title="A study of attention",
        summary="",
        source_kind="arxiv",
        source_slug="arxiv-cs-ai",
        hits=[],
    )
    assert arxiv == "Research"


def test_entity_index_matches_aliases_and_boundaries():
    idx = EntityIndex(
        [
            ("1", "company", "Anthropic", [], 1.0),
            ("2", "model", "Claude", ["Claude Opus", "Claude Sonnet"], 1.0),
            ("3", "company", "OpenAI", ["Open AI"], 1.0),
        ]
    )
    hits = idx.match("Anthropic ships Claude Opus 5", "OpenAI responds")
    names = {h.name for h in hits}
    assert names == {"Anthropic", "Claude", "OpenAI"}
    assert {h.name for h in hits if h.in_title} == {"Anthropic", "Claude"}

    primary = choose_primary(hits)
    assert primary.name == "Claude"  # model beats company, and it's in the title

    # word-boundary: "openair" must not match "OpenAI"
    assert idx.match("the openair festival", "") == []


def test_entity_index_matches_hyphenated_person_aliases():
    idx = EntityIndex(
        [
            (
                "ff",
                "person",
                "Fei-Fei Li",
                ["Fei Fei Li", "FeiFei Li", "Li Fei-Fei"],
                0.8,
            ),
        ]
    )
    hits = idx.match("World Labs founder Fei-Fei Li spoke today", "")
    assert {h.name for h in hits} == {"Fei-Fei Li"}
    hits2 = idx.match("FeiFei Li joins the panel", "")
    assert {h.name for h in hits2} == {"Fei-Fei Li"}


def test_person_extract_rejects_program_phrases_and_finds_minister():
    from planetai_ingest.pipeline.entities import (
        _looks_like_person_name,
        extract_person_candidates,
    )

    assert not _looks_like_person_name("Kuantum Çağrısı")
    assert not _looks_like_person_name("Veri Merkezi Çağrısı")
    assert not _looks_like_person_name("Dynamic Island")
    assert _looks_like_person_name("Mehmet Fatih Kacır")
    assert _looks_like_person_name("Sam Altman")
    assert _looks_like_person_name("Fei-Fei Li")
    assert _looks_like_person_name("FeiFei Li")

    assert "Fei-Fei Li" in extract_person_candidates(
        "Fei-Fei Li announces a new AI initiative", source="news"
    )

    body = (
        "GITEX Ai Türkiye'ye Sanayi ve Teknoloji Bakanımız Mehmet Fatih Kacır "
        "katıldı. HIT-Kuantum Çağrısı ile HIT-Veri Merkezi Çağrısı açıklandı."
    )
    names = extract_person_candidates(body, source="news")
    assert "Mehmet Fatih Kacır" in names
    assert "Kuantum Çağrısı" not in names
    assert "Veri Merkezi Çağrısı" not in names

    # "X ile" over body must not invent people from news copy
    assert extract_person_candidates("Kuantum Çağrısı ile başladı", source="news") == []
    assert "Kuantum Çağrısı" in extract_person_candidates(
        "Kuantum Çağrısı ile başladı", source="video"
    ) or not _looks_like_person_name("Kuantum Çağrısı")
    # video ile still gated by looks_like — junk rejected
    assert extract_person_candidates("Kuantum Çağrısı ile başladı", source="video") == []
