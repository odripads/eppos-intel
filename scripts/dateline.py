#!/usr/bin/env python3
"""Read the dateline of articles whose headline names no kab/kota.

Indonesian news copy opens with the place the reporter filed from: "KENDAL, Beritajateng.id –",
"Bone (ANTARA) -", "TRIBUNNEWS.COM, MAKASSAR -", "Denpasar - ". For a regional story that is where the
incident was, and it is the story's own words, so it outranks the outlet's address as a location.

Only rows still without a kab/kota are fetched, once each, politely (one request per host every few
seconds). Results go to data/dateline.json, keyed by URL, and promote_candidates.py reads them.
A dateline is only accepted when it names a kab/kota in the gazetteer; anything else is recorded as
"tanpa dateline" so it is not fetched again.

    python3 scripts/dateline.py [--max 200]
"""
import argparse, datetime as dt, hashlib, html, json, re, time, unicodedata, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
CACHE = DATA / "dateline.json"
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/126 Safari/537.36"}


def norm(s):
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode().lower()
    return re.sub(r"\s+", " ", s).strip()


def gazetteer():
    """name -> region row; where a kota and a kabupaten share a name, a dateline means the city."""
    wd = json.loads((ROOT / "scripts" / "wikidata_id_regions.json").read_text())
    gaz = {}
    for r in sorted(wd, key=lambda r: 0 if "kota" in r["type"].lower() else 1):
        if "provin" in r["type"].lower(): continue
        n = norm(re.sub(r"^(Kabupaten|Kota|Kab\.)\s+", "", r["label"]))
        gaz.setdefault(n, r); gaz.setdefault(n.replace(" ", ""), r)
    return gaz


# strongest first: an outlet name beside the city leaves no doubt the string is a dateline
POLA_KUAT = [
    re.compile(r"\b([A-Z]{3,}(?:[ -][A-Z]{2,}){0,3})\s*,\s*[\w.-]+\.(?:com|co\.id|id|net|news|COM|ID|CO\.ID)\b"),
    re.compile(r"[\w-]+\.(?:COM|com|ID|id|co\.id|CO\.ID)\s*,\s*([A-Z][A-Za-z]+(?:[ -][A-Z][A-Za-z]+){0,3})\s*[–—-]"),
    re.compile(r"\b([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+){0,2})\s*\((?:ANTARA|Antara|antaranews)\)"),
]
# a bare "CITY -" or "City -" at the start of a line: only searched after the headline, never in menus
POLA_LEMAH = [
    re.compile(r"(?:^|\n)\s*([A-Z]{3,}(?: [A-Z]{2,}){0,3})\s*[–—-]\s+[A-Z]"),
    re.compile(r"(?:^|\n)\s*([A-Z][a-z]{2,}(?: [A-Z][a-z]+){0,2})\s+[–—-]\s+[A-Z]"),
]


def teks(h):
    h = re.sub(r"(?is)<(script|style|noscript|nav|header|footer|aside)[^>]*>.*?</\1>", " ", h)
    t = html.unescape(re.sub(r"<[^>]+>", "\n", h))
    return re.sub(r"[ \t]+", " ", t)


def cari(t, judul, gaz):
    """(matched text, region) for the first dateline after the headline; None when there is none."""
    kunci = norm(judul)[:30]
    tn = norm(t)
    pos = tn.find(kunci) if kunci else -1
    # norm() only changes case and spacing here, so offsets carry over closely enough for a window
    awal = max(0, pos) if pos >= 0 else 0
    jendela = t[awal:awal + 5000] if pos >= 0 else ""
    for pola, sumber in ((POLA_KUAT, jendela or t), (POLA_LEMAH, jendela)):
        for rx in pola:
            for m in rx.finditer(sumber):
                c = re.sub(r"^(kota|kab|kabupaten) ", "", norm(m.group(1)))
                if c in gaz: return m.group(1), gaz[c]
    return None


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--max", type=int, default=200)
    ap.add_argument("--jeda", type=float, default=2.5)
    a = ap.parse_args()
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    rows = json.loads((DATA / "insiden_otomatis.json").read_text())
    todo = [r for r in rows if not r.get("kab_kota") and r.get("sumber_1_url") and r["sumber_1_url"] not in cache]
    gaz = gazetteer()
    terakhir, n, dapat = {}, 0, 0
    for r in todo[:a.max]:
        url = r["sumber_1_url"]; host = urllib.parse.urlsplit(url).netloc
        tunggu = terakhir.get(host, 0) + a.jeda - time.time()
        if tunggu > 0: time.sleep(tunggu)
        terakhir[host] = time.time(); n += 1
        try:
            h = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20).read().decode("utf-8", "ignore")
        except Exception as e:
            cache[url] = {"status": "gagal", "galat": str(e)[:80], "diambil": dt.date.today().isoformat()}
            continue
        hasil = cari(teks(h), r.get("judul_sumber_1") or "", gaz)
        if hasil:
            dapat += 1
            cache[url] = {"status": "ok", "teks": hasil[0], "qid": hasil[1]["qid"], "label": hasil[1]["label"],
                          "diambil": dt.date.today().isoformat()}
        else:
            cache[url] = {"status": "tanpa dateline", "diambil": dt.date.today().isoformat()}
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=1))
    print(f"{n} artikel diambil, {dapat} dateline terbaca; {len(todo) - n} masih menunggu")


if __name__ == "__main__":
    main()
