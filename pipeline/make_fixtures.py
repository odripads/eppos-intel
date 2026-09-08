#!/usr/bin/env python3
"""Generate FIXTURE data so the site can be built before real collection lands.

Rules (spec §Non-negotiables):
  * Real outlets carry only publicly-true facts (domain, name, what the archive recall test found).
  * Every invented number attaches to a `.example` domain or a row marked FIKTIF.
  * Every row carries source_url, archive_url, retrieved_at, first_seen, last_checked.
  * info_a1 rows carry a role, never a name, and never feed an index.

Usage: python3 pipeline/make_fixtures.py   -> writes data/*.json, data/csv/*.csv, data/manifest.json
"""
from __future__ import annotations
import csv, hashlib, json, math, random, datetime as dt
from pathlib import Path
from regimes import REGIONS, WINDOW
from schema import INTAKE_SHEETS, PIPELINE_TABLES, PROVENANCE

random.seed(20260909)
ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"; CSV = DATA / "csv"
NOW = "2026-09-09T00:00:00+07:00"
TODAY = "2026-09-09"
VERSION = "0.1.0-fixture"

def prov(source_url, archive_url="", retrieved=TODAY):
    return {"source_url": source_url, "archive_url": archive_url, "retrieved_at": retrieved,
            "first_seen": NOW, "last_checked": NOW}

def d(s): return dt.date.fromisoformat(s)

# ---------------------------------------------------------------- outlets
# Real outlets: public facts only, from archive-recall/results-2026-09-09.json
RECALL = ROOT / "archive-recall" / "results-2026-09-09.json"
REAL_OUTLETS = [  # (outlet_id, nama, url_beranda, aktif, catatan)
    ("makassar.tribunnews.com", "Tribun Timur", "https://makassar.tribunnews.com", "ya", "bukan WordPress; Wayback ≥20 000 halaman/tahun 2014–2017"),
    ("fajar.co.id", "Harian Fajar", "https://fajar.co.id", "ya", "WP JSON aktif, arsip situs mulai 2017-03; Wayback 2014–2016 ada"),
    ("rakyatsulsel.co", "Rakyat Sulsel", "https://rakyatsulsel.co", "ya", "domain lama rakyatsulsel.com; arsip 2014–2017 hanya di domain lama"),
    ("beritakotamakassar.com", "Berita Kota Makassar", "https://beritakotamakassar.com", "tidak diketahui", "Wayback 2014 tebal (13 994), menyusut ke 6 halaman pada 2017"),
    ("makassar.antaranews.com", "Antara Sulsel", "https://makassar.antaranews.com", "ya", "bukan WordPress; domain lama antarasulsel.com"),
    ("kabarmakassar.com", "Kabar Makassar", "https://kabarmakassar.com", "ya", "WP JSON aktif; 67 499 pos tetapi sebelum 2017 nyaris kosong — migrasi situs"),
    ("upeks.co.id", "Ujung Pandang Ekspres", "https://upeks.co.id", "ya", "WP JSON aktif mulai 2019; memblokir probe (403) setelah ±8 permintaan"),
    ("gosulsel.com", "Gosulsel", "https://gosulsel.com", "ya", "situs di-reset: pos aktif mulai 2025-01; Wayback 2016–2017 >10 000 halaman"),
    ("inikata.com", "Inikata", "https://inikata.com", "tidak diketahui", "TLS rusak saat probe; Wayback 2016–2017 ada"),
    ("sulselsatu.com", "Sulsel Satu", "https://sulselsatu.com", "ya", "WP JSON aktif mulai 2015-08"),
    ("makassar.terkini.id", "Terkini.id Makassar", "https://makassar.terkini.id", "ya", "WP JSON aktif mulai 2019-01"),
]
FIX_OUTLETS = [  # fictional; all invented numbers live here
    ("harian-losari.example", "Harian Losari", "Makassar", "kontrak", 1.35, 0.58),
    ("suara-tamalanrea.example", "Suara Tamalanrea", "Makassar", "kontrak", 1.20, 0.52),
    ("sulsel-kini.example", "Sulsel Kini", "Makassar", "campuran", 0.95, 0.36),
    ("kabar-pelabuhan.example", "Kabar Pelabuhan", "Makassar", "independen", 0.55, 0.17),
    ("timor-pagi.example", "Timor Pagi", "Kupang", "kontrak", 1.10, 0.49),
    ("kupang-kini.example", "Kupang Kini", "Kupang", "independen", 0.65, 0.21),
]

