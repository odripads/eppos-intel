#!/usr/bin/env python3
"""Fetch each source URL once and record the page's real <title>. Derived titles (judul_status = 'dari URL')
are never published as real headlines; this sidecar is merged by build_data.py.

Usage: python3 scripts/verify_titles.py          (reads data/insiden.json + data/kasus_resmi.json, writes data/judul_terverifikasi.json)
Re-runs skip URLs already verified. Failures are recorded with status 'gagal' and stay unverified in the UI.
"""
from __future__ import annotations
import html, json, re, sys, time, datetime as dt
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent; DATA = ROOT / "data"; OUT = DATA / "judul_terverifikasi.json"
UA = "EPPOS-DPP-UGM research (verifying article titles; one request per URL)"
SKIP_TITLE = re.compile(r"^(just a moment|attention required|access denied|403|404|page not found|halaman tidak ditemukan)", re.I)

def title_of(text):
    m = re.search(r'property="og:title"\s+content="([^"]+)"', text) or re.search(r'content="([^"]+)"\s+property="og:title"', text)
    if not m: m = re.search(r"<title[^>]*>(.*?)</title>", text, re.S | re.I)
    if not m: return None
    t = html.unescape(re.sub(r"\s+", " ", m.group(1))).strip()
    return None if not t or SKIP_TITLE.match(t) else t

def main():
    urls = []
    for f, col in (("insiden.json", "sumber_1_url"), ("kasus_resmi.json", "sumber_url")):
        urls += [r[col] for r in json.load(open(DATA / f)) if r.get(col)]
    urls = list(dict.fromkeys(urls))
    done = json.load(open(OUT)) if OUT.exists() else {}
    todo = [u for u in urls if done.get(u, {}).get("status") != "terverifikasi"]
    print(f"{len(urls)} URL, {len(todo)} perlu diambil", file=sys.stderr)
    s = requests.Session(); s.headers["User-Agent"] = UA
    for i, u in enumerate(todo, 1):
        rec = {"diambil": dt.datetime.now().isoformat(timespec="seconds")}
        try:
            r = s.get(u, timeout=30, allow_redirects=True)
            rec["http"] = r.status_code; rec["url_akhir"] = r.url
            t = title_of(r.text) if r.status_code == 200 else None
            rec.update({"judul": t, "status": "terverifikasi" if t else "gagal"})
        except requests.RequestException as e:
            rec.update({"http": None, "judul": None, "status": "gagal", "error": e.__class__.__name__})
        done[u] = rec; print(f"[{i}/{len(todo)}] {rec['status']:13s} {u[:70]}  →  {(rec.get('judul') or '')[:60]}", file=sys.stderr)
        OUT.write_text(json.dumps(done, ensure_ascii=False, indent=1) + "\n"); time.sleep(2)
    ok = sum(1 for v in done.values() if v["status"] == "terverifikasi")
    print(f"{ok} terverifikasi, {len(done) - ok} gagal → {OUT}", file=sys.stderr)

if __name__ == "__main__":
    main()
