#!/usr/bin/env python3
"""Per-province counts against the map's own province list: which are empty, which are thin.

Usage: python3 scripts/cek_provinsi.py
"""
import collections, json
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
def L(n): return json.loads((DATA / n).read_text())
ins, kas, oto = L("insiden.json"), L("kasus_resmi.json"), L("insiden_otomatis.json")
nama = set()
for p in L("provinsi_path.json")["paths"]: nama.update(p.get("provinsi_wikidata") or [])
nama.discard("Nasional")
med, res = collections.Counter(), collections.Counter()
for r in ins + oto: med[r.get("provinsi")] += 1
for r in kas: res[r.get("provinsi")] += 1
semua = nama | {p for p in med if p} | {p for p in res if p}
kosong = sorted(n for n in nama if med[n] + res[n] == 0)
print(f"KOSONG ({len(kosong)}): " + (", ".join(kosong) or "(tidak ada)"))
print("TIPIS (<=5):")
for n in sorted((n for n in semua if 0 < med[n] + res[n] <= 5), key=lambda n: med[n] + res[n]):
    print(f"   {n:26s} media {med[n]:<4d} resmi {res[n]}" + ("" if n in nama else "   (tak ada bentuk di peta)"))
print(f"total: {sum(med.values())} media, {sum(res.values())} kasus resmi, "
      f"{sum(1 for n in semua if med[n] + res[n])} provinsi terisi, {med[None]} tanpa provinsi")
