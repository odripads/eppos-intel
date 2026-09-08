"""Regime timelines and time anchors. Public facts; the x-axis of every chart hangs on these.

Makassar is from PROJECT-SPEC.md. Kupang is a DRAFT awaiting Ravy's verified list (brief item 3);
every Kupang entry carries verified=False and the site labels it as such.
"""
MAKASSAR = {
    "region_id": "ID-7371", "kota": "Makassar", "provinsi": "Sulawesi Selatan",
    "lat": -5.1477, "lon": 119.4327, "verified": True,
    "regimes": [
        {"id": "ilham", "label": "Ilham Arief Sirajuddin (akhir periode II)", "mulai": "2009-05-08", "selesai": "2014-05-08",
         "jenis": "incumbent", "keterangan": "wali kota terpilih, periode kedua; hanya Jan–Mei 2014 masuk jendela"},
        {"id": "danny1", "label": "Danny Pomanto I", "mulai": "2014-05-08", "selesai": "2019-05-08",
         "jenis": "incumbent", "keterangan": "wali kota terpilih"},
        {"id": "pj", "label": "Pj / Plt", "mulai": "2019-05-08", "selesai": "2021-02-26",
         "jenis": "null", "keterangan": "kondisi nol — penjabat tanpa insentif elektoral"},
        {"id": "danny2", "label": "Danny Pomanto II", "mulai": "2021-02-26", "selesai": "2025-02-20",
         "jenis": "incumbent", "keterangan": "wali kota terpilih"},
        {"id": "appi", "label": "Munafri “Appi” Arifuddin", "mulai": "2025-02-20", "selesai": None,
         "jenis": "incumbent", "keterangan": "wali kota terpilih"},
    ],
    "anchors": [
        {"tanggal": "2018-02-12", "label": "penetapan calon 2018", "jenis": "penetapan", "approx": True},
        {"tanggal": "2018-04-23", "label": "pasangan Danny didiskualifikasi (PT TUN, dikuatkan MA)", "jenis": "putusan", "approx": False},
        {"tanggal": "2018-06-27", "label": "kotak kosong menang", "jenis": "pemungutan", "approx": False},
        {"tanggal": "2020-09-23", "label": "penetapan calon 2020", "jenis": "penetapan", "approx": True},
        {"tanggal": "2020-12-09", "label": "pemungutan suara 2020", "jenis": "pemungutan", "approx": False},
        {"tanggal": "2024-09-22", "label": "penetapan calon 2024", "jenis": "penetapan", "approx": True},
        {"tanggal": "2024-11-27", "label": "pemungutan suara 2024 (Danny calon gubernur)", "jenis": "pemungutan", "approx": False},
    ],
    "penetapan": ["2018-02-12", "2020-09-23", "2024-09-22"],
}

KUPANG = {
    "region_id": "ID-5371", "kota": "Kupang", "provinsi": "Nusa Tenggara Timur",
    "lat": -10.1772, "lon": 123.6070, "verified": False,
    "regimes": [
        {"id": "jonas", "label": "Jonas Salean", "mulai": "2012-08-01", "selesai": "2017-08-22",
         "jenis": "incumbent", "keterangan": "DRAFT — tanggal belum diverifikasi"},
        {"id": "jefri", "label": "Jefri Riwu Kore", "mulai": "2017-08-22", "selesai": "2022-08-22",
         "jenis": "incumbent", "keterangan": "DRAFT — tanggal belum diverifikasi"},
        {"id": "pj", "label": "Pj", "mulai": "2022-08-22", "selesai": "2025-02-20",
         "jenis": "null", "keterangan": "DRAFT — nama dan tanggal Pj belum diverifikasi; jangan asumsikan simetri dengan Makassar"},
        {"id": "christian", "label": "Christian Widodo", "mulai": "2025-02-20", "selesai": None,
         "jenis": "incumbent", "keterangan": "DRAFT — tanggal belum diverifikasi"},
    ],
    "anchors": [],
    "penetapan": [],
}

REGIONS = {"Makassar": MAKASSAR, "Kupang": KUPANG}
WINDOW = ("2014-01-01", "2025-12-31")
