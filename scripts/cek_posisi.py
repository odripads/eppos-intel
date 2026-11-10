#!/usr/bin/env python3
"""Cek data/posisi_aktor.json sebelum terbit: skema tertutup, sumber, tanggal, kutipan. Keluar 1 kalau ada yang salah.
Satu baris = satu pernyataan satu aktor tentang satu isu, dengan kutipan verbatim yang mendukung sikapnya.
Daftar tertutup di data/posisi_skema.json. Dipakai: python3 scripts/cek_posisi.py"""
import datetime, json, re, sys
from pathlib import Path
DATA = Path(__file__).resolve().parent.parent / "data"
skema = json.loads((DATA / "posisi_skema.json").read_text())
rows = json.loads((DATA / "posisi_aktor.json").read_text())
SIKAP = {i["id"]: i["sikap"] for i in skema["isu"]}
WAJIB = ("id", "tanggal", "aktor", "jenis_aktor", "lembaga", "isu", "sikap", "kutipan", "sumber_url", "outlet", "diisi_oleh", "status")
hari_ini = datetime.date.today().isoformat()
salah, ids, kembar = [], set(), set()
if not isinstance(rows, list): sys.exit("posisi_aktor.json harus berupa daftar []")
for n, r in enumerate(rows, 1):
    tag = f"baris {n} ({r.get('id', '?')})"
    for k in WAJIB:
        if k not in r: salah.append(f"{tag}: kolom '{k}' tidak ada")
    if any(k not in r for k in WAJIB): continue
    if not re.fullmatch(r"POS-\d{4}", r["id"]): salah.append(f"{tag}: id harus POS-0001 dst")
    if r["id"] in ids: salah.append(f"{tag}: id kembar")
    ids.add(r["id"])
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", r["tanggal"]) or r["tanggal"] > hari_ini: salah.append(f"{tag}: tanggal harus YYYY-MM-DD dan tidak di masa depan")
    if r["jenis_aktor"] not in skema["jenis_aktor"]: salah.append(f"{tag}: jenis_aktor di luar daftar")
    if r["isu"] not in SIKAP: salah.append(f"{tag}: isu di luar daftar")
    elif r["sikap"] not in SIKAP[r["isu"]]: salah.append(f"{tag}: sikap '{r['sikap']}' tidak ada untuk isu '{r['isu']}'")
    if r["status"] not in skema["status"]: salah.append(f"{tag}: status di luar daftar")
    if not re.match(r"https?://", r["sumber_url"]): salah.append(f"{tag}: sumber_url harus http(s)")
    if ".example" in r["sumber_url"]: salah.append(f"{tag}: sumber contoh (.example) tidak boleh terbit")
    kata = len(r["kutipan"].split())
    if not 3 <= kata <= 40: salah.append(f"{tag}: kutipan harus 3–40 kata, verbatim dari sumber ({kata} kata)")
    if not r["aktor"].strip(): salah.append(f"{tag}: aktor kosong")
    if r["sikap"] == "lainnya" and not r.get("catatan"): salah.append(f"{tag}: sikap 'lainnya' wajib punya catatan")
    k = (r["aktor"].lower(), r["isu"], r["sumber_url"])
    if k in kembar: salah.append(f"{tag}: aktor + isu + sumber yang sama sudah ada")
    kembar.add(k)
if salah:
    print(f"posisi_aktor.json: {len(salah)} masalah"); print("\n".join("  " + s for s in salah)); sys.exit(1)
dicek = sum(r["status"] == "dicek tim" for r in rows)
print(f"posisi_aktor.json lolos: {len(rows)} baris, {dicek} dicek tim")
