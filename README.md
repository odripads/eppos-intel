# EPPOS Electoral Intelligence — lapisan media

Sensus insiden intimidasi dan paksaan oleh eksekutif petahana untuk keuntungan elektoral, se-Indonesia.
EPPOS GROUP, Departemen Politik dan Pemerintahan UGM. Spesifikasi: `PROJECT-SPEC.md` (v2, 10 Sep 2026).

Insiden disajikan sebagai **dilaporkan media**, dengan tautan sumber, bukan sebagai temuan yang diadili.

## Alur data

```
eppos-media-intake.xlsx  ──(scripts/build_data.py)──►  data/*.json  ──(fetch)──►  index.html
                          scripts/verify_titles.py  ──►  data/judul_terverifikasi.json (digabung saat build)
```

- Browser tidak pernah membaca xlsx. `data/` adalah rilis dataset berversi (`data/manifest.json`).
- Baris tanpa tautan sumber ditolak saat build dan dicatat di `data/validasi.json`.
- Koordinat: `data/koordinat.json`, kunci `"provinsi|kab_kota"`, centroid dari Wikidata (P625); yang tidak terpetakan ada di `data/koordinat_gagal.json`.
- Judul berita: `judul_status = dari URL` sampai `verify_titles.py` mengambil `<title>` aslinya.

## Perintah

```bash
python3 scripts/build_data.py            # xlsx → data/*.json
python3 scripts/verify_titles.py         # ambil judul asli, sekali per URL
```

`legacy-v1/` menyimpan situs dan pipeline spek v1 (studi dua kota) untuk arsip. `design/eppos-mockup.html` adalah acuan desain.
