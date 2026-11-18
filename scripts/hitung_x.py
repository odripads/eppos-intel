#!/usr/bin/env python3
"""Hitung volume percakapan publik di X per hari lewat endpoint Post Counts resmi (berbayar, pay-per-use).

Hanya JUMLAH unggahan per hari yang diambil, tidak pernah isi unggahan atau data pengguna. Kueri tertutup ada di
data/diskursus_kueri.json (tokoh x topik); hasil di data/diskursus_x.json, dibaca halaman Peta Elit.

Token: ~/.eppos/x_bearer (chmod 600, di luar repo; jangan pernah di-commit atau dicetak).
Harga (docs.x.com, 18 Nov 2026): counts/all $0.010 per permintaan (31 hari per halaman), counts/recent $0.005 per
permintaan (7 hari terakhir). Saldo awal $40 (termasuk bonus $20).

Pakai:
  python3 scripts/hitung_x.py --isi-awal           # riwayat sejak 1 Jan 2026 (counts/all, ~11 halaman per kueri)
  python3 scripts/hitung_x.py                      # perbarui 7 hari terakhir (counts/recent, 1 permintaan per kueri)
  python3 scripts/hitung_x.py --batas 50           # batas permintaan per jalan (bawaan 200), pengaman biaya
"""
import argparse, json, sys, time, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KUERI, HASIL = ROOT / "data/diskursus_kueri.json", ROOT / "data/diskursus_x.json"
TOKEN = Path.home() / ".eppos/x_bearer"
HARGA = {"all": 0.010, "recent": 0.005}


def minta(jenis, q, token, mulai=None, akhir=None, lanjut=None):
    p = {"query": q, "granularity": "day"}
    if mulai: p["start_time"] = mulai
    if akhir: p["end_time"] = akhir
    if lanjut: p["next_token"] = lanjut
    u = f"https://api.x.com/2/tweets/counts/{jenis}?" + urllib.parse.urlencode(p)
    req = urllib.request.Request(u, headers={"Authorization": "Bearer " + token, "User-Agent": "EPPOS-Outlook/1.0"})
    for coba in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code == 429 and coba < 2:
                time.sleep(int(e.headers.get("x-rate-limit-reset", time.time() + 60)) - time.time() + 2); continue
            raise SystemExit(f"X API {e.code}: {e.read()[:300]!r}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--isi-awal", action="store_true")
    ap.add_argument("--batas", type=int, default=200)
    a = ap.parse_args()
    token = TOKEN.read_text().strip()
    K = json.loads(KUERI.read_text())
    H = json.loads(HASIL.read_text()) if HASIL.exists() else {"catatan": "", "seri": {}}
    jenis = "all" if a.isi_awal else "recent"
    n_req = 0
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - 60))
    daftar = [("tema:" + tm["id"], f'({tm["q"]}) -is:retweet') for tm in K.get("tema", [])]
    for tokoh in K["tokoh"]:
        for topik in [None] + K["topik"]:
            daftar.append((tokoh["id"] + ("" if not topik else "+" + topik["id"]), f'({tokoh["q"]})' + (f' ({topik["q"]})' if topik else "") + " -is:retweet"))
    for kunci, q in daftar:
        if True:
            seri = H["seri"].setdefault(kunci, {})
            kemarin = time.strftime("%Y-%m-%d", time.gmtime(time.time() - 86400))
            if a.isi_awal and K["mulai"] in seri and max(seri) >= kemarin:
                continue  # riwayat kueri ini sudah lengkap; jangan membeli ulang
            lanjut = None
            while True:
                if n_req >= a.batas:
                    print(f"berhenti di batas {a.batas} permintaan"); simpan(H, n_req, jenis); return
                d = minta(jenis, q, token, mulai=K["mulai"] + "T00:00:00Z" if a.isi_awal else None, akhir=now if a.isi_awal else None, lanjut=lanjut)
                n_req += 1
                for b in d.get("data", []):
                    tgl = b["start"][:10]
                    # ember pertama counts/recent dimulai di tengah hari: jangan timpa angka sehari penuh yang sudah ada
                    if b["start"][11:19] != "00:00:00" and tgl in seri: continue
                    seri[tgl] = b["tweet_count"]
                lanjut = (d.get("meta") or {}).get("next_token")
                if not lanjut or not a.isi_awal: break
                time.sleep(1.1)
            print(f"{kunci:28} {sum(seri.values()):>9,} unggahan  ({n_req} permintaan, ~${n_req * HARGA[jenis]:.2f})")
            time.sleep(1.1)
    simpan(H, n_req, jenis)


def simpan(H, n_req, jenis):
    H["diperbarui"] = time.strftime("%Y-%m-%d %H:%M UTC", time.gmtime())
    H["catatan"] = "Jumlah unggahan asli (bukan repost) per hari UTC dari X Post Counts API. Hanya angka; isi unggahan dan data pengguna tidak diambil. Counts bisa sedikit berbeda dari hasil pencarian X."
    HASIL.write_text(json.dumps(H, ensure_ascii=False, indent=0, sort_keys=True) + "\n")
    print(f"selesai: {n_req} permintaan {jenis}, perkiraan biaya ${n_req * HARGA[jenis]:.2f}; disimpan ke {HASIL.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
