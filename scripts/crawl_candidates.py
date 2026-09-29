#!/usr/bin/env python3
"""Retrieval pass: find candidate incidents and queue them for Odri's curation.

This does NOT add anything to the map. It writes `data/kandidat.json`, a review queue. Rows only reach
the map after they are curated into `eppos-media-intake.xlsx` by hand (PROJECT-SPEC v2: status_kurasi is
Odri's decision; `dua sumber` needs two different outlets and a near-duplicate check).

Procedure (documented so it is reproducible, per spec):
  grid cell = (gelombang pilkada window) x (mekanisme keyword set) x (provinsi)
  query     = "<mechanism terms> pilkada <provinsi> after:<start> before:<end>"  on Google News RSS (id-ID)
  real URL  = resolved from the Google News article id
  each cell is run once; `data/crawl_state.json` remembers which cells are done
  every run appends to `data/log_pencarian.json` in the same shape as the xlsx `log_pencarian` sheet

Cells are ordered to attack coverage gaps first: wave 2024 before older waves (spec build order), and
provinces with the fewest rows before provinces already well covered. That is deliberate — searching
harder where the press is thinner is what keeps this from becoming a map of press density.

Usage: python3 scripts/crawl_candidates.py [--cells 12] [--dry-run]
"""
from __future__ import annotations
import argparse, datetime as dt, html, json, re, ssl, sys, time, urllib.parse, urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
UA_RSS = "EPPOS-DPP-UGM academic research (incident census; github.com/odripads/eppos-intel)"
UA_RES = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
CTX = ssl.create_default_context()

# --- the closed typology from PROJECT-SPEC v2; queries derive from it, never the reverse
MEKANISME = {
    "paksaan aparat sipil": ["netralitas ASN dilaporkan", "ASN dimutasi jelang pilkada", "honorer diancam pilkada"],
    "paksaan kepala desa dan lurah": ['"kepala desa" dukung paslon dilaporkan', "lurah langgar netralitas", "kades dikumpulkan pilkada"],
    "paksaan warga penerima program": ["bansos syarat dukung pilkada", "bantuan sosial diancam dicabut pilkada"],
    "tekanan terhadap kritik": ["wartawan diintimidasi pilkada", "aktivis dilaporkan polisi pilkada"],
    "pengalihan sumber daya": ["bansos dipercepat jelang pilkada", "peresmian proyek jelang pilkada petahana"],
}
# six months before penetapan through one month after voting day (spec: time is anchored to waves)
GELOMBANG = {
    "2024": ("2024-05-27", "2024-12-27"), "2020": ("2020-06-09", "2021-01-09"),
    "2018": ("2017-12-27", "2018-07-27"), "2017": ("2016-08-15", "2017-03-15"),
    "2015": ("2015-02-24", "2016-01-09"),
}
# matched non-election windows, so a wave's rate has something to be compared against (SPEC v2)
KONTROL = {
    "kontrol-2024": ("2023-05-27", "2023-12-27"), "kontrol-2020": ("2019-06-09", "2020-01-09"),
    "kontrol-2018": ("2019-12-27", "2020-05-27"), "kontrol-2017": ("2014-08-15", "2015-02-15"),
}
# the waves alone leave 2021-2026 unsearched, yet Periode V runs to 2029: without these the current
# presidential period is represented only by its 2024 pilkada window
ANTARA = {
    "2026": ("2026-01-01", "2026-09-29"), "2025": ("2025-01-01", "2025-12-31"),
    "2023": ("2023-01-01", "2023-05-26"), "2022": ("2022-01-01", "2022-12-31"),
    "2021": ("2021-01-10", "2021-12-31"), "2019b": ("2019-01-01", "2019-06-08"),
    "2016": ("2016-01-10", "2016-08-14"),
}
GELOMBANG.update(KONTROL); GELOMBANG.update(ANTARA)
WAVE_ORDER = ["2024", "2020", "2018", "2017", "2015"] + list(ANTARA) + list(KONTROL)
PROVINSI = ["Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Kepulauan Riau", "Jambi", "Sumatera Selatan",
    "Kepulauan Bangka Belitung", "Bengkulu", "Lampung", "Banten", "DKI Jakarta", "Jawa Barat", "Jawa Tengah",
    "DI Yogyakarta", "Jawa Timur", "Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur", "Kalimantan Barat",
    "Kalimantan Tengah", "Kalimantan Selatan", "Kalimantan Timur", "Kalimantan Utara", "Sulawesi Utara",
    "Gorontalo", "Sulawesi Tengah", "Sulawesi Barat", "Sulawesi Selatan", "Sulawesi Tenggara", "Maluku",
    "Maluku Utara", "Papua", "Papua Barat", "Papua Barat Daya", "Papua Tengah", "Papua Pegunungan", "Papua Selatan"]

