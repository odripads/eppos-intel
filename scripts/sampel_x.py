#!/usr/bin/env python3
"""Ambil sampel unggahan X per tema untuk dikode sikapnya (AI menyarankan, manusia memutuskan).

Desain (disetujui Odri 18 Nov 2026): 5 tema (data/diskursus_kueri.json "tema") x 2 masa (sebelum 3 Nov: 20 Okt-2 Nov;
sesudah: 3-18 Nov) x 6 hari tersebar x 10 unggahan = 600. Tiap hari memakai irisan 4 jam yang bergeser supaya tidak selalu
jam yang sama. Hanya unggahan asli (bukan repost), bahasa Indonesia.

Privasi: yang diambil hanya teks, waktu, bahasa, dan ID unggahan; TIDAK ada nama pengguna atau profil. Hasil disimpan di
~/.eppos/sampel_x.json, DI LUAR repo (repo publik). Yang boleh terbit hanya angka agregat hasil verifikasi manusia.
Biaya: $0.005 per unggahan (search/all), ~$3 untuk 600.

Pakai: python3 scripts/sampel_x.py [--per-hari 10] [--batas 700]
"""
import argparse, datetime as dt, json, time, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KUERI = ROOT / "data/diskursus_kueri.json"
TOKEN = Path.home() / ".eppos/x_bearer"
KELUAR = Path.home() / ".eppos/sampel_x.json"
MASA = {"sebelum": ("2026-10-20", "2026-11-02"), "sesudah": ("2026-11-03", "2026-11-18")}


def hari_tersebar(a, b, n):
    d0, d1 = dt.date.fromisoformat(a), dt.date.fromisoformat(b)
    rentang = (d1 - d0).days
    return [d0 + dt.timedelta(days=round(i * rentang / (n - 1))) for i in range(n)]


def cari(q, mulai, akhir, n, token):
    p = {"query": q, "start_time": mulai, "end_time": akhir, "max_results": max(10, n), "tweet.fields": "created_at,lang"}
    req = urllib.request.Request("https://api.x.com/2/tweets/search/all?" + urllib.parse.urlencode(p),
                                 headers={"Authorization": "Bearer " + token, "User-Agent": "EPPOS-Outlook/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read()).get("data", [])[:n]


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--per-hari", type=int, default=10); ap.add_argument("--batas", type=int, default=700)
    a = ap.parse_args()
    token, K = TOKEN.read_text().strip(), json.loads(KUERI.read_text())
    hasil = json.loads(KELUAR.read_text()) if KELUAR.exists() else []
    sudah = {(h["tema"], h["masa"], h["hari"]) for h in hasil}
    diambil = 0
    for tema in K["tema"]:
        for masa, (a0, a1) in MASA.items():
            for i, hari in enumerate(hari_tersebar(a0, a1, 6)):
                if (tema["id"], masa, hari.isoformat()) in sudah: continue
                if diambil + a.per_hari > a.batas: print("batas tercapai"); break
                jam = (i * 4) % 24
                mulai = dt.datetime.combine(hari, dt.time(jam)) - dt.timedelta(hours=7)  # irisan dalam WIB
                akhir = mulai + dt.timedelta(hours=4)
                q = f'({tema["q"]}) -is:retweet lang:id'
                try:
                    data = cari(q, mulai.strftime("%Y-%m-%dT%H:%M:%SZ"), akhir.strftime("%Y-%m-%dT%H:%M:%SZ"), a.per_hari, token)
                except urllib.error.HTTPError as e:
                    print("gagal", tema["id"], hari, e.code, e.read()[:200]); continue
                for t in data:
                    hasil.append({"tema": tema["id"], "masa": masa, "hari": hari.isoformat(), "id": t["id"], "waktu": t["created_at"], "teks": t["text"]})
                diambil += len(data)
                print(f'{tema["id"]:7} {masa:8} {hari}  {jam:02d}-{jam + 4:02d} WIB  {len(data)} unggahan')
                time.sleep(1.2)
    KELUAR.parent.mkdir(exist_ok=True)
    KELUAR.write_text(json.dumps(hasil, ensure_ascii=False, indent=1)); KELUAR.chmod(0o600)
    print(f"selesai: {diambil} unggahan baru (~${diambil * 0.005:.2f}), total {len(hasil)} di {KELUAR}")


if __name__ == "__main__":
    main()
