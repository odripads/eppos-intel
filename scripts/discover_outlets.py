#!/usr/bin/env python3
"""Find and vet more WordPress-backed Indonesian news outlets, unattended.

Probes candidate domains on both REST paths, then screens each one by sampling recent headlines.
Screening is the point: several "local news" domains turn out to be hijacked casino pages, SEO farms
or empty installs, and letting those into the frame would quietly corrupt the census.

Accepted domains are appended to scripts/outlet_wp.json; rejects are recorded with a reason in
scripts/outlet_ditolak.json so an absence is never mistaken for "no coverage here".

Usage: python3 scripts/discover_outlets.py [--workers 30]
"""
from __future__ import annotations
import argparse, html, json, re, ssl, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CTX = ssl.create_default_context(); CTX.check_hostname = False; CTX.verify_mode = ssl.CERT_NONE
UA = "EPPOS-DPP-UGM academic research (incident census; github.com/odripads/eppos-intel)"
PATHS = ["/wp-json/wp/v2/posts?per_page=5&_fields=title,date,link",
         "/?rest_route=/wp/v2/posts&per_page=5&_fields=title,date,link"]

KOTA = """bekasi karawang bogor depok tangerang cirebon indramayu subang purwakarta sukabumi garut tasikmalaya
banjar kuningan majalengka sumedang cianjur bandung semarang solo jogja yogya kudus pati blora tegal pekalongan
purwokerto magelang salatiga klaten sragen madiun kediri malang jember banyuwangi probolinggo pasuruan mojokerto
jombang lamongan gresik tuban bojonegoro madura sumenep pamekasan bangkalan sampang sidoarjo surabaya nganjuk
ngawi ponorogo pacitan trenggalek tulungagung blitar lumajang bondowoso situbondo denpasar bali singaraja
lombok mataram bima dompu sumbawa kupang ende maumere ruteng labuanbajo atambua makassar parepare palopo bone
gowa maros bulukumba manado bitung tomohon kotamobagu palu poso luwuk kendari baubau kolaka gorontalo ambon
tual ternate tidore sofifi jayapura sorong manokwari merauke timika nabire biak medan binjai tebingtinggi
siantar asahan labuhanbatu padang bukittinggi payakumbuh solok pariaman pekanbaru dumai bengkalis siak jambi
palembang lubuklinggau prabumulih bengkulu lampung metro pringsewu pontianak singkawang sintang palangkaraya
sampit pangkalanbun banjarmasin banjarbaru martapura samarinda balikpapan bontang tarakan batam tanjungpinang
karimun bintan aceh banda lhokseumawe langsa sabang meulaboh bireuen""".split()
POLA = ["{c}ekspos.com", "ekspos{c}.com", "{c}bangkit.com", "{c}terbit.com", "{c}aktual.com",
        "aktual{c}.com", "{c}pikiran.com", "{c}suara.com", "{c}warta.com", "{c}kabar.com",
        "{c}berita.com", "{c}harian.id", "{c}pos.id", "{c}news.id", "{c}today.id", "{c}raya.id",
        "{c}update.id", "{c}terkini.id", "{c}online.id", "{c}link.id", "{c}info.com", "{c}info.id",
        "{c}tribun.com", "{c}koran.com", "koran{c}.com", "{c}media.com", "{c}channel.com",
        "{c}voice.com", "{c}focus.com", "{c}review.com", "{c}journal.com", "{c}insight.com",
        "{c}expose.com", "{c}detik.com", "{c}viral.com", "{c}terkini.co.id", "{c}news.co.id"]

# headline signatures of things that are not local journalism
SPAM = re.compile(r"(casino|slot|judi|gacor|togel|poker|betting|bookmaker|crypto|bitcoin|forex|"
                  r"registration steps|practical guide|complete guide|review the|best practices|"
                  r"lirik lagu|makna lagu|link download|nonton film|streaming|hello world|"
                  r"cara tf |cara transfer|spesifikasi hp|harga hp|kode redeem|tips dan trik)", re.I)
ENGLISH = re.compile(r"\b(the|and|for|with|your|how to|what|why|best|guide|review|steps|about)\b", re.I)
# a real Indonesian local-news headline almost always carries one of these
INDO = re.compile(r"\b(di|ke|dari|yang|untuk|dengan|pada|akan|warga|pemkot|pemkab|bupati|wali|gubernur|"
                  r"polres|polda|dprd|dinas|desa|kecamatan|kabupaten|kota|jalan|sekolah|siswa|petani|"
                  r"banjir|kebakaran|korban|tersangka|proyek|anggaran|pemerintah|masyarakat)\b", re.I)


def clean(t): return html.unescape(re.sub(r"<[^>]+>", "", t or "")).strip()


def probe(d):
    for path in PATHS:
        try:
            r = urllib.request.urlopen(urllib.request.Request("https://" + d + path, headers={"User-Agent": UA}),
                                       timeout=14, context=CTX)
            tot = int(r.headers.get("X-WP-Total") or r.headers.get("x-wp-total") or 0)
            j = json.loads(r.read())
            if isinstance(j, list) and j and j[0].get("link"):
                return d, tot, [clean(x.get("title", {}).get("rendered")) for x in j]
        except Exception:
            pass
    return None


def vet(d, tot, titles):
    """Return (ok, reason). Deliberately strict: a polluted frame is worse than a smaller one."""
    if tot < 300: return False, f"arsip terlalu tipis ({tot} pos)"
    ts = [t for t in titles if t]
    if len(ts) < 3: return False, "judul tidak terbaca"
    if sum(bool(SPAM.search(t)) for t in ts) >= 1: return False, "judul memuat penanda spam/pabrik konten"
    indo = sum(bool(INDO.search(t)) for t in ts)
    eng = sum(bool(ENGLISH.search(t)) and not INDO.search(t) for t in ts)
    if indo < max(2, len(ts) // 2): return False, f"hanya {indo}/{len(ts)} judul terbaca sebagai berita Indonesia"
    if eng >= 2: return False, "sebagian besar judul berbahasa Inggris"
    return True, None


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--workers", type=int, default=30)
    a = ap.parse_args()
    reg = json.loads((ROOT / "scripts" / "outlet_wp.json").read_text())
    tolak = json.loads((ROOT / "scripts" / "outlet_ditolak.json").read_text())
    known = set(reg) | set(tolak)
    cand = sorted({p.format(c=c) for c in KOTA for p in POLA} - known)
    print(f"{len(cand)} domain kandidat", file=sys.stderr)
    with ThreadPoolExecutor(max_workers=a.workers) as ex:
        hits = [x for x in ex.map(probe, cand) if x]
    print(f"{len(hits)} menjawab REST", file=sys.stderr)
    baru, ditolak = [], {}
    for d, tot, titles in sorted(hits, key=lambda x: -x[1]):
        ok, why = vet(d, tot, titles)
        if ok: baru.append(d); print(f"  TERIMA {d:32s} {tot:>7,}  {titles[0][:56]}", file=sys.stderr)
        else: ditolak[d] = why
    reg = sorted(set(reg) | set(baru))
    tolak.update(ditolak)
    (ROOT / "scripts" / "outlet_wp.json").write_text(json.dumps(reg, ensure_ascii=False, indent=1) + "\n")
    (ROOT / "scripts" / "outlet_ditolak.json").write_text(json.dumps(tolak, ensure_ascii=False, indent=1) + "\n")
    print(f"\n+{len(baru)} diterima, +{len(ditolak)} ditolak · registri kini {len(reg)} outlet", file=sys.stderr)


if __name__ == "__main__":
    main()
