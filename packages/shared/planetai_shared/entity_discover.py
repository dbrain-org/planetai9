"""Find people and organizations in an article without a hand-maintained list.

A role next to a name ("kurucusu Larry Ellison", "Direktörü Adnan Veysel Ertemel")
is enough to create a person. Other names are checked against Wikidata and kept
only when that record is a human, company, or institution. Program phrases such
as "Jump Start" are dropped. Once an entity exists, later articles match it from
the database and do not call Wikidata again.
"""

from __future__ import annotations

import json
import logging
import re
import unicodedata
import urllib.parse
import urllib.request
import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from planetai_shared.db import models

log = logging.getLogger(__name__)

_MAX_LOOKUPS = 14
_MIN_SITELINKS = 5
# A Turkish chamber or technopark often has two or three Wikipedia editions.
# An exact label/alias match is enough; a fuzzy hit still needs the higher bar.
_MIN_SITELINKS_EXACT = 2
_UA = "PlanetAI9/1.0 (+https://planetai9.com)"

_NAME = r"[A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü'’\-]*"
_ROLES = (
    "kurucusu|kurucularından|direktörü|direktoru|genel müdürü|"
    "ceo(?:'su|’su)?|cto(?:'su|’su)?|cfo(?:'su|’su)?|"
    "başkanı|baskani|müdürü|muduru|mühendisi|muhendisi|mühendis|muhendis|"
    "profesörü|profesoru|founder|director"
)
# The role word is case-insensitive. The name stays case-sensitive, otherwise
# "kurucusu Larry Ellison'ı koltuğa" swallows the lowercase word after the name.
_ROLE_PERSON = re.compile(rf"(?i:{_ROLES})[ \t]+({_NAME}(?:[ \t]+{_NAME}){{0,2}})")
# "Dr. Çağrı Toraman", "Prof. Dr. Mehmet Fatih Amasyalı"
_TITLE_PERSON = re.compile(rf"(?:(?:Prof|Doç|Doc|Dr)\.[ \t]*)+({_NAME}(?:[ \t]+{_NAME}){{0,2}})")
_ORG_PHRASE = re.compile(
    rf"((?:{_NAME}[ \t]+){{1,5}}(?:Üniversitesi|University|Teknopark|Teknokent|"
    rf"Bakanlığı|Bakanligi|Holding|Odası|Odasi|Bankası|Bankasi))"
)
_MULTI = re.compile(rf"({_NAME}(?:[ \t]+{_NAME}){{1,2}})")
_INITIAL_ORG = re.compile(rf"\b([A-ZÇĞİÖŞÜ][ \t]+{_NAME})")
_ACRONYM = re.compile(r"\b[A-ZÇĞİÖŞÜ]{2,10}\b")
_TOKEN = re.compile(rf"{_NAME}")
_SUFFIX = re.compile(
    r"['’](?:nın|nin|nun|nün|ın|in|un|ün|da|de|ta|te|dan|den|a|e|ı|i|u|ü)$",
    re.IGNORECASE,
)

_STOP = frozenset(
    {
        "ancak",
        "bugün",
        "bugun",
        "peki",
        "bunun",
        "şirket",
        "sirket",
        "toplam",
        "oysa",
        "ilk",
        "altı",
        "alti",
        "dört",
        "dort",
        "iş",
        "the",
        "this",
        "that",
        "with",
        "from",
        "after",
        "today",
        "your",
        "and",
        "for",
        "bir",
        "için",
        "icin",
        "gibi",
        "daha",
        "sonra",
        "önce",
        "once",
        "planetai9",
        "youtube",
        "wall",
        "street",
        "jump",
        "start",
        "find",
        "new",
        "york",
        "silicon",
        "valley",
        "relational",
        "cloud",
        "data",
        "artificial",
        "intelligence",
        "yapay",
        "zeka",
        "türkiye",
        "turkiye",
        "istanbul",
        "bu",
    }
)
# Last word of a phrase that is a thing, not a surname.
_JUNK_LAST = frozenset(
    {
        "merkezi",
        "merkez",
        "program",
        "programı",
        "programi",
        "platform",
        "platformu",
        "çağrı",
        "çağrısı",
        "cagri",
        "cagrisi",
        "fabrika",
        "fabrikası",
        "fabrikasi",
        "vadisi",
        "yolu",
        "etkinliği",
        "etkinligi",
        "rabat",
    }
)
# "Fas Rabat", "New York" — look like names, are places.
_PLACE_PERSON_DENY = frozenset(
    {
        "fas rabat",
        "new york",
        "los angeles",
        "san francisco",
        "silicon valley",
        "wall street",
        "hong kong",
        "abu dhabi",
        "kuala lumpur",
    }
)
_ACRONYM_SKIP = frozenset(
    {
        "AI",
        "TR",
        "EN",
        "DB",
        "US",
        "EU",
        "OK",
        "TV",
        "IT",
        "HR",
        "VS",
        "VE",
        "DA",
        "DE",
        "LLM",
        "CEO",
        "CTO",
        "CFO",
    }
)