def outlets():
    rows = []
    for oid, nama, url, aktif, cat in REAL_OUTLETS:
        rows.append({"outlet_id": oid, "nama_outlet": nama, "kota": "Makassar", "jenis": "online",
                     "dewan_pers": "tidak diketahui", "pemilik_terdaftar": "", "sumber_kepemilikan_url": "",
                     "url_beranda": url, "aktif": aktif, "catatan": f"fakta publik dari uji recall arsip 2026-09-09: {cat}",
                     "diisi_oleh": "Odri (probe)", "tanggal_isi": TODAY, "fiktif": False, **prov(url)})
    for oid, nama, kota, profil, _, _ in FIX_OUTLETS:
        rows.append({"outlet_id": oid, "nama_outlet": nama, "kota": kota, "jenis": "online",
                     "dewan_pers": "terverifikasi" if profil != "independen" else "terdaftar", "pemilik_terdaftar": f"PT {nama} Media (FIKTIF)",
                     "sumber_kepemilikan_url": f"https://{oid}/fixture/ahu", "url_beranda": f"https://{oid}", "aktif": "ya",
                     "catatan": f"FIKTIF — profil fixture: {profil}", "diisi_oleh": "fixture", "tanggal_isi": TODAY, "fiktif": True,
                     **prov(f"https://{oid}/fixture")})
    return rows

# ---------------------------------------------------------------- weekly metrics
def weeks():
    w = d("2014-01-06")  # first Monday of the window
    while w <= d(WINDOW[1]):
        yield w; w += dt.timedelta(days=7)

def regime_at(region, day):
    for r in region["regimes"]:
        if d(r["mulai"]) <= day and (r["selesai"] is None or day < d(r["selesai"])): return r
    return None

def days_to_penetapan(region, day):
    if not region["penetapan"]: return None
    return min(((day - d(p)).days for p in region["penetapan"]), key=abs)

def bump(days, peak_at=-28, width=70):
    """Gaussian ramp that peaks shortly before penetapan and is gone after it."""
    if days > 14: return 0.0
    return math.exp(-((days - peak_at) ** 2) / (2 * width ** 2))

def metrik_mingguan():
    rows = []
    for oid, nama, kota, profil, pmult, dup_base in FIX_OUTLETS:
        region = REGIONS[kota]
        for w in weeks():
            reg = regime_at(region, w)
            dtp = days_to_penetapan(region, w)
            if kota == "Makassar":
                base = {"ilham": 0.25, "danny1": 0.27, "pj": 0.08, "danny2": 0.29, "appi": 0.26}[reg["id"]]
                ramp = 0.24 * bump(dtp) if dtp is not None else 0
                # 2018: Danny's pair disqualified 2018-04-23 → agentive framing collapses until after the vote
                if d("2018-04-23") <= w < d("2018-07-15"): base = 0.13; ramp = 0
                pers = (base + ramp) * pmult
                dup = dup_base + (0.10 * bump(dtp) if profil == "kontrak" and dtp is not None else 0)
            else:  # Kupang: no regime structure assumed (spec: do not assume symmetry)
                pers = 0.22 * pmult; dup = dup_base
            pers = min(0.95, max(0.02, random.gauss(pers, 0.035)))
            dup = min(0.95, max(0.02, random.gauss(dup, 0.05)))
            n = max(3, int(random.gauss(38 if profil != "independen" else 22, 7)))
            rows.append({"outlet_id": oid, "kota": kota, "minggu": w.isoformat(), "jumlah_artikel": n,
                         "indeks_personalisasi": round(pers, 3), "bagian_duplikasi": round(dup, 3),
                         "hari_ke_penetapan": dtp, "regime_id": reg["id"] if reg else None, "fiktif": True,
                         **prov(f"https://{oid}/fixture/metrik/{w.isoformat()}")})
    return rows

