#!/usr/bin/env python3
"""Ingest Inan's hand-collected workbooks into the curated layer, with validation.

These are hand-collected rows with sources, so they belong with the curated census, NOT the automated
layer. They arrive on the v2 template, which differs from the pipeline schema, and carry the usual
hand-entry messiness. The rule from PROJECT-SPEC v2 applies: validate before ingesting, reject rows
without a source URL, and report what is wrong rather than repairing it.

What this normalises (deterministic, reversible):
  * Excel serial dates and dd/mm/yyyy -> ISO
  * `mekanisme` free text -> the closed typology, only where the text plainly matches
  * `jumlah_kasus` -> leading integer, with the original kept verbatim

What it refuses to invent:
  * a date that the source itself does not give ("awal September 2013") stays blank
  * a mekanisme that does not clearly match the typology stays blank and is flagged
  * `status_kurasi` is never set to `masuk` — that means a human read the row, and Odri has not yet

Usage: python3 scripts/ingest_inan.py [--dir "../30sept"] [--out data/]
"""
from __future__ import annotations
import argparse, datetime as dt, json, re, sys
from pathlib import Path
import openpyxl

ROOT = Path(__file__).resolve().parent.parent
HEADER_ROW, FIRST_DATA_ROW = 2, 3
URL_RE = re.compile(r"^https?://\S+$", re.I)

# free-text mekanisme -> the five values the typology allows
TIPOLOGI = [
    (r"kriminalisasi|pencemaran nama baik|uu ite|pelaporan pidana|intimidasi|ancaman|kekerasan|"
     r"penganiayaan|perampasan alat|penghalangan kerja jurnalistik|pemanggilan.*wartawan|"
     r"jurnalis|wartawan|aktivis|pers", "tekanan terhadap kritik"),
    (r"mutasi|demosi|promosi jabatan|honorer|pppk|netralitas asn|\basn\b|aparatur", "paksaan aparat sipil"),
    (r"kepala desa|kades|lurah|perangkat desa|dana desa", "paksaan kepala desa dan lurah"),
    (r"bansos|bantuan sosial|hibah|sembako|penerima program|politisasi bansos", "paksaan warga penerima program"),
    (r"pengalihan sumber daya|peresmian|groundbreaking|anggaran dipercepat|penyaluran dipercepat", "pengalihan sumber daya"),
]
# the object of study is a sitting executive; these actors are not, and need Odri's call
BUKAN_EKSEKUTIF = re.compile(r"tim pemenangan|tim sukses|bawaslu|kpu|panwaslu|calon (gubernur|bupati|wali)|"
                             r"partai|relawan|pendukung", re.I)


def cell(v):
    if v is None: return None
    if isinstance(v, (dt.datetime, dt.date)): return v.date().isoformat() if isinstance(v, dt.datetime) else v.isoformat()
    s = str(v).strip()
    return s or None


def to_iso(v):
    """(iso_or_None, note). Never guesses: a date the source does not state stays None."""
    if v is None: return None, None
    if isinstance(v, (dt.datetime, dt.date)):
        return (v.date() if isinstance(v, dt.datetime) else v).isoformat(), None
    s = str(v).strip()
    if re.fullmatch(r"\d{5}", s):                      # Excel serial
        return (dt.date(1899, 12, 30) + dt.timedelta(days=int(s))).isoformat(), None
    m = re.fullmatch(r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})", s)
    if m:
        d, mo, y = map(int, m.groups())
        try: return dt.date(y, mo, d).isoformat(), None
        except ValueError: return None, f"tanggal tidak valid: {s}"
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", s): return s, None
    return None, f"tanggal tidak bisa dipastikan dari sumber: “{s}”"


def map_mekanisme(text):
    if not text: return None, "mekanisme kosong"
    t = text.lower()
    for pat, target in TIPOLOGI:
        if re.search(pat, t): return target, None
    return None, f"mekanisme di luar tipologi tertutup: “{text[:70]}”"


def leading_int(v):
    if v is None: return None
    if isinstance(v, (int, float)): return int(v)
    m = re.search(r"\d[\d.]*", str(v))
    return int(m.group(0).replace(".", "")) if m else None


