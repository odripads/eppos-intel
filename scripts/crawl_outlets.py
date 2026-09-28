#!/usr/bin/env python3
"""Retrieval pass 2: search outlets' own WordPress archives directly.

Independent of Google News, which rate-limits per IP and hands back redirect links that must be resolved.
Here each outlet answers for its own archive, so a hit already carries the real URL, the publication date
and the real headline. Requests are spread across hosts, so there is no shared quota to exhaust.

Like the Google pass, this only fills the review queue — nothing reaches the map without curation.

  grid cell = (outlet) x (mekanisme keyword) x (gelombang pilkada window)
  query     = /wp-json/wp/v2/posts?search=<terms>&after=<start>&before=<end>

Usage: python3 scripts/crawl_outlets.py [--cells 120] [--registry scripts/outlet_wp.json]
"""
from __future__ import annotations
import argparse, datetime as dt, html, json, re, ssl, sys, threading, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import importlib.util

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
spec = importlib.util.spec_from_file_location("cc", ROOT / "scripts" / "crawl_candidates.py")
cc = importlib.util.module_from_spec(spec); spec.loader.exec_module(cc)

UA = "EPPOS-DPP-UGM academic research (incident census; github.com/odripads/eppos-intel)"
CTX = ssl.create_default_context(); CTX.check_hostname = False; CTX.verify_mode = ssl.CERT_NONE

# WP search matches whole words across the post, so terms are shorter than the Google News phrasings
CARI = {
    "paksaan aparat sipil": [
        "netralitas ASN", "mutasi pejabat pilkada", "ASN tidak netral", "ASN dilaporkan Bawaslu",
        "pegawai dimutasi pilkada", "ASN kampanye", "pelanggaran netralitas", "ASN diperiksa Bawaslu",
        "sanksi netralitas ASN", "ASN foto paslon", "ASN medsos paslon", "honorer diancam",
        "pegawai diancam dipecat", "ASN dukung calon", "PNS tidak netral", "BKN netralitas",
        "rekomendasi KASN", "teguran netralitas", "ASN hadiri kampanye", "mutasi jelang pilkada",
    ],
    "paksaan kepala desa dan lurah": [
        "kepala desa netralitas", "lurah netralitas", "kades dukung calon", "kepala desa dilaporkan",
        "perangkat desa pilkada", "kades kampanye", "camat netralitas", "kepala desa dikumpulkan",
        "kades diperiksa Bawaslu", "kepala desa sanksi pilkada", "lurah dilaporkan", "camat dilaporkan",
        "apdesi dukung", "paguyuban kades", "kepala desa deklarasi", "dana desa pilkada",
        "kades diancam", "perangkat desa dimobilisasi", "musyawarah kades pilkada",
    ],
    "paksaan warga penerima program": [
        "bansos pilkada", "bantuan sosial politik", "bansos dipolitisasi", "penerima bantuan diarahkan",
        "bantuan syarat dukung", "sembako pilkada", "KTP dikumpulkan pilkada", "bansos diancam dicabut",
        "penerima PKH pilkada", "bantuan sosial kampanye",
    ],
    "tekanan terhadap kritik": [
        "wartawan intimidasi", "aktivis dilaporkan", "jurnalis diintimidasi", "kritik dilaporkan polisi",
        "wartawan diancam", "aktivis diintimidasi", "akademisi ditekan", "pengunjuk rasa ditangkap",
        "kebebasan pers pilkada", "wartawan dipolisikan",
    ],
    "pengalihan sumber daya": [
        "bansos jelang pilkada", "petahana bantuan sosial", "peresmian jelang pilkada",
        "program bupati jelang pilkada", "hibah jelang pilkada", "bantuan keuangan jelang pilkada",
        "groundbreaking jelang pilkada", "anggaran dipercepat pilkada", "kunjungan kerja petahana",
    ],
}


def _one_page(domain, q, after, before, n, page):
    for path in ("/wp-json/wp/v2/posts?", "/?rest_route=/wp/v2/posts&"):
        qs = urllib.parse.urlencode({"search": q, "after": f"{after}T00:00:00", "before": f"{before}T23:59:59",
                                     "per_page": n, "page": page, "orderby": "date", "_fields": "link,date,title"})
        try:
            r = urllib.request.urlopen(urllib.request.Request(f"https://{domain}{path}{qs}",
                                                              headers={"User-Agent": UA}), timeout=15, context=CTX)
            j = json.loads(r.read())
            if isinstance(j, list): return j
        except Exception as e:
            last = e
    raise last


def wp_search(domain, q, after, before, n=100, max_pages=5):
    """Page through results. A cell that fills its page is truncated otherwise, so the busiest
    outlet/query pairs — exactly the ones most likely to hold incidents — were being cut off."""
    out = []
    for page in range(1, max_pages + 1):
        try:
            j = _one_page(domain, q, after, before, n, page)
        except Exception:
            if page == 1: raise
            break
        out += j
        if len(j) < n: break
    return out


