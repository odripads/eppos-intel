#!/usr/bin/env python3
"""Write the repo's public copy of the intake workbook with `pelaku_nama` gated.

PROJECT-SPEC v2: "pelaku_nama may be blank and usually should be. Only rows with `dua sumber` publish."
A name therefore survives in the committed copy only where the row is BOTH `dua sumber` AND `masuk`.
Your own working file keeps every name; this only governs what the public repo carries.

The gate costs nothing analytically: `pelaku_nama` never enters data/*.json, the map, or any index,
so the published JSON reproduces identically either way.

Usage: python3 scripts/redact_workbook.py [--in eppos-media-intake.xlsx] [--out eppos-media-intake.xlsx]
"""
from __future__ import annotations
import argparse, json
from pathlib import Path
import openpyxl

ROOT = Path(__file__).resolve().parent.parent
HEADER_ROW, FIRST_DATA_ROW = 2, 4


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="src", default=str(ROOT / "eppos-media-intake.xlsx"))
    ap.add_argument("--out", dest="dst", default=str(ROOT / "eppos-media-intake.xlsx"))
    a = ap.parse_args()
    wb = openpyxl.load_workbook(a.src)
    ws = wb["insiden"]
    hdr = {c.value: c.column for c in ws[HEADER_ROW] if c.value}
    need = ("pelaku_nama", "status_verifikasi", "status_kurasi", "insiden_id")
    missing = [c for c in need if c not in hdr]
    if missing:
        raise SystemExit(f"kolom hilang: {missing}")
    kept, redacted = [], []
    for row in range(FIRST_DATA_ROW, ws.max_row + 1):
        nama = ws.cell(row, hdr["pelaku_nama"]).value
        if not nama or not str(nama).strip(): continue
        ver = ws.cell(row, hdr["status_verifikasi"]).value
        kur = ws.cell(row, hdr["status_kurasi"]).value
        rid = ws.cell(row, hdr["insiden_id"]).value
        if ver == "dua sumber" and kur == "masuk":
            kept.append({"insiden_id": rid, "status_verifikasi": ver, "status_kurasi": kur})
        else:
            ws.cell(row, hdr["pelaku_nama"]).value = None
            redacted.append({"insiden_id": rid, "status_verifikasi": ver, "status_kurasi": kur})
    wb.save(a.dst)
    rep = {"aturan": "pelaku_nama hanya terbit pada baris dua sumber + masuk (PROJECT-SPEC v2)",
           "dipertahankan": kept, "dikosongkan": redacted}
    (ROOT / "data" / "redaksi_pelaku_nama.json").write_text(json.dumps(rep, ensure_ascii=False, indent=1) + "\n")
    print(f"{len(kept)} nama dipertahankan, {len(redacted)} dikosongkan → {a.dst}")
    for r in redacted: print(f"  dikosongkan {r['insiden_id']}  ({r['status_verifikasi']} / {r['status_kurasi']})")


if __name__ == "__main__":
    main()