def read(path, sheet):
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb[sheet]
    hdr = [cell(c.value) for c in ws[HEADER_ROW]]
    out = []
    for r in ws.iter_rows(min_row=FIRST_DATA_ROW, values_only=False):
        vals = [c.value for c in r]
        rec = {h: v for h, v in zip(hdr, vals) if h}
        first = cell(rec.get(hdr[0]))
        if not first or first.startswith(("mis.", "domain telanjang")) or "contoh" in str(rec).lower()[:400]:
            continue
        rec["_row"] = r[0].row
        out.append(rec)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=str(ROOT.parent / "30sept"))
    a = ap.parse_args()
    files = sorted(Path(a.dir).glob("*.xlsx"))
    insiden, kasus, masalah = [], [], []

    for f in files:
        tag = "INAN-" + re.sub(r"[^0-9]", "", f.stem)[:8]
        for rec in read(f, "insiden"):
            rid = f"{tag}-{cell(rec.get('insiden_id')) or rec['_row']}"
            url = cell(rec.get("sumber_1_url"))
            note = []
            if not url or not URL_RE.match(url):
                masalah.append({"berkas": f.name, "baris": rec["_row"], "id": rid,
                                "alasan": "tanpa tautan sumber yang sah — baris ditolak"})
                continue
            tgl, n1 = to_iso(rec.get("tanggal"));  note += [n1] if n1 else []
            mek, n2 = map_mekanisme(cell(rec.get("mekanisme"))); note += [n2] if n2 else []
            pj = cell(rec.get("pelaku_jabatan")) or ""
            if BUKAN_EKSEKUTIF.search(pj):
                note.append(f"pelaku bukan eksekutif petahana: “{pj[:60]}” — perlu keputusan lingkup")
            u2 = cell(rec.get("sumber_2_url"))
            insiden.append({
                "insiden_id": rid, "tanggal": tgl, "tanggal_asli": cell(rec.get("tanggal")),
                "provinsi": cell(rec.get("provinsi")), "kab_kota": cell(rec.get("kab_kota")),
                "pelaku_jabatan": pj or None, "pelaku_nama": cell(rec.get("pelaku_nama")),
                "sasaran_jenis": cell(rec.get("sasaran_jenis")),
                "mekanisme": mek, "mekanisme_asli": cell(rec.get("mekanisme")),
                "ringkasan_satu_kalimat": cell(rec.get("ringkasan_satu_kalimat")),
                "hasil": cell(rec.get("hasil")), "sumber_1_url": url,
                "sumber_1_outlet": cell(rec.get("sumber_1_outlet")), "sumber_2_url": u2,
                "status_verifikasi": cell(rec.get("status_verifikasi")) or ("dua sumber" if u2 else "satu sumber"),
                "status_kurasi": "ragu",   # hand-collected but not yet read by Odri
                "gelombang_pilkada": cell(rec.get("gelombang_pilkada")),
                "diisi_oleh": cell(rec.get("diisi_oleh")) or "Inan",
                "tanggal_isi": to_iso(rec.get("tanggal_isi"))[0],
                "sumber_berkas": f.name, "catatan_validasi": note or None,
            })
        for rec in read(f, "kasus_resmi"):
            kid = f"{tag}-{cell(rec.get('kasus_id')) or rec['_row']}"
            url = cell(rec.get("sumber_url"))
            if not url or not URL_RE.match(url):
                masalah.append({"berkas": f.name, "baris": rec["_row"], "id": kid,
                                "alasan": "tanpa tautan sumber yang sah — baris ditolak"})
                continue
            kasus.append({
                "kasus_id": kid, "lembaga": cell(rec.get("lembaga")), "tahun": leading_int(rec.get("tahun")),
                "provinsi": cell(rec.get("provinsi")), "kab_kota": cell(rec.get("kab_kota")),
                "jenis_pelanggaran": cell(rec.get("jenis_pelanggaran")),
                "jumlah_kasus": leading_int(rec.get("jumlah_kasus")),
                "jumlah_kasus_asli": cell(rec.get("jumlah_kasus")),
                "nomor_putusan": cell(rec.get("nomor_putusan")), "sumber_url": url,
                "catatan": cell(rec.get("catatan")),
                "gelombang_pilkada": cell(rec.get("gelombang_pilkada")),
                "diisi_oleh": cell(rec.get("diisi_oleh")) or "Inan",
                "tanggal_isi": to_iso(rec.get("tanggal_isi"))[0],
                "sumber_berkas": f.name,
            })

    D = ROOT / "data"
    (D / "insiden_inan.json").write_text(json.dumps(insiden, ensure_ascii=False, indent=1) + "\n")
    (D / "kasus_resmi_inan.json").write_text(json.dumps(kasus, ensure_ascii=False, indent=1) + "\n")
    (D / "validasi_inan.json").write_text(json.dumps({"ditolak": masalah,
        "berkas": [f.name for f in files]}, ensure_ascii=False, indent=1) + "\n")

    print(f"{len(insiden)} insiden · {len(kasus)} kasus resmi · {len(masalah)} baris ditolak")
    flagged = [r for r in insiden if r.get("catatan_validasi")]
    print(f"\n{len(flagged)} baris insiden perlu keputusanmu:")
    for r in flagged:
        for n in r["catatan_validasi"]: print(f"  {r['insiden_id']}: {n}")
    for m in masalah: print(f"  DITOLAK {m['id']}: {m['alasan']}")


if __name__ == "__main__":
    main()
