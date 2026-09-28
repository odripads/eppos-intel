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

## Rutin harian

`scripts/rutin_harian.sh` (launchd `id.eppos.rutin`, setiap hari 09:30) menjalankan:

1. `crawl_candidates.py --cells 25` — satu petak grid penelusuran, masuk ke `data/kandidat.json`
2. `resolve_urls.py --max 25` — menyelesaikan tautan Google News menjadi URL asli, bertahap
3. `verify_titles.py` — mengambil judul asli halaman sumber
4. `build_data.py` + `build_bundle.py` — membangun ulang data dan situs

Grid penelusuran = gelombang pilkada × mekanisme (tipologi tertutup) × provinsi, 2 340 petak.
Urutannya sengaja: sapuan nasional dulu, lalu provinsi dengan catatan paling sedikit — mencari paling
keras justru di tempat persnya paling tipis, supaya hasilnya tidak sekadar memetakan kepadatan pers.

**Kandidat tidak pernah masuk peta secara otomatis.** Semuanya berhenti di `tinjau.html` sampai
dikurasi dan dipindahkan ke `eppos-media-intake.xlsx`. Aturan dua sumber dan `status_kurasi` tetap
keputusan manusia.

Batas laju: Google News membatasi per IP. 25 petak/hari dengan jeda 12 detik aman; sapuan besar
dalam satu waktu akan diblokir sementara. Petak yang gagal tidak ditandai selesai, jadi diulang besok.

Lokal: `python3 -m http.server 8765` di akar repo, lalu buka `http://localhost:8765/`.