# a title must look like a specific act, not general commentary, before it is queued
RELEVAN = re.compile(r"(dilaporkan|laporan|dugaan|diduga|langgar|pelanggaran|melanggar|sanksi|teguran|diperiksa|"
    r"dipanggil|mobilisasi|dikumpulkan|mengumpulkan|diancam|ancaman|intimidasi|mengintimidasi|tekanan|menekan|"
    r"dimutasi|mutasi|demosi|dicopot|dinonaktifkan|arahkan|mengarahkan|memerintahkan|instruksi)", re.I)
AKTOR = re.compile(r"(bupati|wali ?kota|walikota|gubernur|camat|lurah|kepala desa|kades|sekda|asn|pj |penjabat|"
    r"petahana|inkumben|perangkat desa|honorer|pppk|kepala dinas|pegawai negeri)", re.I)
# commentary / process pieces that are about the topic but are not an incident
BUANG = re.compile(r"(coming soon|tayang di youtube|webinar|sosialisasi|imbau|mengimbau|himbau|apel kesiapan|"
    r"deklarasi damai|doa bersama|tips|opini|kolom|resmi tayang|podcast|quick count|hitung cepat|hasil pilkada|"
    r"ikrar netralitas|peserta ikuti|pakta integritas|rakor|rapat koordinasi|penandatanganan|dilantik|"
    r"siap amankan|gelar simulasi|kupas tuntas|talkshow)", re.I)


def fetch(url, timeout=45, ua=UA_RSS, data=None, headers=None):
    h = {"User-Agent": ua}; h.update(headers or {})
    return urllib.request.urlopen(urllib.request.Request(url, headers=h, data=data), timeout=timeout, context=CTX).read()


def gnews(query, attempts=3):
    """Google News rate-limits per IP. Back off rather than hammer: a blocked sweep should slow down,
    not fail silently and leave a gap in the grid that looks like 'nothing found'."""
    u = "https://news.google.com/rss/search?" + urllib.parse.urlencode({"q": query, "hl": "id", "gl": "ID", "ceid": "ID:id"})
    last = None
    for i in range(attempts):
        try:
            root = ET.fromstring(fetch(u)); break
        except Exception as e:
            last = e; time.sleep(20 * (i + 1))
    else:
        raise last
    out = []
    for i in root.iter("item"):
        link = i.findtext("link") or ""
        out.append({"judul": html.unescape(i.findtext("title") or ""), "gid": link.rsplit("/", 1)[-1].split("?")[0],
                    "pub": i.findtext("pubDate"), "outlet": (i.find("source").text if i.find("source") is not None else None)})
    return out


