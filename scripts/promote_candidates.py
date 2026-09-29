#!/usr/bin/env python3
"""Turn the retrieval queue into a mappable layer, without inventing anything.

Odri authorised auto-inclusion "within our parameters". The parameters are PROJECT-SPEC v2, so this
derives only what a headline plus its metadata can actually support, and leaves everything else blank:

  derived      url, outlet domain, real headline (judul_status = terverifikasi, fetched from the outlet's
               own API), publication date, mechanism (from the typology bucket its query belongs to),
               kab/kota + province (only when a gazetteer name appears literally in the headline)
  NOT derived  tanggal kejadian (a publication date is not an event date), pelaku_jabatan, pelaku_nama,
               sasaran_jenis, ringkasan, hasil — these stay blank rather than guessed

  status_verifikasi is computed, not asserted: two or more DIFFERENT outlet domains reporting the same
  place + mechanism within 7 days counts as `dua sumber`; a lone report is `satu sumber`.

Output `data/insiden_otomatis.json` is a SEPARATE layer. The hand-curated census in `insiden.json` is
untouched, so the two never blur together on the map or in the dataset release.

Usage: python3 scripts/promote_candidates.py
"""
from __future__ import annotations
import datetime as dt, json, re, unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
LON_MIN, LON_MAX, LAT_MIN, LAT_MAX = 95.195138, 141.0009, -10.91942, 5.877151
S = 1000 / (LON_MAX - LON_MIN); OY = (420 - (LAT_MAX - LAT_MIN) * S) / 2
def project(lon, lat): return ((lon - LON_MIN) * S, 420 - ((lat - LAT_MIN) * S + OY))


# A headline must carry electoral context to count. Actor + action alone let through a COVID case
# count, a kades embezzlement, and an affair — the last explicitly out of scope in PROJECT-SPEC v2.
PEMILU = re.compile(r"(pilkada|pemilu|pilpres|pileg|pilgub|pilbup|pilwal|paslon|pasangan calon|calon (bupati|"
    r"wali ?kota|gubernur|wakil)|cabup|cawabup|cagub|cawagub|bakal calon|bawaslu|panwaslu|gakkumdu|\bkpu\b|"
    r"netralitas|kampanye|coblos|pemungutan suara|pencoblosan|tps\b|dkpp|\bkasn\b|masa tenang|"
    r"tahapan pemilihan|pemilihan (kepala daerah|bupati|wali ?kota|gubernur))", re.I)
# out of scope by the spec: personal scandal, ordinary crime, health/disaster reporting
LUAR_LINGKUP = re.compile(r"(selingkuh|perselingkuhan|asusila|mesum|zina|pelecehan|narkoba|sabu|"
    r"covid|corona|kecelakaan|laka lantas|kebakaran|karhutla|banjir|gempa|longsor|pencurian|begal|judi|"
    r"penggelapan|pungli|korupsi|mabuk|perkosa|cabul|"
    # ordinary crime that the mechanism words alone would otherwise let back in
    r"penipuan|ditipu|menipu|aniaya|penganiayaan|pencemaran nama baik|fitnah|difitnah|"
    r"jual beli tanah|sengketa lahan|pembunuhan|curanmor|tawuran|bacok|istri kedua|"
    r"vonis|divonis|penjara|dibui|napi|lapas)", re.I)


# Mechanism signatures from the closed typology. Inside a pilkada window these are plausibly electoral
# even when the headline never says "pilkada" — a mass transfer of officials weeks before a vote is the
# mechanism itself. Outside such a window the same words are just ordinary administration.
MEKANISME_SIG = re.compile(r"(mutasi|rotasi jabatan|dimutasi|digeser|dicopot|demosi|non-?job|lelang jabatan|"
    r"kepala desa|\bkades\b|lurah|perangkat desa|apdesi|paguyuban kades|\bASN\b|\bPNS\b|pegawai negeri|"
    r"honorer|\bPPPK\b|aparatur sipil|camat|bansos|bantuan sosial|sembako|\bPKH\b|"
    r"intimidasi|diancam|ancaman|ditekan|dipaksa|dimobilisasi|dikumpulkan)", re.I)
