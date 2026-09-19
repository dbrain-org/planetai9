"""Dictionary-based entity tagging with Aho-Corasick + auto person discovery."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass

import ahocorasick
from planetai_shared.db import models
from planetai_shared.enums import EntityType
from slugify import slugify
from sqlalchemy import func, select
from sqlalchemy.orm import Session

log = logging.getLogger(__name__)

# most specific type wins when assigning the primary entity
_TYPE_RANK = {
    EntityType.MODEL: 5,
    EntityType.PRODUCT: 4,
    EntityType.TECHNOLOGY: 3,
    EntityType.PERSON: 3,
    EntityType.COMPANY: 2,
    EntityType.INSTITUTION: 2,
}
_WORD = re.compile(r"[a-z0-9]")

# "Kemal Kar ile" — strongest TR guest signal
_GUEST_ILE = re.compile(
    r"(?<![A-Za-zÇĞİÖŞÜçğıöşü])"
    r"([A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü''\-]+)+)"
    r"\s+ile\b"
)
# Video title guest: "Susan Wojcicki: …" (name at start, then colon)
_VIDEO_TITLE_GUEST = re.compile(
    r"^([A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü''\-]+)+)\s*:"
)
# News headline verbs: "Sam Altman apologizes …" / "Dario Amodei warns …"
_NEWS_VERB_PERSON = re.compile(
    r"(?:^|[\s\"“«])"
    r"([A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü''\-]+)+)"
    r"\s+(?:says?|said|announces?|announced|warns?|warned|apologizes?|apologized|"
    r"claims?|claimed|reveals?|revealed|denies|denied|admits?|admitted)\b"
)

_STOP_TOKENS = frozenset(
    {
        "yapay",
        "zeka",
        "zekâ",
        "google",
        "openai",
        "microsoft",
        "amazon",
        "apple",
        "meta",
        "nvidia",
        "anthropic",
        "deepmind",
        "chatgpt",
        "gemini",
        "claude",
        "united",
        "states",
        "new",
        "york",
        "san",
        "francisco",
        "silicon",
        "valley",
        "artificial",
        "intelligence",
        "machine",
        "learning",
        "deep",
        "language",
        "model",
        "models",
        "large",
        "open",
        "source",
        "türkiye",
        "turkiye",
        "china",
        "çin",
        "planetai9",
        "youtube",
        "teknoloji",
        "lideri",
        "kurucu",
        "kurucusu",
        "ceo",
        "cto",
        "the",
        "and",
        "with",
        "from",
        "this",
        "that",
        "world",
        "white",
        "house",
        "wall",
        "street",
        "north",
        "south",
        "east",
        "west",
        "ai",
        "llm",
        "gpt",
        "api",
    }
)


@dataclass(slots=True)
class EntityHit:
    entity_id: str
    entity_type: str
    name: str
    tier: float
    in_title: bool


class EntityIndex:
    def __init__(self, rows: list[tuple]):
        self._auto = ahocorasick.Automaton()
        self._meta: dict[str, dict] = {}
        for eid, etype, name, aliases, tier in rows:
            meta = {"id": str(eid), "type": str(etype), "name": name, "tier": float(tier or 0.4)}
            self._meta[str(eid)] = meta
            for phrase in [name, *(aliases or [])]:
                key = phrase.lower().strip()
                if len(key) >= 3:
                    self._auto.add_word(key, (key, meta))
        self._auto.make_automaton()

    @classmethod
    def from_db(cls, db: Session) -> EntityIndex:
        rows = db.execute(
            select(
                models.Entity.id,
                models.Entity.type,
                models.Entity.name,
                models.Entity.aliases,
                models.Entity.tier,
            )
        ).all()
        return cls(rows)

    def match(self, title: str, body: str) -> list[EntityHit]:
        title_l = f" {title.lower()} "
        full_l = f" {title.lower()}  {body.lower()} "
        found: dict[str, EntityHit] = {}
        for haystack, in_title in ((full_l, False), (title_l, True)):
            for end, (phrase, meta) in self._auto.iter(haystack):
                start = end - len(phrase) + 1
                if _boundary_ok(haystack, start, end):
                    hit = found.get(meta["id"])
                    if hit is None:
                        found[meta["id"]] = EntityHit(
                            meta["id"], meta["type"], meta["name"], meta["tier"], in_title
                        )
                    elif in_title:
                        hit.in_title = True
        return list(found.values())


def _boundary_ok(text: str, start: int, end: int) -> bool:
    before = text[start - 1] if start > 0 else " "
    after = text[end + 1] if end + 1 < len(text) else " "
    return not _WORD.match(before) and not _WORD.match(after)


def choose_primary(hits: list[EntityHit]) -> EntityHit | None:
    if not hits:
        return None
    return max(
        hits,
        key=lambda h: (h.in_title, _TYPE_RANK.get(h.entity_type, 0), h.tier),
    )


def _looks_like_person_name(name: str) -> bool:
    parts = [p for p in re.split(r"\s+", name.strip()) if p]
    if len(parts) < 2 or len(parts) > 3:
        return False
    if len(name) < 5 or len(name) > 60:
        return False
    for p in parts:
        low = p.lower().strip("'-")
        if low in _STOP_TOKENS or len(low) < 2:
            return False
        if not p[0].isupper():
            return False
    return True


def extract_person_candidates(text: str, *, source: str = "news") -> list[str]:
    """Pull likely person names from free text.

    ``source``:
      - ``video``: TR "X ile" guests + leading "Name:" title guests
      - ``news``: "X ile" + English headline verb patterns only
    """
    if not text:
        return []
    found: list[str] = []
    seen: set[str] = set()

    def add(raw: str) -> None:
        name = " ".join(raw.split())
        if not _looks_like_person_name(name):
            return
        key = name.casefold()
        if key in seen:
            return
        seen.add(key)
        found.append(name)

    for m in _GUEST_ILE.finditer(text):
        add(m.group(1))

    if source == "video":
        first = text.split("\n", 1)[0].strip()
        m = _VIDEO_TITLE_GUEST.match(first)
        if m:
            add(m.group(1))
    else:
        for m in _NEWS_VERB_PERSON.finditer(text):
            add(m.group(1))

    return found


def ensure_person_entity(db: Session, name: str) -> models.Entity:
    """Get or create a person entity for ``name`` (idempotent)."""
    name = " ".join(name.split())
    slug = slugify(name)[:160] or "person"
    existing = db.scalar(select(models.Entity).where(models.Entity.slug == slug))
    if existing is not None:
        return existing
    by_name = db.scalar(
        select(models.Entity).where(
            models.Entity.type == EntityType.PERSON.value,
            func.lower(models.Entity.name) == name.lower(),
        )
    )
    if by_name is not None:
        return by_name
    ent = models.Entity(
        slug=slug,
        name=name,
        type=EntityType.PERSON.value,
        aliases=[],
        tier=0.4,
        description=None,
    )
    db.add(ent)
    db.flush()
    log.info("auto person entity: %s (%s)", name, slug)
    return ent


def auto_tag_people(
    db: Session,
    *,
    title: str,
    body: str = "",
    source: str = "news",
) -> list[models.Entity]:
    """Extract person names from text and ensure they exist as entities."""
    text = f"{title}\n{body}".strip()
    people: list[models.Entity] = []
    for name in extract_person_candidates(text, source=source):
        people.append(ensure_person_entity(db, name))
    return people
