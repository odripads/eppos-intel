#!/usr/bin/env python3
"""Kisi sel Indonesia: satu sel = satu petak darat yang dimiliki satu kab/kota. Dasar semua peta di situs.

Peta dasar lama hanya menggambar 32 bentuk: provinsi pemekaran berbagi satu path dan Kepulauan Riau tidak
tergambar sama sekali. Bentuk itu tetap dipakai sebagai topeng daratan, tapi pemilik tiap sel ditentukan oleh
sentroid kab/kota terdekat di provinsi yang sama (provinsi dibaca dari kode BPS, bukan geometri), jadi 38 provinsi
semuanya ada. Batas antarsel karena itu perkiraan: cukup untuk tahu letak, bukan untuk mengukur luas.
Sumber: data/peta_dasar.json + scripts/wikidata_id_regions.json. Hasil: data/kisi.json."""
import json, math, re
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
S = 3.0                                    # jarak antarsel, satuan viewBox 1000x420
BARIS = S * math.sqrt(3) / 2
LON_MIN, LON_MAX, LAT_MIN, LAT_MAX = 95.195138, 141.0009, -10.91942, 5.877151
K = 1000 / (LON_MAX - LON_MIN); OY = (420 - (LAT_MAX - LAT_MIN) * K) / 2
def proyeksi(lon, lat): return (lon - LON_MIN) * K, 420 - ((lat - LAT_MIN) * K + OY)

dasar = json.loads((ROOT / "data/peta_dasar.json").read_text())
wilayah = json.loads((ROOT / "scripts/wikidata_id_regions.json").read_text())
prov_nama = {r["bps"]: r["label"] for r in wilayah if r["type"].startswith("provinsi")}
# dua baris tanpa kode BPS adalah duplikat Wikidata untuk Kota Kendari dan Kabupaten Mempawah lama
unit = {}
for r in wilayah:
    if r["type"].startswith("provinsi") or not r.get("bps"): continue
    p = prov_nama[r["bps"][:2]]
    x, y = proyeksi(r["lon"], r["lat"])
    # kab dan kota senama (Malang, Bandung) jadi satu unit: baris otomatis tidak membedakan keduanya
    unit.setdefault((p, r["label"]), []).append((x, y))

# path → poligon datar (perintah hanya M/L/Z)
def poligon(d):
    out = []
    for bag in re.findall(r"M[^MZ]*", d):
        t = [float(v) for v in re.findall(r"-?\d+\.?\d*", bag)]
        out.append(list(zip(t[0::2], t[1::2])))
    return out
