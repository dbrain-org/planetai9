def test_healthz(client):
    r = client.get("/api/v1/healthz")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_home_shape(client):
    r = client.get("/api/v1/home")
    assert r.status_code == 200
    body = r.json()
    for key in (
        "top_signals",
        "latest_news",
        "popular",
        "trending",
        "videos",
        "timeline",
        "columns",
        "sections",
    ):
        assert key in body


def test_events_filters(client):
    assert client.get("/api/v1/events?limit=5").status_code == 200
    assert client.get("/api/v1/events?bucket=AI&limit=5").status_code == 200
    assert client.get("/api/v1/events?region=TR&limit=5").status_code == 200
    assert client.get("/api/v1/events?entity=does-not-exist").status_code == 404


def test_categories_and_sources(client):
    cats = client.get("/api/v1/categories").json()
    assert any(c["category"] == "Models" for c in cats)
    assert client.get("/api/v1/sources").status_code == 200


def test_search_requires_two_chars(client):
    assert client.get("/api/v1/search?q=a").status_code == 422
    assert client.get("/api/v1/search?q=ai").status_code == 200


def test_marketplace_submission_lands_pending(client):
    payload = {
        "name": "PyTest Sample App",
        "category": "tool",
        "tagline": "an app submitted from the test suite for validation",
        "url": "https://example.com/pytest-app",
        "repo_url": "https://github.com/example/pytest-app",
        "author_name": "Test Suite",
    }
    r = client.post("/api/v1/marketplace", json=payload)
    assert r.status_code == 201
    assert r.json()["status"] == "pending"
    slug = r.json()["slug"]
    try:
        # it must NOT appear in the public (approved) listing
        listed = client.get("/api/v1/marketplace").json()
        assert all(a["name"] != "PyTest Sample App" for a in listed)
    finally:
        from planetai_shared.db import models
        from planetai_shared.db.base import session_scope

        with session_scope() as db:
            db.query(models.MarketplaceApp).filter_by(slug=slug).delete()


def test_marketplace_queue_requires_auth(client, monkeypatch):
    from planetai_api.routers import marketplace

    # With any moderation channel configured, missing token ⇒ 401 (not a public surface).
    monkeypatch.setattr(marketplace._settings, "admin_token", "test-secret", raising=False)
    assert client.get("/api/v1/marketplace/queue").status_code == 401


def test_marketplace_admin_moderation_flow(client, monkeypatch):
    from planetai_api.routers import marketplace

    monkeypatch.setattr(marketplace._settings, "admin_token", "test-secret", raising=False)

    assert client.get("/api/v1/marketplace/queue").status_code == 401
    assert (
        client.get("/api/v1/marketplace/queue", headers={"X-Admin-Token": "wrong"}).status_code
        == 401
    )

    hdr = {"X-Admin-Token": "test-secret"}
    sub = client.post(
        "/api/v1/marketplace",
        json={
            "name": "Admin Flow App",
            "category": "agent",
            "tagline": "submitted to exercise the moderation endpoints",
            "url": "https://example.com/admin-flow",
            "repo_url": "https://github.com/example/admin-flow",
            "author_name": "Test Suite",
        },
    )
    slug = sub.json()["slug"]
    try:
        queue = client.get("/api/v1/marketplace/queue", headers=hdr).json()
        assert any(a["slug"] == slug and a["status"] == "pending" for a in queue)

        upd = client.post(
            f"/api/v1/marketplace/{slug}/status", headers=hdr, json={"status": "approved"}
        )
        assert upd.status_code == 200 and upd.json()["status"] == "approved"
        assert any(a["slug"] == slug for a in client.get("/api/v1/marketplace").json())
    finally:
        from planetai_shared.db import models
        from planetai_shared.db.base import session_scope

        with session_scope() as db:
            db.query(models.MarketplaceApp).filter_by(slug=slug).delete()