# ---------------------------------------------------------------- events + coverage
PERISTIWA = [
    ("MKS-PRW-F01", "Makassar", "2016-03-14", "mobilisasi", "Unjuk rasa pedagang menolak relokasi pasar di depan Balai Kota", "Ujung Pandang", "Pemerintah Kota", "rekaman lapangan"),
    ("MKS-PRW-F02", "Makassar", "2017-11-06", "penindakan", "Inspektorat menerbitkan temuan atas belanja publikasi dinas", "", "Diskominfo (fiktif)", "dokumen lembaga"),
    ("MKS-PRW-F03", "Makassar", "2019-10-21", "pembatalan kebijakan", "Perwali tentang retribusi parkir dicabut setelah tiga bulan berlaku", "", "Pemerintah Kota", "perda atau perkada"),
    ("MKS-PRW-F04", "Makassar", "2020-08-17", "penindakan", "Ombudsman perwakilan menyatakan maladministrasi dalam penyaluran bantuan", "Tamalanrea", "Dinas Sosial (fiktif)", "dokumen lembaga"),
    ("MKS-PRW-F05", "Makassar", "2024-07-29", "mobilisasi", "Aksi warga menolak penggusuran bantaran kanal", "Tallo", "Pemerintah Kota", "rekaman lapangan"),
    ("MKS-PRW-F06", "Makassar", "2024-10-14", "penindakan", "Bawaslu meregistrasi laporan dugaan penyalahgunaan program kota untuk kampanye provinsi", "", "Wali Kota (fiktif)", "nomor perkara"),
    ("KPG-PRW-F01", "Kupang", "2023-05-08", "mobilisasi", "Unjuk rasa mahasiswa soal tarif air minum", "Kelapa Lima", "Pemerintah Kota", "rekaman lapangan"),
    ("KPG-PRW-F02", "Kupang", "2024-09-02", "penindakan", "Temuan BPK atas belanja jasa publikasi", "", "Diskominfo (fiktif)", "dokumen lembaga"),
]

def peristiwa():
    return [{"peristiwa_id": pid, "kota": kota, "tanggal": tgl, "jenis": jenis, "ringkasan_satu_kalimat": ring,
             "lokasi_kecamatan": kec, "aktor_sasaran": aktor, "bukti_independen_url": f"https://bukti.example/{pid}",
             "bukti_jenis": bj, "diisi_oleh": "fixture", "tanggal_isi": TODAY, "fiktif": True,
             **prov(f"https://bukti.example/{pid}")} for pid, kota, tgl, jenis, ring, kec, aktor, bj in PERISTIWA]

def liputan_peristiwa():
    rows = []
    for pid, kota, tgl, jenis, *_ in PERISTIWA:
        for oid, nama, okota, profil, *_ in FIX_OUTLETS:
            if okota != kota: continue
            # contracted outlets tend to stay silent on enforcement; independents cover fast
            p_cover = {"kontrak": 0.25, "campuran": 0.6, "independen": 0.95}[profil]
            if jenis == "mobilisasi": p_cover = min(1, p_cover + 0.25)
            covered = random.random() < p_cover
            lag = None if not covered else int(abs(random.gauss({"kontrak": 60, "campuran": 30, "independen": 6}[profil], 12)))
            n = 0 if not covered else max(1, int(random.gauss(3 if profil == "independen" else 1.5, 1)))
            rows.append({"peristiwa_id": pid, "outlet_id": oid, "covered": covered, "lag_jam": lag, "jumlah_artikel": n,
                         "fiktif": True, **prov(f"https://{oid}/fixture/liputan/{pid}")})
    return rows