def di_dalam(x, y, cincin):
    masuk = False
    for i in range(len(cincin)):
        x1, y1 = cincin[i]; x2, y2 = cincin[i - 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1: masuk = not masuk
    return masuk

bentuk = []
for i, d in enumerate(dasar["paths"]):
    cincin = poligon(d)
    semua = [p for c in cincin for p in c]
    bentuk.append(dict(cincin=cincin, prov=dasar["prov"][i],
                       x0=min(p[0] for p in semua), x1=max(p[0] for p in semua),
                       y0=min(p[1] for p in semua), y1=max(p[1] for p in semua)))

# provinsi tanpa baris kab/kota di gazetir (Jakarta: lima kota administrasi tidak bertipe kota di Wikidata)
for r in wilayah:
    if r["type"].startswith("provinsi") and not any(k[0] == r["label"] for k in unit):
        unit[(r["label"], r["label"])] = [proyeksi(r["lon"], r["lat"])]
nama_unit = sorted(unit, key=lambda k: (k[0], k[1]))
idx_unit = {k: i for i, k in enumerate(nama_unit)}

calon_prov = {}
for (p, n), titik in unit.items(): calon_prov.setdefault(p, []).extend((n, x, y) for x, y in titik)

# Topeng lama menyimpan pulau-pulau Kepri di dalam path Riau, dan garis Papua-nya tidak mengikuti pemekaran
# 2022: untuk dua keluarga ini semua provinsinya jadi calon, sentroid terdekat yang memutuskan.
PAPUA = ["Papua", "Papua Barat", "Papua Barat Daya", "Papua Selatan", "Papua Tengah", "Papua Pegunungan"]
for b in bentuk:
    if "Riau" in b["prov"]: b["prov"] = ["Riau", "Kepulauan Riau"]
    if any(p in PAPUA for p in b["prov"]): b["prov"] = PAPUA

def terdekat(x, y, provs):
    best, bd = None, 1e18
    for p in provs:
        for n, ux, uy in calon_prov.get(p, ()):
            dd = (ux - x) ** 2 + (uy - y) ** 2
            if dd < bd: best, bd = (p, n), dd
    return best, bd

sel = {}                                   # (baris, kolom) -> (x, y, unit)
for r in range(int(420 / BARIS) + 1):
    for c in range(int(1000 / S) + 2):
        x, y = c * S + (S / 2 if r % 2 else 0), r * BARIS
        for b in bentuk:
            if not (b["x0"] <= x <= b["x1"] and b["y0"] <= y <= b["y1"]): continue
            if any(di_dalam(x, y, ci) for ci in b["cincin"]):
                u, _ = terdekat(x, y, b["prov"])
                if u: sel[(r, c)] = (x, y, idx_unit[u])
                break

def petak(x, y):
    r = round(y / BARIS); c = round((x - (S / 2 if r % 2 else 0)) / S)
    return r, c
def tetangga(r, c):
    g = 0 if r % 2 else -1
    return [(r, c - 1), (r, c + 1), (r - 1, c + g), (r - 1, c + g + 1), (r + 1, c + g), (r + 1, c + g + 1)]

# kab/kota tanpa sel: pulau kecil yang tidak tergambar (seluruh Kepri, Sangihe, Talaud...) dan kota yang
# tertimbun kabupaten tetangganya. Mereka mendapat sel di sentroidnya sendiri, supaya tidak hilang dari peta.
dimiliki = {v[2] for v in sel.values()}
for k in nama_unit:
    i = idx_unit[k]
    if i in dimiliki: continue
    x, y = unit[k][0]
    r, c = petak(x, y)
    pulau = (r, c) not in sel
    if not pulau:
        # mainland city: take the cell from whichever neighbour owns the most, never the last cell of a region
        hit = {}
        for v in sel.values(): hit[v[2]] = hit.get(v[2], 0) + 1
        for rc in [(r, c)] + tetangga(r, c):
            if rc in sel and hit[sel[rc][2]] > 1:
                sel[rc] = (*sel[rc][:2], i); break
    else:
        x0 = c * S + (S / 2 if r % 2 else 0)
        sel[(r, c)] = (x0, r * BARIS, i)
        for rc in tetangga(r, c)[:3]:      # 4 sel untuk pulau, cukup untuk terlihat di layar
            if rc not in sel:
                sel[rc] = (rc[1] * S + (S / 2 if rc[0] % 2 else 0), rc[0] * BARIS, i)
    dimiliki.add(i)

urut = sorted(sel.values(), key=lambda v: (v[0], v[1]))
provs = sorted({k[0] for k in nama_unit})
tengah = {}
for x, y, u in urut:
    t = tengah.setdefault(nama_unit[u][0], [0, 0, 0]); t[0] += x; t[1] += y; t[2] += 1
out = {"s": S, "baris": round(BARIS, 4),
       "unit": [[n, p] for p, n in nama_unit],
       "sel": [v for x, y, u in urut for v in (round(x, 1), round(y, 1), u)],
       "prov": {p: {"x": round(t[0] / t[2], 1), "y": round(t[1] / t[2], 1), "n": t[2],
                    "unit": sum(1 for k in nama_unit if k[0] == p)} for p, t in sorted(tengah.items())}}
(ROOT / "data/kisi.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
print(len(urut), "sel;", len(nama_unit), "unit;", len(out["prov"]), "provinsi;",
      f'{(ROOT / "data/kisi.json").stat().st_size / 1e3:.0f} KB')
