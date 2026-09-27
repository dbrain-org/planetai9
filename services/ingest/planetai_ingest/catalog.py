"""Grow VeriVatan, Üniversite, and TAKYAP from public catalogs.

Hugging Face supplies Turkish datasets and models. GitHub supplies open-source
projects and course repositories. Existing cards are left alone; only new URLs
are inserted. The scheduler runs this a few times a day.
"""

from __future__ import annotations

import html
import logging
import re
from urllib.parse import quote

import httpx
from planetai_shared.db import models
from planetai_shared.db.base import session_scope
from slugify import slugify
from sqlalchemy import select
from sqlalchemy.orm import Session

log = logging.getLogger(__name__)

_UA = {"User-Agent": "PlanetAI9 catalog (+https://planetai9.com)"}
_TIMEOUT = httpx.Timeout(20.0, connect=8.0)


def _get_json(client: httpx.Client, url: str):
    try:
        resp = client.get(url, headers=_UA)
        if resp.status_code >= 400:
            log.info("catalog skip %s -> %s", url, resp.status_code)
            return None
        return resp.json()
    except (httpx.HTTPError, ValueError):
        log.info("catalog fetch failed %s", url, exc_info=True)
        return None


def _kind_for_dataset(row: dict) -> str:
    blob = " ".join(
        [
            str(row.get("id") or ""),
            " ".join(row.get("tags") or []),
            str(row.get("description") or ""),
        ]
    ).lower()
    if any(word in blob for word in ("sft", "instruction", "chat", "rlhf")):
        return "sft"
    if any(word in blob for word in ("speech", "audio", "asr")):
        return "medya"
    if any(word in blob for word in ("nlp", "text", "corpus", "language-modeling", "pretraining")):
        return "corpus"
    return "genel"


def _edu_kind(text: str) -> str:
    blob = text.lower()
    if any(
        word in blob for word in ("101", "giriş", "giris", "intro", "beginner", "temel", "herkes")
    ):
        return "herkes"
    if any(word in blob for word in ("meslek", "kariyer", "bootcamp", "career", "iş", "is hayati")):
        return "meslek"
    return "derin"


def _app_category(text: str, pipeline: str | None) -> str:
    blob = f"{text} {pipeline or ''}".lower()
    if any(word in blob for word in ("text-to-speech", "tts")):
        return "tts"
    if any(word in blob for word in ("speech", "asr", "stt", "whisper")):
        return "stt"
    if any(word in blob for word in ("agent", "mcp")):
        return "agent" if "agent" in blob else "mcp"
    if any(word in blob for word in ("llm", "text-generation", "language model", "language-model")):
        return "llm"
    return "tool"


def _load_links(db: Session, collection: str) -> tuple[set[str], set[str], int]:
    rows = db.scalars(
        select(models.CuratedLink).where(models.CuratedLink.collection == collection)
    ).all()
    urls = {r.url.rstrip("/") for r in rows}
    names = {r.name for r in rows}
    order = max((r.sort_order for r in rows), default=-1)
    return urls, names, order


def _add_link(
    db: Session,
    collection: str,
    name: str,
    url: str,
    kind: str,
    note_tr: str,
    note_en: str,
    urls: set[str],
    names: set[str],
    order: int,
    image_url: str | None = None,
) -> int:
    url = url.rstrip("/")
    if not name or not url or url in urls:
        return order
    base = re.sub(r"\s+", " ", name).strip()[:170] or url[:80]
    label = base
    n = 2
    while label in names:
        label = f"{base[:160]} {n}"
        n += 1
    order += 1
    db.add(
        models.CuratedLink(
            collection=collection,
            name=label[:200],
            url=url,
            kind=kind,
            note_tr=note_tr[:500],
            note_en=note_en[:500],
            image_url=image_url,
            sort_order=order,
            enabled=True,
        )
    )
    urls.add(url)
    names.add(label)
    return order