# Wikidata "instance of" ids. Unknown types are checked one step up (subclass of).
_PERSON_Q = frozenset({"Q5"})
_INST_Q = frozenset(
    {
        "Q3918",
        "Q38723",
        "Q875538",
        "Q902104",
        "Q31855",
        "Q1664720",
        "Q2385804",
        "Q1371037",
        "Q189533",
        "Q1144993",
        "Q2659904",
        "Q327333",
        "Q4671277",
        "Q1976594",  # science park (İTÜ ARI Teknokent)
    }
)
_ORG_Q = frozenset(
    {
        "Q43229",
        "Q4830453",
        "Q891723",
        "Q6881511",
        "Q783794",
        "Q163740",
        "Q167037",
        "Q18388277",
    }
)

_cache: dict[str, Resolved | None] = {}
_type_cache: dict[str, str | None] = {}


@dataclass(frozen=True)
class Mention:
    name: str
    hint: str  # person | org | maybe
    priority: int


@dataclass(frozen=True)
class Resolved:
    kind: str  # person | company | institution
    name: str
    aliases: tuple[str, ...]


def _clean_token(token: str) -> str:
    return _SUFFIX.sub("", token).strip("'-’")


def _clean_name(raw: str) -> str:
    parts = [_clean_token(p) for p in raw.split()]
    parts = [p for p in parts if p]
    return " ".join(parts)


def _strong_org(name: str) -> bool:
    """Üniversitesi / Teknopark / Odası and the other suffixes, at least two words."""
    return len(name.split()) >= 2 and _ORG_PHRASE.fullmatch(name) is not None


def _person_ok(name: str) -> bool:
    parts = name.split()
    if len(parts) < 2 or len(parts) > 4:
        return False
    if not 5 <= len(name) <= 60:
        return False
    if " ".join(p.casefold() for p in parts) in _PLACE_PERSON_DENY:
        return False
    last = parts[-1].casefold()
    # "çağrı" is a real first name (Çağrı Toraman). Only reject it as a surname /
    # program word ("Kuantum Çağrısı"), not in every token.
    if last in _JUNK_LAST or last.endswith(("merkezi", "programı", "programi", "platformu")):
        return False
    for p in parts:
        low = p.casefold()
        if low in _STOP or len(low) < 3 or p[0] != p[0].upper():
            return False
        if len(p) > 3 and p.isupper():
            return False
    return True


def _mask(text: str, start: int, end: int) -> str:
    return text[:start] + (" " * (end - start)) + text[end:]


def extract_mentions(title: str, body: str) -> list[Mention]:
    """Candidates, highest priority first. No network."""
    text = f"{title}\n{body}"
    found: dict[str, Mention] = {}

    def add(raw: str, hint: str, priority: int) -> None:
        name = _clean_name(raw)
        if len(name) < 2:
            return
        key = name.casefold()
        if key in _STOP:
            return
        prev = found.get(key)
        if prev is None or priority < prev.priority:
            found[key] = Mention(name, hint, priority)

    masked = text
    for rx, hint, priority in (
        (_TITLE_PERSON, "person", 0),
        (_ROLE_PERSON, "person", 0),
        (_ORG_PHRASE, "org", 1),
    ):
        for m in list(rx.finditer(masked)):
            add(m.group(1), hint, priority)
            masked = _mask(masked, m.start(1), m.end(1))

    multi_counts: dict[str, tuple[str, int]] = {}
    for m in _MULTI.finditer(masked):
        name = _clean_name(m.group(1))
        if not _person_ok(name):
            continue
        key = name.casefold()
        label, n = multi_counts.get(key, (name, 0))
        multi_counts[key] = (label, n + 1)
    title_l = title.casefold()
    for key, (label, n) in multi_counts.items():
        parts = label.split()
        last, prev = parts[-1], parts[-2]
        # "Ali Eren Aytekin" and later just "Aytekin" is a person, not a program name.
        # Skip place/product phrases that only look like names: "Fas Rabat",
        # "Türkbench Fas Rabat".
        if key in _PLACE_PERSON_DENY:
            continue
        given = parts[:-1]
        if (len(parts) == 2 and len(given[0]) < 4) or any(len(p) > 8 for p in given):
            if n >= 2 or key in title_l:
                add(label, "maybe", 3)
            continue
        solo = re.findall(
            rf"(?<!{re.escape(prev)}\s)(?<![A-Za-zÇĞİÖŞÜçğıöşü]){re.escape(last)}(?![A-Za-zÇĞİÖŞÜçğıöşü])",
            text,
        )
        if solo:
            add(label, "person", 0)
        elif n >= 2 or key in title_l:
            add(label, "maybe", 3)

    for m in _INITIAL_ORG.finditer(text):
        add(m.group(1), "maybe", 3)

    for m in _ACRONYM.finditer(text):
        token = m.group(0)
        if token in _ACRONYM_SKIP:
            continue
        add(token, "org", 2)

    # Repeated proper nouns. Sentence-initial words count too; the stop list
    # drops "Ancak" / "Bugün", and one occurrence is never enough.
    counts: dict[str, tuple[str, int]] = {}
    for m in _TOKEN.finditer(masked):
        name = _clean_token(m.group(0))
        if len(name) < 4 or name.casefold() in _STOP:
            continue
        key = name.casefold()
        label, n = counts.get(key, (name, 0))
        counts[key] = (label, n + 1)
    for key, (label, n) in counts.items():
        if n >= 2 or (n >= 1 and key in title_l):
            add(label, "maybe", 4)

    return sorted(found.values(), key=lambda m: (m.priority, -len(m.name)))


