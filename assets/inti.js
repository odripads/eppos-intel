/* EPPOS Political Outlook: inti. Memuat data, menormalkan baris, dan menghitung semua angka turunan.
   Tidak ada angka yang ditulis tangan di halaman: semuanya dihitung dari baris di sini, supaya bisa ditelusuri.
   Data dari /data/*.json (dibangun scripts/build_data.py dan scripts/build_kisi.py). */
window.EPPOS = (function () {
  "use strict";
  var E = { D: {} };

  /* Batas dua rezim. Tahapan Pemilu 2024 resmi berjalan sejak 14 Juni 2022 (PKPU 3/2022), jadi berita 2023 tentang
     netralitas ASN menuju Februari 2024 sudah milik rezim baru. Memakai 1 Januari 2024 akan menaruhnya di Peta I. */
  E.BATAS = "2022-06-14";
  E.REZIM = {
    A: { no: "I", judul: "Sebelum 2024", sub: "Pemilu dan pilkada di tahun yang berbeda", rentang: "2009 – Juni 2022" },
    B: { no: "II", judul: "2024 dan sesudahnya", sub: "Pemilu dan pilkada di tahun yang sama", rentang: "Juni 2022 – kini" }
  };

  // batas siklus mengikuti data/periode.json: satu siklus = dari pemilu sebelumnya sampai pemilu itu
  E.SIKLUS = [
    { id: "2009", judul: "Menuju Pemilu 2009", dari: "0000", sampai: "2009-07-08" },
    { id: "2014", judul: "Menuju Pemilu 2014", dari: "2009-07-08", sampai: "2014-07-09" },
    { id: "2019", judul: "Menuju Pemilu 2019", dari: "2014-07-09", sampai: "2019-04-17" },
    { id: "2024", judul: "Menuju Pemilu 2024", dari: "2019-04-17", sampai: "2024-02-14" },
    { id: "kini", judul: "Sesudah Pemilu 2024", dari: "2024-02-14", sampai: "9999" }
  ];

  // daftar tertutup dari PROJECT-SPEC v2; urutannya tetap, warnanya tidak pernah mengikuti peringkat
  E.MEKANISME = [
    { id: "paksaan aparat sipil", pendek: "Aparat sipil", pintu: "Birokrasi", sasaran: "ASN, honorer, PPPK", ciri: /\b(mutasi|demosi|nonjob|honorer|pppk|apel|deklarasi|dimutasi|intimidasi asn)\b/i, uji: /\b(asn|pns|aparatur|honorer|pppk|p3k|mutasi|demosi|nonjob|camat|sekda|pegawai|pejabat|kadis|kepala dinas|guru|netralitas)\b/i,
      def: "Mutasi dan demosi sebagai hukuman, ancaman pada perpanjangan kontrak honorer dan PPPK, apel yang diwajibkan, arahan lewat grup WhatsApp, ASN dalam deklarasi dukungan." },
    { id: "paksaan kepala desa dan lurah", pendek: "Kepala desa dan lurah", pintu: "Desa", sasaran: "Kades, lurah, perangkat", ciri: /\b(kades|kepala desa|lurah|perangkat desa|dana desa|kepala kampung)\b/i, uji: /\b(kades|kepala desa|lurah|perangkat desa|pj kades|apdesi|dana desa|kepala kampung|kakam|desa)\b/i,
      def: "Kepala desa dikumpulkan dan diarahkan, dana desa menjadi alat tekan, ancaman atas anggaran desa." },
    { id: "pengalihan sumber daya", pendek: "Sumber daya negara", pintu: "Anggaran", sasaran: "Program dan proyek", ciri: /\b(bansos|hibah|proyek|peresmian|fasilitas negara|mobil dinas|apbd)\b/i, uji: /\b(bansos|bantuan|hibah|proyek|anggaran|apbd|peresmian|fasilitas|mobil dinas|dana|sembako|program)\b/i,
      def: "Bansos dipercepat, peresmian proyek dijadwalkan pada masa kampanye." },
    { id: "paksaan warga penerima program", pendek: "Warga penerima program", pintu: "Program", sasaran: "Penerima bantuan", ciri: /\b(bansos|ktp|pkh|blt|sembako|bantuan)\b/i, uji: /\b(bansos|ktp|bantuan|pkh|penerima|blt|sembako)\b/i,
      def: "Bansos dikaitkan dengan pilihan, pengumpulan KTP, ancaman mencabut bantuan." },
    { id: "tekanan terhadap kritik", pendek: "Tekanan pada kritik", pintu: "Ruang publik", sasaran: "Jurnalis, aktivis, akademisi", ciri: /\b(jurnalis|wartawan|aktivis|akademisi|mahasiswa|dosen|pers)\b/i, uji: /\b(jurnalis|wartawan|aktivis|akademisi|intimidasi|teror|ancam|dilaporkan|kritik|mahasiswa|dosen|pers)\b/i,
      def: "Jurnalis, aktivis, dan akademisi ditekan, dilaporkan ke polisi, atau diancam." }
  ];

  E.$ = function (s, a) { return (a || document).querySelector(s); };
  E.$$ = function (s, a) { return Array.prototype.slice.call((a || document).querySelectorAll(s)); };
  E.esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); };
  E.f = function (n) { return Number(n).toLocaleString("id-ID"); };
  E.persen = function (a, b) { return b ? Math.round(a / b * 100) : 0; };
  // tautan dari data hasil crawl: hanya http(s) yang boleh jadi href
  E.url = function (u) { return /^https?:\/\//i.test(String(u || "")) ? E.esc(u) : "#/arsip"; };
  E.tgl = function (s) { if (!s) return null; var d = new Date(s); return isNaN(d) ? s : d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }); };
  E.slug = function (s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); };
  E.cetak = /[?&]cetak=/.test(location.search);
  E.tenang = E.cetak || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* ---------- pemuatan ---------- */
  var BERKAS = ["manifest", "periode", "insiden", "kasus_resmi", "insiden_otomatis", "usaha_pencarian", "kemajuan", "kisi", "qr", "ringkas", "posisi_aktor", "posisi_skema", "lambang", "sikap_pt", "logo_aktor", "enp"];
  E.muat = function () {
    var ambil = window.EPPOS_DATA
      ? Promise.resolve(BERKAS.map(function (n) { return window.EPPOS_DATA[n]; }))
      : Promise.all(BERKAS.map(function (n) { return fetch("data/" + n + ".json").then(function (r) { return r.ok ? r.json() : null; }); }));
    return ambil.then(function (a) {
      BERKAS.forEach(function (n, i) { E.D[n] = a[i]; });
      siapkan();
      return E;
    });
  };

  /* ---------- normalisasi: tiga sumber baris menjadi satu bentuk ---------- */
  function bersihNama(s) { return String(s).replace(/^\s*(kabupaten|kab\.?|kota)\s+/i, "").trim(); }

  function unitDari(prov, kab) {
    if (!prov || !kab) return [];
    return String(kab).split(/,|\sdan\s/).map(function (n) { return E.indeksUnit[prov + "|" + bersihNama(n)]; })
      .filter(function (u) { return u != null; });
  }

  function rezimDari(tgl, th, periode) {
    if (tgl) return tgl < E.BATAS ? "A" : "B";
    if (th) return th < 2022 ? "A" : "B";
    // baris tim tanpa tanggal: periode pilpres masih bisa memutuskan, kecuali Periode IV yang melintasi batas
    if (periode === "Periode V") return "B";
    if (periode === "Periode I" || periode === "Periode II" || periode === "Periode III") return "A";
    return null;
  }

  function siapkan() {
    var D = E.D, K = D.kisi;
    E.nSel = K.sel.length / 3;
    E.nUnit = K.unit.length;
    E.indeksUnit = {};
    K.unit.forEach(function (u, i) { E.indeksUnit[u[1] + "|" + u[0]] = i; });
    E.PROVINSI = Object.keys(K.prov).sort();

    var baris = [];
    (D.insiden_otomatis || []).forEach(function (r) {
      var t = r.tanggal_berita || null;
      baris.push({ id: r.insiden_id, seri: "media", asal: "otomatis", tgl: t, th: t ? +t.slice(0, 4) : null,
        rez: rezimDari(t), prov: r.provinsi || null, kab: r.kab_kota || null, unit: unitDari(r.provinsi, r.kab_kota),
        mek: r.mekanisme || null, bukti: r.status_verifikasi === "dua sumber" ? 2 : 1, judul: r.judul_sumber_1 || "",
        url: r.sumber_1_url, url2: r.sumber_2_url || null, outlet: r.sumber_1_outlet || "", gel: r.gelombang_pilkada || null,
        saluran: r.saluran || null, kira: !!r.lokasi_perkiraan, dasar: r.lokasi_dasar || null });
    });
    (D.insiden || []).forEach(function (r) {
      if (r.status_kurasi !== "masuk" && r.status_kurasi !== "ragu") return;
      var t = r.tanggal || null;
      baris.push({ id: r.insiden_id, seri: "media", asal: "tim", tgl: t, th: t ? +t.slice(0, 4) : null,
        rez: rezimDari(t, null, r.periode_pilpres), prov: r.provinsi || null, kab: r.kab_kota || null, unit: unitDari(r.provinsi, r.kab_kota),
        mek: r.mekanisme || null, bukti: r.status_verifikasi === "dua sumber" ? 2 : 1, judul: r.judul_sumber_1 || r.ringkasan_satu_kalimat || "",
        ringkas: r.ringkasan_satu_kalimat || null, url: r.sumber_1_url, url2: r.sumber_2_url || null, outlet: r.sumber_1_outlet || "",
        pelaku: r.pelaku_jabatan || null, sasaran: r.sasaran_jenis || null, hasil: r.hasil || null });
    });
    (D.kasus_resmi || []).forEach(function (r) {
      var th = r.tahun ? +r.tahun : null;
      baris.push({ id: r.kasus_id, seri: "resmi", asal: "lembaga", tgl: null, th: th, rez: rezimDari(null, th, r.periode_pilpres),
        prov: r.provinsi || null, kab: r.kab_kota || null, unit: unitDari(r.provinsi, r.kab_kota), mek: null, bukti: 3,
        judul: r.judul_sumber_1 || r.jenis_pelanggaran || r.sumber_url || "", url: r.sumber_url, outlet: r.lembaga || "",
        lembaga: r.lembaga || null, jenis: r.jenis_pelanggaran || null, jumlah: r.jumlah_kasus || null, otomatis: r.judul_status === "otomatis, belum diverifikasi" });
    });
    baris.forEach(function (r) {
      var k = r.tgl || (r.th ? r.th + "-07-01" : null);
      r.urut = k || "";
      r.siklus = null;
      if (k) E.SIKLUS.forEach(function (s) { if (k >= s.dari && k < s.sampai) r.siklus = s.id; });
    });
    baris.sort(function (a, b) { return a.urut < b.urut ? 1 : a.urut > b.urut ? -1 : 0; });
    E.baris = baris;
  }

  /* ---------- turunan ---------- */
  // f: {rez, siklus, mek, dua, tahun, prov, seri}
  E.saring = function (f) {
    f = f || {};
    return E.baris.filter(function (r) {
      if (f.rez && r.rez !== f.rez) return false;
      if (f.siklus && r.siklus !== f.siklus) return false;
      if (f.prov && r.prov !== f.prov) return false;
      if (f.seri && r.seri !== f.seri) return false;
      if (f.tahun && r.th !== f.tahun) return false;
      // kasus resmi tidak punya mekanisme dan selalu tingkat bukti tertinggi: filter media tidak menghapusnya,
      // supaya deret kedua tidak hilang diam-diam saat pembaca memilih satu mekanisme
      if (f.mek && r.seri === "media" && r.mek !== f.mek) return false;
      if (f.dua && r.seri === "media" && r.bukti < 2) return false;
      return true;
    });
  };

  E.tally = function (rows) {
    var m = new Int32Array(E.nUnit), k = new Int32Array(E.nUnit), provTingkat = {}, provs = {}, t = { media: 0, resmi: 0, dua: 0, tim: 0, tanpaLokasi: 0, tingkatProv: 0, mek: {} };
    rows.forEach(function (r) {
      if (r.seri === "media") { t.media++; if (r.bukti === 2) t.dua++; if (r.asal === "tim") t.tim++; if (r.mek) t.mek[r.mek] = (t.mek[r.mek] || 0) + 1; }
      else t.resmi++;
      if (r.prov) provs[r.prov] = 1;
      if (r.unit.length) r.unit.forEach(function (u) { (r.seri === "media" ? m : k)[u]++; });
      else if (r.prov) { provTingkat[r.prov] = 1; t.tingkatProv++; }
      else t.tanpaLokasi++;
    });
    var n = 0;
    for (var i = 0; i < E.nUnit; i++) if (m[i] || k[i]) n++;
    t.m = m; t.k = k; t.unit = n; t.provTingkat = provTingkat; t.prov = Object.keys(provs).length; t.provs = provs;
    return t;
  };

  /* Keadaan tiap sel, bukan jumlah: 0 redup, 1 tingkat provinsi, 2 media, 3 resmi, 4 keduanya.
     Mewarnai jumlah akan menggambar kepadatan pers (PROJECT-SPEC v2), jadi yang dipetakan deret mana yang hadir. */
  E.keadaan = function (t) {
    var K = E.D.kisi, v = new Uint8Array(E.nSel);
    for (var i = 0; i < E.nSel; i++) {
      var u = K.sel[i * 3 + 2], a = t.m[u], b = t.k[u];
      v[i] = a && b ? 4 : b ? 3 : a ? 2 : t.provTingkat[K.unit[u][1]] ? 1 : 0;
    }
    return v;
  };

  E.mekUrut = function (t) {
    var total = 0;
    E.MEKANISME.forEach(function (m) { total += t.mek[m.id] || 0; });
    return E.MEKANISME.map(function (m) { return { m: m, n: t.mek[m.id] || 0, p: total ? (t.mek[m.id] || 0) / total * 100 : 0 }; });
  };

  /* Keandalan label: berapa judul yang memang menyebut pintu mekanismenya. Label berasal dari kelompok kata kunci,
     jadi uji ini memeriksa labelnya sendiri; yang di bawah ambang tidak boleh dibaca sebagai pergeseran. */
  E.AMBANG_ANDAL = 50;
  E.keandalan = function (m) {
    var s = E.baris.filter(function (r) { return r.mek === m.id && r.judul; }), c = s.filter(function (r) { return m.uji.test(r.judul); }).length;
    return { n: s.length, cocok: c, p: E.persen(c, s.length), rendah: E.persen(c, s.length) < E.AMBANG_ANDAL };
  };

  /* laju temuan per 1.000 pencarian, hanya dari sapuan arsip yang sama di semua jendela (wp-grid) */
  E.GELOMBANG = [["2015", null], ["2017", "kontrol-2017"], ["2018", "kontrol-2018"], ["2020", "kontrol-2020"], ["2024", "kontrol-2024"]];
  E.laju = function () {
    var grid = E.baris.filter(function (r) { return r.saluran === "wp-grid"; }), u = E.D.usaha_pencarian || {};
    function r(g) { var n = grid.filter(function (x) { return x.gel === g; }).length; return u[g] ? { n: n, c: u[g], laju: n / u[g] * 1000 } : null; }
    return E.GELOMBANG.map(function (g) { return { id: g[0], musim: r(g[0]), kontrol: g[1] ? r(g[1]) : null }; });
  };

  /* gambar yang tidak ikut dibundel (lambang daerah, logo aktor, dokumen): di repo di assets/, di situs terbit di akar */
  E.ASET = window.EPPOS_DATA ? "" : "assets/";

  /* gugus wilayah untuk lintasan waktu; urutannya juga urutan baris peta panas */
  E.PULAU = [
    ["Sumatera", ["Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Kepulauan Riau", "Jambi", "Sumatera Selatan", "Kepulauan Bangka Belitung", "Bengkulu", "Lampung"]],
    ["Jawa", ["Jakarta", "Banten", "Jawa Barat", "Jawa Tengah", "Yogyakarta", "Jawa Timur"]],
    ["Bali–Nusa Tenggara", ["Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur"]],
    ["Kalimantan", ["Kalimantan Barat", "Kalimantan Tengah", "Kalimantan Selatan", "Kalimantan Timur", "Kalimantan Utara"]],
    ["Sulawesi", ["Sulawesi Utara", "Gorontalo", "Sulawesi Tengah", "Sulawesi Barat", "Sulawesi Selatan", "Sulawesi Tenggara"]],
    ["Maluku", ["Maluku", "Maluku Utara"]],
    ["Papua", ["Papua", "Papua Barat", "Papua Barat Daya", "Papua Tengah", "Papua Pegunungan", "Papua Selatan"]]
  ];
  E.TAHUN = [];
  for (var th = 2009; th <= 2026; th++) E.TAHUN.push(th);

  /* Per tahun untuk sekumpulan provinsi: jumlah catatan dan jangkauan, yaitu bagian kab/kota wilayah itu yang punya
     sedikitnya satu catatan pada tahun itu. Jangkauan lebih tahan bias kepadatan pers daripada jumlah, tapi tetap laporan. */
  E.perTahun = function (provs) {
    var ada = {}, unitTotal = 0, K = E.D.kisi, h = {};
    (provs || E.PROVINSI).forEach(function (p) { ada[p] = 1; });
    K.unit.forEach(function (u) { if (ada[u[1]]) unitTotal++; });
    E.TAHUN.forEach(function (t) { h[t] = { n: 0, media: 0, resmi: 0, unit: {} }; });
    E.baris.forEach(function (r) {
      if (!r.th || !h[r.th] || !r.prov || !ada[r.prov]) return;
      var x = h[r.th]; x.n++; x[r.seri]++;
      r.unit.forEach(function (u) { x.unit[u] = 1; });
    });
    E.TAHUN.forEach(function (t) { var x = h[t]; x.jangkau = Object.keys(x.unit).length; x.p = unitTotal ? x.jangkau / unitTotal * 100 : 0; });
    h.unitTotal = unitTotal;
    return h;
  };

  /* lambang resmi (Wikidata P94, cadangan P41), dipetakan ke unit peta lewat provinsi + nama; kab dan kota senama
     berbagi satu unit, jadi satu unit bisa punya dua lambang */
  E.lambangUnit = function (u) { return (E._lambang || siapLambang()).unit[u] || []; };
  E.lambangProv = function (p) { return (E._lambang || siapLambang()).prov[p] || null; };
  function siapLambang() {
    var L = E.D.lambang || {}, kodeProv = {}, out = { unit: {}, prov: {} };
    Object.keys(L).forEach(function (k) { if (k.indexOf(".") < 0) { kodeProv[k] = L[k].label; out.prov[L[k].label] = L[k]; } });
    Object.keys(L).forEach(function (k) {
      if (k.indexOf(".") < 0) return;
      var u = E.indeksUnit[kodeProv[k.slice(0, 2)] + "|" + L[k].label];
      if (u != null) (out.unit[u] = out.unit[u] || []).push(L[k]);
    });
    E._lambang = out;
    return out;
  }
  E.gambarLambang = function (x, kls) {
    return x ? '<img class="' + (kls || "lambang") + '" src="' + E.ASET + "lambang/" + E.esc(x.gambar) + '" alt="Lambang ' + E.esc(x.label) + '" loading="lazy">' : "";
  };

  return E;
})();