def _harvest_datasets(client: httpx.Client, db: Session) -> int:
    urls, names, order = _load_links(db, "tr_data")
    before = len(urls)
    queries = (
        "https://huggingface.co/api/datasets?filter=language:tr&sort=downloads&limit=100&direction=-1",
        "https://huggingface.co/api/datasets?search=turkish&sort=downloads&limit=100&direction=-1",
        "https://huggingface.co/api/datasets?search=turkce&sort=downloads&limit=50&direction=-1",
    )
    seen: set[str] = set()
    for url in queries:
        rows = _get_json(client, url) or []
        if not isinstance(rows, list):
            continue
        for row in rows:
            if row.get("private") or row.get("disabled") or row.get("gated"):
                continue
            dataset_id = str(row.get("id") or "")
            if not dataset_id or dataset_id in seen:
                continue
            seen.add(dataset_id)
            downloads = int(row.get("downloads") or 0)
            description = (row.get("description") or "").strip().split("\n", 1)[0][:180]
            note_tr = description or f"Türkçe açık veri seti. {downloads:,} indirme.".replace(
                ",", "."
            )
            note_en = description or f"Turkish open dataset. {downloads:,} downloads."
            order = _add_link(
                db,
                "tr_data",
                dataset_id,
                f"https://huggingface.co/datasets/{dataset_id}",
                _kind_for_dataset(row),
                note_tr,
                note_en,
                urls,
                names,
                order,
            )
    return len(urls) - before


_VIDEO_QUERIES: dict[str, tuple[str, ...]] = {
    "herkes": (
        "yapay zeka nedir",
        "yapay zeka dersleri başlangıç",
        "chatgpt nasıl kullanılır",
        "üretken yapay zeka giriş",
        "prompt mühendisliği nedir",
        "gemini nasıl kullanılır",
        "yapay zeka araçları günlük hayat",
        "yapay zeka etiği",
        "yapay zekanın tarihi nasıl gelişti",
        "what is artificial intelligence explained",
        "generative ai for beginners",
        "how chatgpt works",
    ),
    "derin": (
        "makine öğrenmesi dersleri",
        "derin öğrenme ders",
        "büyük dil modelleri nasıl çalışır",
        "yapay sinir ağları ders",
        "python ile makine öğrenmesi",
        "doğal dil işleme ders",
        "bilgisayarlı görü ders",
        "LLM fine tuning türkçe",
        "yapay zeka ajanları nasıl yapılır",
        "transformer neural network explained",
        "RAG LLM tutorial",
        "neural networks from scratch",
        "reinforcement learning explained",
        "diffusion models explained",
        "AI agents tutorial",
        "stanford machine learning lecture",
    ),
    "meslek": (
        "yapay zeka sağlıkta",
        "yapay zeka tıp doktor",
        "yapay zeka hukuk",
        "yapay zeka avukatlık",
        "yapay zeka finans",
        "yapay zeka bankacılık",
        "yapay zeka eğitimde öğretmen",
        "yapay zeka iş hayatı meslekler",
        "yapay zeka kariyer geleceğin meslekleri",
        "AI in healthcare",
        "AI in law",
        "AI in finance",
        "AI in education teachers",
        "AI jobs future of work",
    ),
}
_JOB_TOPIC = re.compile(
    r"sağlık|saglik|tıp|tip\b|doktor|hekim|hastane|hukuk|avukat|yargı|finans|banka|ekonomi|"
    r"eğitim|egitim|öğretmen|ogretmen|okul|meslek|iş\s|işler|kariyer|çalışan|health|medic|law|"
    r"legal|lawyer|financ|bank|teach|educat|school|jobs?\b|work|career",
    re.IGNORECASE,
)
_NOT_LESSON = re.compile(
    r"inceleme|review|kullanıcı deneyimi|unboxing|reklam|sponsor|yok edecek|kıyamet|#shorts|"
    r"tanıtıldı|bilgilendirme|masterclass|finansal terapi|fırsatı kaçır|"
    r"canlandır|canlandir|\b4k\b|ultra\s*hd|peygamber|sultan|fetih|fethedil|savaş|hikaye|masal|"
    r"şarkı|sarki|müzik|muzik|\bsong\b|music|klip|trailer|fragman|gameplay|oyun|film|dizi|"
    r"korku|horror|asmr|prank|tiktok|reels|para kazan|make money|passive income|zengin ol|"
    r"şaka gibi|bayılacaksın|solla|gezdik|ürkütücü|kurşun|saldırdı|useless",
    re.IGNORECASE,
)
_LESSON = re.compile(
    r"nedir|nasıl|nasil|neden|ders|eğitim|egitim|giriş|giris|öğren|ogren|anlat|rehber|temel|"
    r"serisi|hafta|bölüm|bolum|seminer|konferans|konuşma|söyleşi|panel|kullan|çalışır|calisir|"
    r"gelecek|geleceğ|meslek|kariyer|dönüş|etki|sağlık|hukuk|finans|öğretmen|"
    r"\bwhat\b|\bhow\b|\bwhy\b|explain|lecture|course|tutorial|guide|beginner|basics|intro|"
    r"learn|lesson|series|talk|\bted|future|impact|changing|transform|from scratch|crash course|"
    r"full course|clearly|in \d+ minutes|"
    r"başla|basla|adım|history|tarihi|sinir ağ|neural|diffusion|\brag\b|fine.?tun|"
    r"yerini alabilir|\bvs\b|tools?\b|araçları|economist|yolculu|\bmit\b|stanford|ways to|"
    r"every feature",
    re.IGNORECASE,
)
_AI_TITLE = re.compile(
    r"yapay\s*zek|\bai\b|\ba\.i\.|makine\s*öğren|derin\s*öğren|machine\s*learning|deep\s*learning|"
    r"\bllm|gpt|chatgpt|gemini|claude|neural|sinir\s*ağ|transformer|prompt|üretken|generative|\brag\b",
    re.IGNORECASE,
)
_MIN_SECONDS = 4 * 60
_MIN_VIEWS = 10_000
_PER_QUERY = 6


