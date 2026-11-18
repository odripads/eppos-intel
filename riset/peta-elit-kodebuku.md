# Kodebuku orbit elit (DRAF LOKAL, jangan terbit, jangan commit)

Draf 18 November 2026 untuk dibahas Odri, Arya, dan tim. Tipe orbit dari panggilan dengan Mas Arya. **Belum ada aktor
yang diberi orbit.** Kodebuku ini hanya menjelaskan sinyal yang bisa diamati, supaya dua pengode bisa menilai baris
`data/peta_elit.json` dengan cara yang sama. Siapa yang mengode, satuan penilaian (per pernyataan atau aktor-per-bulan),
dan cara menengahi beda penilaian belum diputuskan.

## Aturan umum
1. Kode dari baris fakta yang ada (kutipan, tanggal, sumber), bukan dari kesan, survei, atau komentar pengamat.
2. Komentar pengamat dan tafsir media boleh menjadi petunjuk mencari sumber, tidak boleh menjadi bukti orbit.
3. Satu aktor bisa berpindah orbit dari waktu ke waktu. Simpan tanggal penilaian; jangan menimpa penilaian lama.
4. Bedakan tiga keadaan: **tidak ditemukan** (pencarian belum menjangkau), **eksplisit belum memutuskan** (ada kutipan),
   **akses terblokir** (sumber tak bisa dibuka). Ketiganya bukan bukti "netral".
5. Dukungan pada *pemerintahan berjalan* sampai 2029 berbeda dengan dukungan *pencalonan* 2029.

## (a) Sangat pro-petahana
- Sinyal: menyatakan mendukung Prabowo sebagai capres 2029; menyerahkan pilihan cawapres kepada Prabowo; keputusan
  forum resmi partai (Rapimnas, Rakernas, Majelis Syuro) yang menyebut pencalonan Prabowo.
- Bukan sinyal: hanya mendukung pemerintahan "sukses hingga 2029"; hadir di acara bersama Presiden.
- Contoh baris: ELIT-0010 (Golkar, "kami sudah punya calon namanya Pak Prabowo"); ELIT-0015 dan ELIT-0016 (PAN,
  dukung Prabowo dan menyerahkan cawapres kepada capres); ELIT-0014 (PKB, "100 persen atau bahkan 1.000 persen").

## (b) Mencari jalan alternatif untuk dirinya sendiri
- Sinyal: target jabatan presiden atau wakil presiden bagi tokoh sendiri; pidato tentang batas atau giliran kekuasaan
  yang dibaca pihak lain sebagai sinyal pencalonan *dan* ditanggapi terbuka oleh mitra koalisi; membangun poros dengan
  partai lain di luar koalisi pengusung Prabowo.
- Perhatian: sinyal ini sering hidup berdampingan dengan dukungan pada Prabowo (lihat PKB: ELIT-0001 dan ELIT-0003 pada
  hari yang sama). Aturan untuk aktor dengan dua sinyal yang tampak bertentangan perlu diputuskan tim.
- Bantahan resmi (ELIT-0006) dicatat, tidak menghapus sinyal lain; tim memutuskan bobotnya.
- Contoh baris: ELIT-0003 (PKB, target Muhaimin presiden atau wakil presiden); ELIT-0004 (pidato AHY, normatif, tanpa
  nama); ELIT-0005 (tanggapan Golkar yang membaca pidato AHY sebagai sinyal).

## (c) Mencari jalan alternatif lewat orang lain
- Sinyal: mendorong atau tidak membantah pasangan yang melibatkan tokoh di luar partai sendiri (misalnya isu duet
  Dedi Mulyadi–Gibran); pernyataan tokoh berpengaruh yang mengarahkan dukungan kepada figur lain.
- Bukan sinyal: senyum, tawa, atau "Hehe" tanpa pernyataan (kasus Jokowi 27 September; tidak ada baris).
- Contoh baris: ELIT-0009 (Dedi Mulyadi menepis isu duet). Bukti pendorong dari pihak lain **belum ditemukan**.

## (d) PDIP / Pramono
- Sinyal: PDIP menyebut Pramono dalam konteks kepemimpinan nasional; Gerindra membuka pintu koalisi dengan PDIP;
  pujian timbal balik Prabowo–Pramono yang ditanggapi partai.
