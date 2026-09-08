#!/usr/bin/env python3
"""Build-order step 2: WordPress JSON collector, with sitemap fallback.

Usage:
  python3 pipeline/collect_wp.py --outlets data/outlet.json --after 2014-01-01 --before 2025-12-31 [--only fajar.co.id]

Writes raw/artikel/<outlet_id>.jsonl (one article per line, provenance on every row) and raw/<outlet_id>/json|html/.
Re-running is incremental: URLs already in the JSONL are skipped and get last_checked bumped.
Deletion is a finding: a URL that stops returning 200 is appended to raw/peristiwa_penghapusan.jsonl.
"""
from __future__ import annotations
import argparse, json, re
from pathlib import Path
from fetch import get, archive_raw, append_jsonl, now_iso, RAW
from extract import extract_article, strip_html, norm_date

def load_seen(path: Path) -> dict:
    if not path.exists(): return {}
    return {json.loads(l)["url"]: json.loads(l) for l in open(path) if l.strip()}

def wp_json(outlet: str, base: str, after: str, before: str, seen: dict):
    page, rows = 1, []
    while True:
        r = get(f"{base}/wp-json/wp/v2/posts", params={"per_page": 100, "page": page, "order": "asc", "orderby": "date",
                                                       "after": f"{after}T00:00:00", "before": f"{before}T23:59:59", "_fields": "id,link,date,title,content"})
        if r is None or r.status_code != 200: return rows, page > 1
        try: posts = r.json()
        except ValueError: return rows, page > 1
        if not isinstance(posts, list) or not posts: return rows, True
        for p in posts:
            url = p.get("link")
            if not url or url in seen: continue
            raw_path = archive_raw(outlet, url, json.dumps(p, ensure_ascii=False).encode(), kind="json")
            rows.append({"outlet_id": outlet, "url": url, "judul": strip_html(p.get("title", {}).get("rendered", "")).strip(),
                         "tanggal_terbit": norm_date(p.get("date")), "teks": re.sub(r"\s+", " ", strip_html(p.get("content", {}).get("rendered", ""))).strip(),
                         "hash_shingle": None, "kecamatan": None, "sumber_koleksi": "wp_json", "raw_path": raw_path,
                         "source_url": url, "archive_url": "", "retrieved_at": now_iso(), "first_seen": now_iso(), "last_checked": now_iso()})
        total_pages = int(r.headers.get("X-WP-TotalPages", "0") or 0)
        print(f"  {outlet}: halaman {page}/{total_pages or '?'}  (+{len(posts)})")
        if total_pages and page >= total_pages: return rows, True
        page += 1

def sitemap_urls(base: str, after: str, before: str, depth=0):
    """Walk sitemap indexes; yield (loc, lastmod) within the window when lastmod is present."""
    if depth > 3: return
    for path in ("/sitemap.xml", "/sitemap_index.xml", "/post-sitemap.xml", "/sitemap-news.xml") if depth == 0 else (base,):
        r = get(base + path if depth == 0 else base)
        if r is None or r.status_code != 200 or "<" not in r.text[:200]: continue
        if "<sitemapindex" in r.text:
            for loc in re.findall(r"<loc>\s*(.*?)\s*</loc>", r.text):
                yield from sitemap_urls(loc, after, before, depth + 1)
        else:
            for m in re.finditer(r"<url>(.*?)</url>", r.text, re.S):
                loc = re.search(r"<loc>\s*(.*?)\s*</loc>", m.group(1)); lm = re.search(r"<lastmod>\s*(.*?)\s*</lastmod>", m.group(1))
                if not loc: continue
                lmd = norm_date(lm.group(1)) if lm else None
                if lmd and not (after <= lmd <= before): continue
                yield loc.group(1), lmd
        if depth == 0: return

def sitemap(outlet: str, base: str, after: str, before: str, seen: dict):
    rows = []
    for url, lastmod in sitemap_urls(base, after, before):
        if url in seen: continue
        r = get(url)
        if r is None or r.status_code != 200: continue
        raw_path = archive_raw(outlet, url, r.content)
        art = extract_article(r.text, url)
        if not art["tanggal_terbit"]: art["tanggal_terbit"] = lastmod
        if art["tanggal_terbit"] and not (after <= art["tanggal_terbit"] <= before): continue
        rows.append({"outlet_id": outlet, "url": url, **art, "hash_shingle": None, "kecamatan": None, "sumber_koleksi": "sitemap",
                     "raw_path": raw_path, "source_url": url, "archive_url": "", "retrieved_at": now_iso(), "first_seen": now_iso(), "last_checked": now_iso()})
    return rows

def recheck(outlet: str, seen: dict, sample=50):
    """Deletion detection: re-fetch a sample of known URLs; a non-200 becomes a deletion event."""
    import random
    events = []
    for url in random.sample(list(seen), min(sample, len(seen))):
        r = get(url, retries=1)
        if r is None or r.status_code in (404, 410):
            events.append({"outlet_id": outlet, "url": url, "terakhir_terlihat": seen[url]["last_checked"], "pertama_hilang": now_iso(), "jenis": "artikel",
                           "source_url": url, "archive_url": "", "retrieved_at": now_iso(), "first_seen": now_iso(), "last_checked": now_iso()})
    return events

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--outlets", default="data/outlet.json"); ap.add_argument("--after", default="2014-01-01"); ap.add_argument("--before", default="2025-12-31")
    ap.add_argument("--only", nargs="*"); ap.add_argument("--recheck", action="store_true")
    a = ap.parse_args()
    outlets = [o for o in json.load(open(a.outlets)) if not o.get("fiktif") and (not a.only or o["outlet_id"] in a.only)]
    for o in outlets:
        oid, base = o["outlet_id"], o["url_beranda"].rstrip("/")
        out = RAW / "artikel" / f"{oid}.jsonl"; seen = load_seen(out)
        print(f"== {oid} ({len(seen)} sudah ada)")
        if a.recheck:
            ev = recheck(oid, seen); append_jsonl(RAW / "peristiwa_penghapusan.jsonl", ev); print(f"  {len(ev)} URL hilang"); continue
        rows, ok = wp_json(oid, base, a.after, a.before, seen)
        if not ok and not rows:
            print("  WP JSON tidak tersedia → sitemap"); rows = sitemap(oid, base, a.after, a.before, seen)
        append_jsonl(out, rows); print(f"  +{len(rows)} artikel → {out}")

if __name__ == "__main__":
    main()