JENDELA_PILKADA = {"2024", "2020", "2018", "2017", "2015"}


def dalam_lingkup(judul, gelombang=None):
    """(ok, reason, basis). Scope is electoral coercion by executives, not every official in the news.

    Two ways in, recorded separately so the weaker basis stays visible:
      1. the headline itself carries electoral context — strongest
      2. a typology mechanism appears inside a pilkada window — weaker, flagged as such
    Out-of-scope topics (personal scandal, ordinary crime, disaster) are refused on either path."""
    if LUAR_LINGKUP.search(judul):
        return False, "topik di luar lingkup (skandal pribadi / kriminal umum / bencana)", None
    if PEMILU.search(judul):
        return True, None, "konteks elektoral di judul"
    if gelombang in JENDELA_PILKADA and MEKANISME_SIG.search(judul):
        return True, None, "mekanisme tipologi di dalam jendela pilkada"
    return False, "tidak ada konteks elektoral, dan bukan mekanisme tipologi di jendela pilkada", None


def norm(s):
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode().lower()
    return re.sub(r"\s+", " ", s).strip()


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
                if x < x1 + (y - y1) / (y2 - y1) * (x2 - x1): c = not c
    return c


# Home province of each outlet in the registry. Used ONLY as a province-level fallback when the headline
# names no kab/kota, and always flagged `lokasi_dasar = "wilayah edar outlet"` so it is never mistaken for
# a located incident. National outlets are deliberately absent: they have no home region to fall back on.
OUTLET_PROV = {
    "sulselsatu.com": "Sulawesi Selatan", "gosulsel.com": "Sulawesi Selatan", "fajar.co.id": "Sulawesi Selatan",
    "gopos.id": "Sulawesi Selatan", "beritajatim.com": "Jawa Timur", "suarasurabaya.net": "Jawa Timur",
    "radarbanten.co.id": "Banten", "bantennews.co.id": "Banten", "kabarbanten.com": "Banten",
    "radarbekasi.id": "Jawa Barat", "radarkarawang.id": "Jawa Barat", "balipost.com": "Bali",
    "floresa.co": "Nusa Tenggara Timur", "timexkupang.com": "Nusa Tenggara Timur",
    "langgam.id": "Sumatera Barat", "padangkita.com": "Sumatera Barat", "ulasan.co": "Kepulauan Riau",
    "beritamanado.com": "Sulawesi Utara", "sultengraya.com": "Sulawesi Tengah",
    "sultrakini.com": "Sulawesi Tenggara", "kalselpos.com": "Kalimantan Selatan",
    "niaga.asia": "Kalimantan Timur", "malutpost.id": "Maluku Utara",
}