def _get_json(params: dict[str, str]) -> dict:
    url = "https://www.wikidata.org/w/api.php?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": _UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=3) as resp:
        return json.loads(resp.read().decode())


def _kind_of_q(qid: str, depth: int = 0) -> str | None:
    if qid in _type_cache:
        return _type_cache[qid]
    if qid in _PERSON_Q:
        kind = "person"
    elif qid in _INST_Q:
        kind = "institution"
    elif qid in _ORG_Q:
        kind = "company"
    elif depth >= 1:
        kind = None
    else:
        kind = None
        try:
            data = _get_json(
                {
                    "action": "wbgetentities",
                    "ids": qid,
                    "props": "claims",
                    "format": "json",
                }
            )
            claims = (data.get("entities") or {}).get(qid, {}).get("claims") or {}
            parents = _claim_ids(claims, "P279")
            for parent in parents:
                parent_kind = _kind_of_q(parent, depth + 1)
                if parent_kind:
                    kind = parent_kind
                    break
        except Exception:  # noqa: BLE001 - unknown type is not linkable
            kind = None
    _type_cache[qid] = kind
    return kind


def _claim_ids(claims: dict, prop: str) -> list[str]:
    out = []
    for row in claims.get(prop) or []:
        value = ((row.get("mainsnak") or {}).get("datavalue") or {}).get("value") or {}
        qid = value.get("id")
        if qid:
            out.append(qid)
    return out


def lookup_wikidata(name: str) -> Resolved | None:
    """Resolve ``name`` to a notable human or organization. None if unknown."""
    key = name.casefold()
    if key in _cache:
        return _cache[key]
    resolved = _lookup_uncached(name)
    _cache[key] = resolved
    return resolved


def _tokens(value: str) -> list[str]:
    return [t for t in re.split(r"[^a-z0-9çğıöşü]+", value.casefold()) if len(t) > 1]


def _covers(needle: str, bag: set[str]) -> bool:
    """True when ``needle`` is the label, an alias, or the same name with a middle initial."""
    tokens = _tokens(needle)
    if not tokens:
        return False
    for item in bag:
        if item == needle.casefold() or tokens == _tokens(item):
            return True
        item_tokens = _tokens(item)
        if all(t in item_tokens for t in tokens):
            return True
    return False


