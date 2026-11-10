#!/usr/bin/env python3
"""Which outlets' WordPress archives reach back to the Pemilu 2009 / 2014 windows? One empty search per outlet
per window (any post dated inside it). Writes scripts/outlet_arsip_lama.json; crawl_outlets.py then sweeps the
PEMILU windows only on outlets that have posts there, instead of ~59k cells mostly on sites founded later.
Usage: /usr/bin/python3 scripts/probe_arsip_lama.py [--workers 20]"""
import argparse, importlib.util, json, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("co", ROOT / "scripts" / "crawl_outlets.py")
co = importlib.util.module_from_spec(spec); spec.loader.exec_module(co)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--workers", type=int, default=20); a = ap.parse_args()
    outlets = json.loads((ROOT / "scripts" / "outlet_wp.json").read_text())
    windows = co.cc.PEMILU

    def cek(dom):
        hasil = {}
        for w, (start, end) in windows.items():
            try: hasil[w] = len(co._one_page(dom, "", start, end, 1, 1)) > 0
            except Exception: hasil[w] = None          # unreachable: unknown, not "no archive"
        return dom, hasil

    with ThreadPoolExecutor(a.workers) as ex:
        res = dict(ex.map(cek, outlets))
    out = {w: sorted(d for d, h in res.items() if h.get(w)) for w in windows}
    out["tidak_terjangkau"] = sorted(d for d, h in res.items() if any(v is None for v in h.values()))
    (ROOT / "scripts" / "outlet_arsip_lama.json").write_text(json.dumps(out, indent=1) + "\n")
    print({w: len(v) for w, v in out.items()}, "dari", len(outlets), "outlet", file=sys.stderr)


if __name__ == "__main__":
    main()
