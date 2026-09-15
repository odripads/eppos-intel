#!/usr/bin/env python3
"""Weekly metrics from collected articles: personalization index (rule set v0), duplication share (MinHash), days to penetapan.

Usage: python3 pipeline/metrics.py raw/artikel/*.jsonl --out data/metrik_mingguan.json

The personalization rules are a v0 placeholder. They must be calibrated against Odri's hand-coded gold standard
(300–500 sentences across the four regimes) before any number is published. Do not classify the corpus with an LLM.
"""
from __future__ import annotations
import argparse, datetime as dt, hashlib, json, re, sys
from collections import defaultdict
from regimes import REGIONS
from summarize import enrich

INCUMBENT = {  # aliases by region; extend from the pejabat sheet when it lands
    "Makassar": [r"wali\s*kota", r"walikota", r"danny\s+pomanto", r"\bdanny\b", r"ramdhan\s+pomanto", r"\bappi\b", r"munafri"],
    "Kupang": [r"wali\s*kota", r"walikota", r"jefri\s+riwu\s+kore", r"christian\s+widodo"],
}
PROGRAMME = re.compile(r"\b(bantuan|bansos|sembako|program|pembangunan|peresmian|meresmikan|penyaluran|menyalurkan|perbaikan|pelayanan|beasiswa|santunan|hibah|lorong|infrastruktur)\b", re.I)
INSTITUTION = re.compile(r"\b(dinas|pemkot|pemerintah\s+kota|badan|kantor|bappeda|bpkad|diskominfo|pupr|kelurahan|kecamatan|opd)\b", re.I)
AGENTIVE = re.compile(r"\b(dari|oleh|atas\s+(inisiatif|perintah|arahan|instruksi)|diserahkan|diresmikan|menyerahkan|meresmikan|meninjau|meluncurkan|membagikan|memberikan|menggelontorkan|berpesan|memerintahkan|bapak|pak)\b", re.I)
PJ = re.compile(r"\b(pj|plt|penjabat|pelaksana\s+tugas)\b", re.I)

def sentences(text): return [s for s in re.split(r"(?<=[.!?])\s+", text or "") if len(s) > 20]

def personalization(text: str, kota: str):
    inc = re.compile("|".join(INCUMBENT[kota]), re.I)
    a_inc = a_inst = 0
    for s in sentences(text):
        if not PROGRAMME.search(s): continue
        if inc.search(s) and AGENTIVE.search(s) and not PJ.search(s): a_inc += 1   # a Pj/Plt is a caretaker, not the incumbent
        elif INSTITUTION.search(s) or PJ.search(s): a_inst += 1
    return a_inc, a_inst

def shingles(text, k=5):
    w = re.findall(r"\w+", (text or "").lower())
    return {" ".join(w[i:i + k]) for i in range(max(0, len(w) - k + 1))}

def minhash(sh, n=64):
    if not sh: return [0] * n
    return [min(int(hashlib.blake2b(f"{i}|{s}".encode(), digest_size=8).hexdigest(), 16) for s in sh) for i in range(n)]

def near_duplicates(arts, bands=16):
    """LSH over MinHash; two articles from different outlets within ±3 days sharing a band are candidates; Jaccard ≥ .5 confirms."""
    sig = {a["url"]: minhash(shingles(a["teks"])) for a in arts}
    rows = len(sig[next(iter(sig))]) // bands if sig else 0
    buckets = defaultdict(list)
    for a in arts:
        for b in range(bands):
            buckets[(b, tuple(sig[a["url"]][b * rows:(b + 1) * rows]))].append(a)
    dup, pairs = set(), []
    for group in buckets.values():
        if len(group) < 2: continue
        for i in range(len(group)):
            for j in range(i + 1, len(group)):
                x, y = group[i], group[j]
                if x["outlet_id"] == y["outlet_id"] or not x["tanggal_terbit"] or not y["tanggal_terbit"]: continue
                if abs((dt.date.fromisoformat(x["tanggal_terbit"]) - dt.date.fromisoformat(y["tanggal_terbit"])).days) > 3: continue
                sx, sy = sig[x["url"]], sig[y["url"]]
                sim = sum(p == q for p, q in zip(sx, sy)) / len(sx)
                if sim >= 0.5: dup.add(x["url"]); dup.add(y["url"]); pairs.append((x["url"], y["url"], round(sim, 2)))
    return dup, pairs