def _seconds(label: str) -> int:
    total = 0
    for part in label.split(":"):
        if not part.isdigit():
            return 0
        total = total * 60 + int(part)
    return total


def _views(label: str) -> int:
    digits = re.sub(r"\D", "", label)
    return int(digits) if digits else 0


def _text(node: dict | None) -> str:
    if not node:
        return ""
    if "simpleText" in node:
        return node["simpleText"]
    return "".join(run.get("text", "") for run in node.get("runs") or [])


def _video_renderers(node):
    if isinstance(node, dict):
        if "videoRenderer" in node:
            yield node["videoRenderer"]
        for value in node.values():
            yield from _video_renderers(value)
    elif isinstance(node, list):
        for value in node:
            yield from _video_renderers(value)


def _youtube_search(client: httpx.Client, query: str) -> list[dict]:
    """Video results from YouTube search (no API key). Empty list if YouTube changes its page."""
    import json

    try:
        resp = client.get(
            "https://www.youtube.com/results",
            params={"search_query": query, "sp": "EgIQAQ=="},
            headers={
                "User-Agent": "Mozilla/5.0",
                "Accept-Language": "tr,en;q=0.8",
                "Cookie": "CONSENT=YES+1",
            },
        )
    except httpx.HTTPError:
        return []
    match = re.search(r"var ytInitialData = (\{.*?\});</script>", resp.text, re.DOTALL)
    if not match:
        return []
    try:
        data = json.loads(match.group(1))
    except ValueError:
        return []
    videos = []
    for video in _video_renderers(data):
        video_id = video.get("videoId")
        title = _text(video.get("title"))
        if not video_id or not title:
            continue
        videos.append(
            {
                "id": video_id,
                "title": title,
                "channel": _text(video.get("ownerText")),
                "seconds": _seconds(_text(video.get("lengthText"))),
                "views": _views(_text(video.get("viewCountText"))),
                "length": _text(video.get("lengthText")),
            }
        )
    return videos


def _harvest_education(client: httpx.Client, db: Session) -> int:
    """Add popular AI videos (with their YouTube thumbnails) to each Üniversite track."""
    urls, names, order = _load_links(db, "education")
    before = len(urls)
    for kind, queries in _VIDEO_QUERIES.items():
        for query in queries:
            added = 0
            for video in _youtube_search(client, query):
                if added >= _PER_QUERY:
                    break
                if video["seconds"] < _MIN_SECONDS or video["views"] < _MIN_VIEWS:
                    continue
                title = video["title"]
                if not _AI_TITLE.search(title) or _NOT_LESSON.search(title):
                    continue
                if not _LESSON.search(title):
                    continue
                if kind == "meslek" and not _JOB_TOPIC.search(title):
                    continue
                url = f"https://www.youtube.com/watch?v={video['id']}"
                if url in urls:
                    continue
                channel = video["channel"] or "YouTube"
                order = _add_link(
                    db,
                    "education",
                    f"{channel} · {video['title']}",
                    url,
                    kind,
                    f"Video · {video['length']}. {channel} kanalından.",
                    f"Video · {video['length']}. From {channel}.",
                    urls,
                    names,
                    order,
                    image_url=f"https://i.ytimg.com/vi/{video['id']}/hqdefault.jpg",
                )
                added += 1
    return len(urls) - before