# ---------------------------------------------------------------- contracts, officials, network
def kontrak_media():
    rows, k = [], 0
    for oid, nama, kota, profil, *_ in FIX_OUTLETS:
        if profil == "independen": continue
        for th in range(2019, 2026):
            k += 1
            nilai = int(random.gauss(380e6 if profil == "kontrak" else 120e6, 40e6) // 1e6 * 1e6)
            rows.append({"kontrak_id": f"{'MKS' if kota=='Makassar' else 'KPG'}-KTR-F{k:02d}", "outlet_id": oid, "kota": kota,
                         "instansi": f"Diskominfo Kota {kota}", "tahun": th, "nilai_rupiah": nilai,
                         "jenis_kontrak": "kerja sama tahunan" if profil == "kontrak" else "per rilis",
                         "sumber_url": f"https://lpse.example/{kota.lower()}/{th}/{oid}", "sumber_jenis": "LPSE",
                         "tingkat_keyakinan": "tinggi", "diisi_oleh": "fixture", "tanggal_isi": TODAY, "fiktif": True,
                         **prov(f"https://lpse.example/{kota.lower()}/{th}/{oid}")})
    return rows

def pejabat():
    real = [  # public facts: mayors of Makassar per the spec timeline. No LHKPN links asserted here.
        ("MKS-PJB-001", "Mohammad Ramdhan Pomanto", "Makassar", "Wali Kota", "Pemerintah Kota Makassar", "2014-05-08", "2019-05-08"),
        ("MKS-PJB-002", "Mohammad Ramdhan Pomanto", "Makassar", "Wali Kota", "Pemerintah Kota Makassar", "2021-02-26", "2025-02-20"),
        ("MKS-PJB-003", "Munafri Arifuddin", "Makassar", "Wali Kota", "Pemerintah Kota Makassar", "2025-02-20", ""),
    ]
    rows = [{"pejabat_id": pid, "nama_lengkap": nama, "gelar": "", "kota": kota, "jabatan": jab, "instansi": inst,
             "mulai_menjabat": m, "selesai_menjabat": s, "punya_lhkpn": "tidak diketahui", "lhkpn_url": "",
             "catatan": "fakta publik (masa jabatan) — tautan LHKPN menunggu Inan", "diisi_oleh": "Odri", "tanggal_isi": TODAY,
             "fiktif": False, **prov("https://makassarkota.go.id")} for pid, nama, kota, jab, inst, m, s in real]
    fake = [("MKS-PJB-F01", "Pejabat Fiktif Satu", "Kepala Dinas Contoh", "Dinas Contoh Kota Makassar"),
            ("MKS-PJB-F02", "Pejabat Fiktif Dua", "Sekretaris Daerah (fiktif)", "Sekretariat Daerah (fiktif)"),
            ("KPG-PJB-F01", "Pejabat Fiktif Tiga", "Kepala Dinas Contoh", "Dinas Contoh Kota Kupang")]
    for pid, nama, jab, inst in fake:
        rows.append({"pejabat_id": pid, "nama_lengkap": nama, "gelar": "", "kota": "Kupang" if pid.startswith("KPG") else "Makassar",
                     "jabatan": jab, "instansi": inst, "mulai_menjabat": "2021-03-01", "selesai_menjabat": "", "punya_lhkpn": "ya",
                     "lhkpn_url": f"https://elhkpn.example/{pid}", "catatan": "FIKTIF — hanya untuk fixture relasi/tender",
                     "diisi_oleh": "fixture", "tanggal_isi": TODAY, "fiktif": True, **prov(f"https://elhkpn.example/{pid}")})
    return rows

def perusahaan():
    return [{"perusahaan_id": pid, "nama_perusahaan": nama, "bentuk": "PT", "kota_terdaftar": kota, "direksi_komisaris": dk,
             "sumber_url": f"https://ahu.example/{pid}", "catatan": "FIKTIF", "diisi_oleh": "fixture", "tanggal_isi": TODAY,
             "fiktif": True, **prov(f"https://ahu.example/{pid}")}
            for pid, nama, kota, dk in [("MKS-PRS-F01", "PT Contoh Karya Losari", "Makassar", "Kerabat Fiktif A; Kerabat Fiktif B"),
                                        ("MKS-PRS-F02", "PT Contoh Media Pantai", "Makassar", "Kerabat Fiktif C"),
                                        ("KPG-PRS-F01", "PT Contoh Timor Jaya", "Kupang", "Kerabat Fiktif D")]]

def relasi():
    R = [("MKS-REL-F01", "MKS-PJB-F01", "Kerabat Fiktif A", "saudara", "MKS-PRS-F01", "LHKPN", "AHU", "terkonfirmasi"),
         ("MKS-REL-F02", "MKS-PJB-F02", "Kerabat Fiktif C", "ipar", "MKS-PRS-F02", "berita", "", "satu sumber"),
         ("KPG-REL-F01", "KPG-PJB-F01", "Kerabat Fiktif D", "anak", "KPG-PRS-F01", "", "", "dugaan")]
    return [{"relasi_id": rid, "pejabat_id": pj, "nama_pihak_terkait": nm, "jenis_hubungan": jh, "perusahaan_id": pr,
             "sumber_1_url": f"https://sumber.example/{rid}/1" if s1 else "", "sumber_1_jenis": s1,
             "sumber_2_url": f"https://sumber.example/{rid}/2" if s2 else "", "sumber_2_jenis": s2, "status": st,
             "catatan": "FIKTIF" + (" — alasan dugaan: nama muncul di berita tender, belum ada dokumen" if st == "dugaan" else ""),
             "diisi_oleh": "fixture", "tanggal_isi": TODAY, "fiktif": True, **prov(f"https://sumber.example/{rid}/1")}
            for rid, pj, nm, jh, pr, s1, s2, st in R]

def tender():
    T = [("MKS-TDR-F01", "Makassar", 2023, "Belanja Jasa Publikasi Program Kota (fiktif)", "Diskominfo Kota Makassar", "PT Contoh Karya Losari", "MKS-PRS-F01", 412000000),
         ("MKS-TDR-F02", "Makassar", 2024, "Belanja Publikasi dan Dokumentasi (fiktif)", "Diskominfo Kota Makassar", "PT Contoh Karya Losari", "MKS-PRS-F01", 455000000),
         ("MKS-TDR-F03", "Makassar", 2024, "Jasa Publikasi Media Daring (fiktif)", "Bappeda Kota Makassar", "PT Contoh Media Pantai", "MKS-PRS-F02", 98000000),
         ("KPG-TDR-F01", "Kupang", 2024, "Belanja Jasa Publikasi (fiktif)", "Diskominfo Kota Kupang", "PT Contoh Timor Jaya", "KPG-PRS-F01", 150000000)]
    return [{"tender_id": tid, "kota": kota, "tahun": th, "nama_paket": nm, "instansi_pengguna": inst, "pemenang_nama": win,
             "perusahaan_id": pid, "nilai_rupiah": nilai, "sumber_url": f"https://lpse.example/{tid}", "diisi_oleh": "fixture",
             "tanggal_isi": TODAY, "fiktif": True, **prov(f"https://lpse.example/{tid}")} for tid, kota, th, nm, inst, win, pid, nilai in T]

def info_a1():
    A = [("MKS-A1-F01", "Makassar", "2026-09-05", "wartawan lokal", "Sebagian outlet kecil dibayar per rilis, bukan kontrak tahunan", "sedang", "tidak", "belum"),
         ("MKS-A1-F02", "Makassar", "2026-09-06", "mantan staf kelurahan", "Daftar penerima bantuan disusun ulang menjelang penetapan calon 2024", "rendah", "tidak", "sedang dicek"),
         ("KPG-A1-F01", "Kupang", "2026-09-07", "aktivis", "Diskominfo mengundang outlet tertentu saja ke peliputan program", "sedang", "ya", "belum")]
    return [{"a1_id": a, "kota": k, "tanggal_info": t, "peran_narasumber": p, "ringkasan": r, "tingkat_keyakinan": tk,
             "boleh_dikutip": bd, "status_verifikasi": sv, "diisi_oleh": "fixture", "tanggal_isi": TODAY, "fiktif": True,
             "source_url": "", "archive_url": "", "retrieved_at": t, "first_seen": NOW, "last_checked": NOW}
            for a, k, t, p, r, tk, bd, sv in A]

def artikel():
    """A small annotated sample to exercise the personalization rules. Fictional text on .example outlets."""
    S = [("harian-losari.example", "2024-08-12", "Bantuan dari Bapak Wali Kota tiba di Tallo", "Bantuan sembako dari Bapak Wali Kota Danny Pomanto tiba di Kecamatan Tallo, Senin. Wali Kota berpesan agar warga menjaga kebersihan.", "Tallo"),
         ("kabar-pelabuhan.example", "2024-08-12", "Dinas Sosial salurkan sembako di Tallo", "Program bantuan Dinas Sosial Kota Makassar menyalurkan sembako kepada 200 keluarga di Kecamatan Tallo.", "Tallo"),
         ("suara-tamalanrea.example", "2020-08-03", "Pj Wali Kota tinjau posko bantuan", "Pj Wali Kota meninjau posko bantuan Dinas Sosial di Tamalanrea. Penyaluran dilakukan oleh petugas dinas.", "Tamalanrea"),
         ("harian-losari.example", "2016-02-15", "Danny resmikan lorong garden di Rappocini", "Wali Kota Makassar Danny Pomanto meresmikan lorong garden yang dibangun atas inisiatifnya di Rappocini.", "Rappocini"),
         ("sulsel-kini.example", "2019-11-04", "Pemkot cabut perwali retribusi parkir", "Pemerintah Kota Makassar mencabut peraturan wali kota tentang retribusi parkir setelah tiga bulan berlaku.", "")]
    rows = []
    for i, (oid, tgl, judul, teks, kec) in enumerate(S, 1):
        rows.append({"artikel_id": f"ART-F{i:03d}", "outlet_id": oid, "url": f"https://{oid}/{tgl.replace('-', '/')}/artikel-{i}",
                     "judul": judul, "tanggal_terbit": tgl, "teks": teks, "hash_shingle": hashlib.sha1(teks.encode()).hexdigest()[:16],
                     "kecamatan": kec, "sumber_koleksi": "fixture", "fiktif": True, **prov(f"https://{oid}/{tgl.replace('-', '/')}/artikel-{i}")})
    return rows

def outlet_domain_history():
    H = [("rakyatsulsel.co", "rakyatsulsel.com", None, None, "Wayback 2014–2017 hanya di domain lama"),
         ("makassar.antaranews.com", "antarasulsel.com", None, None, "kedua domain terarsip 2014–2017"),
         ("makassar.terkini.id", "terkini.id", None, None, "domain induk terarsip sejak 2015"),
         ("makassar.tribunnews.com", "tribun-timur.com", None, None, "domain lama; tidak ada arsip 2014–2017")]
    return [{"outlet_id": o, "domain": dm, "berlaku_dari": a, "berlaku_sampai": b, "catatan": c, "fiktif": False,
             **prov("archive-recall/results-2026-09-09.json")} for o, dm, a, b, c in H]

def peristiwa_penghapusan():
    P = [("gosulsel.com", "https://gosulsel.com", "2017-12-31", "2025-01-06", "situs", "pos aktif mulai 2025-01-06 (3 911 pos); Wayback 2016–2017 >10 000 halaman"),
         ("kabarmakassar.com", "https://kabarmakassar.com", "2017-10-01", None, "situs", "pos aktif sebelum 2017 nyaris nol (1/1/0/108) meski Wayback ada"),
         ("fajar.co.id", "https://fajar.co.id", "2017-03-21", None, "situs", "pos aktif mulai 2017-03-22; Wayback 2014–2016 ada")]
    return [{"outlet_id": o, "url": u, "terakhir_terlihat": a, "pertama_hilang": b, "jenis": j, "catatan": c, "fiktif": False,
             **prov("archive-recall/results-2026-09-09.json")} for o, u, a, b, j, c in P]

# ---------------------------------------------------------------- write
def write(name, rows, columns):
    DATA.mkdir(exist_ok=True); CSV.mkdir(exist_ok=True)
    cols = [c for c in columns if c in (rows[0] if rows else {})]
    extra = [c for c in (rows[0] if rows else {}) if c not in cols]
    cols += extra
    jp = DATA / f"{name}.json"; jp.write_text(json.dumps(rows, ensure_ascii=False, indent=0) + "\n")
    with open(CSV / f"{name}.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols); w.writeheader(); w.writerows(rows)
    return {"table": name, "rows": len(rows), "columns": cols, "sha256": hashlib.sha256(jp.read_bytes()).hexdigest()[:16],
            "fixture_rows": sum(1 for r in rows if r.get("fiktif"))}

def main():
    tables = {
        "outlet": outlets(), "kontrak_media": kontrak_media(), "pejabat": pejabat(), "perusahaan": perusahaan(),
        "relasi": relasi(), "tender": tender(), "peristiwa": peristiwa(), "info_a1": info_a1(),
        "artikel": artikel(), "metrik_mingguan": metrik_mingguan(), "liputan_peristiwa": liputan_peristiwa(),
        "outlet_domain_history": outlet_domain_history(), "peristiwa_penghapusan": peristiwa_penghapusan(),
    }
    manifest = {"version": VERSION, "generated_at": NOW, "fixture": True,
                "publisher": "EPPOS GROUP DPP UGM", "window": list(WINDOW),
                "note": "DATA FIKTIF untuk membangun situs. Outlet nyata hanya membawa fakta publik; semua angka rekaan menempel pada domain .example.",
                "tables": []}
    for name, rows in tables.items():
        cols = INTAKE_SHEETS.get(name) or PIPELINE_TABLES[name]
        manifest["tables"].append(write(name, rows, list(cols) + PROVENANCE))
    (DATA / "regime.json").write_text(json.dumps(REGIONS, ensure_ascii=False, indent=1) + "\n")
    (DATA / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + "\n")
    for t in manifest["tables"]: print(f"{t['table']:24s} {t['rows']:6d} rows  ({t['fixture_rows']} fixture)")

if __name__ == "__main__":
    main()