- Bukan sinyal: kerja sama dinas Presiden–Gubernur yang ditegaskan "tidak ada agenda politik".
- Contoh baris: ELIT-0008 (PDIP: "Pilpres masih jauh, kita kerja dulu", lalu memuji Pramono); ELIT-0007 (Gerindra
  membuka peluang Pilpres bersama PDIP).

## (e) Belum terlihat
- Gunakan hanya bila ada kutipan "belum membahas" atau "menunggu" (ELIT-0012 Demokrat, ELIT-0013 NasDem, ELIT-0017
  PKS), atau bila pencarian yang terdokumentasi tidak menemukan apa pun. Catat jenisnya (eksplisit atau tidak ditemukan).
- Belum ditelusuri khusus: Hanura, Perindo, PPP, Gelora (kueri awal tanpa hasil); Buruh, Ummat, PBB, Garuda (belum).

## Pertanyaan terbuka untuk tim
1. Siapa pengode dan penengah? Perlu dua pengode independen dan ukuran kesepakatan?
2. Satuan: per pernyataan atau aktor-per-bulan? Bolehkah satu aktor dua orbit sekaligus?
3. Apakah target "presiden atau wakil presiden" dimasukkan (b), atau kategori sendiri?
4. Boleh tidak AI menyarankan potongan teks untuk dinilai manusia? (Aturan proyek saat ini: AI tidak mengklasifikasi.)

## Titik patah 3 November 2026 dan hipotesis "menjaga jarak dari istana" (ditambahkan 18 Nov, arahan Odri)

Konteks bersumber (lihat data/peta_elit_peristiwa.json): 3 Nov Listyo Sigit Prabowo tersangka penyadapan terhadap
Presiden (dugaan makar diselidiki terpisah); 9 Nov tiga kader PSI di kabinet keluar dari partai; 11–12 Nov Gibran
mengundurkan diri sesudah MA (30 Okt) membatalkan surat penyetaraan ijazahnya; kursi wapres kosong, MPR bersidang
9 Des, dua nama dari Presiden paling lambat sekitar 25 Nov.

Pertanyaan Odri: mengapa partai koalisi tidak mengajukan kader sendiri untuk kursi wapres, tetapi menyerahkan ke
Presiden atau menyebut kader Gerindra (Dasco, Muzani, Sugiono)? Apakah ini persiapan 2029, atau menjaga jarak dari
lingkar istana supaya leluasa bergerak menjelang 2029?

**Status: hipotesis, bukan temuan.** Tidak ditampilkan di situs. Sinyal yang bisa diamati dari baris data:

| Sinyal | Mendukung "menjaga jarak" | Melemahkan |
|---|---|---|
| Alasan tidak mengajukan kader | alasan yang menyebut 2029, kemandirian, atau peran di luar istana (contoh: PDIP "penyeimbang di luar kekuasaan") | alasan prosedural saja (Pasal 8 ayat 2, hak prerogatif) atau kesepakatan koalisi (PAN: wapres dari Gerindra) |
| Keinginan internal yang ditahan | ada keinginan mengajukan kader lalu ditahan tanpa alasan koalisi | ditahan "demi kekompakan koalisi" (Golkar, Idrus Marham 15 Nov) |
| Dukungan terbuka ke kader Gerindra | — | elit partai sendiri menyebut Dasco (Golkar, NasDem, PDIP, Gerindra; 15–16 Nov) |
| Pernyataan 2029 sesudah 3 Nov | partai menyebut target atau calon 2029 sendiri | menegaskan ulang dukungan Prabowo 2029 sesudah 3 Nov (belum ditemukan per 18 Nov) |
| Jarak dari Jokowi | kritik terbuka pada Jokowi/Gibran sesudah 3 Nov | membela atau diam |

Catatan pembacaan awal (18 Nov, belum dikode): pada 13–17 Nov hampir semua partai DPR menyatakan tidak mengusulkan
nama, dengan alasan berbeda (konstitusi: Demokrat, NasDem, PKB; kesepakatan koalisi: PAN; posisi penyeimbang: PDIP;
hak partai pengusung 2024: PKS). Pada 15–16 Nov elit dari beberapa partai menyebut Dasco secara terbuka. Belum ada
pernyataan 2029 sesudah 3 Nov dari partai DPR mana pun dalam data. Ini menjadi bahan uji, bukan kesimpulan.

Yang perlu diputuskan tim: (1) unit penilaian (partai-per-minggu?); (2) siapa pengode; (3) apakah "diam soal 2029
sesudah 3 Nov" dihitung sebagai sinyal, mengingat jendela baru dua minggu.