def _lookup_uncached(name: str) -> Resolved | None:
    try:
        search = _get_json(
            {
                "action": "wbsearchentities",
                "search": name,
                "language": "tr",
                "uselang": "tr",
                "type": "item",
                "limit": "3",
                "format": "json",
            }
        )
    except Exception as exc:  # noqa: BLE001
        log.info("wikidata search failed for %s: %s", name, exc)
        return None

    needle = name.casefold()
    for hit in search.get("search") or []:
        label = (hit.get("label") or "").strip()
        label_fold = label.casefold()
        label_hit = needle in label_fold or label_fold in needle
        # Acronyms often match a longer label ("İTÜ" → "İstanbul Teknik Üniversitesi")
        # only through aliases; accept the top hit and verify on the entity.
        top = hit is (search.get("search") or [None])[0]
        if not label_hit and not top:
            continue
        qid = hit.get("id")
        if not qid:
            continue
        try:
            data = _get_json(
                {
                    "action": "wbgetentities",
                    "ids": qid,
                    "props": "claims|labels|aliases|sitelinks",
                    "languages": "tr|en",
                    "format": "json",
                }
            )
        except Exception as exc:  # noqa: BLE001
            log.info("wikidata entity failed for %s: %s", qid, exc)
            continue
        entity = (data.get("entities") or {}).get(qid) or {}
        labels = entity.get("labels") or {}
        label_values = []
        for lang in ("tr", "en"):
            value = ((labels.get(lang) or {}).get("value") or "").strip()
            if value:
                label_values.append(value)
        canonical = label_values[0] if label_values else label or name
        aliases = []
        for lang in ("tr", "en"):
            for row in (entity.get("aliases") or {}).get(lang) or []:
                value = (row.get("value") or "").strip()
                if value:
                    aliases.append(value)
        bag = {v.casefold() for v in (*label_values, *aliases)}
        if not _covers(needle, bag):
            continue
        kinds = []
        for p31 in _claim_ids(entity.get("claims") or {}, "P31"):
            kind = _kind_of_q(p31)
            if kind:
                kinds.append(kind)
        if not kinds:
            continue
        kind = (
            "person"
            if "person" in kinds
            else "institution"
            if "institution" in kinds
            else "company"
        )
        sitelinks = len(entity.get("sitelinks") or {})
        # People keep the stricter bar so a two-article namesake is not linked.
        minimum = _MIN_SITELINKS_EXACT if kind != "person" and needle in bag else _MIN_SITELINKS
        if sitelinks < minimum:
            continue
        extra = tuple(a for a in (name, *aliases) if a.casefold() != canonical.casefold())
        return Resolved(kind, canonical, extra)
    return None


def _slug(name: str) -> str:
    folded = name.replace("İ", "I").replace("ı", "i")
    folded = unicodedata.normalize("NFKD", folded)
    folded = "".join(c for c in folded if not unicodedata.combining(c))
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", folded).strip("-").lower()
    return (slug or "entity")[:150]


def _index(db: Session) -> list[models.Entity]:
    return list(db.scalars(select(models.Entity)).all())


def _find(rows: list[models.Entity], *names: str) -> models.Entity | None:
    wanted = {n.casefold() for n in names if n}
    for ent in rows:
        bag = {ent.name.casefold(), *((a or "").casefold() for a in ent.aliases or [])}
        if bag & wanted:
            return ent
    return None


def _ensure(
    db: Session,
    rows: list[models.Entity],
    *,
    kind: str,
    name: str,
    aliases: tuple[str, ...] | list[str],
) -> models.Entity:
    ent = _find(rows, name, *aliases)
    if ent is not None:
        merged = list(ent.aliases or [])
        seen = {a.casefold() for a in merged}
        seen.add(ent.name.casefold())
        for alias in (name, *aliases):
            key = alias.casefold()
            if key in seen:
                continue
            seen.add(key)
            merged.append(alias)
        ent.aliases = merged
        return ent
    slug = _slug(name)
    if any(row.slug == slug for row in rows):
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"
    ent = models.Entity(
        slug=slug[:160],
        name=name[:200],
        type=kind,
        aliases=[a for a in aliases if a.casefold() != name.casefold()][:12],
        tier=0.45 if kind == "person" else 0.55,
    )
    db.add(ent)
    db.flush()
    rows.append(ent)
    log.info("auto entity: %s (%s, %s)", ent.name, ent.slug, kind)
    return ent


_WORD = re.compile(r"[0-9A-Za-zÇĞİÖŞÜçğıöşü]")
_LINKABLE = frozenset({"person", "company", "institution"})


def _phrase_hit(haystack: str, phrase: str) -> bool:
    """True when ``phrase`` sits on a word boundary. Casefold, no substring hits."""
    needle = phrase.casefold()
    if len(needle) < 3:
        return False
    start = 0
    while True:
        idx = haystack.find(needle, start)
        if idx < 0:
            return False
        before = haystack[idx - 1] if idx else " "
        after = haystack[idx + len(needle) : idx + len(needle) + 1] or " "
        if _WORD.match(before) is None and _WORD.match(after) is None:
            return True
        start = idx + 1


