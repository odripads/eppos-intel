"""Schema contract for the EPPOS media layer.

Sheet names, column headers and dropdown lists are copied verbatim from
`eppos-media-intake.xlsx`. They are the contract with the hand-collection team.
Never rename them here without changing the workbook, and vice versa.
"""
from __future__ import annotations

INTAKE_SHEETS: dict[str, list[str]] = {
    "outlet": ["outlet_id", "nama_outlet", "kota", "jenis", "dewan_pers", "pemilik_terdaftar",
               "sumber_kepemilikan_url", "url_beranda", "aktif", "catatan", "diisi_oleh", "tanggal_isi"],
    "kontrak_media": ["kontrak_id", "outlet_id", "kota", "instansi", "tahun", "nilai_rupiah", "jenis_kontrak",
                      "sumber_url", "sumber_jenis", "tingkat_keyakinan", "diisi_oleh", "tanggal_isi"],
    "pejabat": ["pejabat_id", "nama_lengkap", "gelar", "kota", "jabatan", "instansi", "mulai_menjabat",
                "selesai_menjabat", "punya_lhkpn", "lhkpn_url", "catatan", "diisi_oleh", "tanggal_isi"],
    "perusahaan": ["perusahaan_id", "nama_perusahaan", "bentuk", "kota_terdaftar", "direksi_komisaris",
                   "sumber_url", "catatan", "diisi_oleh", "tanggal_isi"],
    "relasi": ["relasi_id", "pejabat_id", "nama_pihak_terkait", "jenis_hubungan", "perusahaan_id",
               "sumber_1_url", "sumber_1_jenis", "sumber_2_url", "sumber_2_jenis", "status", "catatan",
               "diisi_oleh", "tanggal_isi"],
    "tender": ["tender_id", "kota", "tahun", "nama_paket", "instansi_pengguna", "pemenang_nama",
               "perusahaan_id", "nilai_rupiah", "sumber_url", "diisi_oleh", "tanggal_isi"],
    "peristiwa": ["peristiwa_id", "kota", "tanggal", "jenis", "ringkasan_satu_kalimat", "lokasi_kecamatan",
                  "aktor_sasaran", "bukti_independen_url", "bukti_jenis", "diisi_oleh", "tanggal_isi"],
    "info_a1": ["a1_id", "kota", "tanggal_info", "peran_narasumber", "ringkasan", "tingkat_keyakinan",
                "boleh_dikutip", "status_verifikasi", "diisi_oleh", "tanggal_isi"],
}

# Dropdown lists, exactly as the workbook's data validation defines them.
DROPDOWNS: dict[tuple[str, str], list[str]] = {
    ("outlet", "kota"): ["Makassar", "Kupang"],
    ("outlet", "jenis"): ["online", "cetak", "tv", "radio"],
    ("outlet", "dewan_pers"): ["terverifikasi", "terdaftar", "belum", "tidak diketahui"],
    ("outlet", "aktif"): ["ya", "tidak", "tidak diketahui"],
    ("kontrak_media", "kota"): ["Makassar", "Kupang"],
    ("kontrak_media", "jenis_kontrak"): ["kerja sama tahunan", "per rilis", "e-katalog", "tidak diketahui"],
    ("kontrak_media", "sumber_jenis"): ["LPSE", "SIRUP", "e-katalog", "berita", "KIP", "lainnya"],
    ("kontrak_media", "tingkat_keyakinan"): ["tinggi", "sedang", "rendah"],
    ("pejabat", "kota"): ["Makassar", "Kupang"],
    ("pejabat", "punya_lhkpn"): ["ya", "tidak", "tidak diketahui"],
    ("perusahaan", "bentuk"): ["PT", "CV", "UD", "Yayasan", "lainnya"],
    ("relasi", "jenis_hubungan"): ["istri", "suami", "anak", "saudara", "ipar", "menantu", "lainnya"],
    ("relasi", "sumber_1_jenis"): ["LHKPN", "AHU", "berita", "dokumen resmi", "lainnya"],
    ("relasi", "sumber_2_jenis"): ["LHKPN", "AHU", "berita", "dokumen resmi", "lainnya"],
    ("relasi", "status"): ["terkonfirmasi", "satu sumber", "dugaan"],
    ("tender", "kota"): ["Makassar", "Kupang"],
    ("peristiwa", "kota"): ["Makassar", "Kupang"],
    ("peristiwa", "jenis"): ["mobilisasi", "penindakan", "pembatalan kebijakan"],
    ("peristiwa", "bukti_jenis"): ["nomor perkara", "perda atau perkada", "dokumen lembaga", "rekaman lapangan"],
    ("info_a1", "kota"): ["Makassar", "Kupang"],
    ("info_a1", "tingkat_keyakinan"): ["tinggi", "sedang", "rendah"],
    ("info_a1", "boleh_dikutip"): ["ya", "tidak"],
    ("info_a1", "status_verifikasi"): ["belum", "sedang dicek", "terverifikasi", "gugur"],
}

