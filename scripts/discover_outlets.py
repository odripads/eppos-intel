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

def _kota_dari_gazetteer(provinsi=None):
    """Every kab/kota name in the gazetteer, reduced to the single token outlets actually use in a
    domain (Kabupaten Tulang Bawang Barat -> tulangbawang). Beats a hand-typed list of big cities:
    the thin-coverage regions are exactly the ones a hand-typed list forgets."""
    import json as _j
    rows = _j.loads((ROOT / "scripts" / "wikidata_id_regions.json").read_text())
    # `provinsi` narrows the stems to those provinces, matched on the BPS code rather than on map
    # geometry, so a sweep can be aimed at the provinces that still have no outlet at all
    kode = None
    if provinsi:
        want = {x.strip().lower() for x in provinsi}
        kode = {r["bps"][:2] for r in rows
                if "provin" in r["type"].lower() and r.get("bps") and r["label"].lower() in want}
        if not kode:
            raise SystemExit("provinsi tidak dikenal: " + ", ".join(sorted(want)))
    out = set()
    for r in rows:
        if "provin" in r["type"].lower(): continue
        if kode is not None and (r.get("bps") or "")[:2] not in kode: continue
        t = re.sub(r"[^a-z ]+", "", r["label"].lower()).strip()
        t = re.sub(r"^(kabupaten|kota administrasi|kota)\s+", "", t)
        joined = t.replace(" ", "")
        if 4 <= len(joined) <= 16: out.add(joined)
        first = t.split(" ")[0]
        if 4 <= len(first) <= 14: out.add(first)
    return sorted(out)


KOTA = _kota_dari_gazetteer()
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
    ap.add_argument("--provinsi", default=None, help="batasi tebakan domain ke kab/kota provinsi ini (koma)")
    ap.add_argument("--domains", default=None,
                    help="berkas berisi satu domain per baris; vet domain itu saja, jangan menebak pola")
    a = ap.parse_args()
    kota = _kota_dari_gazetteer(a.provinsi.split(",")) if a.provinsi else KOTA
    print(f"{len(kota)} nama kota dipakai", file=sys.stderr)
    reg = json.loads((ROOT / "scripts" / "outlet_wp.json").read_text())
    tolak = json.loads((ROOT / "scripts" / "outlet_ditolak.json").read_text())
    known = set(reg) | set(tolak)
    if a.domains:
        # domains observed in the wild (Google News surfaced them) rather than guessed from a pattern:
        # they still go through the same vetting, because being real is not the same as being in frame
        diminta = [x.strip().lower().replace("www.", "") for x in Path(a.domains).read_text().split() if x.strip()]
        cand = sorted(set(diminta) - known)
        print(f"{len(diminta)} domain diminta, {len(cand)} belum dikenal", file=sys.stderr)
    else:
        cand = sorted({p.format(c=c) for c in kota for p in POLA} - known)
    print(f"{len(cand)} domain kandidat", file=sys.stderr)
    with ThreadPoolExecutor(max_workers=a.workers) as ex:
        hits = [x for x in ex.map(probe, cand) if x]
    print(f"{len(hits)} menjawab REST", file=sys.stderr)
    baru, ditolak = [], {}
    for d, tot, titles in sorted(hits, key=lambda x: -x[1]):
        ok, why = vet(d, tot, titles)
        if ok: baru.append(d); print(f"  TERIMA {d:32s} {tot:>7,}  {titles[0][:56]}", file=sys.stderr)
        else: ditolak[d] = why
    # re-read before writing: two sweeps run side by side (one per province, one over a domain list)
    # and a wholesale write would silently drop whatever the other one had just accepted
    def simpan_gabung(nama, tambahan, gabung):
        f = ROOT / "scripts" / nama
        kini = json.loads(f.read_text()) if f.exists() else ([] if isinstance(tambahan, list) else {})
        hasil = gabung(kini, tambahan)
        f.write_text(json.dumps(hasil, ensure_ascii=False, indent=1) + "\n")
        return hasil
    reg = simpan_gabung("outlet_wp.json", baru, lambda a, b: sorted(set(a) | set(b)))
    simpan_gabung("outlet_ditolak.json", ditolak, lambda a, b: {**a, **b})
    print(f"\n+{len(baru)} diterima, +{len(ditolak)} ditolak · registri kini {len(reg)} outlet", file=sys.stderr)


if __name__ == "__main__":
    main()
