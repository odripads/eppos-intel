#!/usr/bin/env python3
"""Accept every queued candidate into the automated layer in one go.

Odri authorised blanket inclusion (29 Sep 2026) rather than reviewing row by row, so each candidate is
stamped `diterima otomatis` — accepted for display under a standing authorisation.

It is deliberately NOT stamped `masuk`. In this project `masuk` means a person read the row and cleared
it, and `dua sumber` means two independent outlets were checked against each other. Writing either of
those here would make 891 single-source machine finds indistinguishable from the hand-checked census,
which is the one distinction the whole design rests on. The rows are all on the map either way; only the
label differs, and the label is what keeps the dataset honest.

Usage: python3 scripts/confirm_queue.py [--reset]
"""
from __future__ import annotations
import argparse, datetime as dt, json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
P = ROOT / "data" / "kandidat.json"


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--reset", action="store_true")
    a = ap.parse_args()
    import sys; sys.path.insert(0, str(Path(__file__).resolve().parent))
    import kandidat_io
    hasil = {}
    kandidat_io.ubah(lambda kand: hasil.update(_cap(kand, a.reset)))
    print(f"{hasil['n']} kandidat ditandai · {hasil['tertahan']} tertahan tanpa URL · {hasil['sisa']} belum ditandai")


def _cap(kand, reset):
    today = dt.date.today().isoformat()
    n = 0
    for k in kand:
        if reset:
            k["status_tinjau"] = None; k["catatan_tinjau"] = None; n += 1
            continue
        # held only because the URL was missing; once the resolver finds it, the hold no longer applies
        if k.get("status_tinjau") == "tertahan" and k.get("url"):
            k["status_tinjau"] = None
        if k.get("status_tinjau"): continue
        if not k.get("url"):
            k["status_tinjau"] = "tertahan"
            k["catatan_tinjau"] = "tanpa URL sumber; setiap baris wajib punya tautan sumber"
            continue
        k["status_tinjau"] = "diterima otomatis"
        k["catatan_tinjau"] = f"diterima massal {today} atas izin berdiri Odri; bukan tinjauan per baris"
        n += 1
    return {"n": n, "sisa": sum(1 for k in kand if not k.get("status_tinjau")),
            "tertahan": sum(1 for k in kand if k.get("status_tinjau") == "tertahan")}


if __name__ == "__main__":
    main()