# The column that carries a row's source link. A row without it is rejected, never repaired.
SOURCE_URL_COLUMN: dict[str, str | None] = {
    "outlet": "url_beranda",
    "kontrak_media": "sumber_url",
    "pejabat": "lhkpn_url",          # required only when punya_lhkpn == "ya"; see validate_intake
    "perusahaan": "sumber_url",
    "relasi": "sumber_1_url",
    "tender": "sumber_url",
    "peristiwa": "bukti_independen_url",
    "info_a1": None,                 # field information; no URL by design, never enters an index
}

PRIMARY_KEY: dict[str, str] = {
    "outlet": "outlet_id", "kontrak_media": "kontrak_id", "pejabat": "pejabat_id",
    "perusahaan": "perusahaan_id", "relasi": "relasi_id", "tender": "tender_id",
    "peristiwa": "peristiwa_id", "info_a1": "a1_id",
}

FOREIGN_KEYS: list[tuple[str, str, str]] = [  # (sheet, column, target sheet)
    ("kontrak_media", "outlet_id", "outlet"),
    ("relasi", "pejabat_id", "pejabat"),
    ("relasi", "perusahaan_id", "perusahaan"),
    ("tender", "perusahaan_id", "perusahaan"),
]

DATE_COLUMNS: dict[str, list[str]] = {
    "outlet": ["tanggal_isi"], "kontrak_media": ["tanggal_isi"],
    "pejabat": ["mulai_menjabat", "selesai_menjabat", "tanggal_isi"],
    "perusahaan": ["tanggal_isi"], "relasi": ["tanggal_isi"], "tender": ["tanggal_isi"],
    "peristiwa": ["tanggal", "tanggal_isi"], "info_a1": ["tanggal_info", "tanggal_isi"],
}
MONEY_COLUMNS: dict[str, list[str]] = {"kontrak_media": ["nilai_rupiah"], "tender": ["nilai_rupiah"]}
YEAR_COLUMNS: dict[str, list[str]] = {"kontrak_media": ["tahun"], "tender": ["tahun"]}

# Provenance columns carried by every published row, intake and pipeline alike.
PROVENANCE = ["source_url", "archive_url", "retrieved_at", "first_seen", "last_checked"]

# Pipeline-generated tables (spec §Data model) plus two the recall test showed we need.
PIPELINE_TABLES: dict[str, list[str]] = {
    "artikel": ["artikel_id", "outlet_id", "url", "judul", "tanggal_terbit", "teks", "hash_shingle", "kecamatan",
                "sumber_koleksi"],  # sumber_koleksi: wp_json | sitemap | wayback
    "metrik_mingguan": ["outlet_id", "kota", "minggu", "jumlah_artikel", "indeks_personalisasi",
                        "bagian_duplikasi", "hari_ke_penetapan"],
    "liputan_peristiwa": ["peristiwa_id", "outlet_id", "covered", "lag_jam", "jumlah_artikel"],
    "outlet_domain_history": ["outlet_id", "domain", "berlaku_dari", "berlaku_sampai"],
    "peristiwa_penghapusan": ["outlet_id", "url", "terakhir_terlihat", "pertama_hilang", "jenis"],  # jenis: artikel | situs
}

BARE_DOMAIN_RE = r"^(?!www\.)[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$"
ISO_DATE_RE = r"^\d{4}-\d{2}-\d{2}$"