def test_marketplace_rejects_bad_category(client):
    r = client.post(
        "/api/v1/marketplace",
        json={
            "name": "Bad",
            "category": "nope",
            "tagline": "x" * 12,
            "url": "https://example.com",
            "author_name": "t",
        },
    )
    assert r.status_code == 422


def test_author_studio_hidden_without_keys(client, monkeypatch):
    from planetai_api.routers import authors
    from planetai_shared.db import models
    from planetai_shared.db.base import session_scope

    # no env keys and no DB hashes ⇒ the studio surface must 404 (stay invisible)
    monkeypatch.setattr(authors._settings, "author_keys", {}, raising=False)
    with session_scope() as db:
        for a in db.query(models.Author).all():
            a.api_key_hash = None
    assert client.get("/api/v1/authors/me/studio").status_code == 404
    assert (
        client.get(
            "/api/v1/authors/me/studio", headers={"X-Author-Key": "ayhan-demirci:whatever"}
        ).status_code
        == 404
    )


def test_author_studio_write_flow(client, monkeypatch, author_slug):
    from planetai_api.routers import authors
    from planetai_shared.author_auth import hash_api_key
    from planetai_shared.db import models
    from planetai_shared.db.base import session_scope

    monkeypatch.setattr(authors._settings, "author_keys", {}, raising=False)
    with session_scope() as db:
        a = db.query(models.Author).filter_by(slug="ayhan-demirci").one()
        a.api_key_hash = hash_api_key("test-key")
    hdr = {"X-Author-Key": "ayhan-demirci:test-key"}

    assert client.get("/api/v1/authors/me/studio").status_code == 401
    assert (
        client.get(
            "/api/v1/authors/me/studio", headers={"X-Author-Key": "ayhan-demirci:x"}
        ).status_code
        == 401
    )

    body = "İlk paragraf, anlamlı ve yeterince uzun bir cümle burada duruyor.\n\nİkinci paragraf da öyle."
    created = client.post(
        "/api/v1/authors/me/columns",
        headers=hdr,
        json={"title": "Test köşe yazısı", "dek": "kısa spot", "body": body, "status": "draft"},
    )
    assert created.status_code == 201
    slug = created.json()["slug"]
    try:
        # draft ⇒ not in the public feed
        assert all(c["slug"] != slug for c in client.get("/api/v1/columns").json())

        pub = client.patch(
            f"/api/v1/authors/me/columns/{slug}",
            headers=hdr,
            json={"title": "Test köşe yazısı", "dek": "spot", "body": body, "status": "published"},
        )
        assert pub.status_code == 200 and pub.json()["status"] == "published"
        assert any(c["slug"] == slug for c in client.get("/api/v1/columns").json())

        # another author's key cannot touch it
        with session_scope() as db:
            other = db.query(models.Author).filter_by(slug="someone-else").first()
            if other is None:
                other = models.Author(slug="someone-else", name="Other", status="active")
                db.add(other)
            other.api_key_hash = hash_api_key("k2")
            other.status = "active"
        forbidden = client.patch(
            f"/api/v1/authors/me/columns/{slug}",
            headers={"X-Author-Key": "someone-else:k2"},
            json={"title": "hijack denemesi", "body": body, "status": "draft"},
        )
        assert forbidden.status_code == 404
    finally:
        from planetai_shared.db import models
        from planetai_shared.db.base import session_scope

        with session_scope() as db:
            db.query(models.OpinionPost).filter_by(slug=slug).delete()


