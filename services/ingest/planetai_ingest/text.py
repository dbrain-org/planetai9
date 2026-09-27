"""Text normalization, hashing, and similarity helpers (no LLM)."""

from __future__ import annotations

import hashlib
import re
import unicodedata
from urllib.parse import urlparse

from selectolax.parser import HTMLParser

_WS = re.compile(r"\s+")
_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+")
_TRACKING = re.compile(r"[?&](utm_[^=]+|ref|fbclid|gclid|mc_cid|mc_eid)=[^&]*", re.IGNORECASE)


def extract_og_image(html: str, base_url: str = "") -> str | None:
    """Pull an og:image / twitter:image / first large <img> out of a page."""
    from urllib.parse import urljoin

    tree = HTMLParser(html)
    for sel, attr in (
        ('meta[property="og:image"]', "content"),
        ('meta[name="og:image"]', "content"),
        ('meta[name="twitter:image"]', "content"),
        ('meta[property="twitter:image"]', "content"),
        ('link[rel="image_src"]', "href"),
    ):
        node = tree.css_first(sel)
        if node and node.attributes.get(attr):
            return urljoin(base_url, node.attributes[attr].strip())
    article = tree.css_first("article img, main img, figure img, img")
    if article and article.attributes.get("src"):
        src = article.attributes["src"].strip()
        if src and not src.startswith("data:"):
            return urljoin(base_url, src)
    return None


_BOILER = re.compile(
    r"^(sign up|subscribe|read more|advertisement|share this|related:|image:|photo:|"
    r"getty images|reuters|associated press|©|all rights reserved|follow us|"
    r"this article|you might also|recommended|newsletter|cookie)",
    re.IGNORECASE,
)
_DROP_SELECTORS = "figure,figcaption,aside,nav,footer,header,form,script,style,.ad,.advertisement,.newsletter,.related,.share,.social,.promo"


def first_outbound_url(html: str) -> str | None:
    """First link in a post that is not Reddit itself (link previews, cited articles)."""
    if not html:
        return None
    tree = HTMLParser(html)
    for node in tree.css("a"):
        href = (node.attributes.get("href") or "").strip()
        if not href.startswith("http"):
            continue
        host = (urlparse(href).hostname or "").lower()
        if not host or "reddit.com" in host or host.endswith("redd.it"):
            continue
        return href
    return None


def extract_article_paragraphs(html: str, *, max_chars: int = 4800, max_paras: int = 14) -> str:
    """Pull the main article prose out of a page. Excerpt, not full reproduction."""
    if not html:
        return ""
    tree = HTMLParser(html)
    for node in tree.css(_DROP_SELECTORS):
        node.decompose()

    # pick the container with the most paragraph text
    best, best_len = None, 0
    sel = (
        "article, main, [role=main], .post-content, .article-body, .article-content, "
        ".entry-content, .wp-block-post-content, .td-post-content, .tdb_single_content, "
        ".c-article, .content__article-body, [itemprop=articleBody]"
    )
    for cand in tree.css(sel):
        length = sum(len(p.text() or "") for p in cand.css("p"))
        if length > best_len:
            best, best_len = cand, length
    body_len = sum(len(p.text() or "") for p in (tree.body.css("p") if tree.body else []))
    root = tree.body if best is None or best_len < body_len * 0.55 else best
    root = root or tree

    out: list[str] = []
    total = 0
    for p in root.css("p"):
        txt = _WS.sub(" ", (p.text() or "")).strip()
        if len(txt) < 40 or _BOILER.match(txt):
            continue
        out.append(txt)
        total += len(txt)
        if len(out) >= max_paras or total >= max_chars:
            break
    return "\n\n".join(out)


def strip_html(raw: str | None) -> str:
    if not raw:
        return ""
    text = HTMLParser(raw).text(separator=" ")
    return _WS.sub(" ", text).strip()


def normalize_ws(text: str | None) -> str:
    return _WS.sub(" ", (text or "").strip())


def clean_url(url: str) -> str:
    url = _TRACKING.sub("", url or "").rstrip("?&")
    return url


def registered_domain(url: str) -> str:
    host = (urlparse(url).hostname or "").lower().removeprefix("www.")
    parts = host.split(".")
    return ".".join(parts[-2:]) if len(parts) >= 2 else host


def summarize_excerpt(text: str, max_chars: int = 280, max_sentences: int = 2) -> str:
    """Pick the first 1-2 sentences, capped. No rewriting."""
    text = normalize_ws(text)
    if not text:
        return ""
    sentences = _SENT_SPLIT.split(text)
    out = " ".join(sentences[:max_sentences]).strip()
    if len(out) > max_chars:
        out = out[:max_chars].rsplit(" ", 1)[0].rstrip(",;:") + "…"
    return out


def content_hash(title: str, url: str) -> str:
    key = f"{_norm_title(title)}|{registered_domain(url)}"
    return hashlib.sha1(key.encode("utf-8")).hexdigest()


def _norm_title(title: str) -> str:
    t = unicodedata.normalize("NFKD", title or "").encode("ascii", "ignore").decode()
    t = re.sub(r"[^a-z0-9 ]+", " ", t.lower())
    return _WS.sub(" ", t).strip()


_TOKEN = re.compile(r"[a-z0-9]+")


def _tokens(text: str) -> list[str]:
    return _TOKEN.findall((text or "").lower())


def simhash64(text: str) -> int:
    """64-bit SimHash over word shingles. Signed range for Postgres BIGINT."""
    tokens = _tokens(text)
    if not tokens:
        return 0
    shingles = (
        tokens if len(tokens) < 3 else [" ".join(tokens[i : i + 2]) for i in range(len(tokens) - 1)]
    )
    v = [0] * 64
    for sh in shingles:
        h = int.from_bytes(hashlib.blake2b(sh.encode(), digest_size=8).digest(), "big")
        for b in range(64):
            v[b] += 1 if (h >> b) & 1 else -1
    out = 0
    for b in range(64):
        if v[b] > 0:
            out |= 1 << b
    return out - (1 << 64) if out >= (1 << 63) else out


def hamming(a: int, b: int) -> int:
    return ((a & 0xFFFFFFFFFFFFFFFF) ^ (b & 0xFFFFFFFFFFFFFFFF)).bit_count()