def _retire_repo_courses(db: Session) -> int:
    """Hide repo projects filed as courses and videos that don't teach anything."""
    rows = db.scalars(
        select(models.CuratedLink).where(
            models.CuratedLink.collection == "education",
            models.CuratedLink.enabled.is_(True),
            models.CuratedLink.url.contains("github.com/"),
            models.CuratedLink.note_tr.endswith("yıldız."),
        )
    ).all()
    for row in rows:
        row.enabled = False
    videos = db.scalars(
        select(models.CuratedLink).where(
            models.CuratedLink.collection == "education",
            models.CuratedLink.enabled.is_(True),
            models.CuratedLink.note_tr.startswith("Video ·"),
        )
    ).all()
    hidden = 0
    for row in videos:
        title = row.name.split(" · ", 1)[-1]
        if _NOT_LESSON.search(title) or not _LESSON.search(title):
            row.enabled = False
            hidden += 1
    return len(rows) + hidden


def _existing_app_keys(db: Session) -> tuple[set[str], set[str]]:
    rows = db.scalars(select(models.MarketplaceApp)).all()
    slugs = {r.slug for r in rows}
    urls = {(r.url or "").rstrip("/") for r in rows}
    urls |= {(r.repo_url or "").rstrip("/") for r in rows}
    return slugs, urls


def _add_app(
    db: Session,
    *,
    slug: str,
    name: str,
    tagline: str,
    url: str,
    repo_url: str | None,
    category: str,
    author_name: str,
    slugs: set[str],
    urls: set[str],
) -> bool:
    url = url.rstrip("/")
    repo = (repo_url or "").rstrip("/") or None
    if url in urls or (repo and repo in urls):
        return False
    base = slugify(slug)[:140] or "proje"
    label = base
    n = 2
    while label in slugs:
        label = f"{base[:130]}-{n}"
        n += 1
    db.add(
        models.MarketplaceApp(
            slug=label,
            name=name[:160],
            tagline=(tagline or name)[:240],
            description=tagline[:800] if tagline else None,
            url=url,
            repo_url=repo,
            category=category,
            pricing="free",
            author_name=(author_name or "Açık kaynak")[:120],
            author_url=url,
            is_turkish_dev=True,
            status="approved",
            featured=False,
        )
    )
    slugs.add(label)
    urls.add(url)
    if repo:
        urls.add(repo)
    return True


def _harvest_projects(client: httpx.Client, db: Session) -> int:
    slugs, urls = _existing_app_keys(db)
    added = 0
    models_url = (
        "https://huggingface.co/api/models?search=turkish&sort=downloads&limit=60&direction=-1"
    )
    rows = _get_json(client, models_url) or []
    if isinstance(rows, list):
        for row in rows:
            if row.get("private") or row.get("disabled"):
                continue
            model_id = str(row.get("id") or "")
            if not model_id:
                continue
            pipeline = row.get("pipeline_tag")
            downloads = int(row.get("downloads") or 0)
            added += _add_app(
                db,
                slug=f"hf-{model_id}",
                name=model_id,
                tagline=f"Türkçe açık model. {downloads:,} indirme.".replace(",", "."),
                url=f"https://huggingface.co/{model_id}",
                repo_url=f"https://huggingface.co/{model_id}",
                category=_app_category(model_id, pipeline),
                author_name=model_id.split("/")[0],
                slugs=slugs,
                urls=urls,
            )
    queries = (
        "turkish llm OR turkish nlp",
        "türkçe yapay zeka OR turkce dil modeli",
    )
    for query in queries:
        payload = _get_json(
            client,
            "https://api.github.com/search/repositories?q="
            + quote(query + " fork:false")
            + "&sort=stars&per_page=20",
        )
        if not isinstance(payload, dict):
            continue
        for row in payload.get("items") or []:
            full = row.get("full_name") or ""
            if not full:
                continue
            desc = (row.get("description") or "Açık kaynak yapay zekâ projesi.").strip()
            added += _add_app(
                db,
                slug=full,
                name=row.get("name") or full,
                tagline=desc[:240],
                url=row.get("html_url") or "",
                repo_url=row.get("html_url"),
                category=_app_category(f"{full} {desc}", None),
                author_name=(row.get("owner") or {}).get("login") or full.split("/")[0],
                slugs=slugs,
                urls=urls,
            )
    return added


_OG_IMAGE = re.compile(
    r'(?:property="og:image"[^>]*content="([^"]+)"|content="([^"]+)"[^>]*property="og:image")',
    re.IGNORECASE,
)
_BTK_IMAGE = re.compile(
    r'"imageUrl"\s*:\s*"(https:[^"]+\.(?:png|jpe?g|webp)[^"]*)"',
    re.IGNORECASE,
)