def test_moderator_author_can_work_marketplace_queue(client, monkeypatch, author_slug):
    from planetai_api.routers import authors, marketplace
    from planetai_shared.author_auth import hash_api_key
    from planetai_shared.db import models
    from planetai_shared.db.base import session_scope

    monkeypatch.setattr(authors._settings, "author_keys", {}, raising=False)
    monkeypatch.setattr(marketplace._settings, "author_keys", {}, raising=False)
    monkeypatch.setattr(marketplace._settings, "moderator_authors", [], raising=False)
    with session_scope() as db:
        a = db.query(models.Author).filter_by(slug="ayhan-demirci").one()
        a.api_key_hash = hash_api_key("mk")
        a.is_moderator = True
        other = db.query(models.Author).filter_by(slug="no-mod").first()
        if other is None:
            other = models.Author(slug="no-mod", name="No Mod", status="active")
            db.add(other)
        other.api_key_hash = hash_api_key("x")
        other.is_moderator = False
        other.status = "active"

    good = {"X-Author-Key": "ayhan-demirci:mk"}
    # studio payload advertises the capability
    assert client.get("/api/v1/authors/me/studio", headers=good).json()["is_moderator"] is True
    # a non-moderator author key is rejected from the queue
    assert (
        client.get("/api/v1/marketplace/queue", headers={"X-Author-Key": "no-mod:x"}).status_code
        == 401
    )

    assert client.get("/api/v1/marketplace/queue", headers=good).status_code == 200

    sub = client.post(
        "/api/v1/marketplace",
        json={
            "name": "Moderator Flow App",
            "category": "tool",
            "tagline": "exercise the moderator-author approval path",
            "url": "https://example.com/mod-flow",
            "repo_url": "https://github.com/example/mod-flow",
            "author_name": "Test",
        },
    )
    slug = sub.json()["slug"]
    try:
        upd = client.post(
            f"/api/v1/marketplace/{slug}/status", headers=good, json={"status": "approved"}
        )
        assert upd.status_code == 200 and upd.json()["status"] == "approved"
        assert any(a["slug"] == slug for a in client.get("/api/v1/marketplace").json())
    finally:
        from planetai_shared.db import models
        from planetai_shared.db.base import session_scope

        with session_scope() as db:
            db.query(models.MarketplaceApp).filter_by(slug=slug).delete()


def test_curated_links_public_and_moderation(client, monkeypatch, author_slug):
    from planetai_api.routers import authors, marketplace
    from planetai_shared.author_auth import hash_api_key
    from planetai_shared.db import models
    from planetai_shared.db.base import session_scope

    monkeypatch.setattr(authors._settings, "author_keys", {}, raising=False)
    monkeypatch.setattr(marketplace._settings, "author_keys", {}, raising=False)
    monkeypatch.setattr(marketplace._settings, "moderator_authors", [], raising=False)
    with session_scope() as db:
        a = db.query(models.Author).filter_by(slug=author_slug).one()
        a.api_key_hash = hash_api_key("ck")
        a.is_moderator = True
    hdr = {"X-Author-Key": f"{author_slug}:ck"}

    assert client.get("/api/v1/curated/nope").status_code == 404
    assert client.get("/api/v1/curated/tr_data").status_code == 200
    assert client.get("/api/v1/curated/tr_data/manage").status_code == 401

    created = client.post(
        "/api/v1/curated/tr_data",
        headers=hdr,
        json={
            "name": "PyTest Kaynak",
            "url": "https://example.com/x",
            "kind": "portal",
            "note_tr": "tr",
            "note_en": "en",
            "enabled": True,
        },
    )
    assert created.status_code == 201
    lid = created.json()["id"]
    try:
        assert any(x["id"] == lid for x in client.get("/api/v1/curated/tr_data").json())

        # hide it → drops out of the public list, still in /manage
        upd = client.patch(
            f"/api/v1/curated/tr_data/{lid}",
            headers=hdr,
            json={
                "name": "PyTest Kaynak",
                "url": "https://example.com/x",
                "kind": "portal",
                "enabled": False,
            },
        )
        assert upd.status_code == 200
        assert all(x["id"] != lid for x in client.get("/api/v1/curated/tr_data").json())
        assert any(
            x["id"] == lid for x in client.get("/api/v1/curated/tr_data/manage", headers=hdr).json()
        )
    finally:
        assert client.delete(f"/api/v1/curated/tr_data/{lid}", headers=hdr).status_code == 204


