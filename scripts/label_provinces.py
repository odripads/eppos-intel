#!/usr/bin/env python3
"""Identify which SVG path in the mockup's map is which province.

The mockup ships 32 anonymous <path class="prov"> elements (the old 32-province division). To make
provinces clickable we need a name per path. Method: project each province's Wikidata centroid into the
mockup's own projection, then ray-cast it against every path's rings. A path that contains exactly one
province centroid is labelled with it; anything ambiguous or unmatched is reported, never guessed.

Writes data/provinsi_path.json: [{path_index, provinsi, qid, lon, lat, x, y}] plus an 'unmatched' list.
"""
from __future__ import annotations
import json, re, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LON_MIN, LON_MAX, LAT_MIN, LAT_MAX = 95.195138, 141.0009, -10.91942, 5.877151
S = 1000 / (LON_MAX - LON_MIN); OY = (420 - (LAT_MAX - LAT_MIN) * S) / 2
def project(lon, lat): return ((lon - LON_MIN) * S, 420 - ((lat - LAT_MIN) * S + OY))

def rings(d):
    out = []
    for chunk in d.split("M")[1:]:
        pts = [tuple(map(float, m.groups())) for m in re.finditer(r"(-?\d+\.?\d*)[ ,](-?\d+\.?\d*)", chunk)]
        if len(pts) >= 3: out.append(pts)
    return out

def inside(rs, x, y):
    c = False
    for ring in rs:
        n = len(ring)
        for i in range(n):
            x1, y1 = ring[i]; x2, y2 = ring[(i + 1) % n]
            if (y1 > y) != (y2 > y):
                xint = x1 + (y - y1) / (y2 - y1) * (x2 - x1)
                if x < xint: c = not c
    return c

def norm(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z ]+", "", s).strip()

# our data's province strings -> the Wikidata label they correspond to
ALIAS = {"di yogyakarta": "yogyakarta", "dki jakarta": "jakarta", "kepulauan riau": "kepulauan riau",
         "kepulauan bangka belitung": "kepulauan bangka belitung", "papua barat daya": "southwest papua"}

def main():
    html = (ROOT / "index.html").read_text()
    g = re.search(r'<g id="provs">(.*?)</g>', html, re.S).group(1)
    ds = re.findall(r'<path class="prov"[^>]*\sd="([^"]+)"', g)
    prings = [rings(d) for d in ds]

    wd = json.load(open(ROOT / "scripts" / "wikidata_id_regions.json"))
    provs = [r for r in wd if "provin" in r["type"].lower()]
    # provinces actually present in our data (plus every Wikidata province, to claim paths correctly)
    used = set()
    for f, in (("insiden.json",), ("kasus_resmi.json",)):
        for r in json.load(open(ROOT / "data" / f)):
            if r.get("provinsi"): used.add(r["provinsi"])

    labels, unmatched, claims = [], [], {}
    for p in provs:
        x, y = project(p["lon"], p["lat"])
        hits = [i for i, rs in enumerate(prings) if inside(rs, x, y)]
        if len(hits) == 1:
            claims.setdefault(hits[0], []).append((p, x, y))
        else:
            unmatched.append({"provinsi": p["label"], "qid": p["qid"], "alasan": f"{len(hits)} path memuat centroid"})

    for idx, cands in sorted(claims.items()):
        # a path may contain several modern provinces (the map predates the Papua split): keep them all
        names = [c[0]["label"] for c in cands]
        labels.append({"path_index": idx, "provinsi_wikidata": names,
                       "qid": [c[0]["qid"] for c in cands],
                       "x": round(cands[0][1], 1), "y": round(cands[0][2], 1)})

    # map our data's province strings onto path indices by normalised name
    by_name = {}
    for L in labels:
        for n in L["provinsi_wikidata"]: by_name[norm(n)] = L["path_index"]
    data_map, data_miss = {}, []
    for pname in sorted(used):
        k = ALIAS.get(norm(pname), norm(pname))
        idx = by_name.get(k)
        if idx is None: idx = by_name.get(norm(pname))
        if idx is None: data_miss.append(pname)
        else: data_map[pname] = idx

    out = {"paths": labels, "provinsi_data": data_map, "tidak_cocok_wikidata": unmatched, "tidak_cocok_data": data_miss,
           "catatan": "Peta mockup memakai pembagian 32 provinsi lama; provinsi hasil pemekaran setelahnya berbagi satu path."}
    (ROOT / "data" / "provinsi_path.json").write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
    print(f"{len(labels)} dari {len(ds)} path dikenali; {len(data_map)} dari {len(used)} provinsi di data terpetakan")
    for L in labels: print(f"  path {L['path_index']:2d}  {', '.join(L['provinsi_wikidata'])}")
    if data_miss: print("  TIDAK COCOK (data):", data_miss)
    if unmatched: print("  TIDAK COCOK (wikidata):", [u["provinsi"] for u in unmatched])

if __name__ == "__main__":
    main()
