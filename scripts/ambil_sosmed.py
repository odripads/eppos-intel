#!/usr/bin/env python3
"""Ambil teks unggahan publik X dan Threads lewat endpoint oEmbed resmi (tanpa akun, tanpa kunci), untuk Peta Elit.

Alur: tim menempel tautan unggahan ke data/sosmed_antrian.txt (satu tautan per baris; baris '#' diabaikan). Skrip ini
memanggil oEmbed resmi masing-masing platform, lalu menulis teks persis, akun, dan tanggal ke data/sosmed_kandidat.json.
Kandidat BELUM masuk peta: manusia (atau bot-posisi) memilih kutipan 3-40 kata dari "teks", menentukan jenis/topik,
memastikan akun itu resmi milik tokohnya, lalu menambahkannya ke data/peta_elit.json dengan "kanal": "x" atau "threads".

Endpoint (hanya dua ini; jangan memakai endpoint X/Threads lain, jangan login):
  X:       https://publish.x.com/oembed?omit_script=1&url=<tautan>
  Threads: https://graph.threads.net/v1.0/oembed?url=<tautan>
Tanggal X diambil dari tautan tanggal di blockquote oEmbed; Threads dari metadata halaman publik (og/ld+json) bila ada,
kalau tidak ada dibiarkan kosong dan harus diisi manual dari sumber lain.

Pakai: python3 scripts/ambil_sosmed.py            # proses antrian, lewati yang sudah ada di kandidat
"""
import html, json, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ANTRIAN, KELUAR = ROOT / "data/sosmed_antrian.txt", ROOT / "data/sosmed_kandidat.json"
UA = {"User-Agent": "EPPOS-Outlook/1.0 (https://eppos-outlook.vercel.app)"}
BULAN = {m: i for i, m in enumerate(["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], 1)}


def ambil(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
        return r.read().decode("utf8", "ignore")


def teks_html(h):
    h = re.sub(r"<br\s*/?>", "\n", h)
    return html.unescape(re.sub(r"<[^>]+>", "", h)).strip()


def x(url):
    d = json.loads(ambil("https://publish.x.com/oembed?omit_script=1&url=" + urllib.parse.quote(url, safe="")))
    blok = d.get("html", "")
    isi = re.search(r"<p[^>]*>(.*?)</p>", blok, re.S)
    tgl = re.findall(r">(\w+) (\d{1,2}), (\d{4})</a>", blok)
    tanggal = ""
    if tgl:
        b, h, t = tgl[-1]
        if b in BULAN: tanggal = f"{t}-{BULAN[b]:02d}-{int(h):02d}"
    return {"kanal": "x", "akun": "@" + d.get("author_url", "").rstrip("/").split("/")[-1], "nama_akun": d.get("author_name", ""),
            "teks": teks_html(isi.group(1)) if isi else "", "tanggal": tanggal, "tanggal_dari": "oEmbed X"}


def threads(url):
    d = json.loads(ambil("https://graph.threads.net/v1.0/oembed?url=" + urllib.parse.quote(url, safe="")))
    akun = re.search(r"threads\.(?:com|net)/@([^/]+)", url)
    tanggal, teks = "", ""
    try:
        hal = ambil(url)
        m = re.search(r'<meta property="og:description" content="([^"]*)"', hal)
        teks = html.unescape(m.group(1)) if m else ""
        m = re.search(r'"(?:taken_at|uploadDate|datePublished)"\s*:\s*"?(\d{4}-\d{2}-\d{2}|\d{10})', hal)
        if m: tanggal = m.group(1) if "-" in m.group(1) else time.strftime("%Y-%m-%d", time.gmtime(int(m.group(1))))
    except Exception:
        pass
    if not teks: teks = teks_html(d.get("html", ""))
    tanggal_dari = "metadata halaman" if tanggal else ""
    kode = re.search(r"/post/([A-Za-z0-9_-]+)", url)
    if not tanggal and kode:
        # Kode unggahan Threads = ID media gaya Instagram: 41 bit teratas = milidetik sejak epoch Instagram (1314220021721).
        # Dicocokkan 18 Nov 2026 pada tiga unggahan yang isinya bertanggal; dikonversi ke WIB (UTC+7).
        A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
        nilai = 0
        for c in kode.group(1)[:11]: nilai = nilai * 64 + A.index(c)
        tanggal = time.strftime("%Y-%m-%d", time.gmtime(((nilai >> 23) + 1314220021721) / 1000 + 7 * 3600))
        tanggal_dari = "ID unggahan (WIB)"
    return {"kanal": "threads", "akun": "@" + akun.group(1) if akun else "", "nama_akun": d.get("author_name", ""), "teks": teks, "tanggal": tanggal, "tanggal_dari": tanggal_dari}


def main():
    if not ANTRIAN.exists():
        ANTRIAN.write_text("# Satu tautan unggahan X atau Threads per baris. Contoh:\n# https://x.com/<akun>/status/<id>\n")
        print(f"dibuat {ANTRIAN.relative_to(ROOT)}; isi tautan lalu jalankan lagi"); return
    lama = json.loads(KELUAR.read_text()) if KELUAR.exists() else []
    sudah = {k["sumber_url"] for k in lama}
    baru = 0
    for baris in ANTRIAN.read_text().splitlines():
        u = baris.strip()
        if not u or u.startswith("#") or u in sudah: continue
        try:
            if re.match(r"https?://(www\.)?(x|twitter)\.com/[^/]+/status/\d+", u): k = x(u)
            elif re.match(r"https?://(www\.)?threads\.(com|net)/@[^/]+/post/", u): k = threads(u)
            else: print("lewati (bukan tautan unggahan X/Threads):", u); continue
        except Exception as e:
            print("gagal:", u, e); continue
        k["sumber_url"] = u.split("?")[0]
        k["diambil"] = time.strftime("%Y-%m-%d")
        lama.append(k); sudah.add(u); baru += 1
        print(f"{k['kanal']:7} {k['akun']:22} {k['tanggal'] or '????-??-??'}  {k['teks'][:70]}")
        time.sleep(1.5)
    KELUAR.write_text(json.dumps(lama, ensure_ascii=False, indent=1) + "\n")
    print(f"{baru} kandidat baru, {len(lama)} total di {KELUAR}")


if __name__ == "__main__":
    main()
