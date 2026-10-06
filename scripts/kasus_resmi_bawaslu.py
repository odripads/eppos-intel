#!/usr/bin/env python3
"""Administrative-case candidates from Bawaslu's own regional websites, for the kasus_resmi series.

Bawaslu provincial and kab/kota offices each run a Drupal site (<name>.bawaslu.go.id) whose /berita listing
gives a headline, a timestamp and a link per item. Most items are the office's own activities (sosialisasi,
rakor, apel); a few report a case it handled: a report received, an ASN recommended to BKN, a suspect named.
This script walks the listings, keeps the case items by rule, and writes data/kasus_resmi_otomatis.json,
which build_data.py merges into kasus_resmi marked "otomatis, belum diverifikasi".

Only the headline is read. Nothing is classified by a model: a case item needs a case-handling verb, an
official or ASN as its subject, and none of the activity words. jumlah_kasus is filled only when the
headline itself states a count. Province and kab/kota come from a kab/kota named in the headline, else from
the office that published it.

These are administrative records, not media reports, so they never enter insiden_otomatis: the two series
are kept apart by design (PROJECT-SPEC, "two series with differently-directed biases").

    python3 scripts/kasus_resmi_bawaslu.py                 # crawl every site in scripts/outlet_bawaslu.json
    python3 scripts/kasus_resmi_bawaslu.py --dari FILE     # reuse a crawl ("date | title | url | site | -" lines)
"""
import argparse, collections, datetime as dt, html, json, re, ssl, sys, threading, time, unicodedata, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
CTX = ssl.create_default_context(); CTX.check_hostname = False; CTX.verify_mode = ssl.CERT_NONE
UA = {"User-Agent": "EPPOS-DPP-UGM academic research (incident census; github.com/odripads/eppos-intel)"}

ROW = re.compile(r'class="[^"]*views-row[^"]*"(.*?)(?=class="[^"]*views-row|</main>|$)', re.S)
TIME = re.compile(r'<time datetime="(\d{4}-\d\d-\d\d)')
LINK = re.compile(r'<a href="((?:/index\.php)?/berita/[^"?#]+)"[^>]*>\s*([^<]{12,300}?)\s*</a>')

TANGANI = re.compile(r"(rekomendasi\w*|teruskan|diteruskan|tindak ?lanjut\w*|tangani|menangani|penanganan|temukan|temuan|"
                     r"terima (?:\d+ )?laporan|menerima laporan|laporan dugaan|registrasi|diregistrasi|putus\w*|hentikan|dihentikan|"
                     r"limpahkan|dilimpahkan|klarifikasi|panggil|dipanggil|periksa|diperiksa|kajian|sanksi|terbukti|"
                     r"langgar|melanggar|pelanggaran|tidak netral|tak netral|sidang|gakkumdu|proses laporan|tersangka|ditetapkan)", re.I)
SASARAN = re.compile(r"(\basn\b|\bpns\b|aparatur sipil|pegawai|honorer|pppk|kepala kampung|kakam|kepala desa|kades|perangkat desa|"
                     r"kepala distrik|kadistrik|\bcamat\b|\blurah\b|pejabat|sekda|kepala dinas|\bkadis\b|bupati|wali ?kota|"
                     r"gubernur|\bpj\b|petahana|netralitas)", re.I)
BUKAN = re.compile(r"(sosialisasi|rakor|rapat koordinasi|apel|bimtek|pelatihan|webinar|forum|konsolidasi|silaturahmi|"
                   r"kunjungi|sambangi|audiensi|launching|peluncuran|ucapan|selamat|upacara|olahraga|jumat sehat|"
                   r"seleksi|rekrutmen|pendaftaran|lantik|pelantikan|bawaslu goes|ngopi|diskusi|talkshow|podcast|"
                   # rehearsals, attendance, MoUs, briefings, warnings and opinion are not cases
                   r"simulasi|hadiri|kerja sama|tandatangani|coffee morning|paparkan|surat keputusan|penetapan pasangan|"
                   r"sanksinya bisa|bisa dipidana|\?|\btop \d)", re.I)
