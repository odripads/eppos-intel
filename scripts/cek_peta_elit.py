#!/usr/bin/env python3
"""Cek data/peta_elit.json sebelum terbit: jenis tertutup, sumber, tanggal, kutipan verbatim 3-40 kata. Keluar 1 kalau salah.
Satu baris = satu pernyataan bertanggal tentang pencalonan Pilpres 2029 (aktor -> sasaran). Tidak ada tafsir orbit di sini:
jenis "dukung capres", "dukung cawapres", "pasangkan" dan "tolak/berbenturan" wajib menyebut sasaran orang; "isu" boleh
kosong supaya pernyataan normatif tidak dipaksa menunjuk seseorang. File boleh belum ada (situs menampilkan keadaan kosong).
Dipakai: python3 scripts/cek_peta_elit.py"""
import datetime, json, re, sys
from pathlib import Path
F = Path(__file__).resolve().parent.parent / "data" / "peta_elit.json"
if not F.exists():
    print("peta_elit: file belum ada, dilewati"); sys.exit(0)
rows = json.loads(F.read_text())
JENIS = ("dukung capres", "dukung cawapres", "pasangkan", "tolak/berbenturan", "isu")
BERSASARAN = JENIS[:4]
STATUS = ("otomatis", "dicek tim")
WAJIB = ("id", "aktor", "lembaga", "tanggal", "jenis", "sasaran", "kutipan", "sumber_url", "outlet", "status")
OPSIONAL = ("isu", "catatan", "wilayah", "kode_bps", "diisi_oleh", "partai")
hari_ini = datetime.date.today().isoformat()
salah, ids, kembar = [], set(), set()
if not isinstance(rows, list): sys.exit("peta_elit.json harus berupa daftar []")
for n, r in enumerate(rows, 1):
    tag = f"baris {n} ({r.get('id', '?')})"
    if not isinstance(r, dict): salah.append(f"{tag}: bukan objek"); continue
    kurang = [k for k in WAJIB if not isinstance(r.get(k), str)]
    if kurang: salah.append(f"{tag}: kolom wajib hilang atau bukan teks: {', '.join(kurang)}"); continue
    for k in r:
        if k not in WAJIB + OPSIONAL: salah.append(f"{tag}: kolom tak dikenal '{k}'")
        elif k in OPSIONAL and not isinstance(r[k], str): salah.append(f"{tag}: kolom '{k}' harus teks")
    if not re.fullmatch(r"ELIT-\d{4}", r["id"]): salah.append(f"{tag}: id harus ELIT-0001 dst")
    if r["id"] in ids: salah.append(f"{tag}: id kembar")
    ids.add(r["id"])
    try: datetime.date.fromisoformat(r["tanggal"]); sah = True
    except ValueError: sah = False
    if not sah or not "2026-01-01" <= r["tanggal"] <= hari_ini: salah.append(f"{tag}: tanggal harus YYYY-MM-DD, sejak 1 Jan 2026, tidak di masa depan")
    if r["jenis"] not in JENIS: salah.append(f"{tag}: jenis di luar daftar {JENIS}")
    if r["jenis"] in BERSASARAN and not r["sasaran"].strip(): salah.append(f"{tag}: jenis '{r['jenis']}' wajib menyebut sasaran")
    if r["status"] not in STATUS: salah.append(f"{tag}: status harus {STATUS}")
    if not r["aktor"].strip() or not r["lembaga"].strip(): salah.append(f"{tag}: aktor dan lembaga wajib diisi")
    kata = len(r["kutipan"].split())
    if not 3 <= kata <= 40: salah.append(f"{tag}: kutipan {kata} kata, harus 3-40")
    if not re.fullmatch(r"https?://\S+", r["sumber_url"]): salah.append(f"{tag}: sumber_url bukan tautan http(s)")
    kunci = (r["aktor"], r["tanggal"], r["kutipan"].strip().lower())
    if kunci in kembar: salah.append(f"{tag}: pernyataan kembar (aktor, tanggal, kutipan sama)")
    kembar.add(kunci)
if salah:
    print("\n".join(salah)); print(f"peta_elit: {len(salah)} masalah dari {len(rows)} baris"); sys.exit(1)
print(f"peta_elit: {len(rows)} baris lolos cek ({sum(r['status'] == 'dicek tim' for r in rows)} dicek tim)")
