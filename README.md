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

### Dua jalur penelusuran

| Jalur | Sumber | Batas | Hasil |
|---|---|---|---|
| `crawl_outlets.py` | arsip WordPress tiap outlet (`scripts/outlet_wp.json`) | tidak ada kuota bersama | URL, tanggal, dan judul asli langsung |
| `crawl_candidates.py` | Google News RSS | dibatasi per IP, ±25 kueri/hari | tautan perlu diselesaikan `resolve_urls.py` |

Jalur arsip outlet jauh lebih produktif dan dijalankan lebih dulu. Jalur Google News tetap dipakai
karena jangkauannya nasional, sedangkan registri outlet baru mencakup sebagian provinsi.

### Redaksi `pelaku_nama`

`scripts/redact_workbook.py` menjaga aturan spek sendiri: nama pelaku hanya terbit pada baris
`dua sumber` **dan** `masuk`. Baris lain dikosongkan namanya di salinan repo; berkas kerja lengkap
disimpan di luar repo (`~/Documents/EPPOS-master/`). Laporan: `data/redaksi_pelaku_nama.json`.
Tidak ada kerugian analitis: `pelaku_nama` tidak pernah masuk ke `data/*.json`, peta, atau indeks mana pun.

### Lapisan penelusuran otomatis

`scripts/promote_candidates.py` mengubah antrean penelusuran menjadi `data/insiden_otomatis.json`,
lapisan terpisah di peta (segitiga emas). Sensus yang dikurasi tangan di `insiden.json` tidak disentuh.

Yang **diturunkan**: URL, domain outlet, judul asli (dari API outlet sendiri), tanggal terbit,
mekanisme (dari kelompok kata kunci kueri), dan kab/kota bila namanya muncul harfiah di judul.
Yang **dibiarkan kosong**: tanggal kejadian, pelaku, sasaran, ringkasan, hasil — tidak bisa
disimpulkan dari judul, dan spek melarang mengisi nilai dengan tebakan.

`status_verifikasi` dihitung, bukan diklaim: dua outlet berbeda yang memberitakan tempat dan mekanisme
sama dalam 7 hari dihitung `dua sumber`; selebihnya `satu sumber`.

Bila judul tidak menyebut tempat, titik jatuh ke centroid provinsi wilayah edar outlet dan ditandai
`lokasi_dasar = "wilayah edar outlet"` supaya tidak terbaca sebagai insiden yang sudah terlokalisasi.

### Registri outlet dan penyaringannya

`scripts/outlet_wp.json` (65 outlet) adalah kerangka sampel jalur arsip. Domain masuk registri hanya
setelah judul-judul terbarunya dilihat dan terbaca sebagai jurnalisme lokal Indonesia.

`scripts/outlet_ditolak.json` mencatat yang ditolak beserta alasannya — 19 domain, antara lain domain
yang dibajak jadi iklan kasino, pabrik konten SEO wisata dan lirik lagu, instalasi WordPress kosong,
dan satu situs berbahasa Portugis tentang Angola. Penolakan dicatat, bukan dihapus diam-diam: kosong
karena tidak ada dan kosong karena disaring adalah dua hal berbeda.

**Bias kerangka yang harus diakui.** Dari ±1 400 domain yang diuji, hanya puluhan yang membuka
`wp-json` atau `?rest_route=`. Media nasional besar hampir semuanya menutupnya, jadi registri ini
condong ke koran daerah. Sebaran temuan otomatis mengikuti bias itu, bukan sebaran kejadian.
Daftar resmi Dewan Pers akan lebih tepat sebagai kerangka, tetapi portalnya (`datapers.dewanpers.or.id`)
berada di balik login sehingga belum bisa dipakai otomatis.

### Saringan lingkup elektoral

Pemeriksaan sampel menunjukkan saringan lama (aktor + tindakan) meloloskan banyak berita yang bukan
objek studi: jumlah kasus COVID, perselingkuhan kades, penggelapan, kebakaran hutan. Perselingkuhan
bahkan eksplisit di luar lingkup menurut spek.

`dalam_lingkup()` di `promote_candidates.py` kini mensyaratkan konteks elektoral di judul (pilkada,
paslon, Bawaslu, netralitas, kampanye, KPU, dan sejenisnya) dan menolak topik di luar lingkup.
Dari 1 632 baris, **909 disisihkan** dan tercatat di `data/otomatis_diluar_lingkup.json` — disimpan,
bukan dibuang, supaya keputusannya bisa ditinjau ulang.

Ini menukar sebagian recall demi presisi. Beberapa baris yang relevan ikut tersisih karena judulnya
tidak menyebut konteks elektoral (mis. mutasi massal ASN tanpa kata "pilkada"). Untuk proyek yang
menyajikan tiap titik sebagai dugaan intervensi, positif palsu lebih mahal daripada temuan yang luput.