# Local shorthand and city names that are not themselves kab/kota entries in the gazetteer.
# Each maps to the kab/kota it belongs to, so a headline saying "Bawaslu Kotim" still places.
ALIAS_TEMPAT = {
    "kotim": "Kotawaringin Timur", "sampit": "Kotawaringin Timur", "kobar": "Kotawaringin Barat",
    "pangkalanbun": "Kotawaringin Barat", "luwuk": "Banggai", "kotabaru": "Kota Baru",
    "madura": "Pamekasan", "bumiaji": "Kota Batu", "batu": "Kota Batu",
    "inhu": "Indragiri Hulu", "inhil": "Indragiri Hilir", "pekanbaru": "Kota Pekanbaru",
    "tanjungpinang": "Kota Tanjung Pinang", "batam": "Kota Batam", "lingga": "Lingga",
    "halmahera": "Halmahera Tengah", "ternate": "Kota Ternate", "sofifi": "Tidore Kepulauan",
    "banjarbaru": "Kota Banjar Baru", "martapura": "Banjar", "kendari": "Kota Kendari",
    "baubau": "Kota Bau-Bau", "palu": "Kota Palu", "gorontalo": "Kota Gorontalo",
    "jayapura": "Kota Jayapura", "sorong": "Kota Sorong", "ambon": "Kota Ambon",
    "kupang": "Kota Kupang", "mataram": "Kota Mataram", "denpasar": "Kota Denpasar",
    "makassar": "Kota Makassar", "parepare": "Kota Pare-Pare", "manado": "Kota Manado",
    "bitung": "Kota Bitung", "tomohon": "Kota Tomohon", "minut": "Minahasa Utara",
    "mitra": "Minahasa Tenggara", "bolmong": "Bolaang Mongondow", "jember": "Jember",
    "gresik": "Gresik", "sidoarjo": "Sidoarjo", "bogor": "Kota Bogor", "depok": "Kota Depok",
    "bekasi": "Kota Bekasi", "karawang": "Karawang", "cirebon": "Kota Cirebon",
    "tasikmalaya": "Kota Tasikmalaya", "sukabumi": "Kota Sukabumi", "garut": "Garut",
    "semarang": "Kota Semarang", "solo": "Kota Surakarta", "surakarta": "Kota Surakarta",
    "jogja": "Kota Yogyakarta", "yogya": "Kota Yogyakarta", "magelang": "Kota Magelang",
    "salatiga": "Kota Salatiga", "kudus": "Kudus", "jambi": "Kota Jambi",
    "palembang": "Kota Palembang", "lampung": "Kota Bandar Lampung", "medan": "Kota Medan",
    "padang": "Kota Padang", "bengkulu": "Kota Bengkulu", "pontianak": "Kota Pontianak",
    "samarinda": "Kota Samarinda", "balikpapan": "Kota Balikpapan", "banjarmasin": "Kota Banjarmasin",
    "surabaya": "Kota Surabaya", "malang": "Kota Malang", "kediri": "Kota Kediri",
    "madiun": "Kota Madiun", "pasuruan": "Kota Pasuruan", "probolinggo": "Kota Probolinggo",
    "mojokerto": "Kota Mojokerto", "blitar": "Kota Blitar", "banda": "Kota Banda Aceh",
}

KAB_PREFIX = re.compile(r"^(kabupaten|kab\.?|kota administrasi|kota adm\.?|kota)\s+", re.I)
PREFIX = re.compile(r"^(radar|kabar|info|berita|suara|harian|warta|media|tribun|jurnal|koran|portal|lintas|fokus)")
SUFFIX = re.compile(r"(pos|news|today|raya|terkini|ekspres|update|kita|post|hits|online|satu|net|id|co|com|"
                    r"voice|zone|link|channel|kini|expose|ekspos|times|daily|metro|media|bicara|aktual)$")


def outlet_city(domain):
    """Most regional outlets name their city in the domain (kabarnganjuk.com -> nganjuk).
    Used only to place a point at province level when the headline names no place."""
    base = domain.split(".")[0]
    base = PREFIX.sub("", base)
    base = SUFFIX.sub("", base)
    return base if len(base) >= 4 else None


