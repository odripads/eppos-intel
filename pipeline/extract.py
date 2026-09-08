"""Generic article extraction from HTML: title, published date, body text. Used by sitemap and Wayback paths."""
from __future__ import annotations
import html, json, re

_META = [r'property="article:published_time"\s+content="([^"]+)"', r'content="([^"]+)"\s+property="article:published_time"',
         r'name="pubdate"\s+content="([^"]+)"', r'itemprop="datePublished"\s+content="([^"]+)"',
         r'"datePublished"\s*:\s*"([^"]+)"', r'name="publish-date"\s+content="([^"]+)"']
_URL_DATE = re.compile(r"/(20\d\d)/(\d\d)/(\d\d)/")
_TAG = re.compile(r"<[^>]+>")
_SCRIPT = re.compile(r"<(script|style|noscript)[^>]*>.*?</\1>", re.S | re.I)

def strip_html(s: str) -> str:
    return html.unescape(_TAG.sub(" ", _SCRIPT.sub(" ", s))).replace("\xa0", " ")

def norm_date(s: str | None) -> str | None:
    if not s: return None
    m = re.match(r"(\d{4}-\d{2}-\d{2})", s)
    return m.group(1) if m else None

def extract_article(raw: str, url: str) -> dict:
    title = None
    m = re.search(r'property="og:title"\s+content="([^"]+)"', raw) or re.search(r"<title>(.*?)</title>", raw, re.S)
    if m: title = html.unescape(m.group(1)).strip()
    date = None
    for pat in _META:
        m = re.search(pat, raw)
        if m: date = norm_date(m.group(1)); break
    if not date:
        m = _URL_DATE.search(url)
        if m: date = f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    # body: prefer <article>, else the densest <p> run
    body = None
    m = re.search(r"<article[^>]*>(.*?)</article>", raw, re.S | re.I)
    if m: body = m.group(1)
    else:
        ps = re.findall(r"<p[^>]*>(.*?)</p>", raw, re.S | re.I)
        body = " ".join(p for p in ps if len(strip_html(p)) > 60)
    text = re.sub(r"\s+", " ", strip_html(body or "")).strip()
    return {"judul": title, "tanggal_terbit": date, "teks": text}