def resolve(gid, attempts=3):
    """Google News RSS links are JS redirects; ask Google's own endpoint for the real URL.
    Failure is recorded, never silently dropped: an unresolved candidate is still queued and flagged,
    because losing a real incident to a rate limit would quietly bias the census."""
    for attempt in range(attempts):
      try:
        page = fetch("https://news.google.com/articles/" + gid, ua=UA_RES, timeout=35).decode("utf8", "ignore")
        sig = re.search(r'data-n-a-sg="([^"]+)"', page); ts = re.search(r'data-n-a-ts="([^"]+)"', page)
        if not (sig and ts): return None
        inner = json.dumps(["garturlreq", [["X", "X", ["X", "X"], None, None, 1, 1, "US:en", None, 1, None, None, None, None, None, 0, 1],
                                           "X", "X", 1, [1, 1, 1], 1, 1, None, 0, 0, None, 0], gid, int(ts.group(1)), sig.group(1)])
        body = urllib.parse.urlencode({"f.req": json.dumps([[["Fbv4je", inner, None, "generic"]]])}).encode()
        r = fetch("https://news.google.com/_/DotsSplashUi/data/batchexecute?rpcids=Fbv4je", ua=UA_RES, data=body,
                  headers={"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"}, timeout=35).decode("utf8", "ignore")
        m = re.findall(r'https?://(?!news\.google)[^\\"\s]{15,}', r)
        if m: return m[0]
      except Exception:
        pass
      time.sleep(6 * (attempt + 1))
    return None


def norm_url(u):
    if not u: return None
    p = urllib.parse.urlsplit(u)
    host = p.netloc.lower().removeprefix("www.")
    return host + p.path.rstrip("/")


def load(name, default):
    p = DATA / name
    return json.loads(p.read_text()) if p.exists() else default


def known_urls():
    seen = set()
    for f, cols in (("insiden.json", ("sumber_1_url", "sumber_2_url")), ("kasus_resmi.json", ("sumber_url",))):
        for r in load(f, []):
            for c in cols:
                if r.get(c): seen.add(norm_url(r[c]))
    return seen


def build_grid(state, insiden):
    """Least-covered provinces first, newest wave first: search hardest where the record is thinnest."""
    cover = {p: 0 for p in PROVINSI}
    for r in insiden:
        if r.get("provinsi") in cover: cover[r["provinsi"]] += 1
    provs = sorted(PROVINSI, key=lambda p: (cover[p], p))
    done = set(state.get("done", []))
    grid = []
    # Tier 1 — national sweep per wave: no province term, so nothing is excluded by phrasing. Highest yield.
    for wave in WAVE_ORDER:
        for mek, queries in MEKANISME.items():
            for q in queries:
                cid = f"{wave}|*|{mek}|{q}"
                if cid not in done: grid.append((cid, wave, None, mek, q))
    # Tier 2 — province sweep, thinnest coverage first: deliberately searches hardest where the press is thinnest.
    for wave in WAVE_ORDER:
        for prov in provs:
            for mek, queries in MEKANISME.items():
                for q in queries:
                    cid = f"{wave}|{prov}|{mek}|{q}"
                    if cid not in done: grid.append((cid, wave, prov, mek, q))
    return grid