def clusters(arts, pairs, kota_of):
    """Union-find over duplicate pairs → klaster_duplikat rows with member links."""
    parent = {}
    def find(u):
        parent.setdefault(u, u)
        while parent[u] != u: parent[u] = parent[parent[u]]; u = parent[u]
        return u
    for a, b, _ in pairs: parent[find(a)] = find(b)
    sim = {}
    for a, b, s in pairs: sim[a] = max(sim.get(a, 0), s); sim[b] = max(sim.get(b, 0), s)
    by_url = {a["url"]: a for a in arts}
    groups = defaultdict(list)
    for u in parent: groups[find(u)].append(by_url[u])
    out = []
    for i, members in enumerate(sorted(groups.values(), key=lambda m: min(x["tanggal_terbit"] for x in m)), 1):
        members.sort(key=lambda x: x["tanggal_terbit"]); head = members[0]
        kid = f"KLS-{head['tanggal_terbit'][:4]}-{i:04d}"
        for m in members: m["klaster_id"] = kid
        out.append({"klaster_id": kid, "kota": kota_of.get(head["outlet_id"], ""), "tanggal": head["tanggal_terbit"], "judul_representatif": head.get("judul"),
                    "ringkasan": head.get("ringkasan"), "kategori": head.get("kategori"), "jumlah_outlet": len({m["outlet_id"] for m in members}), "jenis": "salinan lintas outlet",
                    "anggota": [{"artikel_id": m.get("artikel_id"), "outlet_id": m["outlet_id"], "url": m["url"], "tanggal_terbit": m["tanggal_terbit"], "jaccard": sim.get(m["url"])} for m in members],
                    "fiktif": False, "source_url": head["url"], "archive_url": head.get("archive_url", ""), "retrieved_at": head["tanggal_terbit"],
                    "first_seen": dt.date.today().isoformat(), "last_checked": dt.date.today().isoformat()})
    return out

def week_of(day): d = dt.date.fromisoformat(day); return (d - dt.timedelta(days=d.weekday())).isoformat()

def days_to_penetapan(kota, day):
    pen = REGIONS[kota]["penetapan"]
    if not pen: return None
    d = dt.date.fromisoformat(day)
    return min(((d - dt.date.fromisoformat(p)).days for p in pen), key=abs)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("jsonl", nargs="+"); ap.add_argument("--out", default="data/metrik_mingguan.json")
    ap.add_argument("--outlets", default="data/outlet.json")
    a = ap.parse_args()
    kota_of = {o["outlet_id"]: o["kota"] for o in json.load(open(a.outlets))}
    arts = [json.loads(l) for f in a.jsonl for l in open(f) if l.strip()]
    arts = [x for x in arts if x.get("tanggal_terbit")]
    print(f"{len(arts)} artikel bertanggal", file=sys.stderr)
    for i, x in enumerate(arts, 1):
        x.setdefault("artikel_id", f"ART-{i:06d}"); enrich(x)
    dup, pairs = near_duplicates(arts)
    kl = clusters(arts, pairs, kota_of)
    json.dump(kl, open(a.out.replace("metrik_mingguan", "klaster_duplikat"), "w"), ensure_ascii=False, indent=0)
    json.dump(arts, open(a.out.replace("metrik_mingguan", "artikel"), "w"), ensure_ascii=False, indent=0)
    print(f"{len(kl)} klaster duplikat", file=sys.stderr)
    agg = defaultdict(lambda: {"n": 0, "dup": 0, "a_inc": 0, "a_inst": 0})
    for x in arts:
        kota = kota_of.get(x["outlet_id"], "Makassar")
        key = (x["outlet_id"], kota, week_of(x["tanggal_terbit"]))
        g = agg[key]; g["n"] += 1; g["dup"] += x["url"] in dup
        ai, an = personalization(x["teks"], kota); g["a_inc"] += ai; g["a_inst"] += an
    out = []
    for (oid, kota, wk), g in sorted(agg.items()):
        denom = g["a_inc"] + g["a_inst"]
        out.append({"outlet_id": oid, "kota": kota, "minggu": wk, "jumlah_artikel": g["n"],
                    "indeks_personalisasi": round(g["a_inc"] / denom, 3) if denom else None,
                    "bagian_duplikasi": round(g["dup"] / g["n"], 3), "hari_ke_penetapan": days_to_penetapan(kota, wk),
                    "kalimat_program": denom, "aturan": "v0-rule", "fiktif": False,
                    "source_url": f"raw/artikel/{oid}.jsonl", "archive_url": "", "retrieved_at": wk, "first_seen": dt.date.today().isoformat(), "last_checked": dt.date.today().isoformat()})
    json.dump(out, open(a.out, "w"), ensure_ascii=False, indent=0)
    print(f"{len(out)} baris mingguan → {a.out}", file=sys.stderr)

if __name__ == "__main__":
    main()
