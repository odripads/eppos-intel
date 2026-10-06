#!/usr/bin/env python3
"""Add Google News results gathered in the in-app browser to the candidate pool.

The RSS endpoint and the URL-resolution endpoint both refuse this machine's scripted requests, but the
server-rendered search page and the same resolution call made from a news.google.com page in the
browser still answer. The browser step therefore produces a plain file, one line per article:

    YYYY-MM-DD | headline | publisher URL

and this script turns it into candidates. It never decides scope: mechanism is a first guess from the
headline, and promote_candidates.py applies the same scope filter it applies to everything else.

Usage: python3 scripts/impor_peramban.py <file> --kueri "<what was searched>"
"""
from __future__ import annotations
import argparse, datetime as dt, re, sys, urllib.parse
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import kandidat_io

DESA = re.compile(r"(kades|kepala desa|\blurah\b|keuchik|geuchik|wali nagari|kepala kampung|kakam|dukuh|perangkat desa|"
                  r"perbekel|kepala pekon|peratin|kumtua|hukum tua)", re.I)
BANSOS = re.compile(r"(bansos|bantuan sosial|sembako|\bpkh\b|blt)", re.I)
KRITIK = re.compile(r"(wartawan|jurnalis|intimidasi|teror|diancam|kritik)", re.I)
SUMBER = re.compile(r"(peras|dana desa|anggaran|hibah|proyek|fasilitas negara|kendaraan dinas)", re.I)
JENDELA = {"2024": ("2024-05-27", "2024-12-27"), "2020": ("2020-06-09", "2021-01-09"),
           "2018": ("2017-12-27", "2018-07-27"), "2017": ("2016-08-15", "2017-03-15"), "2015": ("2015-02-24", "2016-01-09")}


def mekanisme(j):
    if DESA.search(j): return "paksaan kepala desa dan lurah"
    if BANSOS.search(j): return "paksaan warga penerima program"
    if KRITIK.search(j): return "tekanan terhadap kritik"
    if SUMBER.search(j): return "pengalihan sumber daya"
    return "paksaan aparat sipil"


def gelombang(d):
    for w, (a, b) in JENDELA.items():
        if a <= d <= b: return w
    # a bare year that happens to name a wave ("2024" for a March 2024 story) would read as inside it
    return f"luar-{d[:4]}" if d[:4] in JENDELA else d[:4]


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("berkas"); ap.add_argument("--kueri", required=True)
    a = ap.parse_args()
    today = dt.date.today().isoformat()
    rows = []
    for line in Path(a.berkas).read_text().splitlines():
        if not line.strip(): continue
        d, j, u = [x.strip() for x in line.split(" | ", 2)]
        p = urllib.parse.urlsplit(u)
        rows.append({"kandidat_id": "KAN-00000", "judul": j, "outlet": p.netloc.replace("www.", ""),
                     "tanggal_terbit": d, "url": urllib.parse.urlunsplit((p.scheme, p.netloc, p.path, "", "")),
                     "url_google": None, "status_url": "terselesaikan", "gelombang_pilkada": gelombang(d),
                     "mekanisme_dugaan": mekanisme(j), "provinsi_kueri": "(pencarian peramban)",
                     "kueri": "Google News (peramban, halaman pencarian): " + a.kueri, "ditemukan_pada": today,
                     "status_tinjau": None,
                     "catatan_tinjau": "ditemukan lewat halaman pencarian Google News di peramban; URL lewat panggilan "
                                       "pengalihan Google dari halaman yang sama"})
    sebelum = len(kandidat_io._baca())
    n = kandidat_io.id_berikut()
    for i, r in enumerate(rows): r["kandidat_id"] = f"KAN-{n + i + 1:05d}"
    sesudah = kandidat_io.simpan(rows)
    print(f"{len(rows)} baris dibaca, {sesudah - sebelum} kandidat baru (sisanya sudah ada)")


if __name__ == "__main__":
    main()