def _merge_save(path, rows):
    """Union with whatever is on disk now, keyed by URL (falling back to id), then write once."""
    import json as _j
    try:
        disk = _j.loads(path.read_text())
    except Exception:
        disk = []
    seen, out = {}, []
    for r in disk + rows:
        k = (r.get("url") or r.get("url_google") or r.get("kandidat_id"))
        if k in seen:
            out[seen[k]].update({kk: vv for kk, vv in r.items() if vv is not None})
            continue
        seen[k] = len(out); out.append(dict(r))
    path.write_text(_j.dumps(out, ensure_ascii=False, indent=1) + "\n")
    return len(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cells", type=int, default=25, help="grid cells per run (Google News membatasi laju; 25 aman)")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    insiden = load("insiden.json", [])
    state = load("crawl_state.json", {"done": [], "runs": []})
    kandidat = load("kandidat.json", [])
    logs = load("log_pencarian.json", [])
    seen = known_urls() | {norm_url(k.get("url")) for k in kandidat if k.get("url")}
    seen_titles = {re.sub(r"\W+", "", (k.get("judul") or "").lower())[:70] for k in kandidat}

    grid = build_grid(state, insiden)
    todo = grid[: a.cells]
    print(f"grid: {len(grid)} sel belum dijalankan; run ini mengambil {len(todo)}", file=sys.stderr)
    if not todo:
        print("Seluruh grid sudah dijalankan.", file=sys.stderr); return

    today = dt.date.today().isoformat()
    gagal = 0
    nextn = max([int(k["kandidat_id"].split("-")[-1]) for k in kandidat], default=0)
    nextlog = max([int(l["log_id"].split("-")[-1]) for l in logs], default=0)
    baru = 0

    for cid, wave, prov, mek, qterm in todo:
        start, end = GELOMBANG[wave]
        query = (f'{qterm} "{prov}" after:{start} before:{end}' if prov else f'{qterm} after:{start} before:{end}')
        try:
            items = gnews(query)
        except Exception as e:
            # the cell is NOT marked done, so a rate-limited sweep is retried tomorrow instead of
            # silently leaving a hole that would read as "no incidents here"
            print(f"  GAGAL {query[:60]}: {type(e).__name__} (sel diulang besok)", file=sys.stderr)
            gagal += 1
            if gagal >= 5:
                print("  5 kegagalan beruntun \u2014 kemungkinan dibatasi laju; hentikan run ini.", file=sys.stderr)
                break
            time.sleep(30); continue
        gagal = 0
        kept = 0
        for it in items:
            t = it["judul"]
            if not (RELEVAN.search(t) and AKTOR.search(t)) or BUANG.search(t): continue
            tkey = re.sub(r"\W+", "", t.lower())[:70]
            if tkey in seen_titles: continue
            url = None   # resolution is a separate, rate-limited step (scripts/resolve_urls.py)
            seen_titles.add(tkey)
            nextn += 1; kept += 1; baru += 1
            pub = it["pub"]
            try: tgl = dt.datetime.strptime(pub[5:16], "%d %b %Y").date().isoformat()
            except Exception: tgl = None
            kandidat.append({
                "kandidat_id": f"KAN-{nextn:05d}", "judul": re.sub(r"\s+-\s+[^-]+$", "", t).strip(),
                "outlet": it["outlet"], "tanggal_terbit": tgl, "url": url,
                "url_google": None if url else f"https://news.google.com/rss/articles/{it['gid']}",
                "status_url": "terselesaikan" if url else "belum terselesaikan",
                "gelombang_pilkada": wave, "mekanisme_dugaan": mek, "provinsi_kueri": prov or "(nasional)",
                "kueri": query, "ditemukan_pada": today, "status_tinjau": None, "catatan_tinjau": None,
            })
        nextlog += 1
        logs.append({"log_id": f"LOG-{nextlog:04d}", "provinsi": prov or "(nasional)", "tanggal_pencarian": today, "kueri": query,
                     "alat": "Google News RSS (skrip)", "dijalankan_oleh": "rutin otomatis",
                     "catatan": f"{len(items)} hasil, {kept} masuk antrean tinjau"})
        state.setdefault("done", []).append(cid)
        # simpan berkala: satu run panjang tidak boleh kehilangan semuanya kalau prosesnya mati
        if len(state["done"]) % 25 == 0:
            _merge_save(DATA / "kandidat.json", kandidat)
            (DATA / "crawl_state.json").write_text(json.dumps(state, ensure_ascii=False, indent=1) + "\n")
            (DATA / "log_pencarian.json").write_text(json.dumps(logs, ensure_ascii=False, indent=1) + "\n")
        print(f"  {wave} {(prov or '(nasional)')[:18]:18s} {mek[:24]:24s} {len(items):2d} hasil → {kept} kandidat", file=sys.stderr)
        time.sleep(12)

    state.setdefault("runs", []).append({"tanggal": today, "sel": len(todo), "kandidat_baru": baru})
    if a.dry_run:
        print(f"[dry-run] {baru} kandidat akan ditambahkan", file=sys.stderr); return
    _merge_save(DATA / "kandidat.json", kandidat)
    (DATA / "crawl_state.json").write_text(json.dumps(state, ensure_ascii=False, indent=1) + "\n")
    (DATA / "log_pencarian.json").write_text(json.dumps(logs, ensure_ascii=False, indent=1) + "\n")
    belum = len([k for k in kandidat if not k.get("status_tinjau")])
    print(f"\n{baru} kandidat baru · {belum} menunggu tinjauan · {len(state['done'])}/{len(grid) + len(state['done'])} sel grid selesai", file=sys.stderr)


if __name__ == "__main__":
    main()
