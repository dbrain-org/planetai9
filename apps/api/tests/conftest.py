import pytest
from fastapi.testclient import TestClient
from planetai_shared.db.base import engine
from sqlalchemy import text


def _db_ready() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("select 1 from events limit 1"))
        return True
    except Exception:
        return False


DB_READY = _db_ready()


def pytest_collection_modifyitems(config, items):
    if DB_READY:
        return
    skip = pytest.mark.skip(reason="database not migrated/reachable")
    for item in items:
        if "test_api" in item.nodeid:
            item.add_marker(skip)


@pytest.fixture(scope="session")
def client() -> TestClient:
    from planetai_api.main import app
    from planetai_api.ratelimit import limiter

    # tests exercise rate-limited endpoints repeatedly (and the limiter's
    # fixed-window state lives in Redis across runs) — turn it off here.
    limiter.enabled = False

    return TestClient(app)


@pytest.fixture
def author_slug() -> str:
    """Ensure an author row exists for the studio tests (independent of seed)."""
    from planetai_shared.db import models
    from planetai_shared.db.base import session_scope

    slug = "ayhan-demirci"
    with session_scope() as db:
        if db.query(models.Author).filter_by(slug=slug).first() is None:
            db.add(
                models.Author(
                    slug=slug,
                    name="Ayhan Demirci",
                    role="Kurucu · PlanetAI9",
                    status="active",
                )
            )
    return slug