JUMLAH = re.compile(r"\b(\d{1,4}|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh)\s+(?:orang\s+|oknum\s+)?"
                    r"(kasus|laporan|temuan|dugaan|pelanggaran|perkara|aduan|asn|pns|pegawai|kepala kampung|kades|"
                    r"kepala desa|kepala distrik|pejabat|oknum)", re.I)
KATA = {"satu": 1, "dua": 2, "tiga": 3, "empat": 4, "lima": 5, "enam": 6, "tujuh": 7, "delapan": 8, "sembilan": 9, "sepuluh": 10}


def norm(s):
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode().lower()
    return re.sub(r"\s+", " ", s).strip()


def jelajah(situs, maxp=120, jeda=2.0):
    """Walk /berita?page=N on each site until two pages in a row yield nothing."""
    hasil, kunci = {}, threading.Lock()
    def kerja(s):
        base, kosong = f"https://{s}.bawaslu.go.id", 0
        for p in range(maxp):
            u = f"{base}/berita" + (f"?page={p}" if p else "")
            try:
                h = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=25, context=CTX).read().decode("utf-8", "ignore")
            except Exception as e:
                print(f"  {s} hal {p}: {str(e)[:50]}", file=sys.stderr); kosong += 1; time.sleep(3)
            else:
                got = 0
                for r in ROW.finditer(h):
                    seg = r.group(1)[:4000]; t = TIME.search(seg); l = LINK.search(seg)
                    if not (t and l): continue
                    url = base + l.group(1).replace("/index.php", "")
                    with kunci:
                        if url not in hasil: hasil[url] = (t.group(1), html.unescape(l.group(2)).strip(), s); got += 1
                kosong = kosong + 1 if got == 0 else 0
            if kosong >= 2: break
            time.sleep(jeda)
    sem = threading.Semaphore(16)
    def jalan(s):
        with sem: kerja(s)
    ts = [threading.Thread(target=jalan, args=(s,)) for s in situs]; [t.start() for t in ts]; [t.join() for t in ts]
    return [(d, j, u, s) for u, (d, j, s) in hasil.items()]


def gazetir():
    """kab/kota of the provinces the sites cover: normalized name -> row, plus the province of each BPS code."""
    wd = json.loads((ROOT / "scripts" / "wikidata_id_regions.json").read_text())
    prov = {(r.get("bps") or "")[:2]: r["label"] for r in wd if "provin" in r["type"].lower() and r.get("bps")}
    kab = [r for r in wd if "provin" not in r["type"].lower() and r.get("bps")]
    return kab, prov


def lengkap(r):
    """kasus_resmi names places in full ("Kabupaten Boyolali", "Kota Semarang"), which also keeps the city and
    the regency of Jayapura (or Sorong) apart."""
    if re.match(r"^(Kabupaten|Kota)\s", r["label"]): return r["label"]
    return ("Kota " if "kota" in r["type"].lower() else "Kabupaten ") + r["label"]


