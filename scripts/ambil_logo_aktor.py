#!/usr/bin/env python3
"""Logo partai dan organisasi masyarakat sipil untuk peta sikap RUU Pemilu, dari gambar utama artikel Wikipedia.
Hasil: assets/logo-aktor/<kode>.<ext> dan data/logo_aktor.json. Periksa hasilnya dengan mata: gambar utama artikel
kadang foto, bukan logo; yang salah dihapus dari JSON dan tampil sebagai monogram."""
import json, time, urllib.parse, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
UA = {"User-Agent": "EPPOS-Outlook/1.0 (https://eppos-outlook.vercel.app; research site)"}
AKTOR = {
 "pdip": "Partai Demokrasi Indonesia Perjuangan", "golkar": "Partai Golongan Karya", "gerindra": "Partai Gerakan Indonesia Raya",
 "pkb": "Partai Kebangkitan Bangsa", "nasdem": "Partai NasDem", "pks": "Partai Keadilan Sejahtera", "demokrat": "Partai Demokrat (Indonesia)",
 "pan": "Partai Amanat Nasional", "psi": "Partai Solidaritas Indonesia", "perindo": "Partai Persatuan Indonesia",
 "hanura": "Partai Hati Nurani Rakyat", "ppp": "Partai Persatuan Pembangunan", "buruh": "Partai Buruh (Indonesia, 2021)",
 "ummat": "Partai Ummat", "pkn": "Partai Kebangkitan Nusantara", "pbb": "Partai Bulan Bintang", "berkarya": "Partai Berkarya",
 "gelora": "Partai Gelombang Rakyat Indonesia", "garuda": "Partai Garda Republik Indonesia",
 "perludem": "Perkumpulan untuk Pemilu dan Demokrasi", "icw": "Indonesia Corruption Watch", "ylbhi": "Yayasan Lembaga Bantuan Hukum Indonesia",
 "tii": "Transparency International Indonesia", "elsam": "Lembaga Studi dan Advokasi Masyarakat", "safenet": "SAFEnet",
 "migrantcare": "Migrant Care", "kppod": "Komite Pemantauan Pelaksanaan Otonomi Daerah", "netgrit": "Network for Democracy and Electoral Integrity",
 "pshk": "Pusat Studi Hukum dan Kebijakan Indonesia", "puskapol": "Pusat Kajian Politik Universitas Indonesia",
}
tuj = ROOT / "assets/logo-aktor"; tuj.mkdir(exist_ok=True)
out = {}
for kode, judul in AKTOR.items():
    u = ("https://id.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=thumbnail|name&pithumbsize=240&redirects=1&format=json&titles="
         + urllib.parse.quote(judul))
    try:
        pg = list(json.loads(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30).read())["query"]["pages"].values())[0]
    except Exception as e:
        print("gagal", kode, e); continue
    th = pg.get("thumbnail")
    # gambar utama artikel PDIP dan Gerindra adalah foto bendera, bukan logonya
    src = th["source"] if th and kode not in ("pdip", "gerindra") else None
    if not src:
        # gambar utama artikel melewatkan logo non-bebas; Wikidata P154 (logo) menunjuk berkasnya di Commons
        for wiki, t in (("idwiki", pg.get("title", judul)), ("enwiki", judul)):
            w = json.loads(urllib.request.urlopen(urllib.request.Request("https://www.wikidata.org/w/api.php?action=wbgetentities&props=claims&format=json&sites="
                + wiki + "&titles=" + urllib.parse.quote(t), headers=UA), timeout=30).read()).get("entities", {})
            c = next(iter(w.values()), {}).get("claims", {})
            if c.get("P154"):
                pg["pageimage"] = c["P154"][0]["mainsnak"]["datavalue"]["value"]
                src = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(pg["pageimage"]) + "?width=240"; break
    if not src: print("tanpa gambar:", kode, judul); continue
    with urllib.request.urlopen(urllib.request.Request(src, headers=UA), timeout=30) as r:
        b, ct = r.read(), r.headers.get_content_type()
    ext = {"image/png": "png", "image/jpeg": "jpg", "image/svg+xml": "svg", "image/webp": "webp", "image/gif": "gif"}.get(ct, "png")
    for f in tuj.glob(kode + ".*"): f.unlink()
    (tuj / f"{kode}.{ext}").write_bytes(b)
    out[kode] = {"nama": judul, "gambar": f"{kode}.{ext}", "berkas": pg.get("pageimage"), "sumber": "https://id.wikipedia.org/wiki/" + urllib.parse.quote(pg["title"].replace(" ", "_"))}
    time.sleep(0.4)
# PDIP: P154 di Wikidata juga foto bendera; berkas logonya di Commons bernama "PDI Perjuangan.svg"
if "pdip" in out:
    for f in tuj.glob("pdip.*"): f.unlink()
    with urllib.request.urlopen(urllib.request.Request("https://commons.wikimedia.org/wiki/Special:FilePath/PDI_Perjuangan.svg?width=240", headers=UA), timeout=30) as r:
        (tuj / "pdip.png").write_bytes(r.read())
    out["pdip"].update({"gambar": "pdip.png", "berkas": "PDI Perjuangan.svg"})
(ROOT / "data/logo_aktor.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
print(len(out), "logo dari", len(AKTOR))
