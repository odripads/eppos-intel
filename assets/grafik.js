/* EPPOS Political Outlook: gambar bersama. Semua mengembalikan string, supaya halaman web dan pelat presentasi
   memakai gambar yang persis sama: format statis dan interaktif tidak boleh bercerita berbeda. */
(function (E) {
  "use strict";
  var esc = E.esc, f = E.f;

  /* fakta kalender. Tanggal pemungutan suara, bukan tahapan. Yang masih rencana ditandai `rencana`. */
  var LAJUR = [
    { t: "Pemilu legislatif", titik: [[2009.27, "9 Apr"], [2014.27, "9 Apr"], [2019.29, "17 Apr"], [2024.12, "14 Feb"], [2029.2, "2029", 1]] },
    { t: "Pemilu presiden", titik: [[2009.52, "8 Jul"], [2014.52, "9 Jul"], [2019.29, "17 Apr"], [2024.12, "14 Feb"], [2029.2, "2029", 1]] },
    { t: "Pilkada", pita: [[2009, 2015, "jadwal per daerah, belum serentak", "tipis"]],
      titik: [[2015.94, "9 Des"], [2017.12, "15 Feb"], [2018.49, "27 Jun"], [2020.94, "9 Des"], [2024.91, "27 Nov"]], rentang: [[2031.8, 2032.3, "2031–32"]] },
    { t: "Penjabat kepala daerah", pita: [[2022.37, 2025.13, "sekitar 270 daerah, ditunjuk pusat", "tegas"]] }
  ];

  E.kalender = function (tinggi) {
    var W = 1240, kiri = 172, kanan = 16, atas = 62, x0 = 2009, x1 = 2032.6;
    tinggi = tinggi || 46;
    var x = function (t) { return kiri + (t - x0) / (x1 - x0) * (W - kiri - kanan); };
    var H = atas + LAJUR.length * tinggi + 52, s = "", th;
    function hx(cx, cy, r, kls) {
      var p = [];
      for (var i = 0; i < 6; i++) { var a = Math.PI / 6 + i * Math.PI / 3; p.push((cx + r * Math.cos(a)).toFixed(1) + "," + (cy + r * Math.sin(a)).toFixed(1)); }
      return '<polygon class="' + kls + '" points="' + p.join(" ") + '"/>';
    }
    // kolom 2024 di bawah segalanya: inilah satu-satunya hal yang gambar ini ingin Anda lihat
    s += '<rect class="k-2024" x="' + x(2024) + '" y="' + (atas - 18) + '" width="' + (x(2025) - x(2024)) + '" height="' + (LAJUR.length * tinggi + 26) + '"/>';
    for (th = 2009; th <= 2032; th++) {
      s += '<line class="k-grid" x1="' + x(th) + '" x2="' + x(th) + '" y1="' + (atas - 12) + '" y2="' + (H - 34) + '"/>';
      s += '<text class="k-th' + (th === 2024 ? " k-th-kuat" : "") + '" x="' + (x(th) + (x(th + 1) - x(th)) / 2) + '" y="' + (H - 16) + '" text-anchor="middle">' + (th % 5 === 4 || th === 2024 ? th : "'" + String(th).slice(2)) + "</text>";
    }
    // pita rezim
    var bts = 2022.45, kini = 2026.84;
    s += '<rect class="k-rez a" x="' + x(2009) + '" y="10" width="' + (x(bts) - x(2009) - 2) + '" height="22"/>';
    s += '<rect class="k-rez b" x="' + x(bts) + '" y="10" width="' + (x(kini) - x(bts) - 2) + '" height="22"/>';
    s += '<rect class="k-rez c" x="' + x(kini) + '" y="10" width="' + (x(x1) - x(kini)) + '" height="22"/>';
    s += '<text class="k-rez-t" x="' + (x(2009) + 10) + '" y="26">PETA I · PEMILU DAN PILKADA DI TAHUN BERBEDA</text>';
    s += '<text class="k-rez-t" x="' + (x(bts) + 8) + '" y="26">PETA II</text>';
    s += '<text class="k-rez-t c" x="' + (x(kini) + 8) + '" y="26">MENUJU 2029 · DIPISAH LAGI</text>';
    LAJUR.forEach(function (L, i) {
      var y = atas + i * tinggi + tinggi / 2 - 8;
      s += '<line class="k-lajur" x1="' + kiri + '" x2="' + (W - kanan) + '" y1="' + y + '" y2="' + y + '"/>';
      s += '<text class="k-lab" x="0" y="' + (y + 4) + '">' + esc(L.t) + "</text>";
      (L.pita || []).forEach(function (p) {
        s += '<rect class="k-pita ' + p[3] + '" x="' + x(p[0]) + '" y="' + (y - 11) + '" width="' + (x(p[1]) - x(p[0])) + '" height="22"/>';
        // pita penjabat terlalu pendek untuk teksnya, jadi labelnya duduk di kanan pita
        var luar = p[3] === "tegas";
        s += '<text class="k-pita-t' + (luar ? " luar" : "") + '" x="' + (luar ? x(p[1]) + 8 : x(p[0]) + 8) + '" y="' + (y + 4) + '">' + esc(p[2]) + "</text>";
      });
      (L.rentang || []).forEach(function (p) {
        s += '<rect class="k-rentang" x="' + x(p[0]) + '" y="' + (y - 9) + '" width="' + (x(p[1]) - x(p[0])) + '" height="18"/>';
        s += '<text class="k-tgl rencana" x="' + ((x(p[0]) + x(p[1])) / 2) + '" y="' + (y - 14) + '" text-anchor="middle">' + esc(p[2]) + "</text>";
      });
      (L.titik || []).forEach(function (p) {
        s += hx(x(p[0]), y, 9, p[2] ? "k-titik rencana" : p[0] > 2024 && p[0] < 2025 || (p[0] > 2024.1 && p[0] < 2024.2) ? "k-titik panas" : "k-titik");
        s += '<text class="k-tgl' + (p[2] ? " rencana" : "") + '" x="' + x(p[0]) + '" y="' + (y - 14) + '" text-anchor="middle">' + esc(p[1]) + "</text>";
      });
    });
    return '<svg class="kal" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Kalender pemilu nasional dan pilkada 2009 sampai 2032. Hanya pada 2024 keduanya berada di tahun yang sama.">' + s + "</svg>";
  };

  /* pita tahun di hero: versi kalender yang bisa dibaca dalam dua detik */
  E.pitaTahun = function () {
    var pemilu = [2009, 2014, 2019, 2024], pilkada = [2015, 2017, 2018, 2020, 2024], h = "";
    for (var t = 2009; t <= 2029; t++) {
      var a = pemilu.indexOf(t) >= 0, b = pilkada.indexOf(t) >= 0, rencana = t === 2029;
      h += '<span class="th' + (a && b ? " dua" : "") + (rencana ? " rencana" : "") + (t % 5 === 4 ? "" : " sepi") + '"><i class="' + (a || rencana ? "on p" : "") + '"></i><i class="' + (b ? "on k" : "") + '"></i><b>' + (t % 5 === 4 ? t : "'" + String(t).slice(2)) + "</b></span>";
    }
    return '<div class="pita-th" role="img" aria-label="Tahun 2009 sampai 2029. Pemilu nasional: 2009, 2014, 2019, 2024, 2029. Pilkada serentak: 2015, 2017, 2018, 2020, 2024. Hanya 2024 punya keduanya.">' + h + "</div>";
  };

  /* rel tahun di bawah peta: batang per tahun, klik untuk menyaring kedua peta */
  E.relTahun = function (hist, pilih) {
    var dari = 2009, sampai = 2026, W = 1240, H = 96, bawah = 22, atas = 16, b = (W - 0) / (sampai - dari + 1), maks = 1, s = "", t;
    for (t = dari; t <= sampai; t++) maks = Math.max(maks, hist[t] || 0);
    // sqrt: 2024 sebelas kali lipat tahun lain; skala linear membuat 2009-2017 hilang sama sekali
    var ty = function (n) { return Math.sqrt(n / maks) * (H - atas - bawah); };
    for (t = dari; t <= sampai; t++) {
      var n = hist[t] || 0, h = n ? Math.max(2, ty(n)) : 0, x = (t - dari) * b, rez = t < 2022 ? "a" : t > 2022 ? "b" : "ab", on = pilih === t;
      s += '<g class="th-kol' + (on ? " on" : "") + (pilih && !on ? " redup" : "") + '" data-th="' + t + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + t + ": " + n + ' catatan">' +
        '<rect class="th-hit" x="' + x + '" y="0" width="' + b + '" height="' + H + '"/>' +
        (n ? '<rect class="th-bar ' + rez + '" x="' + (x + b * 0.18) + '" y="' + (H - bawah - h) + '" width="' + (b * 0.64) + '" height="' + h + '" rx="2"/>' : "") +
        (n ? '<text class="th-n" x="' + (x + b / 2) + '" y="' + (H - bawah - h - 4) + '" text-anchor="middle">' + f(n) + "</text>" : "") +
        '<text class="th-t" x="' + (x + b / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + t + "</text></g>";
    }
    return '<svg class="rel-th" viewBox="0 0 ' + W + " " + H + '" role="group" aria-label="Catatan per tahun">' + s + "</svg>";
  };

  /* batang pasangan Peta I / Peta II: pangsa di dalam periodenya sendiri, jadi tidak terpengaruh jumlah mentah */
  E.batangPasang = function (a, b) {
    function g(k, p, n) {
      return '<span class="bp-baris"><i class="bp-lab">' + k + '</i><span class="bp-rel"><i class="bp ' + (k === "I" ? "a" : "b") + '" style="width:' + Math.max(p, 0.6).toFixed(1) + '%"></i></span><b>' + Math.round(p) + "%</b><em>" + f(n) + "</em></span>";
    }
    return '<span class="bp-wadah">' + g("I", a.p, a.n) + g("II", b.p, b.n) + "</span>";
  };

  /* Gambar laju: satu sumbu, dua seri. Bukan jumlah mentah: pembaginya pencarian yang benar-benar dijalankan. */
  E.lajuHtml = function () {
    var L = E.laju(), maks = 0;
    L.forEach(function (r) { if (r.musim) maks = Math.max(maks, r.musim.laju); if (r.kontrol) maks = Math.max(maks, r.kontrol.laju); });
    function b(x, kls) { return x ? '<span class="lj-rel"><i class="lj ' + kls + '" style="width:' + (x.laju / maks * 100).toFixed(1) + '%"></i><b>' + x.laju.toFixed(1).replace(".", ",") + "</b></span>" : '<span class="lj-rel"><em>tidak ada jendela pembanding</em></span>'; }
    return '<table class="laju"><thead><tr><th scope="col">Gelombang pilkada</th><th scope="col"><i class="sw-lj musim"></i>Musim pilkada</th><th scope="col"><i class="sw-lj kontrol"></i>Jendela pembanding</th></tr></thead><tbody>' +
      L.filter(function (r) { return r.musim; }).map(function (r) {
        return '<tr><th scope="row">' + r.id + "</th><td>" + b(r.musim, "musim") + "</td><td>" + b(r.kontrol, "kontrol") + "</td></tr>";
      }).join("") + "</tbody></table>";
  };

  /* kartogram tegel: 38 provinsi berukuran sama. Jakarta tidak boleh kalah dari Papua hanya karena luasnya. */
  E.TEGEL = {
    "Aceh": [0, 0, "Aceh", "ACE"], "Sumatera Utara": [1, 1, "Sumut", "SUT"], "Riau": [2, 1, "Riau", "RIA"], "Kepulauan Riau": [3, 1, "Kepri", "KRI"],
    "Sumatera Barat": [1, 2, "Sumbar", "SBA"], "Jambi": [2, 2, "Jambi", "JAM"], "Kepulauan Bangka Belitung": [3, 2, "Babel", "BBL"],
    "Bengkulu": [1, 3, "Bengkulu", "BEN"], "Sumatera Selatan": [2, 3, "Sumsel", "SSE"], "Lampung": [2, 4, "Lampung", "LAM"],
    "Banten": [3, 5, "Banten", "BAN"], "Jakarta": [3, 4, "Jakarta", "JKT"], "Jawa Barat": [4, 5, "Jabar", "JBA"], "Jawa Tengah": [5, 5, "Jateng", "JTE"], "Yogyakarta": [5, 6, "DIY", "DIY"],
    "Jawa Timur": [6, 5, "Jatim", "JTI"], "Bali": [7, 5, "Bali", "BAL"], "Nusa Tenggara Barat": [8, 5, "NTB", "NTB"], "Nusa Tenggara Timur": [9, 5, "NTT", "NTT"],
    "Kalimantan Barat": [5, 2, "Kalbar", "KBA"], "Kalimantan Tengah": [6, 3, "Kalteng", "KTE"], "Kalimantan Selatan": [7, 3, "Kalsel", "KSE"], "Kalimantan Timur": [7, 2, "Kaltim", "KTI"], "Kalimantan Utara": [7, 1, "Kaltara", "KUT"],
    "Sulawesi Utara": [10, 1, "Sulut", "SUL"], "Gorontalo": [9, 1, "Gorontalo", "GOR"], "Sulawesi Tengah": [9, 2, "Sulteng", "STE"], "Sulawesi Barat": [8, 3, "Sulbar", "SBR"], "Sulawesi Selatan": [8, 4, "Sulsel", "SSL"], "Sulawesi Tenggara": [9, 3, "Sultra", "STG"],
    "Maluku Utara": [11, 1, "Malut", "MUT"], "Maluku": [11, 3, "Maluku", "MAL"],
    "Papua Barat Daya": [12, 2, "Pabar Daya", "PBD"], "Papua Barat": [13, 2, "Pabar", "PBA"], "Papua": [14, 2, "Papua", "PAP"], "Papua Tengah": [13, 3, "Papteng", "PTE"], "Papua Pegunungan": [14, 3, "Papeg", "PPE"], "Papua Selatan": [14, 4, "Papsel", "PSE"]
  };

  E.bukti = function (n) {
    var t = n === 3 ? "kasus resmi lembaga" : n === 2 ? "diberitakan dua outlet" : "satu sumber";
    return '<span class="pip" title="' + t + '" aria-label="' + t + '">' + [1, 2, 3].map(function (i) { return "<i" + (i <= n ? ' class="on' + (n === 3 ? " resmi" : "") + '"' : "") + "></i>"; }).join("") + "</span>";
  };

  E.qrSvg = function (kelas) {
    var q = E.D.qr;
    if (!q) return "";
    return '<svg class="' + (kelas || "qr") + '" viewBox="-4 -4 ' + (q.n + 8) + " " + (q.n + 8) + '" role="img" aria-label="Kode QR menuju ' + esc(q.url) + '"><rect x="-4" y="-4" width="' + (q.n + 8) + '" height="' + (q.n + 8) + '" fill="#fff"/><path d="' + q.d + '" fill="#0b1330"/></svg>';
  };

  /* jalan aturan: dipakai halaman Skema dan pelat presentasi */
  E.PATAH = [
    { t: "23 Jan 2014", j: "Putusan MK 14/PUU-XI/2013", k: "Pemilu legislatif dan presiden harus digelar serentak, mulai 2019.", url: "https://www.mkri.id/public/content/persidangan/putusan/putusan_sidang_1612_14-PUU-2013-telahucap-23Jan2014.pdf" },
    { t: "2016", j: "UU 10/2016 Pasal 201", k: "Pilkada serentak nasional dijadwalkan November 2024. Kepala daerah yang masa jabatannya habis sebelum itu diganti penjabat.", url: "https://peraturan.bpk.go.id/Download/26408/UU%20Nomor%2010%20Tahun%202016.pdf" },
    { t: "26 Feb 2020", j: "Putusan MK 55/PUU-XVII/2019", k: "Enam model keserentakan disebut sebagai pilihan yang konstitusional.", url: "https://www.mkri.id/public/content/persidangan/putusan/putusan_mkri_6797.pdf" },
    { t: "14 Jun 2022", j: "Tahapan Pemilu 2024 dimulai", k: "PKPU 3/2022. Tanggal ini memisahkan Peta I dan Peta II.", url: "https://peraturan.go.id/files/bn574-2022.pdf", kunci: 1 },
    { t: "2022–2023", j: "Gelombang penjabat", k: "Sekitar 270 daerah dipimpin penjabat yang ditunjuk pusat sampai hasil Pilkada 2024 dilantik." },
    { t: "31 Okt 2023", j: "UU 20/2023 tentang ASN", k: "KASN dihapus, tetapi tetap bekerja sampai aturan pelaksananya terbit. Pengawasan sistem merit lalu dijalankan BKN (Perpres 92/2024, 23 Agustus 2024), sebelum Pilkada 2024. Deret kasus resmi punya patahan struktural di titik ini.", url: "https://peraturan.bpk.go.id/Download/326904/UU%20Nomor%2020%20Tahun%202023.pdf" },
    { t: "14 Feb dan 27 Nov 2024", j: "Pemilu dan pilkada dalam satu tahun", k: "Pertama kalinya pemilu nasional dan pilkada serentak se-Indonesia jatuh di tahun yang sama.", kunci: 1 },
    { t: "29 Feb 2024", j: "Putusan MK 116/PUU-XXI/2023", k: "Ambang batas parlemen 4 persen tetap untuk 2024, tetapi harus diubah sebelum Pemilu 2029.", url: "https://www.mkri.id/public/content/persidangan/putusan/putusan_mkri_9657_1709186459.pdf" },
    { t: "2 Jan 2025", j: "Putusan MK 62/PUU-XXII/2024", k: "Ambang pencalonan presiden (20 persen kursi DPR atau 25 persen suara sah nasional) dihapus.", url: "https://www.mkri.id/public/content/persidangan/putusan/putusan_mkri_11344_1735807848.pdf" },
    { t: "26 Jun 2025", j: "Putusan MK 135/PUU-XXII/2024", k: "Pemilu nasional dan daerah dipisah mulai 2029, dengan jeda 2 sampai 2,5 tahun.", url: "https://www.mkri.id/public/content/persidangan/putusan/putusan_mkri_12830_1750924073.pdf", kunci: 1 }
  ];

  /* Lintasan waktu satu wilayah: batang per tahun, jangkauan (%) atau jumlah catatan. Tahun pemilu dan pilkada ditandai
     di bawah sumbu, karena laporan memang memuncak di sana: puncak di tahun pemilihan adalah musim, bukan temuan. */
  E.lintasanSvg = function (h, metrik) {
    var W = 1240, H = 230, kiri = 44, bawah = 46, atas = 22, n = E.TAHUN.length, b = (W - kiri) / n, maks = 0;
    var nilai = function (t) { return metrik === "catatan" ? h[t].n : h[t].p; };
    E.TAHUN.forEach(function (t) { maks = Math.max(maks, nilai(t)); });
    maks = metrik === "catatan" ? Math.max(5, maks) : Math.max(10, Math.ceil(maks / 10) * 10);
    var y = function (v) { return H - bawah - v / maks * (H - bawah - atas); }, s = "";
    [0, 0.5, 1].forEach(function (k) {
      var v = maks * k;
      s += '<line class="ln-grid" x1="' + kiri + '" x2="' + W + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="ln-sb" x="' + (kiri - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + (metrik === "catatan" ? E.f(Math.round(v)) : Math.round(v) + "%") + "</text>";
    });
    var pemilu = [2009, 2014, 2019, 2024], pilkada = [2015, 2017, 2018, 2020, 2024];
    E.TAHUN.forEach(function (t, i) {
      var v = nilai(t), x = kiri + i * b, rez = t < 2022 ? "a" : t > 2022 ? "b" : "ab";
      if (v > 0) s += '<rect class="ln-bar ' + rez + '" x="' + (x + b * 0.18) + '" y="' + y(v) + '" width="' + (b * 0.64) + '" height="' + (H - bawah - y(v)) + '" rx="2"><title>' + t + ": " + h[t].jangkau + " dari " + h.unitTotal + " kab/kota (" + Math.round(h[t].p) + "%), " + h[t].n + " catatan</title></rect>" +
        '<text class="ln-n" x="' + (x + b / 2) + '" y="' + (y(v) - 5) + '" text-anchor="middle">' + (metrik === "catatan" ? E.f(v) : Math.round(v) + "%") + "</text>";
      s += '<text class="ln-th" x="' + (x + b / 2) + '" y="' + (H - bawah + 16) + '" text-anchor="middle">' + t + "</text>";
      if (pemilu.indexOf(t) >= 0) s += '<rect class="ln-pip p" x="' + (x + b / 2 - 9) + '" y="' + (H - bawah + 24) + '" width="8" height="6"/>';
      if (pilkada.indexOf(t) >= 0) s += '<rect class="ln-pip k" x="' + (x + b / 2 + 1) + '" y="' + (H - bawah + 24) + '" width="8" height="6"/>';
    });
    return '<svg class="lintasan" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Lintasan per tahun">' + s + "</svg>";
  };

  /* Peta panas provinsi × tahun. Satu rona, terang ke gelap (sekuensial), skala akar supaya tahun tipis tetap terbaca. */
  E.petaPanasHtml = function (metrik, pilih) {
    var data = {}, maks = 0;
    E.PULAU.forEach(function (g) { g[1].forEach(function (p) {
      var h = E.perTahun([p]); data[p] = h;
      E.TAHUN.forEach(function (t) { maks = Math.max(maks, metrik === "catatan" ? h[t].n : h[t].p); });
    }); });
    function warna(v) {
      if (!v) return "";
      var k = Math.sqrt(v / maks), a = [244, 245, 247], b = [143, 42, 26];
      return "background:rgb(" + a.map(function (c, i) { return Math.round(c + (b[i] - c) * (0.12 + 0.88 * k)); }).join(",") + ")" + (k > 0.55 ? ";color:#fff" : "");
    }
    var h = '<table class="panas"><thead><tr><th scope="col"></th>' + E.TAHUN.map(function (t) { return '<th scope="col">' + (t % 5 === 4 ? t : "'" + String(t).slice(2)) + "</th>"; }).join("") + "</tr></thead><tbody>";
    E.PULAU.forEach(function (g) {
      h += '<tr class="pn-grup"><th colspan="' + (E.TAHUN.length + 1) + '" scope="rowgroup">' + esc(g[0]) + "</th></tr>";
      g[1].forEach(function (p) {
        var d = data[p];
        h += '<tr class="' + (pilih === p ? "on" : "") + '"><th scope="row"><button class="pn-p" data-p="' + esc(p) + '">' + esc(p) + "</button></th>" + E.TAHUN.map(function (t) {
          var v = metrik === "catatan" ? d[t].n : d[t].p;
          return '<td style="' + warna(v) + '" title="' + esc(p) + " " + t + ": " + d[t].jangkau + " dari " + d.unitTotal + " kab/kota, " + d[t].n + ' catatan">' + (v ? (metrik === "catatan" ? d[t].n : Math.round(v)) : "") + "</td>";
        }).join("") + "</tr>";
      });
    });
    return h + "</tbody></table>";
  };
})(window.EPPOS);