def tempat(judul, situs, kab, prov):
    """(provinsi, kab_kota, dasar). A kab/kota named in the headline wins; a bare "Jayapura" or "Sorong" is the
    city after "wali kota"/"kota", the regency after "bupati"/"kabupaten". Otherwise the publishing office."""
    j = norm(judul)
    for r in sorted(kab, key=lambda r: -len(r["label"])):
        n = norm(re.sub(r"^(Kabupaten|Kota)\s+", "", r["label"]))
        m = re.search(r"(?<![a-z])(\w+ )?" + re.escape(n) + r"(?![a-z])", j)
        if not m: continue
        kota = r["label"].startswith("Kota") or "kota" in r["type"].lower()
        kembar = [x for x in kab if norm(re.sub(r"^(Kabupaten|Kota)\s+", "", x["label"])) == n]
        if len(kembar) > 1:
            depan = j[max(0, m.start() - 12):m.start() + len(m.group(0))]
            ingin_kota = bool(re.search(r"wali ?kota|walikota|\bkota\b", depan))
            if kota != ingin_kota: continue
        return prov.get(r["bps"][:2]), lengkap(r), "kab/kota di judul"
    s = situs.replace(".bawaslu.go.id", "")
    for r in kab:
        n = re.sub(r"[^a-z]", "", norm(re.sub(r"^(Kabupaten|Kota)\s+", "", r["label"])))
        kota = r["label"].startswith("Kota") or "kota" in r["type"].lower()
        if s in ({f"kota{n}", f"{n}kota"} if kota else {n, f"kab{n}", f"{n}kab"}):
            return prov.get(r["bps"][:2]), lengkap(r), "kantor Bawaslu penerbit"
    for kode, label in prov.items():
        if re.sub(r"[^a-z]", "", norm(label)) == s or (s == "kaltara" and label == "Kalimantan Utara"):
            return label, None, "kantor Bawaslu penerbit (provinsi)"
    return None, None, None


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--dari"); ap.add_argument("--maxp", type=int, default=120)
    a = ap.parse_args()
    situs = json.loads((ROOT / "scripts" / "outlet_bawaslu.json").read_text())
    if a.dari:
        L = [tuple(x.strip() for x in l.split(" | ")[:4]) for l in open(a.dari) if l.strip()]
        L = [(d, j, u, s.replace(".bawaslu.go.id", "")) for d, j, u, s in L]
    else:
        L = jelajah(situs, a.maxp)
    print(f"{len(L)} berita dari {len({x[3] for x in L})} situs", file=sys.stderr)
    # a site-day with 15+ items is a bulk upload: the timestamp is the upload, not necessarily publication
    massal = {k for k, v in collections.Counter((x[3], x[0]) for x in L).items() if v >= 15}
    kab, prov = gazetir()
    today = dt.date.today().isoformat()
    out, dilihat = [], set()
    for d, j, u, s in sorted(L, key=lambda x: (x[3] in ("papua", "papuabarat", "kaltara", "papuabaratdaya", "papuatengah",
                                                       "papuapegunungan", "papuaselatan"), x[0])):
        if not (TANGANI.search(j) and SASARAN.search(j)) or BUKAN.search(j): continue
        kunci = re.sub(r"\W+", "", j.lower())
        if kunci in dilihat: continue        # one case reposted by the province office: keep the kab office's copy
        dilihat.add(kunci)
        m = JUMLAH.search(j); n = None
        if m: w = m.group(1).lower(); n = int(w) if w.isdigit() else KATA.get(w)
        pv, kk, dasar = tempat(j, s + ".bawaslu.go.id", kab, prov)
        out.append({"kasus_id": None, "lembaga": "Bawaslu", "tahun": int(d[:4]), "tanggal": d,
                    "tanggal_catatan": "unggah massal; tanggal mungkin bukan tanggal terbit" if (s, d) in massal else None,
                    "provinsi": pv, "kab_kota": kk, "lokasi_dasar": dasar,
                    "jenis_pelanggaran": j, "jumlah_kasus": n, "jumlah_frasa": m.group(0) if m else None,
                    "sumber_url": u, "judul_sumber_1": j, "judul_status": "otomatis, belum diverifikasi",
                    "diisi_oleh": "otomatis (situs Bawaslu)", "tanggal_isi": today, "situs": f"{s}.bawaslu.go.id"})
    out.sort(key=lambda r: (r["tanggal"], r["sumber_url"]))
    lama = {r["sumber_url"]: r for r in json.loads((DATA / "kasus_resmi_otomatis.json").read_text())} \
        if (DATA / "kasus_resmi_otomatis.json").exists() else {}
    # ids are kept across reruns; a new case takes the next free number, never a number already given out
    nomor = max([int(r["kasus_id"].split("-")[-1]) for r in lama.values() if r.get("kasus_id")], default=0)
    for r in out:
        if r["sumber_url"] in lama:
            r["kasus_id"] = lama[r["sumber_url"]]["kasus_id"]; r["tanggal_isi"] = lama[r["sumber_url"]].get("tanggal_isi") or today
        else:
            nomor += 1; r["kasus_id"] = f"OTO-BWS-{nomor:04d}"
    (DATA / "kasus_resmi_otomatis.json").write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
    print(f"{len(out)} kandidat kasus resmi · {sum(1 for r in out if r['jumlah_kasus'])} dengan jumlah di judul")


if __name__ == "__main__":
    main()