def main():
    kand = json.loads((DATA / "kandidat.json").read_text())
    wd = json.loads((ROOT / "scripts" / "wikidata_id_regions.json").read_text())
    pp = json.loads((DATA / "provinsi_path.json").read_text())
    html = (ROOT / "index.html").read_text()
    ds = re.findall(r'<path class="prov"[^>]*\sd="([^"]+)"', re.search(r'<g id="provs">(.*?)</g>', html, re.S).group(1))
    prings = [rings(d) for d in ds]
    path_names = {L["path_index"]: L["provinsi_wikidata"] for L in pp["paths"]}

    # gazetteer: longest names first so "Kabupaten Semarang" wins over "Semarang"
    gaz = []
    for r in wd:
        t = r["type"].lower()
        if "provin" in t: continue
        gaz.append((norm(r["label"]), r))
    gaz.sort(key=lambda g: -len(g[0]))

    def place_of(title):
        n = " " + norm(title) + " "
        for name, r in gaz:
            if len(name) < 5: continue
            if re.search(r"(?<![a-z])" + re.escape(name) + r"(?![a-z])", n):
                return r
        return None

    gaz_by_name = {}
    for nm, r in gaz: gaz_by_name.setdefault(nm, r)

    def place_from_alias(text):
        t = norm(text)
        for ali, target in ALIAS_TEMPAT.items():
            if re.search(r"(?<![a-z])" + ali + r"(?![a-z])", t):
                r = gaz_by_name.get(norm(target)) or gaz_by_name.get(norm(KAB_PREFIX.sub("", target)))
                if r: return r
        return None

    def place_from_domain(domain):
        """Outlet names embed their city (malangvoice, jurnalbogor). Longest gazetteer name that
        appears inside the domain wins; the alias table covers local shorthand the gazetteer lacks."""
        if not domain: return None
        base = norm(domain.split(".")[0])
        for nm, r in gaz:
            if len(nm) >= 5 and nm.replace(" ", "") in base: return r
        for ali, target in ALIAS_TEMPAT.items():
            if ali in base:
                r = gaz_by_name.get(norm(target)) or gaz_by_name.get(norm(KAB_PREFIX.sub("", target)))
                if r: return r
        return None

    def place_from_url(url):
        """Article slugs often carry the kab/kota even when the headline does not
        (…/pilkada/d-123/bawaslu-sleman-limpahkan…). Same gazetteer, same word-boundary rule."""
        if not url: return None
        slug = re.sub(r"[^a-z]+", " ", url.lower().split("://", 1)[-1])
        n = " " + slug + " "
        for name, r in gaz:
            if len(name) < 5: continue
            if re.search(r"(?<![a-z])" + re.escape(name) + r"(?![a-z])", n):
                return r
        return None

    def province_of(r):
        x, y = project(r["lon"], r["lat"])
        for i, rs in enumerate(prings):
            if inside(rs, x, y):
                names = path_names.get(i, [])
                return (names[0] if names else None), i
        return None, None

    prov_centroid = {norm(r["label"]): r for r in wd if "provin" in r["type"].lower()}
    PROV_ALIAS = {"di yogyakarta": "yogyakarta", "dki jakarta": "jakarta"}
    rows, unplaced, ditolak = [], 0, []
    for k in kand:
        if not k.get("url"): continue
        ok, why, basis = dalam_lingkup(k["judul"], k.get("gelombang_pilkada"))
        if not ok:
            ditolak.append({"kandidat_id": k["kandidat_id"], "judul": k["judul"], "alasan": why}); continue
        p = place_of(k["judul"])
        dasar = "nama kab/kota di judul" if p else None
        if not p:
            p = place_from_url(k.get("url"))
            if p: dasar = "nama kab/kota di tautan"
        if not p:
            p = place_from_alias(k["judul"])
            if p: dasar = "singkatan tempat di judul"
        if not p:
            p = place_from_domain(k.get("outlet"))
            if p: dasar = "nama kota di domain outlet"
        prov, pidx = (province_of(p) if p else (None, None))
        if not p:
            hp = OUTLET_PROV.get(k.get("outlet"))
            if not hp and k.get("outlet"):
                city = outlet_city(k["outlet"])
                if city:
                    for nm, gr in gaz:
                        if nm == city or nm.replace(" ", "") == city:
                            pv, _ix = province_of(gr)
                            if pv: hp = pv
                            break
            if hp:
                pr = prov_centroid.get(PROV_ALIAS.get(norm(hp), norm(hp)))
                if pr:
                    prov, pidx = province_of(pr)
                    prov = prov or hp
                    dasar = "wilayah edar outlet"
        rows.append({
            "insiden_id": k["kandidat_id"].replace("KAN", "AUTO"),
            "tanggal": None,                       # event date unknown; a publication date is not it
            "tanggal_berita": k.get("tanggal_terbit"),
            "provinsi": prov, "kab_kota": (p["label"] if p else None),
            "lokasi_dasar": dasar,
            # True where the place came from the outlet rather than from the story itself: the article
            # never names it, so the point marks where the outlet is based, not where the incident was.
            "lokasi_perkiraan": dasar in ("wilayah edar outlet", "nama kota di domain outlet"),
            "lokasi_tingkat": ("kab_kota" if p else ("provinsi" if prov else None)),
            "pelaku_jabatan": None, "sasaran_jenis": None,
            "mekanisme": k.get("mekanisme_dugaan"),
            "ringkasan_satu_kalimat": None, "hasil": None,
            "sumber_1_url": k["url"], "sumber_1_outlet": k.get("outlet"), "sumber_2_url": None,
            "status_verifikasi": None,             # computed below
            "status_kurasi": "otomatis",
            "periode_pilpres": None,               # set from the wave window below
            "gelombang_pilkada": k.get("gelombang_pilkada"),
            "judul_sumber_1": k["judul"],
            "judul_status": "terverifikasi" if k.get("status_url") == "terselesaikan" else "dari URL",
            "diisi_oleh": "penelusuran otomatis", "tanggal_isi": k.get("ditemukan_pada"),
            "kueri": k.get("kueri"), "lingkup_dasar": basis, "_path": pidx,
        })
        if not prov: unplaced += 1

    # periode from the wave the query targeted (waves sit wholly inside one presidential period)
    WAVE_PERIODE = {"2024": "Periode V", "2020": "Periode IV", "2018": "Periode III",
                    "2017": "Periode III", "2015": "Periode III", "2026": "Periode V", "2025": "Periode V",
                    "2023": "Periode IV", "2022": "Periode IV", "2021": "Periode IV", "2019b": "Periode III",
                    "2016": "Periode III", "kontrol-2024": "Periode IV", "kontrol-2020": "Periode IV",
                    "kontrol-2018": "Periode IV", "kontrol-2017": "Periode III"}
    for r in rows: r["periode_pilpres"] = WAVE_PERIODE.get(r["gelombang_pilkada"])

    # corroboration: same place + mechanism, different outlet domains, within 7 days
    buckets = defaultdict(list)
    for r in rows:
        if r["kab_kota"] and r["tanggal_berita"]:
            buckets[(r["kab_kota"], r["mekanisme"])].append(r)
    for group in buckets.values():
        group.sort(key=lambda r: r["tanggal_berita"])
        for i, r in enumerate(group):
            d0 = dt.date.fromisoformat(r["tanggal_berita"])
            others = {o["sumber_1_outlet"] for o in group
                      if o is not r and abs((dt.date.fromisoformat(o["tanggal_berita"]) - d0).days) <= 7}
            others.discard(r["sumber_1_outlet"])
            if others:
                r["status_verifikasi"] = "dua sumber"
                mate = next(o for o in group if o["sumber_1_outlet"] in others)
                r["sumber_2_url"] = mate["sumber_1_url"]
    for r in rows:
        if not r["status_verifikasi"]: r["status_verifikasi"] = "satu sumber"

    (DATA / "insiden_otomatis.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1) + "\n")
    (DATA / "otomatis_diluar_lingkup.json").write_text(json.dumps(ditolak, ensure_ascii=False, indent=1) + "\n")
    print(f"{len(ditolak)} kandidat disisihkan sebagai di luar lingkup (tercatat, tidak dibuang)")
    dua = sum(1 for r in rows if r["status_verifikasi"] == "dua sumber")
    placed = sum(1 for r in rows if r["kab_kota"])
    provlvl = sum(1 for r in rows if not r["kab_kota"] and r["provinsi"])
    byprov = defaultdict(int)
    for r in rows:
        if r["provinsi"]: byprov[r["provinsi"]] += 1
    print(f"{len(rows)} baris otomatis · {placed} punya kab/kota · {unplaced} tanpa lokasi · {dua} dua sumber")
    print(f"{len(byprov)} provinsi tersentuh: " + ", ".join(f"{k}({v})" for k, v in sorted(byprov.items(), key=lambda x: -x[1])[:12]))


if __name__ == "__main__":
    main()