def _known_cover(url: str) -> str | None:
    try:
        parsed = httpx.URL(url)
    except httpx.InvalidURL:
        return None
    host = (parsed.host or "").lower().removeprefix("www.")
    if host == "github.com":
        parts = [p for p in parsed.path.split("/") if p]
        if len(parts) >= 2:
            return (
                f"https://opengraph.githubassets.com/1/{parts[0]}/{parts[1].removesuffix('.git')}"
            )
    if host in {"cloudskillsboost.google", "grow.google", "ai.google.dev"} or host.endswith(
        ".google"
    ):
        return "/covers/google.png"
    if host in {"youtube.com", "m.youtube.com", "youtu.be"}:
        if host == "youtu.be":
            video = parsed.path.strip("/").split("/")[0]
        else:
            video = parsed.params.get("v") or ""
        if video and video not in {"playlist", "channel", "c", "user"}:
            return f"https://i.ytimg.com/vi/{video}/hqdefault.jpg"
    return None


def _cover_from_page(client: httpx.Client, url: str) -> str | None:
    known = _known_cover(url)
    if known:
        return known
    if "youtube.com/playlist" in url:
        try:
            resp = client.get(
                "https://www.youtube.com/oembed", params={"format": "json", "url": url}
            )
            return resp.json().get("thumbnail_url") if resp.status_code == 200 else None
        except (httpx.HTTPError, ValueError):
            return None
    try:
        resp = client.get(url, headers={**_UA, "accept": "text/html"})
    except httpx.HTTPError:
        return None
    if resp.status_code >= 400:
        return None
    if "btkakademi.gov.tr" in url:
        match = _BTK_IMAGE.search(resp.text)
        if match:
            return match.group(1).replace("\\u0026", "&")
    match = _OG_IMAGE.search(resp.text)
    if not match:
        return None
    image = html.unescape(match.group(1) or match.group(2) or "")
    if not image or image.startswith("data:"):
        return None
    return str(resp.url.join(image))


def _image_loads(client: httpx.Client, url: str) -> bool:
    if url.startswith("/"):
        return True
    try:
        with client.stream("GET", url, headers=_UA) as resp:
            return resp.status_code < 400 and resp.headers.get("content-type", "image/").startswith(
                "image/"
            )
    except httpx.HTTPError:
        return False


def _working_cover(client: httpx.Client, url: str) -> str | None:
    image = _cover_from_page(client, url)
    return image if image and _image_loads(client, image) else None


def fill_education_covers(client: httpx.Client, db: Session, limit: int = 400) -> int:
    """Attach a cover to education cards that don't have one yet."""
    from concurrent.futures import ThreadPoolExecutor

    for row in db.scalars(
        select(models.CuratedLink).where(
            models.CuratedLink.collection == "education",
            models.CuratedLink.image_url.contains("&amp;"),
        )
    ):
        row.image_url = html.unescape(row.image_url)

    rows = db.scalars(
        select(models.CuratedLink)
        .where(
            models.CuratedLink.collection == "education",
            models.CuratedLink.enabled.is_(True),
            models.CuratedLink.image_url.is_(None),
        )
        .limit(limit)
    ).all()
    if not rows:
        return 0
    found: dict[str, str] = {}
    with ThreadPoolExecutor(max_workers=8) as pool:
        jobs = {pool.submit(_working_cover, client, row.url): row.url for row in rows}
        for job in jobs:
            image = job.result()
            if image:
                found[jobs[job]] = image
    filled = 0
    for row in rows:
        image = found.get(row.url)
        if not image:
            continue
        row.image_url = image
        filled += 1
    return filled


def harvest_catalogs() -> dict[str, int]:
    """Insert new open data, courses, and projects. Only hides repo cards filed as courses."""
    stats = {"datasets": 0, "education": 0, "projects": 0, "covers": 0, "retired": 0}
    with httpx.Client(timeout=_TIMEOUT, follow_redirects=True) as client, session_scope() as db:
        stats["retired"] = _retire_repo_courses(db)
        stats["datasets"] = _harvest_datasets(client, db)
        stats["education"] = _harvest_education(client, db)
        stats["projects"] = _harvest_projects(client, db)
        stats["covers"] = fill_education_covers(client, db)
    log.info("catalog harvest %s", stats)
    return stats
