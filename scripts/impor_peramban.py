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


# A page's own <title>/og:title usually ends with the site name ("... - PAPUA TIMES", "... | Jubi Papua").
# Google News strips it; web-search results keep it. Only a trailing segment that names the site goes.
SITUS = re.compile(r"(news|berita|times|\bpos\b|\.com|\.co\.id|\.id\b|kabupaten|kota |tribun|antara|"
                   r"indonesia timur|teropong|monitor|media|online|portal|suara|harian|pikiran|kompas|detik|"
                   r"republika|tempo|merdeka|okezone|liputan|inews|sindo|jpnn|jawapos|rri|bawaslu|mkri|"
                   r"papua|papuan|kaltara|kalimantan|indonesia$)", re.I)


def bersih_judul(judul, host):
    root = re.sub(r"[^a-z0-9]", "", host.lower().replace("www.", "").split(".")[0])
    j = judul.strip()
    for _ in range(3):
        m = re.search(r"\s+(?:\||-|–|—|/)\s+([^|–—/]{2,60})$", j)
        if not m: break
        suf = m.group(1); n = re.sub(r"[^a-z0-9]", "", suf.lower())
        if (root and (root in n or n in root)) or SITUS.search(suf): j = j[:m.start()].rstrip()
        else: break
    return j


KUERI_PERAMBAN = "Google News (peramban, halaman pencarian): "
KUERI_WEB = "Pencarian web (websearch): "
KUERI_SITUS = "Pencarian situs (halaman cari outlet): "
CATATAN_PERAMBAN = ("ditemukan lewat halaman pencarian Google News di peramban; URL lewat panggilan "
                    "pengalihan Google dari halaman yang sama")
CATATAN_SITUS = ("ditemukan lewat halaman pencarian situs outlet itu sendiri; judul dan tanggal dibaca dari "
                 "kartu hasil pencarian, tanggal relatif ('2 jam lalu') tidak dipakai")
CATATAN_WEB = ("ditemukan lewat mesin pencari web; judul dan tanggal terbit dibaca dari metadata halaman artikel "
               "(og:title, article:published_time), dari tanggal di URL, atau dari Google News untuk judul yang sama")


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("berkas"); ap.add_argument("--kueri", required=True)
    # "websearch": URLs from a web search engine; headline and date read from the article page itself
    ap.add_argument("--saluran", choices=["peramban", "websearch", "situs"], default="peramban")
    # "situs": an outlet's own search page (regional Antara); lines carry "| outlet | query" after the URL
    a = ap.parse_args()
    today = dt.date.today().isoformat()
    rows = []
    for line in Path(a.berkas).read_text().splitlines():
        if not line.strip(): continue
        f = [x.strip() for x in line.split(" | ")]
        if len(f) >= 5 and f[-3].startswith("http"):   # date | title | url | outlet | query
            d, j, u, kueri = f[0], " | ".join(f[1:-3]), f[-3], f"{a.kueri} {f[-2]} cari='{f[-1]}'"
        else:
            d, j, u, kueri = f[0], " | ".join(f[1:-1]), f[-1], a.kueri
        p = urllib.parse.urlsplit(u)
        if a.saluran == "websearch": j = bersih_judul(j, p.netloc)
        rows.append({"kandidat_id": "KAN-00000", "judul": j, "outlet": p.netloc.replace("www.", ""),
                     "tanggal_terbit": d, "url": urllib.parse.urlunsplit((p.scheme, p.netloc, p.path, "", "")),
                     "url_google": None, "status_url": "terselesaikan", "gelombang_pilkada": gelombang(d),
                     "mekanisme_dugaan": mekanisme(j), "provinsi_kueri": "(pencarian peramban)",
                     "kueri": {"websearch": KUERI_WEB, "situs": KUERI_SITUS}.get(a.saluran, KUERI_PERAMBAN) + kueri, "ditemukan_pada": today,
                     "status_tinjau": None,
                     "catatan_tinjau": {"websearch": CATATAN_WEB, "situs": CATATAN_SITUS}.get(a.saluran, CATATAN_PERAMBAN)})
    sebelum = len(kandidat_io._baca())
    n = kandidat_io.id_berikut()
    for i, r in enumerate(rows): r["kandidat_id"] = f"KAN-{n + i + 1:05d}"
    sesudah = kandidat_io.simpan(rows)
    print(f"{len(rows)} baris dibaca, {sesudah - sebelum} kandidat baru (sisanya sudah ada)")


if __name__ == "__main__":
    main()