def _link_known_phrases(
    db: Session,
    event: models.Event,
    rows: list[models.Entity],
    linked: set[str],
    haystack: str,
    title_l: str,
) -> int:
    """Attach curated entities whose name or alias is written in the article.

    "Cosmos ekibine" matches the YTÜ team. Bare "Cosmos" does not, so NVIDIA's
    model family stays a different name.
    """
    made = 0
    for ent in rows:
        if ent.type not in _LINKABLE or str(ent.id) in linked:
            continue
        phrases = [ent.name, *(ent.aliases or [])]
        if not any(_phrase_hit(haystack, p) for p in phrases if p):
            continue
        in_title = any(_phrase_hit(title_l, p) for p in phrases if p)
        db.add(
            models.EventEntity(
                event_id=event.id,
                entity_id=ent.id,
                role="mentioned",
                confidence=0.85 if in_title else 0.65,
            )
        )
        linked.add(str(ent.id))
        made += 1
        if event.primary_entity_id is None and in_title and ent.type in {"company", "institution"}:
            event.primary_entity_id = ent.id
    return made


def discover_for_event(db: Session, event: models.Event) -> int:
    """Link people and organizations named in ``event``. Idempotent."""
    body = " ".join(p for p in (event.summary, event.body_text) if p)
    rows = _index(db)
    linked = {
        str(r.entity_id)
        for r in db.scalars(
            select(models.EventEntity).where(models.EventEntity.event_id == event.id)
        ).all()
    }
    # The dictionary pass may have added rows that are not flushed yet.
    for obj in db.new:
        if isinstance(obj, models.EventEntity) and obj.event_id == event.id:
            linked.add(str(obj.entity_id))
    haystack = f" {(event.title or '').casefold()}  {body.casefold()} "
    title_l = f" {(event.title or '').casefold()} "
    made = _link_known_phrases(db, event, rows, linked, haystack, title_l)

    mentions = extract_mentions(event.title or "", body)
    if not mentions:
        return made

    lookups = 0

    for mention in mentions:
        ent = _find(rows, mention.name)
        resolved: Resolved | None = None
        if ent is None:
            if lookups >= _MAX_LOOKUPS and mention.hint != "person":
                continue
            lookups += 1
            resolved = lookup_wikidata(mention.name)
            if resolved is not None:
                ent = _ensure(
                    db,
                    rows,
                    kind=resolved.kind,
                    name=resolved.name,
                    aliases=(mention.name, *resolved.aliases),
                )
            elif mention.hint == "person" and _person_ok(mention.name):
                ent = _ensure(db, rows, kind="person", name=mention.name, aliases=())
            elif mention.hint == "org" and (
                _strong_org(mention.name)
                or (mention.name.casefold() in title_l and len(mention.name) >= 4)
            ):
                # A titled acronym (GİNOVA) or a Teknopark / Odası phrase with no
                # Wikidata page is still the organization the article is about.
                ent = _ensure(db, rows, kind="institution", name=mention.name, aliases=())
        if ent is None or ent.type not in {"person", "company", "institution"}:
            continue
        if str(ent.id) in linked:
            continue
        in_title = mention.name.casefold() in title_l or ent.name.casefold() in title_l
        db.add(
            models.EventEntity(
                event_id=event.id,
                entity_id=ent.id,
                role="mentioned",
                confidence=0.8 if in_title else 0.6,
            )
        )
        linked.add(str(ent.id))
        made += 1
        if event.primary_entity_id is None and in_title and ent.type in {"company", "institution"}:
            event.primary_entity_id = ent.id

    return made


def backfill_submitted_events(*, limit: int = 60) -> int:
    """Re-scan PlanetAI9's own articles. Each article is saved on its own.

    One shared transaction hid every link until the whole Wikidata scan finished,
    and a failure at the end threw the links away.
    """
    from sqlalchemy import or_

    from planetai_shared.db.base import session_scope

    with session_scope() as db:
        event_ids = db.scalars(
            select(models.Article.event_id)
            .join(models.Source, models.Source.id == models.Article.source_id)
            .where(
                models.Article.event_id.is_not(None),
                or_(
                    models.Article.external_id.like("reader:%"),
                    models.Source.slug == "planetai9-editorial",
                ),
            )
            .order_by(models.Article.published_at.desc())
            .limit(limit)
        ).all()
    made = 0
    seen: set[uuid.UUID] = set()
    for event_id in event_ids:
        if event_id is None or event_id in seen:
            continue
        seen.add(event_id)
        try:
            with session_scope() as db:
                event = db.get(models.Event, event_id)
                if event is None or event.status != "active":
                    continue
                n = discover_for_event(db, event)
                made += n
                if n:
                    log.info("linked %s names on %s", n, event.slug)
        except Exception:
            log.exception("entity discovery failed for event %s", event_id)
    return made