def clean(t):
    return html.unescape(re.sub(r"<[^>]+>", "", t or "")).strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cells", type=int, default=400)
    ap.add_argument("--registry", default=str(ROOT / "scripts" / "outlet_wp.json"))
    a = ap.parse_args()

    outlets = json.loads(Path(a.registry).read_text())
    state = cc.load("crawl_state.json", {"done": [], "runs": []})
    kand = cc.load("kandidat.json", [])
    logs = cc.load("log_pencarian.json", [])
    seen = cc.known_urls() | {cc.norm_url(k["url"]) for k in kand if k.get("url")}
    seen_t = {re.sub(r"\W+", "", (k.get("judul") or "").lower())[:70] for k in kand}
    done = set(state.get("done", []))

    grid = []
    for wave in cc.WAVE_ORDER:
        for mek, qs in CARI.items():
            for q in qs:
                for d in outlets:
                    cid = f"wp|{wave}|{d}|{q}"
                    if cid not in done: grid.append((cid, wave, d, mek, q))
    todo = grid[: a.cells]
    print(f"grid WP: {len(grid)} sel tersisa; run ini {len(todo)}", file=sys.stderr)

    today = dt.date.today().isoformat()
    lock = threading.Lock()
    counter = {"n": max([int(k["kandidat_id"].split("-")[-1]) for k in kand], default=0),
               "log": max([int(l["log_id"].split("-")[-1]) for l in logs], default=0), "baru": 0, "sel": 0}
    by_host = {}
    for cell in todo: by_host.setdefault(cell[2], []).append(cell)

    def work(dom):
        """One worker per outlet: requests to a single site stay sequential and spaced."""
        dead = 0
        for cid, wave, _d, mek, q in by_host[dom]:
            if dead >= 4: return          # site is down or blocking; leave its cells for another day
            start, end = cc.GELOMBANG[wave]
            try:
                items = wp_search(dom, q, start, end)
                dead = 0
            except Exception as e:
                dead += 1
                with lock: print(f"  GAGAL {dom} '{q}' {wave}: {type(e).__name__}", file=sys.stderr)
                time.sleep(2); continue
            rows, kept = [], 0
            for it in items:
                t = clean(it.get("title", {}).get("rendered"))
                if not (cc.RELEVAN.search(t) and cc.AKTOR.search(t)) or cc.BUANG.search(t): continue
                url = it.get("link")
                if not url: continue
                rows.append((t, url, (it.get("date") or "")[:10]))
            with lock:
                for t, url, tgl in rows:
                    tk = re.sub(r"\W+", "", t.lower())[:70]
                    nu = cc.norm_url(url)
                    if tk in seen_t or nu in seen: continue
                    seen.add(nu); seen_t.add(tk); counter["n"] += 1; counter["baru"] += 1; kept += 1
                    kand.append({"kandidat_id": f"KAN-{counter['n']:05d}", "judul": t, "outlet": dom,
                        "tanggal_terbit": tgl, "url": url, "url_google": None, "status_url": "terselesaikan",
                        "gelombang_pilkada": wave, "mekanisme_dugaan": mek, "provinsi_kueri": "(arsip outlet)",
                        "kueri": f"{dom} search='{q}' {start}..{end}", "ditemukan_pada": today,
                        "status_tinjau": None, "catatan_tinjau": None})
                counter["log"] += 1
                logs.append({"log_id": f"LOG-{counter['log']:04d}", "provinsi": "(arsip outlet)",
                    "tanggal_pencarian": today, "kueri": f"{dom} wp-json search='{q}' {start}..{end}",
                    "alat": "WordPress REST (skrip)", "dijalankan_oleh": "rutin otomatis",
                    "catatan": f"{len(items)} hasil, {kept} masuk antrean"})
                done.add(cid); counter["sel"] += 1
                if kept: print(f"  {wave} {dom[:22]:22s} {q[:26]:26s} {len(items):3d}\u2192{kept}", file=sys.stderr)
                if counter["sel"] % 60 == 0:
                    state["done"] = sorted(done)
                    (DATA / "kandidat.json").write_text(json.dumps(kand, ensure_ascii=False, indent=1) + "\n")
                    (DATA / "crawl_state.json").write_text(json.dumps(state, ensure_ascii=False, indent=1) + "\n")
                    print(f"  ... {counter['sel']} sel, {counter['baru']} kandidat baru", file=sys.stderr)
            time.sleep(1.0)

    with ThreadPoolExecutor(max_workers=min(10, len(by_host))) as ex:
        list(ex.map(work, list(by_host)))
    baru = counter["baru"]
    state["done"] = sorted(done)

    state.setdefault("runs", []).append({"tanggal": today, "sel": len(todo), "kandidat_baru": baru, "sumber": "wp"})
    (DATA / "kandidat.json").write_text(json.dumps(kand, ensure_ascii=False, indent=1) + "\n")
    (DATA / "crawl_state.json").write_text(json.dumps(state, ensure_ascii=False, indent=1) + "\n")
    (DATA / "log_pencarian.json").write_text(json.dumps(logs, ensure_ascii=False, indent=1) + "\n")
    belum = len([k for k in kand if not k.get("status_tinjau")])
    print(f"\n{baru} kandidat baru · {belum} menunggu tinjauan", file=sys.stderr)


if __name__ == "__main__":
    main()
