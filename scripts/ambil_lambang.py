#!/usr/bin/env python3
"""Lambang resmi tiap kab/kota dan provinsi, dari Wikidata (P94 lambang, cadangan P41 bendera) lewat Wikimedia Commons.
Hasil: assets/lambang/<kode BPS>.<ext> (lebar 128 px) dan data/lambang.json (label, berkas Commons sebagai sumber).
Dipakai: python3 scripts/ambil_lambang.py   (aman diulang: yang sudah ada dilewati)"""
import json, time, urllib.parse, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
UA = {"User-Agent": "EPPOS-Outlook/1.0 (https://eppos-outlook.vercel.app; research site)"}
def ambil(url):
    for coba in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r: return r.read(), r.headers.get_content_type()
        except Exception as e:
            if coba == 3: raise
            time.sleep(3 * (coba + 1))
wil = [r for r in json.loads((ROOT / "scripts/wikidata_id_regions.json").read_text()) if r.get("bps")]
tuj = ROOT / "assets/lambang"; tuj.mkdir(exist_ok=True)
out, tanpa = {}, []
for i in range(0, len(wil), 50):
    grup = wil[i:i + 50]
    js, _ = ambil("https://www.wikidata.org/w/api.php?action=wbgetentities&props=claims&format=json&ids=" + "|".join(r["qid"] for r in grup))
    ent = json.loads(js)["entities"]
    for r in grup:
        c = ent.get(r["qid"], {}).get("claims", {})
        f = None
        for p in ("P94", "P41"):
            if c.get(p): f = c[p][0]["mainsnak"].get("datavalue", {}).get("value"); break
        if f: out[r["bps"]] = {"label": r["label"], "jenis": r["type"], "berkas": f}
        else: tanpa.append(r)
    time.sleep(0.5)
# cadangan: gambar utama artikel Wikipedia bahasa Indonesia daerah itu, yang hampir selalu lambangnya
for r in tanpa:
    js, _ = ambil("https://www.wikidata.org/w/api.php?action=wbgetentities&props=sitelinks&sitefilter=idwiki&format=json&ids=" + r["qid"])
    sl = json.loads(js)["entities"].get(r["qid"], {}).get("sitelinks", {}).get("idwiki")
    if not sl: continue
    js, _ = ambil("https://id.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=name&format=json&titles=" + urllib.parse.quote(sl["title"]))
    pg = next(iter(json.loads(js)["query"]["pages"].values()))
    nama = pg.get("pageimage", "")
    if nama and any(k in nama.lower() for k in ("lambang", "logo", "coat", "seal", "emblem", "flag", "bendera")):
        out[r["bps"]] = {"label": r["label"], "jenis": r["type"], "berkas": nama}
    time.sleep(0.3)
n = 0
for bps, d in out.items():
    # cocok persis: pola "12.*" untuk provinsi juga menangkap "12.71.png" milik kota di provinsi itu
    ada = [f for f in tuj.glob(bps + ".*") if f.suffix.lower() in (".png", ".jpg", ".gif", ".webp") and f.stem == bps]
    if ada: d["gambar"] = ada[0].name; continue
    try:
        b, ct = ambil("https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(d["berkas"]) + "?width=128")
    except Exception as e:
        print("gagal", bps, d["label"], e); continue
    ext = {"image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp"}.get(ct, "png")
    (tuj / f"{bps}.{ext}").write_bytes(b); d["gambar"] = f"{bps}.{ext}"; n += 1
    time.sleep(0.25)
out = {k: v for k, v in out.items() if v.get("gambar")}
(ROOT / "data/lambang.json").write_text(json.dumps(out, ensure_ascii=False, indent=0))
print(len(wil), "wilayah;", len(out), "punya lambang;", n, "baru diunduh")