def test_events_window_and_region_world(client):
    assert client.get("/api/v1/events?window=24h&limit=5").status_code == 200
    assert client.get("/api/v1/events?window=bogus&limit=5").status_code == 200  # ignored

    world = client.get("/api/v1/events?region=world&limit=30").json()["data"]
    tr = client.get("/api/v1/events?region=TR&limit=30").json()["data"]
    world_slugs = {e["slug"] for e in world}
    tr_slugs = {e["slug"] for e in tr}
    assert world_slugs.isdisjoint(tr_slugs)  # a story is in exactly one region


def test_event_translation_served_by_lang(client):
    import uuid

    from planetai_shared.db import models
    from planetai_shared.db.base import session_scope

    slug = f"pytest-xlate-{uuid.uuid4().hex[:8]}"
    with session_scope() as db:
        ev = models.Event(
            slug=slug,
            title="Yerli yapay zekâ modeli tanıtıldı",
            summary="Türkçe özet.",
            category="Models",
            lang="tr",
            impact="low",
            importance=1,
            source_count=1,
            first_seen_at="2026-09-01T00:00:00Z",
            last_activity_at="2026-09-08T00:00:00Z",
            status="active",
        )
        db.add(ev)
        db.flush()
        db.add(
            models.EventTranslation(
                event_id=ev.id,
                target_lang="en",
                title="Homegrown AI model unveiled",
                summary="English summary.",
                status="done",
                source_hash="x",
            )
        )
        ev_id = ev.id

    try:
        default = client.get(f"/api/v1/events/{slug}").json()
        assert default["title"] == "Yerli yapay zekâ modeli tanıtıldı"

        en = client.get(f"/api/v1/events/{slug}?lang=en").json()
        assert en["title"] == "Homegrown AI model unveiled"

        # TR requested for a TR-origin story ⇒ still the original
        tr = client.get(f"/api/v1/events/{slug}?lang=tr").json()
        assert tr["title"] == "Yerli yapay zekâ modeli tanıtıldı"
    finally:
        with session_scope() as db:
            db.query(models.EventTranslation).filter_by(event_id=ev_id).delete()
            db.query(models.Event).filter_by(id=ev_id).delete()


def test_home_region_scopes_top_signals_and_latest(client):
    assert client.get("/api/v1/home").status_code == 200
    tr_home = client.get("/api/v1/home?region=TR").json()
    world_home = client.get("/api/v1/home?region=world").json()
    tr_slugs = {e["slug"] for e in tr_home["latest_news"]}
    world_slugs = {e["slug"] for e in world_home["latest_news"]}
    assert tr_slugs.isdisjoint(world_slugs)


def test_marketplace_requires_repo_url_and_records_turkish_dev(client, monkeypatch):
    from planetai_api.routers import marketplace

    monkeypatch.setattr(marketplace._settings, "admin_token", "test-secret", raising=False)

    # open-source repo link is now required
    missing_repo = client.post(
        "/api/v1/marketplace",
        json={
            "name": "No Repo App",
            "category": "tool",
            "tagline": "should be rejected for missing repo_url",
            "url": "https://example.com/no-repo",
            "author_name": "Test Suite",
        },
    )
    assert missing_repo.status_code == 422

    sub = client.post(
        "/api/v1/marketplace",
        json={
            "name": "Turkish Dev App",
            "category": "tool",
            "tagline": "exercises the is_turkish_dev self-declaration field",
            "url": "https://example.com/tr-dev",
            "repo_url": "https://github.com/example/tr-dev",
            "author_name": "Test Suite",
            "is_turkish_dev": True,
        },
    )
    assert sub.status_code == 201
    slug = sub.json()["slug"]
    try:
        hdr = {"X-Admin-Token": "test-secret"}
        queue = client.get("/api/v1/marketplace/queue", headers=hdr).json()
        row = next(a for a in queue if a["slug"] == slug)
        assert row["is_turkish_dev"] is True
    finally:
        from planetai_shared.db import models
        from planetai_shared.db.base import session_scope

        with session_scope() as db:
            db.query(models.MarketplaceApp).filter_by(slug=slug).delete()


