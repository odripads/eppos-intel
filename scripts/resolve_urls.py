#!/usr/bin/env python3
"""Fill in real article URLs for queued candidates, slowly.

Google News RSS links are JS redirects. The endpoint that returns the real URL rate-limits hard, so this
runs as its own step with long pauses instead of inline during the crawl — a blocked request must never
cause a real incident to be dropped from the queue.

Usage: python3 scripts/resolve_urls.py [--max 25] [--gap 8]
"""
from __future__ import annotations
import argparse, json, sys, time
from pathlib import Path
import importlib.util

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("cc", ROOT / "scripts" / "crawl_candidates.py")
cc = importlib.util.module_from_spec(spec); spec.loader.exec_module(cc)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--max", type=int, default=25, help="candidates to attempt this run")
    ap.add_argument("--gap", type=float, default=8.0, help="seconds between attempts")
    a = ap.parse_args()
    p = ROOT / "data" / "kandidat.json"
    if not p.exists():
        print("belum ada kandidat", file=sys.stderr); return
    kand = json.loads(p.read_text())
    # a row already known to duplicate another article is not worth a rate-limited request
    todo = [k for k in kand if not k.get("url") and k.get("url_google") and k.get("status_url") != "duplikat"]
    if not todo:
        print("semua kandidat sudah punya URL", file=sys.stderr); return
    ok = fail = beruntun = 0
    for k in todo[: a.max]:
        if beruntun >= 5:
            # Google allows a short burst then throttles; pushing past it only deepens the block.
            # The rest keep their url_google and are retried by the next daily run.
            print(f"  5 kegagalan beruntun \u2014 berhenti; sisanya dicoba lagi besok", file=sys.stderr); break
        gid = k["url_google"].rsplit("/", 1)[-1]
        u = cc.resolve(gid, attempts=2)

        # applied to the row as it is on disk NOW, under the lock: the crawlers keep adding rows while
        # this runs, and rewriting the whole file from the copy read at start would erase them
        def terapkan(disk, k=k, u=u):
            sasaran = next((d for d in disk if d.get("url_google") == k["url_google"]), None)
            if sasaran is None or sasaran.get("url"): return "lewat"
            if not u:
                sasaran["status_url"] = "belum terselesaikan"; return "gagal"
            nu = cc.norm_url(u)
            if any(cc.norm_url(d["url"]) == nu for d in disk if d.get("url")):
                sasaran["status_url"] = "duplikat"; sasaran["catatan_tinjau"] = "URL sama dengan kandidat lain"
                return "duplikat"
            sasaran["url"] = u; sasaran["status_url"] = "terselesaikan"; return "ok"
        hasil = cc.kandidat_io.ubah(terapkan)
        if hasil == "ok": ok += 1
        if u: beruntun = 0
        else: fail += 1; beruntun += 1
        print(("  OK   " if u else "  GAGAL") + " " + k["kandidat_id"] + " " + (u or k["judul"])[:72], file=sys.stderr)
        time.sleep(a.gap)
    kand = json.loads(p.read_text())
    sisa = len([k for k in kand if not k.get("url") and k.get("url_google")])
    print(f"{ok} terselesaikan, {fail} gagal, {sisa} masih menunggu", file=sys.stderr)


if __name__ == "__main__":
    main()
