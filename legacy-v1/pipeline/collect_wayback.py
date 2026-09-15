#!/usr/bin/env python3
"""Wayback collector for the years no live site still serves (recall test: everything before 2017).

Usage: python3 pipeline/collect_wayback.py --domain rakyatsulsel.com --outlet rakyatsulsel.co --from 2014 --to 2017 [--limit 500]

Lists CDX captures (200, text/html, one per URL), keeps article-like paths, fetches the raw capture
(`id_` flag = unmodified bytes) and extracts title/date/text. archive_url is set on every row.
"""
from __future__ import annotations
import argparse, json, re
from urllib.parse import urlencode
from fetch import get, archive_raw, append_jsonl, now_iso, RAW
from extract import extract_article

ARTICLE_RE = re.compile(r"/(20\d\d/\d\d|read|berita|news|artikel|post|\d{4,})", re.I)
SKIP_RE = re.compile(r"/(tag|category|kategori|page|author|feed|wp-|search|\?s=|amp/?$)", re.I)

def cdx(domain: str, year: int, limit: int):
    q = urlencode({"url": domain, "matchType": "domain", "from": year, "to": year, "filter": ["statuscode:200", "mimetype:text/html"],
                   "collapse": "urlkey", "fl": "timestamp,original", "limit": limit * 4}, doseq=True)
    r = get("https://web.archive.org/cdx/search/cdx?" + q, timeout=240)
    if r is None or r.status_code != 200: return []
    rows = [l.split(" ", 1) for l in r.text.split("\n") if " " in l]
    rows = [(t, u) for t, u in rows if ARTICLE_RE.search(u) and not SKIP_RE.search(u)]
    return rows[:limit]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--domain", required=True); ap.add_argument("--outlet", required=True)
    ap.add_argument("--from", dest="y0", type=int, default=2014); ap.add_argument("--to", dest="y1", type=int, default=2017)
    ap.add_argument("--limit", type=int, default=300, help="captures per year")
    a = ap.parse_args()
    out = RAW / "artikel" / f"{a.outlet}.jsonl"
    seen = {json.loads(l)["url"] for l in open(out)} if out.exists() else set()
    for y in range(a.y0, a.y1 + 1):
        caps = cdx(a.domain, y, a.limit); rows = []
        print(f"== {a.domain} {y}: {len(caps)} kandidat artikel")
        for ts, url in caps:
            if url in seen: continue
            arch = f"https://web.archive.org/web/{ts}id_/{url}"
            r = get(arch)
            if r is None or r.status_code != 200: continue
            raw_path = archive_raw(a.outlet, url, r.content)
            art = extract_article(r.text, url)
            if not art["tanggal_terbit"]: art["tanggal_terbit"] = f"{ts[:4]}-{ts[4:6]}-{ts[6:8]}"; art["tanggal_dari_capture"] = True
            rows.append({"outlet_id": a.outlet, "url": url, **art, "hash_shingle": None, "kecamatan": None, "sumber_koleksi": "wayback",
                         "raw_path": raw_path, "source_url": url, "archive_url": f"https://web.archive.org/web/{ts}/{url}",
                         "retrieved_at": now_iso(), "first_seen": now_iso(), "last_checked": now_iso()})
            seen.add(url)
        append_jsonl(out, rows); print(f"  +{len(rows)} artikel")

if __name__ == "__main__":
    main()
