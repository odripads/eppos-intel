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
    todo = [k for k in kand if not k.get("url") and k.get("url_google")]
    if not todo:
        print("semua kandidat sudah punya URL", file=sys.stderr); return
    seen = {cc.norm_url(k["url"]) for k in kand if k.get("url")}
    ok = fail = 0
    for k in todo[: a.max]:
        gid = k["url_google"].rsplit("/", 1)[-1]
        u = cc.resolve(gid, attempts=2)
        if u:
            nu = cc.norm_url(u)
            if nu in seen:
                k["status_url"] = "duplikat"; k["catatan_tinjau"] = "URL sama dengan kandidat lain"
            else:
                seen.add(nu); k["url"] = u; k["status_url"] = "terselesaikan"; ok += 1
        else:
            k["status_url"] = "belum terselesaikan"; fail += 1
        print(("  OK   " if u else "  GAGAL") + " " + k["kandidat_id"] + " " + (u or k["judul"])[:72], file=sys.stderr)
        p.write_text(json.dumps(kand, ensure_ascii=False, indent=1) + "\n")
        time.sleep(a.gap)
    sisa = len([k for k in kand if not k.get("url") and k.get("url_google")])
    print(f"{ok} terselesaikan, {fail} gagal, {sisa} masih menunggu", file=sys.stderr)


if __name__ == "__main__":
    main()