def test_news_submission_approval_creates_event_in_tr_region(client, monkeypatch):
    from planetai_api.routers import marketplace

    monkeypatch.setattr(marketplace._settings, "admin_token", "test-secret", raising=False)
    hdr = {"X-Admin-Token": "test-secret"}

    assert client.get("/api/v1/news-submissions/queue", headers=hdr).status_code == 200

    # body + name required
    bad = client.post(
        "/api/v1/news-submissions",
        json={"category": "AI", "submitter_name": "X"},
    )
    assert bad.status_code == 422

    body = (
        "PyTest okuyucu haberi — LLM Radar yayında. "
        "Bu metin kırk karakterden uzun olacak şekilde yazıldı."
    )
    sub = client.post(
        "/api/v1/news-submissions",
        json={
            "title": "PyTest okuyucu haberi",
            "summary": "LLM Radar yayında — kırk karakterlik kısa bir alt başlık özeti.",
            "description": body,
            "submitter_name": "Test Suite",
            "submitter_phone": "05551234567",
            "submitter_profession": "Mühendis",
            "submitter_company": "PlanetAI9",
            "image_urls": ["/uploads/news/demo/1.jpg"],
        },
    )
    assert sub.status_code == 201

    queue = client.get("/api/v1/news-submissions/queue", headers=hdr).json()
    row = next(s for s in queue if s["submitter_name"] == "Test Suite" and s["status"] == "pending")
    assert row["event_slug"] is None
    assert row["image_urls"] == ["/uploads/news/demo/1.jpg"]
    title = row["title"]

    approved = client.post(
        f"/api/v1/news-submissions/{row['id']}/status", headers=hdr, json={"status": "approved"}
    )
    assert approved.status_code == 200
    event_slug = approved.json()["event_slug"]
    assert event_slug

    try:
        detail = client.get(f"/api/v1/events/{event_slug}")
        assert detail.status_code == 200
        assert detail.json()["title"] == title
        assert detail.json()["summary"].startswith("LLM Radar")
        assert detail.json()["image_urls"] == ["/uploads/news/demo/1.jpg"]

        tr_slugs = {
            e["slug"] for e in client.get("/api/v1/events?region=TR&limit=50").json()["data"]
        }
        assert event_slug in tr_slugs

        # Reject / pending must unpublish the reader Event
        rejected = client.post(
            f"/api/v1/news-submissions/{row['id']}/status",
            headers=hdr,
            json={"status": "rejected"},
        )
        assert rejected.status_code == 200
        assert client.get(f"/api/v1/events/{event_slug}").status_code == 404
        submitted = {
            e["slug"] for e in client.get("/api/v1/events?origin=submitted&limit=50").json()["data"]
        }
        assert event_slug not in submitted

        # Re-approve brings it back
        again = client.post(
            f"/api/v1/news-submissions/{row['id']}/status",
            headers=hdr,
            json={"status": "approved"},
        )
        assert again.status_code == 200
        assert client.get(f"/api/v1/events/{event_slug}").status_code == 200
    finally:
        from planetai_shared.db import models
        from planetai_shared.db.base import session_scope

        with session_scope() as db:
            db.query(models.NewsSubmission).filter_by(id=row["id"]).delete()
            ev = db.query(models.Event).filter_by(slug=event_slug).first()
            if ev is not None:
                db.query(models.Article).filter_by(event_id=ev.id).delete()
                db.query(models.EventTopic).filter_by(event_id=ev.id).delete()
                db.delete(ev)
