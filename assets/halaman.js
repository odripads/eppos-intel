/* EPPOS Political Outlook: halaman dan perute. Semua angka di sini dibaca dari inti.js.
   Teks yang belum ditulis tim diberi kotak .menyusul, tidak pernah diisi angka karangan. */
(function (E) {
  "use strict";
  var $ = E.$, $$ = E.$$, esc = E.esc, f = E.f, persen = E.persen;
  var NAV = [["intervensi", "Intervensi Eksekutif"], ["skema", "Skema"], ["provinsi", "Provinsi"], ["arsip", "Arsip"], ["ruu-pemilu", "RUU Pemilu"], ["metode", "Metode"]];
  var NAV_HP = [["", "Beranda"], ["intervensi", "Intervensi"], ["skema", "Skema"], ["ruu-pemilu", "RUU"], ["arsip", "Arsip"]];
  var F = { mek: null, dua: false, tahun: null, wilayah: "semua", tampilan: "tumpuk", prov: null };
  var A = { q: "", rez: "", mek: "", bukti: "", prov: "", n: 40 };
  var URL_SITUS = "eppos-outlook.vercel.app";

  /* ---------- potongan kecil ---------- */
  // dua logo setara, ukurannya dari satu nilai di CSS (--u). Turunan di assets/lockup (scripts/logo_turunan.py): di permukaan
  // gelap GOV memakai krem EPPOS karena merah aslinya hanya 1,9:1 di atas navy
  function logoDua(terang) {
    return '<span class="logo-dua"><img class="l-eppos" src="' + (terang ? E.logo : E.logoInv) + '" alt="EPPOS GROUP"><i class="l-garis"></i><img class="l-polgov" src="' + (terang ? E.logoPolgov : E.logoPolgovInv) + '" alt="PolGov, Research Center for Politics and Government"></span>';
  }
  function palang(no, judul) { return '<div class="palang"><i></i><span>' + esc(no) + "</span>" + (judul ? "<b>" + esc(judul) + "</b>" : "") + "</div>"; }
  function kepala(kicker, judul, dek) {
    return '<header class="hal-kepala"><p class="kicker">' + esc(kicker) + '</p><h1 class="j-hal">' + esc(judul) + "</h1>" + (dek ? '<p class="dek">' + dek + "</p>" : "") + "</header>";
  }
  function menyusul(judul, isi) {
    return '<div class="menyusul"><span class="menyusul-tag">Naskah menyusul</span><h4>' + esc(judul) + "</h4>" + (isi ? "<p>" + isi + "</p>" : "") + "</div>";
  }
  function petak(no) { return '<span class="gbr-no">Gambar ' + no + "</span>"; }
  function keterangan(kelas) {
    return '<ul class="ket ' + (kelas || "") + '">' + E.KETERANGAN.map(function (x) {
      return '<li><i class="ket-sel st' + x.st + '"></i><span><b>' + esc(x.t) + "</b>" + esc(x.k) + "</span></li>";
    }).join("") + "</ul>";
  }
  function totalSemua() {
    var t = E.tally(E.baris), A_ = E.tally(E.saring({ rez: "A" })), B_ = E.tally(E.saring({ rez: "B" }));
    return { t: t, a: A_, b: B_ };
  }
  function bukaBaris(r) {
    var tempat = r.kab || r.prov || "Tingkat nasional";
    return '<li class="cat"><time>' + esc(r.tgl ? E.tgl(r.tgl) : r.th || "tanpa tanggal") + '</time><div class="cat-isi"><a href="' + E.url(r.url) + '" target="_blank" rel="noopener">' + esc(r.judul || r.url) + '</a><p class="cat-meta">' +
      E.bukti(r.bukti) + "<span>" + esc(tempat) + (r.kab && r.prov ? ", " + esc(r.prov) : "") + (r.kira ? " (perkiraan)" : "") + "</span><span>" + esc(r.outlet || "") + "</span>" +
      (r.mek ? "<span>" + esc(pendekMek(r.mek)) + "</span>" : "") + (r.jenis ? "<span>" + esc(r.jenis) + "</span>" : "") +
      (r.url2 ? '<a class="s2" href="' + E.url(r.url2) + '" target="_blank" rel="noopener">sumber 2</a>' : "") + "</p></div></li>";
  }
  function pendekMek(id) { var m = E.MEKANISME.filter(function (x) { return x.id === id; })[0]; return m ? m.pendek : id; }

  /* papan sederhana: data-papan="A", "B", atau "siklus:2019" */
  function pasangPapan(akar) {
    $$("[data-papan]", akar).forEach(function (el) {
      if (el.dataset.terpasang) return;
      el.dataset.terpasang = 1;
      var k = el.dataset.papan, fl = k.indexOf("siklus:") === 0 ? { siklus: k.slice(7) } : k === "semua" ? {} : { rez: k };
      if (el.dataset.prov) fl.prov = el.dataset.prov;
      var o = { nilai: E.keadaan(E.tally(E.saring(fl))), hidup: el.dataset.hidup === "1", label: el.dataset.label === "1" };
      if (el.dataset.vb) o.vb = el.dataset.vb.split(",").map(Number);
      if (el.dataset.prov) o.hanya = el.dataset.prov;
      new E.Papan(el, o);
    });
  }

  function vbProv(p) {
    var K = E.D.kisi, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (var i = 0; i < E.nSel; i++) {
      if (K.unit[K.sel[i * 3 + 2]][1] !== p) continue;
      var x = K.sel[i * 3], y = K.sel[i * 3 + 1];
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    var g = Math.max(x1 - x0, y1 - y0) * 0.1 + 6;
    return [x0 - g, y0 - g, x1 - x0 + g * 2, y1 - y0 + g * 2];
  }

  /* ---------- BERANDA ---------- */
  function beranda() {
    var s = totalSemua(), t = s.t;
    var pintu = [
      ["intervensi", "Fokus 1", "Intervensi Eksekutif", "Dua peta: sebelum dan sesudah pemilu dan pilkada bertemu dalam satu tahun. " + f(t.media) + " catatan media, " + f(t.resmi) + " kasus resmi."],
      ["ruu-pemilu", "Fokus 2", "RUU Pemilu", "Ambang batas parlemen, syarat pencapresan, dan pemisahan pemilu sebagai konteks peta politik 2027–2029."],
      ["skema", "Rangka", "Skema Rekayasa Elektoral", "Lima mekanisme yang dilaporkan, dan aturan main yang berubah di sekitarnya."],
      ["provinsi", "Rujukan", "38 Berkas Provinsi", "Tiap provinsi punya halaman sendiri, dengan perbandingan dua peta dan semua catatannya."],
      ["arsip", "Rujukan", "Arsip Catatan", "Cari semua catatan menurut kata, wilayah, mekanisme, dan tingkat bukti, lengkap dengan tautan sumber."],
      ["metode", "Rujukan", "Metode dan Batasan", "Apa yang dihitung, apa yang tidak, dan bagaimana mengoreksi kami."]
    ];
    return '<div class="layar-depan"><section class="hero malam">' +
      '<div class="lebar"><p class="kicker">Rilis 2 Desember 2026</p><h1 class="hero-j lebar-penuh">EPPOS Political<br>Outlook</h1></div>' +
      '<div class="lebar hero-bawah"><div class="hero-sisi"><p class="hero-tesis">Satu tahun, dua pemilihan.</p>' +
        '<p class="hero-dek">Baru sekali pemilu nasional dan pilkada se-Indonesia jatuh di tahun yang sama: 2024. Mulai 2029 keduanya dipisah lagi. Outlook ini membaca apa yang dilaporkan terjadi pada birokrasi dan desa di antara dua aturan main itu, dan apa artinya bagi peta politik 2027–2029.</p>' +
        '<div class="aksi"><a class="btn utama" href="#/intervensi">Buka dua peta</a><a class="btn" href="#/ruu-pemilu">RUU Pemilu</a></div></div>' +
        '<div class="hero-kanan"><div class="hero-papan papan" data-papan="B" data-hidup="1" data-label="1"></div>' + E.pitaTahun() +
        '<p class="pita-ket"><span><i class="p"></i>pemilu nasional</span><span><i class="k"></i>pilkada serentak</span><span><i class="d"></i>keduanya</span><span class="sisi">Peta II. Sel menyala menandai wilayah dengan laporan, bukan jumlah laporan.</span></p></div>' +
      "</div>" +
    "</section>" +

    '<section class="pita-angka"><div class="lebar pita-isi">' +
      [[t.media, "catatan media"], [t.resmi, "kasus resmi"], [E.PROVINSI.length, "provinsi"], [t.unit, "dari " + E.nUnit + " kab/kota punya catatan"], [E.D.kemajuan ? E.D.kemajuan.sel_selesai : 0, "pencarian dijalankan"]].map(function (x) {
        return '<div class="angka"><b data-naik="' + x[0] + '">' + f(x[0]) + "</b><span>" + esc(x[1]) + "</span></div>";
      }).join("") +
    "</div></section></div>" +

    '<section class="kertas blok"><div class="lebar">' + palang("Gambar 1", "Mengapa ada dua peta") +
      '<div class="dua-kol"><div><h2 class="j2">Hanya 2024 yang menyatukan keduanya.</h2></div>' +
      '<p class="lead">Sebelum 2024, kepala daerah dipilih di tahun yang berbeda dari pemilu nasional. Pada 2024, keduanya jatuh di tahun yang sama, sementara sekitar 270 daerah dipimpin penjabat yang ditunjuk pusat. Putusan MK 135/PUU-XXII/2024 memisahkannya lagi mulai 2029. Itu membuat 2024 bukan sekadar yang pertama, tetapi mungkin satu-satunya.</p></div>' +
      '<figure class="gbr"><div class="gulir">' + E.kalender() + "</div>" +
      '<figcaption><b>Kalender pemilu nasional dan pilkada, 2009–2032.</b> Segi enam merah: pemungutan suara 2024. Segi enam berongga: rencana menurut putusan MK, menunggu RUU Pemilu.</figcaption></figure>' +
    "</div></section>" +

    '<section class="malam blok"><div class="lebar">' + palang("Gambar 2", "Dua peta") +
      '<div class="pasang">' +
        '<div class="pasang-papan">' + ["A", "B"].map(function (k) {
          var R = E.REZIM[k], x = k === "A" ? s.a : s.b;
          return '<figure class="papan-bingkai"><figcaption class="papan-kap"><span class="no">Peta ' + R.no + "</span><b>" + esc(R.judul) + "</b><span>" + esc(R.sub) + '</span><span class="kanan">' + f(x.unit) + " kab/kota</span></figcaption>" +
            '<div class="papan" data-papan="' + k + '" data-label="1"></div></figure>';
        }).join("") + "</div>" +
        '<aside class="pasang-sisi"><h3 class="j3">Yang menyala bukan yang terburuk, tetapi yang terlaporkan.</h3>' +
        "<p>Sel menyala berarti ada laporan yang ditemukan lewat prosedur pencarian kami. Warnanya menunjukkan deret mana yang hadir, bukan berapa banyak.</p>" +
        keterangan() + '<a class="btn utama" href="#/intervensi">Jelajahi peta interaktif</a></aside>' +
      "</div>" +
    "</div></section>" +

    '<section class="kertas blok"><div class="lebar">' + palang("Isi", "Dalam Outlook ini") +
      '<ol class="indeks">' + pintu.map(function (p, i) {
        return '<li><a href="#/' + p[0] + '"><span class="i-no">' + String(i + 1).padStart(2, "0") + '</span><span class="i-kat">' + esc(p[1]) + '</span><span class="i-j">' + esc(p[2]) + '</span><span class="i-k">' + esc(p[3]) + '</span><span class="i-p" aria-hidden="true">→</span></a></li>';
      }).join("") + "</ol>" +
    "</div></section>" +

    '<section class="kertas blok pendek"><div class="lebar">' + palang("Sebelum membaca", "Tiga hal") +
      '<div class="tiga">' +
      "<div><h3 class=\"j3\">Ini peta laporan, bukan peta kejadian.</h3><p>Media adalah sensor, bukan objek kajian. Sel redup bisa berarti tidak ada kejadian, bisa juga berarti tidak ada yang meliput.</p></div>" +
      "<div><h3 class=\"j3\">Warna tidak menunjukkan jumlah.</h3><p>Menghitung laporan per wilayah akan menggambar kepadatan pers. Jawa memerah karena wartawannya banyak. Karena itu kami memetakan deret yang hadir.</p></div>" +
      '<div><h3 class="j3">Jumlah antarperiode tidak setara.</h3><p>Arsip daring menipis ke belakang dan pencarian lebih dalam di 2024. Perbandingan yang sah ada di <a href="#/intervensi/laju">laju per 1.000 pencarian</a>.</p></div>' +
      "</div></div></section>";
  }

  /* ---------- INTERVENSI ---------- */
  function intervensi() {
    return '<section class="malam hal-int"><div class="lebar">' +
      kepala("Fokus 1 · fondasi Outlook", "Intervensi Eksekutif", "Intimidasi dan paksaan oleh eksekutif petahana demi keuntungan elektoral, sebagaimana dilaporkan media dan dicatat lembaga. Satu sel adalah satu petak wilayah kab/kota.") +
      '<button class="kendali-buka" id="kendali-buka" aria-expanded="false" aria-controls="kendali">Saring peta</button><div class="kendali" id="kendali"></div>' +
      '<div class="panggung"><div class="papan-kol" id="papan-kol"></div><aside class="rel" id="rel" aria-label="Ringkasan dua peta"></aside></div>' +
      '<figure class="waktu"><figcaption><b id="waktu-j">Catatan per tahun</b><span>Pilih satu tahun untuk menyaring kedua peta. Tinggi batang memakai skala akar supaya tahun-tahun awal tetap terbaca.</span></figcaption><div class="gulir" id="waktu"></div></figure>' +
    "</div></section>" +

    '<section class="kertas blok" id="lintasan"><div class="lebar">' + palang("Gambar 3a", "Lintasan waktu") +
      '<div class="dua-kol"><h2 class="j2">Kapan, dan di mana paling sering dilaporkan?</h2><p class="lead">Pilih nasional, gugus pulau, atau satu provinsi. <b>Jangkauan</b> adalah bagian kab/kota di wilayah itu yang punya sedikitnya satu catatan pada tahun tersebut; ia lebih tahan bias kepadatan pers daripada jumlah catatan, tetapi tetap laporan, bukan kejadian. Arsip menipis sebelum 2015.</p></div>' +
      '<div class="ln-kendali"><label class="pil"><span>Wilayah</span><select id="ln-cakupan"></select></label><div class="seg terang" id="ln-metrik"></div></div>' +
      '<figure class="gbr tanpa-garis"><div class="gulir" id="ln-grafik"></div><figcaption><b id="ln-judul"></b> <span class="ln-ket"><i class="p"></i>pemilu nasional <i class="k"></i>pilkada serentak · batang biru Peta I, merah Peta II</span></figcaption></figure>' +
      '<div class="palang-jarak">' + palang("Peta panas", "38 provinsi × 18 tahun") + '</div><p class="rel-cat">Klik nama provinsi untuk melihat lintasannya di atas. Angka di sel: ' + '<span id="ln-satuan">persen kab/kota tersentuh</span>.</p>' +
      '<div class="gulir" id="ln-panas"></div>' +
    "</div></section>" +

    '<section class="kertas blok"><div class="lebar">' + palang("Gambar 3", "Peta per siklus pemilu") +
      '<div class="dua-kol"><h2 class="j2">Dari 2009 sampai 2024, siklus demi siklus.</h2><p class="lead">Rapat tim meminta peta sampai 2009. Yang terlihat di bawah adalah kondisi data saat ini: dua siklus awal hampir kosong karena arsipnya belum disapu, bukan karena tidak ada kejadian. Sapuan untuk jendela pilkada dimulai dari 2015.</p></div>' +
      '<div class="siklus" id="siklus"></div>' +
    "</div></section>" +

    '<section class="kertas blok pendek" id="laju"><div class="lebar">' + palang("Gambar 4", "Perbandingan yang sah") +
      '<div class="dua-kol"><div><h2 class="j2">Laju temuan per 1.000 pencarian.</h2><p class="lead">Hanya temuan dari sapuan arsip yang sama di semua jendela. Yang diukur seberapa banyak yang diberitakan, bukan seberapa banyak yang terjadi.</p></div>' +
      '<figure class="gbr tanpa-garis">' + E.lajuHtml() + "<figcaption><b>Sumber:</b> sapuan arsip outlet (wp-grid). Pembagi: jumlah pencarian per jendela waktu. Jendela pembanding: panjang sama, tanpa pilkada.</figcaption></figure></div>" +
    "</div></section>";
  }

  function saringF(rez) { return { rez: rez, mek: F.mek, dua: F.dua, tahun: F.tahun }; }

  function gambarKendali() {
    function seg(nama, label, ops, kini) {
      return '<div class="seg" role="group" aria-label="' + esc(label) + '"><span class="seg-j">' + esc(label) + "</span>" + ops.map(function (o) {
        return '<button data-k="' + nama + '" data-v="' + esc(o[0]) + '" aria-pressed="' + (String(kini) === String(o[0])) + '">' + esc(o[1]) + "</button>";
      }).join("") + "</div>";
    }
    $("#kendali").innerHTML =
      seg("tampilan", "Tampilan", [["tumpuk", "Bertumpuk"], ["geser", "Geser"]], F.tampilan) +
      seg("dua", "Bukti media", [["false", "Semua"], ["true", "Dua sumber"]], F.dua) +
      seg("wilayah", "Wilayah", E.WILAYAH.map(function (w) { return [w.id, w.t]; }), F.wilayah) +
      seg("mek", "Mekanisme", [["", "Semua"]].concat(E.MEKANISME.map(function (m) { return [m.id, m.pendek]; })), F.mek || "");
    $$("#kendali button").forEach(function (b) {
      b.onclick = function () {
        var k = b.dataset.k, v = b.dataset.v;
        F[k] = k === "dua" ? v === "true" : k === "mek" ? (v || null) : v;
        gambarKendali();
        if (k === "tampilan") return bangunPapan();
        if (k === "wilayah") { var w = E.WILAYAH.filter(function (x) { return x.id === v; })[0]; E.Papan.semua.forEach(function (p) { if (p.o.arah) p.arahkan(w.vb); }); return; }
        perbarui();
      };
    });
  }

  var papanA = null, papanB = null;

  function arah(i, e) {
    var tip = $("#tip");
    if (i == null) { tip.hidden = true; E.sorotSemua(null); return; }
    var K = E.D.kisi, u = K.sel[i * 3 + 2], nm = K.unit[u][0], pv = K.unit[u][1], a = E.tally(E.saring(saringF("A"))), b = E.tally(E.saring(saringF("B")));
    tip.hidden = false;
    tip.innerHTML = "<b>" + esc(nm) + "</b><span>" + esc(pv) + "</span><em>Peta I: " + f(a.m[u] + a.k[u]) + " · Peta II: " + f(b.m[u] + b.k[u]) + "</em>";
    var x = Math.min(window.innerWidth - 230, e.clientX + 14), y = Math.max(8, e.clientY - 66);
    tip.style.transform = "translate(" + x + "px," + y + "px)";
    E.sorotSemua(pv);
  }
  function pilih(i) { F.unit = E.D.kisi.sel[i * 3 + 2]; F.prov = E.D.kisi.unit[F.unit][1]; gambarRel(); }

  function bangunPapan() {
    E.Papan.lepasSemua();
    var kol = $("#papan-kol"), w = E.WILAYAH.filter(function (x) { return x.id === F.wilayah; })[0];
    if (F.tampilan === "geser") {
      kol.innerHTML = '<figure class="papan-bingkai geser"><figcaption class="papan-kap ganda"><span><span class="no">Peta I</span> Sebelum 2024</span><span class="kanan"><span class="no">Peta II</span> 2024 dan sesudahnya</span></figcaption>' +
        '<div class="papan besar" id="papan-A"><div class="geser-garis" id="geser" role="slider" tabindex="0" aria-label="Geser antara Peta I dan Peta II" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"><span>⇆</span></div></div></figure>';
      papanA = new E.Papan($("#papan-A"), { vb: w.vb, arah: arah, pilih: pilih, label: true });
      papanB = null;
      pasangGeser();
    } else {
      kol.innerHTML = ["A", "B"].map(function (k) {
        var R = E.REZIM[k];
        return '<figure class="papan-bingkai"><figcaption class="papan-kap"><span class="no">Peta ' + R.no + "</span><b>" + esc(R.judul) + "</b><span>" + esc(R.sub) + " · " + esc(R.rentang) + '</span><span class="kanan" id="kap-' + k + '"></span></figcaption><div class="papan" id="papan-' + k + '"></div></figure>';
      }).join("");
      papanA = new E.Papan($("#papan-A"), { vb: w.vb, arah: arah, pilih: pilih, hidup: true, label: true });
      papanB = new E.Papan($("#papan-B"), { vb: w.vb, arah: arah, pilih: pilih, hidup: true, label: true });
    }
    perbarui();
  }

  function pasangGeser() {
    var el = $("#geser"), wadah = $("#papan-A");
    function atur(x) { var b = wadah.getBoundingClientRect(), p = Math.max(0.02, Math.min(0.98, (x - b.left) / b.width)); papanA.garis = p; el.style.left = (p * 100) + "%"; el.setAttribute("aria-valuenow", Math.round(p * 100)); papanA.lukis(); }
    el.addEventListener("pointerdown", function (e) { el.setPointerCapture(e.pointerId); papanA.tahanGeser = true; e.preventDefault(); });
    el.addEventListener("pointermove", function (e) { if (papanA.tahanGeser) atur(e.clientX); });
    el.addEventListener("pointerup", function () { papanA.tahanGeser = false; });
    el.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault(); var b = wadah.getBoundingClientRect(); atur(b.left + b.width * (papanA.garis + (e.key === "ArrowLeft" ? -0.04 : 0.04)));
    });
  }

  function perbarui() {
    var a = E.tally(E.saring(saringF("A"))), b = E.tally(E.saring(saringF("B")));
    if (F.tampilan === "geser") papanA.setel(E.keadaan(a), E.keadaan(b));
    else {
      papanA.setel(E.keadaan(a)); papanB.setel(E.keadaan(b));
      $("#kap-A").textContent = f(a.unit) + " kab/kota"; $("#kap-B").textContent = f(b.unit) + " kab/kota";
    }
    gambarRel(a, b);
    var hist = {};
    E.saring({ mek: F.mek, dua: F.dua }).forEach(function (r) { if (r.th) hist[r.th] = (hist[r.th] || 0) + 1; });
    $("#waktu").innerHTML = E.relTahun(hist, F.tahun);
    $("#waktu-j").textContent = F.tahun ? "Menampilkan " + F.tahun + " saja" : "Catatan per tahun";
    $$("#waktu .th-kol").forEach(function (g) {
      var pilihTh = function () { var t = +g.dataset.th; F.tahun = F.tahun === t ? null : t; perbarui(); };
      g.onclick = pilihTh;
      g.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pilihTh(); } };
    });
  }

  function baris3(lab, a, b, cat) { return "<tr><th scope=\"row\">" + esc(lab) + (cat ? "<small>" + esc(cat) + "</small>" : "") + "</th><td>" + a + "</td><td>" + b + "</td></tr>"; }

  function gambarRel(a, b) {
    a = a || E.tally(E.saring(saringF("A"))); b = b || E.tally(E.saring(saringF("B")));
    var h = '<div class="rel-umum"><h3 class="j-rel">Dua peta dalam angka</h3><table class="banding"><thead><tr><th></th><th scope="col"><i class="sw-rez a"></i>Peta I</th><th scope="col"><i class="sw-rez b"></i>Peta II</th></tr></thead><tbody>' +
      baris3("Catatan media", f(a.media), f(b.media), "jumlah temuan, bukan kejadian") +
      baris3("Dua sumber", persen(a.dua, a.media) + "%", persen(b.dua, b.media) + "%") +
      baris3("Kasus resmi", f(a.resmi), f(b.resmi)) +
      baris3("Kab/kota tersentuh", f(a.unit) + "<small>" + persen(a.unit, E.nUnit) + "%</small>", f(b.unit) + "<small>" + persen(b.unit, E.nUnit) + "%</small>", "dari " + E.nUnit) +
      baris3("Provinsi", f(a.prov), f(b.prov)) +
      '</tbody></table><p class="rel-cat">Peta I mencakup 13 tahun, Peta II empat tahun, dan kedalaman arsipnya tidak setara. Baca bentuk sebarannya, jangan selisih jumlahnya. ' +
      '<a href="#/metode">Mengapa?</a></p>' + keterangan("ringkas") +
      '<p class="rel-cat">' + f(a.tanpaLokasi + b.tanpaLokasi) + " catatan tingkat nasional tidak punya sel di peta, tetapi tetap ada di <a href=\"#/arsip\">arsip</a>.</p></div>";
    if (F.prov) h += relProv(F.prov);
    $("#rel").innerHTML = h;
    var t = $("#rel-tutup"); if (t) t.onclick = function () { F.prov = null; gambarRel(); };
  }

  function relProv(p) {
    var x = E.tally(E.saring({ rez: "A", prov: p, mek: F.mek, dua: F.dua, tahun: F.tahun })), y = E.tally(E.saring({ rez: "B", prov: p, mek: F.mek, dua: F.dua, tahun: F.tahun }));
    var u = E.D.kisi.prov[p].unit, rows = E.saring({ prov: p, mek: F.mek, dua: F.dua, tahun: F.tahun }).slice(0, 3);
    var un = F.unit != null && E.D.kisi.unit[F.unit][1] === p ? F.unit : null;
    var lb = un != null ? E.lambangUnit(un) : [];
    return '<div class="rel-prov"><header><h3 class="j-rel">' + esc(p) + '</h3><button id="rel-tutup" aria-label="Tutup">×</button></header>' +
      '<div class="lambang-baris">' + E.gambarLambang(E.lambangProv(p)) + (un != null ? lb.map(function (x) { return E.gambarLambang(x); }).join("") +
        '<span><b>' + esc(E.D.kisi.unit[un][0]) + "</b>" + (lb.length ? esc(lb.map(function (x) { return /kota/i.test(x.jenis) ? "Kota" : "Kabupaten"; }).join(" dan ")) : "lambang belum tersedia") + "</span>" : "") + "</div>" +
      '<table class="banding"><thead><tr><th></th><th scope="col">Peta I</th><th scope="col">Peta II</th></tr></thead><tbody>' +
      baris3("Catatan media", f(x.media), f(y.media)) + baris3("Kasus resmi", f(x.resmi), f(y.resmi)) +
      baris3("Kab/kota tersentuh", f(x.unit), f(y.unit), "dari " + u) + "</tbody></table>" +
      (rows.length ? '<ul class="rel-judul">' + rows.map(function (r) { return '<li><a href="' + E.url(r.url) + '" target="_blank" rel="noopener">' + esc(r.judul) + "</a></li>"; }).join("") + "</ul>" : "") +
      '<a class="btn utama kecil" href="#/provinsi/' + E.slug(p) + '">Buka berkas provinsi</a></div>';
  }

  function gambarSiklus() {
    $("#siklus").innerHTML = E.SIKLUS.map(function (s) {
      var t = E.tally(E.saring({ siklus: s.id })), tipis = t.media + t.resmi < 30;
      return '<figure class="siklus-sel' + (tipis ? " tipis" : "") + '"><div class="papan" data-papan="siklus:' + s.id + '"></div>' +
        (tipis ? '<span class="cap-tipis">Arsip belum disapu</span>' : "") +
        "<figcaption><b>" + esc(s.judul) + "</b><span>" + f(t.media) + " media · " + f(t.resmi) + " resmi · " + f(t.unit) + " kab/kota</span></figcaption></figure>";
    }).join("");
    pasangPapan($("#siklus"));
  }

  var LN = { cakupan: "nasional", metrik: "jangkau" };
  function provCakupan(c) {
    if (c === "nasional") return E.PROVINSI;
    var g = E.PULAU.filter(function (x) { return "pulau:" + x[0] === c; })[0];
    return g ? g[1] : [c];
  }
  function gambarLintasan() {
    var sel = $("#ln-cakupan");
    if (!sel) return;
    sel.innerHTML = '<option value="nasional">Nasional (38 provinsi)</option>' + E.PULAU.map(function (g) {
      return '<optgroup label="' + esc(g[0]) + '"><option value="pulau:' + esc(g[0]) + '">Seluruh ' + esc(g[0]) + "</option>" +
        g[1].map(function (p) { return '<option value="' + esc(p) + '">' + esc(p) + "</option>"; }).join("") + "</optgroup>";
    }).join("");
    sel.value = LN.cakupan;
    sel.onchange = function () { LN.cakupan = sel.value; gambarLintasan(); };
    $("#ln-metrik").innerHTML = '<span class="seg-j">Ukuran</span>' + [["jangkau", "Jangkauan kab/kota"], ["catatan", "Jumlah catatan"]].map(function (o) {
      return '<button data-v="' + o[0] + '" aria-pressed="' + (LN.metrik === o[0]) + '">' + o[1] + "</button>";
    }).join("");
    $$("#ln-metrik button").forEach(function (b) { b.onclick = function () { LN.metrik = b.dataset.v; gambarLintasan(); }; });
    var h = E.perTahun(provCakupan(LN.cakupan)), nama = LN.cakupan === "nasional" ? "Nasional" : LN.cakupan.replace("pulau:", "Seluruh ");
    $("#ln-grafik").innerHTML = E.lintasanSvg(h, LN.metrik);
    $("#ln-judul").textContent = nama + " · " + (LN.metrik === "catatan" ? "catatan per tahun" : "jangkauan per tahun, dari " + h.unitTotal + " kab/kota");
    $("#ln-satuan").textContent = LN.metrik === "catatan" ? "jumlah catatan" : "persen kab/kota tersentuh";
    $("#ln-panas").innerHTML = E.petaPanasHtml(LN.metrik, LN.cakupan);
    $$("#ln-panas .pn-p").forEach(function (b) {
      b.onclick = function () { LN.cakupan = b.dataset.p; gambarLintasan(); $("#lintasan").scrollIntoView({ behavior: E.tenang ? "auto" : "smooth" }); };
    });
  }

  function setelahIntervensi() {
    gambarKendali(); bangunPapan(); gambarSiklus(); gambarLintasan();
    var b = $("#kendali-buka");
    b.onclick = function () { var buka = $("#kendali").classList.toggle("buka"); b.setAttribute("aria-expanded", String(buka)); };
  }

  /* ---------- SKEMA ---------- */
  function andalHtml(u) {
    return u.rendah ? '<p class="andal rendah"><b>Label perlu ditinjau.</b> Hanya ' + f(u.cocok) + " dari " + f(u.n) + " judul menyebut pintu ini, jadi pangsanya belum bisa dibaca sebagai pergeseran.</p>"
      : '<p class="andal">' + u.p + "% judul menyebut pintu ini</p>";
  }
  function skema() {
    var s = totalSemua(), a = E.mekUrut(s.a), b = E.mekUrut(s.b);
    function contoh(id, rx) {
      // label mekanisme berasal dari kelompok kata kunci, tidak semua judulnya menyebut pintu itu; yang dipajang harus menyebutnya
      var cocok = E.baris.filter(function (r) { return r.mek === id && rx.test(r.judul); });
      var pil = cocok.filter(function (r) { return r.bukti === 2; }).concat(cocok.filter(function (r) { return r.bukti === 1; }));
      return pil.slice(0, 2).map(function (r) { return '<li><a href="' + E.url(r.url) + '" target="_blank" rel="noopener">' + esc(r.judul) + "</a><span>" + esc(r.prov || "nasional") + " · " + esc(r.tgl ? r.tgl.slice(0, 4) : r.th || "") + "</span></li>"; }).join("");
    }
    return '<section class="kertas blok"><div class="lebar">' +
      kepala("Rangka Outlook", "Skema Rekayasa Elektoral", "Pertanyaan utamanya bukan seberapa banyak, tetapi lewat pintu mana. Rekayasa elektoral bekerja lewat dua lapis: aturan main yang berubah, dan rantai perintah yang menjalankannya di daerah.") +
      palang("Gambar 5", "Rantai perintah yang dilaporkan") +
      '<div class="rantai" role="img" aria-label="Eksekutif petahana menekan lewat lima pintu menuju sasaran">' +
        '<div class="r-kol r-asal"><span class="r-j">Pemegang kuasa</span><b>Eksekutif petahana</b><p>Kepala daerah, penjabat, pejabat di atasnya</p></div>' +
        '<div class="r-panah" aria-hidden="true"></div>' +
        '<div class="r-kol r-pintu"><span class="r-j">Pintu</span>' + E.MEKANISME.map(function (m) { return "<div><b>" + esc(m.pintu) + "</b></div>"; }).join("") + "</div>" +
        '<div class="r-panah" aria-hidden="true"></div>' +
        '<div class="r-kol r-sasaran"><span class="r-j">Sasaran</span>' + E.MEKANISME.map(function (m) { return "<div>" + esc(m.sasaran) + "</div>"; }).join("") + "</div>" +
        '<div class="r-panah" aria-hidden="true"></div>' +
        '<div class="r-kol r-asal akhir"><span class="r-j">Tujuan</span><b>Suara</b><p>Keuntungan elektoral bagi petahana atau jagoannya</p></div>' +
      "</div>" +

      '<div class="palang-jarak">' + palang("Gambar 6", "Lima mekanisme, dua peta") + '</div>' +
      '<p class="lead sempit">Pangsa dihitung di dalam periodenya masing-masing, jadi perbedaan jumlah mentah antarperiode tidak memengaruhinya. Mekanisme ditentukan oleh kelompok kata kunci, tidak ada model bahasa yang menggolongkan baris.</p>' +
      '<div class="mek-daftar">' + E.MEKANISME.map(function (m, i) {
        var u = E.keandalan(m);
        return '<article class="mek' + (u.rendah ? " rendah" : "") + '"><span class="mek-no">' + (i + 1) + '</span><div class="mek-a"><h3 class="j3">' + esc(m.pendek) + "</h3><p>" + esc(m.def) + "</p></div>" +
          '<div class="mek-b">' + E.batangPasang(a[i], b[i]) + andalHtml(u) + '</div><ul class="mek-c">' + contoh(m.id, m.ciri) + "</ul></article>";
      }).join("") + "</div>" +
      '<p class="rel-cat"><i class="sw-rez a"></i> Peta I &nbsp; <i class="sw-rez b"></i> Peta II. Angka miring: jumlah catatan.</p>' +
    "</div></section>" +

    '<section class="malam blok"><div class="lebar">' + palang("Gambar 7", "Aturan main yang berubah") +
      '<div class="dua-kol"><h2 class="j2">Sepuluh titik patah, 2014–2025.</h2><p class="lead">Peta tidak berdiri sendiri. Setiap titik di bawah mengubah siapa yang memegang kuasa di daerah menjelang pemungutan suara, atau siapa yang mengawasinya.</p></div>' +
      '<ol class="patah">' + E.PATAH.map(function (p) {
        return '<li class="' + (p.kunci ? "kunci" : "") + '"><time>' + esc(p.t) + "</time><div><b>" + (p.url ? '<a href="' + E.url(p.url) + '" target="_blank" rel="noopener">' + esc(p.j) + "</a>" : esc(p.j)) + "</b><p>" + esc(p.k) + "</p></div></li>";
      }).join("") + "</ol>" +
    "</div></section>" +

    '<section class="kertas blok pendek"><div class="lebar">' + palang("Analisis", "Bacaan tim") +
      '<div class="tiga">' + menyusul("Apa yang berubah dari Peta I ke Peta II", "Tafsir tim atas pergeseran pangsa mekanisme.") + menyusul("Peran penjabat", "Apakah pola berbeda di daerah yang dipimpin penjabat dibanding petahana definitif.") + menyusul("Patahan pengawasan", "Dampak pembubaran KASN pada deret kasus resmi.") + "</div>" +
    "</div></section>";
  }

  /* ---------- PROVINSI ---------- */
  function provinsi() {
    var data = E.PROVINSI.map(function (p) {
      var a = E.tally(E.saring({ rez: "A", prov: p })), b = E.tally(E.saring({ rez: "B", prov: p })), u = E.D.kisi.prov[p].unit;
      var medAll = a.media + b.media, kasAll = a.resmi + b.resmi;
      return { p: p, a: a, b: b, u: u, cat: medAll && kasAll ? 4 : kasAll ? 3 : medAll ? 2 : 0 };
    });
    var tegel = data.map(function (d) {
      var T = E.TEGEL[d.p], pa = persen(d.a.unit, d.u), pb = persen(d.b.unit, d.u);
      return '<a class="tegel cat' + d.cat + '" style="grid-column:' + (T[0] + 1) + ";grid-row:" + (T[1] + 1) + '" href="#/provinsi/' + E.slug(d.p) + '" aria-label="' + esc(d.p) + ": Peta I " + pa + " persen, Peta II " + pb + ' persen kab/kota tersentuh"><b class="tg-p">' + T[2] + '</b><b class="tg-k">' + T[3] + '</b><span class="tg-bar"><i class="a" style="width:' + pa + '%"></i></span><span class="tg-bar"><i class="b" style="width:' + pb + '%"></i></span></a>';
    }).join("");
    var urut = data.slice().sort(function (x, y) { return persen(y.b.unit, y.u) - persen(x.b.unit, x.u) || x.p.localeCompare(y.p); });
    return '<section class="malam blok"><div class="lebar">' +
      kepala("Rujukan", "Berkas Provinsi", "Tiap tegel adalah satu provinsi, semua berukuran sama. Dua batang di dalamnya: pangsa kab/kota yang punya catatan di Peta I dan Peta II.") +
      palang("Gambar 8", "38 provinsi") +
      '<div class="tegel-grid">' + tegel + "</div>" +
      '<p class="rel-cat terang"><i class="sw-rez a"></i> Peta I &nbsp; <i class="sw-rez b"></i> Peta II &nbsp;·&nbsp; warna tepi: deret yang hadir, seperti pada peta.</p>' +
    "</div></section>" +
    '<section class="kertas blok pendek"><div class="lebar">' + palang("Tabel 1", "Semua provinsi") +
      '<div class="gulir"><table class="tabel"><thead><tr><th scope="col">Provinsi</th><th scope="col" class="r">Media I</th><th scope="col" class="r">Media II</th><th scope="col" class="r">Resmi I</th><th scope="col" class="r">Resmi II</th><th scope="col" class="r">Kab/kota I</th><th scope="col" class="r">Kab/kota II</th></tr></thead><tbody>' +
      urut.map(function (d) {
        return '<tr><th scope="row"><a href="#/provinsi/' + E.slug(d.p) + '">' + esc(d.p) + '</a></th><td class="r">' + f(d.a.media) + '</td><td class="r">' + f(d.b.media) + '</td><td class="r">' + f(d.a.resmi) + '</td><td class="r">' + f(d.b.resmi) + '</td><td class="r">' + d.a.unit + " / " + d.u + '</td><td class="r">' + d.b.unit + " / " + d.u + "</td></tr>";
      }).join("") + "</tbody></table></div></div></section>";
  }

  function berkasProv(slug) {
    var p = E.PROVINSI.filter(function (x) { return E.slug(x) === slug; })[0];
    if (!p) return '<section class="kertas blok"><div class="lebar"><h1 class="j-hal">Provinsi tidak ditemukan</h1><p><a href="#/provinsi">Kembali ke daftar</a></p></div></section>';
    var a = E.tally(E.saring({ rez: "A", prov: p })), b = E.tally(E.saring({ rez: "B", prov: p })), u = E.D.kisi.prov[p].unit;
    var rows = E.saring({ prov: p }), ma = E.mekUrut(a), mb = E.mekUrut(b), vb = vbProv(p).join(",");
    var kab = {};
    rows.forEach(function (r) { r.unit.forEach(function (i) { var n = E.D.kisi.unit[i][0]; kab[n] = (kab[n] || 0) + 1; }); });
    var kabU = Object.keys(kab).sort(function (x, y) { return kab[y] - kab[x]; }).slice(0, 8);
    var dek = a.media + b.media + " catatan media dan " + (a.resmi + b.resmi) + " kasus resmi. " + (a.resmi + b.resmi && a.media + b.media ? "Dua deret hadir di provinsi ini." : a.resmi + b.resmi ? "Hanya kasus resmi: pengawas mencatat, berita tidak ditemukan." : "Hanya pemberitaan: belum ada perkara resmi yang ditemukan.");
    return '<section class="malam blok"><div class="lebar"><p class="remah"><a href="#/provinsi">Berkas Provinsi</a> / ' + esc(p) + "</p>" +
      E.gambarLambang(E.lambangProv(p), "lambang besar") +
      kepala("Berkas provinsi", p, esc(dek)) +
      '<div class="berkas-papan">' + ["A", "B"].map(function (k) {
        var R = E.REZIM[k], x = k === "A" ? a : b;
        return '<figure class="papan-bingkai"><figcaption class="papan-kap"><span class="no">Peta ' + R.no + "</span><b>" + esc(R.judul) + '</b><span class="kanan">' + x.unit + " / " + u + " kab/kota</span></figcaption>" +
          '<div class="papan prov" data-papan="' + k + '" data-prov="' + esc(p) + '" data-vb="' + vb + '"></div></figure>';
      }).join("") + "</div></div></section>" +
      '<section class="kertas blok pendek"><div class="lebar">' + palang("Lintasan waktu", "jangkauan per tahun") +
      '<figure class="gbr tanpa-garis"><div class="gulir">' + E.lintasanSvg(E.perTahun([p]), "jangkau") + '</div><figcaption>Bagian kab/kota di ' + esc(p) + ' yang punya sedikitnya satu catatan per tahun. Bandingkan dengan provinsi lain di <a href="#/intervensi/lintasan">peta panas</a>.</figcaption></figure>' +
      '<div class="berkas-isi" style="margin-top:clamp(36px,4vw,56px)"><div>' + palang("Mekanisme") +
      '<div class="mek-ringkas">' + E.MEKANISME.map(function (m, i) { return ma[i].n + mb[i].n ? '<div><span>' + esc(m.pendek) + "</span>" + E.batangPasang(ma[i], mb[i]) + "</div>" : ""; }).join("") + "</div>" +
      palang("Kab/kota paling sering disebut") + '<ol class="kab-daftar">' + kabU.map(function (n) { return "<li><span>" + E.gambarLambang(E.lambangUnit(E.indeksUnit[p + "|" + n])[0], "lambang kecil") + esc(n) + "</span><b>" + kab[n] + "</b></li>"; }).join("") + "</ol>" +
      menyusul("Catatan analis", "Konteks politik provinsi ini.") +
      "</div><div>" + palang("Semua catatan", f(rows.length)) + '<ul class="cat-daftar">' + rows.slice(0, 60).map(bukaBaris).join("") + "</ul>" +
      (rows.length > 60 ? '<p class="rel-cat">' + f(rows.length - 60) + ' catatan lain ada di <a href="#/arsip">arsip</a>.</p>' : "") +
      "</div></div></div></section>";
  }

  /* ---------- ARSIP ---------- */
  function arsip() {
    function pil(id, lab, ops) { return '<label class="pil"><span>' + esc(lab) + '</span><select id="' + id + '"><option value="">Semua</option>' + ops.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + "</option>"; }).join("") + "</select></label>"; }
    return '<section class="kertas blok"><div class="lebar">' +
      kepala("Rujukan", "Arsip Catatan", "Setiap catatan menaut ke sumbernya. Catatan adalah <b>laporan</b>, bukan temuan yang sudah diadili. Titik di kiri tiap baris menunjukkan tingkat bukti.") +
      '<div class="arsip-kendali"><label class="cari"><span>Cari</span><input id="a-q" type="search" placeholder="Kata dalam judul, kab/kota, atau outlet" value="' + esc(A.q) + '"></label>' +
      pil("a-rez", "Peta", [["A", "Peta I"], ["B", "Peta II"]]) +
      pil("a-mek", "Mekanisme", E.MEKANISME.map(function (m) { return [m.id, m.pendek]; })) +
      pil("a-bukti", "Bukti", [["1", "Satu sumber"], ["2", "Dua sumber"], ["3", "Kasus resmi"]]) +
      pil("a-prov", "Provinsi", E.PROVINSI.map(function (p) { return [p, p]; })) +
      '</div><p class="arsip-hitung" id="a-hitung" role="status"></p><ul class="cat-daftar lebar-penuh" id="a-daftar"></ul><div class="aksi tengah"><button class="btn gelap" id="a-lagi" hidden>Muat 40 lagi</button></div></div></section>';
  }
  function setelahArsip() {
    var hasil = [];
    function saring() {
      var q = A.q.toLowerCase();
      hasil = E.baris.filter(function (r) {
        if (A.rez && r.rez !== A.rez) return false;
        if (A.mek && r.mek !== A.mek) return false;
        if (A.bukti && r.bukti !== +A.bukti) return false;
        if (A.prov && r.prov !== A.prov) return false;
        return !q || (r.judul + " " + (r.kab || "") + " " + (r.prov || "") + " " + r.outlet).toLowerCase().indexOf(q) >= 0;
      });
      tampil();
    }
    function tampil() {
      $("#a-hitung").textContent = f(hasil.length) + " catatan" + (hasil.length > A.n ? ", menampilkan " + f(A.n) + " terbaru" : "");
      $("#a-daftar").innerHTML = hasil.slice(0, A.n).map(bukaBaris).join("");
      $("#a-lagi").hidden = hasil.length <= A.n;
    }
    ["rez", "mek", "bukti", "prov"].forEach(function (k) { var el = $("#a-" + k); el.value = A[k]; el.onchange = function () { A[k] = el.value; A.n = 40; saring(); }; });
    var tunda;
    $("#a-q").oninput = function (e) { clearTimeout(tunda); tunda = setTimeout(function () { A.q = e.target.value; A.n = 40; saring(); }, 160); };
    $("#a-lagi").onclick = function () { A.n += 40; tampil(); };
    saring();
  }

  /* ---------- RUU PEMILU ---------- */
  function hantuKursi() {
    var h = "";
    [68, 54, 47, 41, 36, 30, 24, 19, 15, 11, 8, 5].forEach(function (x) { h += '<i style="height:' + x + '%"></i>'; });
    return '<div class="hantu" aria-hidden="true"><div class="hantu-bar">' + h + '</div><div class="hantu-garis" style="bottom:22%"></div></div>';
  }
  /* Peta posisi aktor (Fokus 2). Diisi bot posisi dan tim Beckham di data/posisi_aktor.json; skemanya tertutup di
     data/posisi_skema.json dan dicek scripts/cek_posisi.py sebelum terbit. Halaman ini hanya menampilkan. */
  function petaPosisi() {
    var S = E.D.posisi_skema, P = (E.D.posisi_aktor || []).slice().sort(function (a, b) { return a.tanggal < b.tanggal ? 1 : -1; });
    var h = palang("Gambar 10", "Peta posisi aktor") +
      '<div class="dua-kol"><h2 class="j2">Siapa mendorong apa?</h2><p class="lead">Posisi masyarakat sipil, elit parlemen, dan elit non-parlemen soal ambang batas parlemen dan syarat pencapresan. Setiap posisi menaut ke pernyataan aslinya.</p></div>';
    if (!S || !P.length) return h + menyusul("Peta posisi sedang disusun", "Tim sedang memetakan tiga kelompok aktor. Setiap baris nanti memuat kutipan, tanggal, dan tautan sumber.");
    function baris(x) {
      return '<li><span class="sikap">' + esc(x.sikap) + (x.angka ? " " + esc(x.angka) : "") + "</span><b>" + esc(x.aktor) + "</b>" +
        (x.lembaga ? '<span class="ps-lbg">' + esc(x.lembaga) + "</span>" : "") + "<q>" + esc(x.kutipan) + "</q>" +
        '<a href="' + E.url(x.sumber_url) + '" target="_blank" rel="noopener">' + esc(x.outlet || "sumber") + " · " + esc(E.tgl(x.tanggal)) + "</a>" +
        (x.status !== "dicek tim" ? '<span class="ps-oto">belum dicek tim</span>' : "") + "</li>";
    }
    h += '<div class="posisi"><div class="ps-kepala"><span></span>' + S.isu.map(function (i) { return "<span>" + esc(i.id) + "</span>"; }).join("") + "</div>";
    S.jenis_aktor.forEach(function (j) {
      h += '<div class="ps-baris"><b>' + esc(j) + "</b>" + S.isu.map(function (i) {
        var r = P.filter(function (x) { return x.jenis_aktor === j && x.isu === i.id; });
        return '<ul class="ps-sel" data-isu="' + esc(i.id) + '">' + (r.length ? r.map(baris).join("") : '<li class="ps-kosong">belum ada catatan</li>') + "</ul>";
      }).join("") + "</div>";
    });
    return h + "</div>" + '<p class="rel-cat">' + f(P.length) + " pernyataan · " + f(P.filter(function (x) { return x.status === "dicek tim"; }).length) + " sudah dicek tim. Sikap diambil dari kutipan, bukan ditafsirkan.</p>";
  }

  /* Konstelasi sikap ambang batas parlemen (Gambar 9a-9b). Data: data/sikap_pt.json, dari analisis terpadu tim RUU
     Pemilu dan laporan singkat Komisi II DPR. Logo dari Wikipedia/Wikidata (scripts/ambil_logo_aktor.py); yang tidak
     punya logo tampil sebagai monogram. Sumbu 0-7,5%: kiri keterwakilan, kanan efektivitas. */
  var KEL = [["masyarakat sipil", "Masyarakat sipil"], ["partai nonparlemen", "Partai nonparlemen"], ["partai parlemen", "Partai parlemen"]];
  function chipAktor(a, i) {
    var L = (E.D.logo_aktor || {})[a.kode];
    return '<button class="k-chip' + (L ? "" : " mono") + '" data-i="' + i + '" title="' + esc(a.nama + " · " + (a.label || "tanpa angka")) + '">' +
      (L ? '<img src="' + E.ASET + "logo-aktor/" + esc(L.gambar) + '" alt="' + esc(a.nama) + '">' : "<span>" + esc(a.pendek || a.nama) + "</span>") + "</button>";
  }
  function konstelasi() {
    var S = E.D.sikap_pt;
    if (!S) return "";
    var semua = S.aktor.concat(S.tanpa_angka), X = function (v) { return (v / 7.5 * 100).toFixed(2) + "%"; };
    var h = '<div class="kons"><div class="kons-isi">';
    KEL.forEach(function (k) {
      var grup = {};
      S.aktor.forEach(function (a, i) { if (a.kelompok !== k[0]) return; var t = a.titik != null ? a.titik : (a.min + a.maks) / 2; (grup[t] = grup[t] || []).push(i); });
      var baris = 1, isi = "";
      Object.keys(grup).forEach(function (t) {
        var ids = grup[t], kol = ids.length > 3 ? 2 : 1, br = Math.ceil(ids.length / kol);
        baris = Math.max(baris, br);
        ids.forEach(function (i) {
          var a = S.aktor[i];
          if (a.min < a.maks) isi += '<span class="k-rentang" style="left:' + X(a.min) + ";width:" + X(a.maks - a.min) + '"></span>';
        });
        isi += '<div class="k-klaster" style="left:' + X(+t) + ";width:" + (kol * 50) + 'px">' + ids.map(function (i) { return chipAktor(S.aktor[i], i); }).join("") + "</div>";
      });
      h += '<div class="kons-lajur"><span class="kl-j">' + esc(k[1]) + '</span><div class="kl-area" style="height:' + (baris * 50 + 8) + 'px">' + isi + "</div></div>";
    });
    h += '<div class="kons-sumbu"><span class="ks-pita"></span>' + [0, 1, 2, 3, 4, 5, 6, 7].map(function (v) { return '<span class="ks-t" style="left:' + X(v) + '">' + v + "%</span>"; }).join("") +
      '<span class="ks-ujung kiri">← Keterwakilan: inklusif, lebih sedikit suara terbuang</span><span class="ks-ujung kanan">Efektivitas: lebih sedikit partai, pemerintahan lebih lincah →</span></div>';
    h += '</div></div><div class="kons-tanpa"><span class="kl-j">Tanpa angka</span>' + S.tanpa_angka.map(function (a, j) { return chipAktor(a, S.aktor.length + j); }).join("") + "</div>";
    return h + '<div class="kons-detail" id="kons-detail" aria-live="polite"></div>';
  }
  function detailAktor(i) {
    var S = E.D.sikap_pt, a = S.aktor.concat(S.tanpa_angka)[i], L = (E.D.logo_aktor || {})[a.kode];
    $("#kons-detail").innerHTML = (L ? '<img src="' + E.ASET + "logo-aktor/" + esc(L.gambar) + '" alt="">' : '<span class="k-chip mono statis"><span>' + esc(a.pendek || a.nama) + "</span></span>") +
      '<div><p class="kicker">' + esc(a.kelompok) + (a.tanggal ? " · " + esc(E.tgl(a.tanggal)) : "") + '</p><h3 class="j3">' + esc(a.nama) + ' <span class="sikap">' + esc(a.label || "tanpa angka") + "</span></h3><p>" + esc(a.catatan) + "</p>" +
      (a.sumber.length ? '<p class="k-sumber">' + a.sumber.map(function (x) { return '<a href="' + (/^https?:/.test(x[1]) ? E.url(x[1]) : E.ASET + esc(x[1])) + '" target="_blank" rel="noopener">' + esc(x[0]) + "</a>"; }).join(" · ") + "</p>" : '<p class="k-sumber">Sumber: ' + esc(S.sumber_tim) + "</p>") + "</div>";
    $$(".k-chip[data-i]").forEach(function (c) { c.classList.toggle("on", +c.dataset.i === i); });
  }
  function simulasi() {
    var S = E.D.sikap_pt.simulasi, L = E.D.logo_aktor || {};
    var st = function (v, t) { return v < t ? ["tidak", "tidak lolos"] : v - t < 0.5 ? ["tipis", "lolos tipis"] : ["lolos", "lolos"]; };
    var h = '<table class="tabel sim"><thead><tr><th scope="col">Partai</th><th scope="col" class="r">Suara 2024</th><th scope="col" class="r">Kursi</th>' + S.ambang.map(function (t) { return '<th scope="col">Ambang ' + t + "%</th>"; }).join("") + "</tr></thead><tbody>";
    S.partai.forEach(function (r) {
      h += '<tr><th scope="row">' + (L[r[0]] ? '<img class="sim-logo" src="' + E.ASET + "logo-aktor/" + esc(L[r[0]].gambar) + '" alt="">' : "") + esc(r[1]) + '</th><td class="r">' + String(r[2]).replace(".", ",") + '%</td><td class="r">' + r[3] + "</td>" +
        S.ambang.map(function (t) { var x = st(r[2], t); return '<td class="sim-' + x[0] + '">' + x[1] + "</td>"; }).join("") + "</tr>";
    });
    h += '<tr class="sim-jumlah"><th scope="row">Partai yang lolos</th><td></td><td></td>' + S.ambang.map(function (t) { return "<td>" + S.partai.filter(function (r) { return r[2] >= t; }).length + " dari " + S.partai.length + "</td>"; }).join("") + "</tr>";
    h += '<tr class="sim-jumlah"><th scope="row">Suara partai-partai ini yang hilang</th><td></td><td></td>' + S.ambang.map(function (t) { var v = 0; S.partai.forEach(function (r) { if (r[2] < t) v += r[2]; }); return "<td>" + (v ? String(v.toFixed(1)).replace(".", ",") + "%" : "0") + "</td>"; }).join("") + "</tr>";
    return h + "</tbody></table>";
  }
  function rdpu() {
    var R = E.D.sikap_pt.rdpu;
    return '<article class="rdpu"><time>' + esc(E.tgl(R.tanggal)) + '</time><h3 class="j3">' + esc(R.judul) + '</h3><ul>' + R.butir.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") + "</ul><p>" + esc(R.catatan_rapat) +
      ' <a href="' + E.ASET + esc(R.berkas) + '" target="_blank" rel="noopener">Laporan singkat Komisi II DPR (PDF)</a></p></article>';
  }
  function setelahRuu() {
    $$(".k-chip[data-i]").forEach(function (c) { c.onclick = function () { detailAktor(+c.dataset.i); }; });
    if ($("#kons-detail")) detailAktor(0);
  }

  function ruu() {
    return '<section class="kertas blok"><div class="lebar">' +
      kepala("Fokus 2", "RUU Pemilu", "Studi baru tentang revisi aturan pemilu, khususnya ambang batas parlemen dan syarat pencapresan, sebagai konteks relevansi peta politik 2027–2029.") +
      '<div class="status-ruu"><span class="kicker">Status</span><p>Per 7 November 2026, Ketua Komisi II DPR menyebut rapat Panja RUU Pemilu <a href="https://kumparan.com/kumparannews/komisi-ii-dpr-sodorkan-2-opsi-skenario-ke-pemerintah-soal-pembentukan-timsel-kpu-28Wo9zmWus0" target="_blank" rel="noopener">mulai 11 November 2026</a>, setelah rapat perdana batal digelar di masa reses. Angka ambang batas belum diputuskan. Halaman ini diperbarui mengikuti naskah.</p></div>' +
      palang("Gambar 9", "Tiga putusan yang memaksa revisi") +
      '<div class="tiga putusan">' + [E.PATAH[7], E.PATAH[8], E.PATAH[9]].map(function (p) {
        return '<article class="kartu-put"><time>' + esc(p.t) + '</time><h3 class="j3"><a href="' + E.url(p.url) + '" target="_blank" rel="noopener">' + esc(p.j) + "</a></h3><p>" + esc(p.k) + "</p></article>";
      }).join("") + "</div>" +
    "</div></section>" +

    '<section class="kertas blok" id="konstelasi"><div class="lebar">' + palang("Gambar 9a", "Konstelasi sikap ambang batas parlemen") +
      '<div class="dua-kol"><h2 class="j2">Efektif, atau mewakili?</h2><p class="lead">Ambang batas parlemen memaksa pilihan antara dua nilai yang sama-sama sah. Outlook ini memakai pendekatan eklektik: tidak memilih satu kutub, tetapi menimbang keduanya.</p></div>' +
      '<div class="tiga kutub"><div class="ktb wakil"><p class="kicker">Kutub keterwakilan</p><h3 class="j3">Inklusif, sampai 0%</h3><p>Makin rendah ambang, makin sedikit suara yang tidak menjadi kursi dan makin beragam aspirasi yang terwakili. Harganya: parlemen lebih terfragmentasi. Dipegang masyarakat sipil dan partai nonparlemen.</p></div>' +
      '<div class="ktb tengah"><p class="kicker">Pendekatan Outlook ini</p><h3 class="j3">Eklektik: menimbang keduanya</h3><p>Putusan MK 116/PUU-XXI/2023 meminta angka ambang ditata ulang dengan menimbang proporsionalitas hasil pemilu, penyederhanaan partai, dan partisipasi bermakna, lewat perhitungan yang terbuka. Ukurannya: berapa efektivitas yang dibeli dengan berapa suara yang hilang.</p></div>' +
      '<div class="ktb efektif"><p class="kicker">Kutub efektivitas</p><h3 class="j3">Ramping: 5–7%</h3><p>Makin tinggi ambang, makin sedikit partai dan fraksi, negosiasi legislasi lebih sederhana, dan pemerintahan lebih stabil. Harganya: jutaan suara tidak menjadi kursi, 17,3 juta pada 2024 menurut Perindo. Dipegang sebagian besar partai parlemen.</p></div></div>' +
      '<p class="rel-cat">Setiap logo diletakkan pada angka yang diusulkan aktornya; garis menunjukkan rentang usulan. Klik logo untuk sumbernya.</p>' + konstelasi() +
      '<p class="rel-cat">Sumber: analisis terpadu tim RUU Pemilu EPPOS (Nov 2026) dan pemberitaan yang dihimpunnya; RDPU Komisi II DPR 12 Nov 2026. Angka mengikuti materi sumber. Logo dari Wikipedia/Wikimedia Commons; organisasi tanpa logo publik tampil sebagai monogram.</p>' +
      '<div class="palang-jarak">' + palang("Gambar 9b", "Simulasi ambang 4–7%") + '</div>' +
      '<div class="dua-kol ruu-kol"><div class="gulir">' + simulasi() + '<p class="rel-cat">' + esc(E.D.sikap_pt ? E.D.sikap_pt.simulasi.catatan : "") + ' Hanya delapan partai parlemen; partai di bawah 4% pada 2024 tidak tercantum di materi sumber.</p></div>' + rdpu() + "</div>" +
    "</div></section>" +

    '<section class="kertas blok pendek" id="posisi"><div class="lebar">' + petaPosisi() + "</div></section>" +

    '<section class="malam blok"><div class="lebar">' + palang("Bagian 1", "Ambang batas parlemen") +
      '<div class="dua-kol ruu-kol"><div><h2 class="j2">Berapa suara yang boleh terbuang?</h2><p class="lead">MK meminta angka 4 persen diubah sebelum 2029 tanpa menentukan angka baru. Bagian ini menyimulasikan kursi DPR pada beberapa ambang berbeda dengan hasil Pemilu 2024.</p>' +
      menyusul("Pertanyaan kajian", "Berapa suara hangus pada tiap ambang? Partai mana yang berubah posisi? Apa dampaknya pada koalisi 2029?") +
      '</div><figure class="slot"><figcaption><span class="menyusul-tag">Slot gambar</span><b>Simulasi kursi DPR pada ambang 0 sampai 5 persen</b><span>Bentuk ilustratif, belum berisi data. Menunggu rekapitulasi KPU.</span></figcaption>' + hantuKursi() + "</figure></div>" +
    "</div></section>" +

    '<section class="kertas blok"><div class="lebar">' + palang("Bagian 2", "Syarat pencapresan") +
      '<div class="dua-kol ruu-kol"><figure class="slot terang"><figcaption><span class="menyusul-tag">Slot gambar</span><b>Skenario jumlah pasangan calon 2029</b><span>Bentuk ilustratif, belum berisi data.</span></figcaption><div class="hantu-kotak" aria-hidden="true"><i></i><i></i><i></i><i></i></div></figure>' +
      '<div><h2 class="j2">Sesudah 20 persen dihapus, siapa yang menjaga pintu?</h2><p class="lead">Putusan 62/PUU-XXII/2024 menghapus ambang pencalonan presiden. Pertanyaannya bergeser ke rekayasa konstitusional yang akan mengisi kekosongan itu dalam RUU.</p>' +
      menyusul("Pertanyaan kajian", "Skenario apa yang dibahas? Bagaimana insentif koalisi berubah bila semua partai peserta bisa mencalonkan?") + "</div></div>" +
    "</div></section>" +

    '<section class="kertas blok pendek"><div class="lebar">' + palang("Bagian 3", "Peta politik 2027–2029") +
      '<div class="dua-kol"><h2 class="j2">Bagaimana peta intervensi membaca RUU?</h2><p class="lead">Kalau pemilu nasional dan pilkada dipisah lagi, kepala daerah tidak lagi menghadapi dua pemilihan sekaligus. Peta I dan Peta II memberi gambaran awal tentang apa yang bisa berubah.</p></div>' +
      '<div class="tiga tahun">' + ["2027", "2028", "2029"].map(function (t) { return '<div class="kol-tahun"><b>' + t + "</b>" + menyusul("Yang perlu dipantau", "") + "</div>"; }).join("") + "</div>" +
    "</div></section>";
  }

  /* ---------- METODE ---------- */
  function metode() {
    var s = totalSemua(), t = s.t, r = E.D.ringkas || {}, m = E.D.manifest || {};
    var satu = E.baris.filter(function (x) { return x.bukti === 1; }).length, dua = E.baris.filter(function (x) { return x.bukti === 2; }).length, res = E.baris.filter(function (x) { return x.bukti === 3; }).length;
    var kir = E.baris.filter(function (x) { return x.kira; }).length;
    var alur = [[E.D.kemajuan ? E.D.kemajuan.sel_selesai : 0, "pencarian dijalankan", "kata kunci × outlet × jendela waktu"], [r.kandidat, "kandidat berita", "judul yang cocok dengan kata kunci"], [t.media, "lolos aturan lingkup", "aturan tertulis, tanpa model bahasa"], [dua, "diberitakan dua outlet", "tingkat bukti kedua"]];
    return '<section class="kertas blok"><div class="lebar">' +
      kepala("Rujukan · data " + esc(m.version || ""), "Metode dan Batasan", "Kami mengklaim sensus insiden yang <b>dapat ditemukan lewat prosedur tertulis</b>, tidak pernah kelengkapan.") +
      palang("Gambar 11", "Dari pencarian ke catatan") +
      '<ol class="alur">' + alur.map(function (a) { return '<li><b>' + f(a[0] || 0) + "</b><span>" + esc(a[1]) + "</span><small>" + esc(a[2]) + "</small></li>"; }).join("") + "</ol>" +
      '<div class="palang-jarak">' + palang("Tabel 2", "Tingkat bukti") + "</div>" +
      '<div class="gulir"><table class="tabel bukti-t"><thead><tr><th scope="col">Tingkat</th><th scope="col">Arti</th><th scope="col" class="r">Catatan</th></tr></thead><tbody>' +
      "<tr><td>" + E.bukti(1) + "</td><td><b>Satu sumber.</b> Satu outlet, diterima otomatis oleh aturan lingkup. Belum dibaca manusia.</td><td class=\"r\">" + f(satu) + "</td></tr>" +
      "<tr><td>" + E.bukti(2) + "</td><td><b>Dua sumber.</b> Dua outlet berbeda memberitakan tempat dan mekanisme yang sama dalam tujuh hari.</td><td class=\"r\">" + f(dua) + "</td></tr>" +
      "<tr><td>" + E.bukti(3) + "</td><td><b>Kasus resmi.</b> Perkara yang masuk jalur Bawaslu, DKPP, BKN, KPK, atau MK. Baris otomatis dari situs Bawaslu ditandai belum diverifikasi.</td><td class=\"r\">" + f(res) + "</td></tr>" +
      "</tbody></table></div>" +
      '<div class="palang-jarak">' + palang("Batasan") + "</div>" +
      '<div class="tiga">' +
      "<div><h3 class=\"j3\">Bias pers</h3><p>Deret media condong ke wilayah dengan pers aktif. Deret kasus resmi condong ke wilayah dengan pengawas yang bekerja. Keduanya meleset ke arah berlawanan, dan selisihnya adalah temuan.</p></div>" +
      "<div><h3 class=\"j3\">Arsip yang menipis</h3><p>Hanya " + f(E.saring({ siklus: "2009" }).length + E.saring({ siklus: "2014" }).length) + " catatan berasal dari sebelum Juli 2014. Jendela sapuan dimulai dari Pilkada 2015, dan banyak arsip daring lama sudah hilang.</p></div>" +
      "<div><h3 class=\"j3\">Letak perkiraan</h3><p>" + f(kir) + " catatan ditempatkan dari nama outlet atau baris tanggal berita, bukan dari isi judul. Mereka ditandai perkiraan di arsip. Batas antarsel di peta juga perkiraan, dan luas sel mengikuti luas wilayah, bukan bobotnya.</p></div>" +
      "</div>" +
      '<div class="palang-jarak">' + palang("Koreksi dan kutipan") + "</div>" +
      '<div class="tiga dua-saja"><div><h3 class="j3">Ada yang keliru?</h3><p>Catatan yang dikoreksi tidak dihapus, melainkan diberi status dan tautan ke koreksinya.</p>' + menyusul("Kanal koreksi", "Alamat surel tim dicantumkan saat publikasi.") + '</div>' +
      '<div><h3 class="j3">Cara mengutip</h3><p class="kutip">EPPOS Group, PolGov, Departemen Politik dan Pemerintahan UGM. (2026). <i>EPPOS Political Outlook</i>. Data versi ' + esc(m.version || "") + ". " + URL_SITUS + "</p></div></div>" +
    "</div></section>";
  }

  /* ---------- PRESENTASI ---------- */
  function kakiPlat(sumber) {
    var m = E.D.manifest || {};
    return '<footer class="pl-kaki"><span>' + esc(sumber || "Catatan adalah laporan, bukan temuan yang sudah diadili.") + " Data versi " + esc(m.version || "") + '.</span><span class="pl-url">' + URL_SITUS + "</span></footer>";
  }
  function kepalaPlat(no, j, kicker, terang) {
    return '<header class="pl-kepala"><div><p class="kicker">' + esc(kicker) + '</p><h2 class="pl-j">' + j + '</h2></div>' + logoDua(terang) + "</header>";
  }
  function statPlat(x) {
    return '<dl class="pl-stat"><div><dt>Catatan media</dt><dd>' + f(x.media) + "</dd></div><div><dt>Kasus resmi</dt><dd>" + f(x.resmi) + "</dd></div><div><dt>Kab/kota</dt><dd>" + f(x.unit) + "<small> / " + E.nUnit + "</small></dd></div><div><dt>Provinsi</dt><dd>" + f(x.prov) + "</dd></div></dl>";
  }
  function daftarPlat() {
    var s = totalSemua(), a = E.mekUrut(s.a), b = E.mekUrut(s.b);
    return [
      '<section class="plat malam sampul"><div class="sampul-atas"><p class="kicker">PolGov, Departemen Politik dan Pemerintahan UGM · 2 Desember 2026</p>' + logoDua(false) + '</div><h1 class="hero-j">EPPOS Political<br>Outlook</h1><div class="sampul-bawah"><div><p class="hero-tesis">Satu tahun, dua pemilihan.</p><p class="hero-dek">Membaca skema rekayasa elektoral, dari intervensi eksekutif sampai RUU Pemilu.</p></div><div class="sampul-papan papan" data-papan="B" data-label="1"></div></div></section>',
      '<section class="plat kertas">' + kepalaPlat(2, "Hanya 2024 yang menyatukan keduanya.", "Mengapa ada dua peta", true) + '<div class="pl-isi tengah-v">' + E.kalender(82) + "</div>" + kakiPlat("Segi enam berongga: rencana menurut Putusan MK 135/PUU-XXII/2024, menunggu RUU Pemilu.") + "</section>",
      '<section class="plat malam">' + kepalaPlat(3, "Peta I. Sebelum 2024", "Pemilu dan pilkada di tahun yang berbeda · 2009 – Juni 2022") + statPlat(s.a) + '<div class="pl-papan papan" data-papan="A" data-label="1"></div>' + keterangan("baris") + kakiPlat() + "</section>",
      '<section class="plat malam">' + kepalaPlat(4, "Peta II. 2024 dan sesudahnya", "Pemilu dan pilkada di tahun yang sama · Juni 2022 – kini") + statPlat(s.b) + '<div class="pl-papan papan" data-papan="B" data-label="1"></div>' + keterangan("baris") + kakiPlat() + "</section>",
      '<section class="plat malam">' + kepalaPlat(5, "Dua peta", "Sebelum dan sesudah pemilu dan pilkada bertemu dalam satu tahun") + '<div class="pl-dua"><div class="pl-tumpuk">' + ["A", "B"].map(function (k) { var R = E.REZIM[k]; return '<figure class="papan-bingkai"><figcaption class="papan-kap"><span class="no">Peta ' + R.no + "</span><b>" + esc(R.judul) + "</b><span>" + esc(R.rentang) + '</span></figcaption><div class="papan" data-papan="' + k + '" data-label="1"></div></figure>'; }).join("") + '</div><aside class="pl-sisi"><table class="banding"><thead><tr><th></th><th scope="col">Peta I</th><th scope="col">Peta II</th></tr></thead><tbody>' +
        baris3("Catatan media", f(s.a.media), f(s.b.media)) + baris3("Dua sumber", persen(s.a.dua, s.a.media) + "%", persen(s.b.dua, s.b.media) + "%") + baris3("Kasus resmi", f(s.a.resmi), f(s.b.resmi)) + baris3("Kab/kota", f(s.a.unit), f(s.b.unit)) + baris3("Provinsi", f(s.a.prov), f(s.b.prov)) +
        "</tbody></table>" + keterangan("ringkas") + '<div class="pl-qr">' + E.qrSvg() + "<p>Pindai untuk peta interaktif</p></div></aside></div>" + kakiPlat("Warna menunjukkan deret yang hadir, bukan jumlah.") + "</section>",
      '<section class="plat kertas">' + kepalaPlat(6, "Siklus demi siklus, 2009–2024", "Pemilu 2024 dan pemilu sebelumnya", true) + '<div class="pl-siklus">' + E.SIKLUS.map(function (c) { var t = E.tally(E.saring({ siklus: c.id })), tp = t.media + t.resmi < 30; return '<figure class="siklus-sel' + (tp ? " tipis" : "") + '"><div class="papan" data-papan="siklus:' + c.id + '"></div>' + (tp ? '<span class="cap-tipis">Arsip belum disapu</span>' : "") + "<figcaption><b>" + esc(c.judul) + "</b><span>" + f(t.media) + " media · " + f(t.resmi) + " resmi · " + f(t.unit) + " kab/kota</span></figcaption></figure>"; }).join("") + '<div class="pl-catatan"><b>Dua siklus awal kosong karena arsipnya belum disapu.</b><p>Bukan karena tidak ada kejadian. Sapuan jendela pilkada dimulai dari 2015.</p></div></div>' + kakiPlat() + "</section>",
      '<section class="plat kertas">' + kepalaPlat(7, "Lima mekanisme, dua peta", "Skema rekayasa elektoral", true) + '<div class="pl-mek">' + E.MEKANISME.map(function (m, i) { var u = E.keandalan(m); return '<div class="pl-mek-b' + (u.rendah ? " rendah" : "") + '"><div><h3 class="j3">' + esc(m.pendek) + "</h3><p>" + esc(m.sasaran) + "</p></div><div>" + E.batangPasang(a[i], b[i]) + andalHtml(u) + "</div></div>"; }).join("") + "</div>" + kakiPlat("Pangsa di dalam periode masing-masing. Label mekanisme dari kelompok kata kunci.") + "</section>",
      '<section class="plat malam">' + kepalaPlat(8, "Aturan main yang berubah", "2014–2025") + '<ol class="patah ringkas">' + E.PATAH.map(function (p) { return '<li class="' + (p.kunci ? "kunci" : "") + '"><time>' + esc(p.t) + "</time><div><b>" + esc(p.j) + "</b><p>" + esc(p.k) + "</p></div></li>"; }).join("") + "</ol>" + kakiPlat() + "</section>",
      '<section class="plat kertas">' + kepalaPlat(9, "RUU Pemilu dan peta 2027–2029", "Fokus 2", true) + '<div class="pl-ruu">' + [E.PATAH[7], E.PATAH[8], E.PATAH[9]].map(function (p) { return '<article class="kartu-put"><time>' + esc(p.t) + '</time><h3 class="j3">' + esc(p.j) + "</h3><p>" + esc(p.k) + "</p></article>"; }).join("") + "</div>" + '<div class="pl-ruu dua">' + menyusul("Ambang batas parlemen", "Simulasi kursi DPR pada beberapa ambang.") + menyusul("Syarat pencapresan", "Skenario sesudah ambang 20 persen dihapus.") + "</div>" + kakiPlat() + "</section>",
      '<section class="plat malam penutup"><div class="pen-kiri">' + logoDua(false) + '<h2 class="hero-j kecil">Peta lengkap,<br>arsip, dan<br>metode.</h2><p class="hero-dek">Setiap catatan menaut ke sumbernya. Pindai untuk menjelajahi dua peta, 38 berkas provinsi, dan seluruh arsip.</p><p class="pl-url besar">' + URL_SITUS + '</p></div><div class="pen-qr">' + E.qrSvg() + "</div></section>"
    ];
  }

  function presentasi(no) {
    var P = daftarPlat(), n = Math.min(P.length, Math.max(1, +no || 1));
    E.platN = n; E.platTotal = P.length;
    if (/cetak=semua/.test(location.search)) return '<div class="plat-cetak">' + P.join("") + "</div>";
    return '<div class="plat-pentas" id="pentas"><div class="plat-skala" id="skala">' + P[n - 1] + "</div>" +
      (E.cetak ? "" : '<nav class="plat-navi" aria-label="Pelat"><a href="#/presentasi/' + Math.max(1, n - 1) + '" aria-label="Sebelumnya">←</a><span>' + n + " / " + P.length + '</span><a href="#/presentasi/' + Math.min(P.length, n + 1) + '" aria-label="Berikutnya">→</a><button id="plat-layar">Layar penuh</button><a href="#/">Keluar</a></nav>') + "</div>";
  }
  function setelahPresentasi() {
    var sk = $("#skala"), pen = $("#pentas");
    if (sk && !E.cetak) {
      var pas = function () { var k = Math.min(pen.clientWidth / 1920, pen.clientHeight / 1080); sk.style.transform = "translate(-50%,-50%) scale(" + k + ")"; };
      pas(); window.addEventListener("resize", pas);
      E.lepasHal = function () { window.removeEventListener("resize", pas); };
      var b = $("#plat-layar"); if (b) b.onclick = function () { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); };
    }
    pasangPapan($("#isi"));
    document.documentElement.setAttribute("data-siap", "1");
  }
  document.addEventListener("keydown", function (e) {
    if (!document.body.classList.contains("hal-presentasi")) return;
    if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); location.hash = "#/presentasi/" + Math.min(E.platTotal, E.platN + 1); }
    if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); location.hash = "#/presentasi/" + Math.max(1, E.platN - 1); }
    if (e.key === "Escape" && !document.fullscreenElement) location.hash = "#/";
  });

  /* ---------- kaki dan navigasi ---------- */
  function kaki() {
    var m = E.D.manifest || {};
    return '<div class="lebar kaki-isi"><div>' + logoDua(false) + '<p>Research Center for Politics and Government (PolGov), Departemen Politik dan Pemerintahan, Universitas Gadjah Mada.</p></div>' +
      '<nav aria-label="Tautan kaki">' + NAV.map(function (n) { return '<a href="#/' + n[0] + '">' + esc(n[1]) + "</a>"; }).join("") + "</nav>" +
      "<div><p><b>EPPOS Political Outlook</b>. Catatan adalah laporan dengan tautan sumber, bukan temuan yang sudah diadili.</p><p class=\"mono\">Data versi " + esc(m.version || "") + "</p></div></div>";
  }

  var JUDUL = { "": "EPPOS Political Outlook", intervensi: "Intervensi Eksekutif", skema: "Skema Rekayasa Elektoral", provinsi: "Berkas Provinsi", arsip: "Arsip Catatan", "ruu-pemilu": "RUU Pemilu", metode: "Metode dan Batasan", presentasi: "Mode Presentasi" };

  function naikkanAngka() {
    if (E.tenang) return;
    $$("[data-naik]").forEach(function (el) {
      var n = +el.dataset.naik, t0 = performance.now(), dur = 1100;
      (function step(t) {
        var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        el.textContent = f(Math.round(n * e));
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    });
  }

  function jalankan() {
    var bagian = location.hash.replace(/^#\/?/, "").split("/"), rute = bagian[0] || "", isi = $("#isi");
    if (E.lepasHal) { E.lepasHal(); E.lepasHal = null; }
    E.Papan.lepasSemua();
    $("#tip").hidden = true;
    var html, setelah = null, titik = null;
    switch (rute) {
      case "": html = beranda(); setelah = function () { pasangPapan(isi); naikkanAngka(); }; break;
      case "intervensi": html = intervensi(); setelah = setelahIntervensi; titik = bagian[1] || null; break;
      case "skema": html = skema(); break;
      case "provinsi": html = bagian[1] ? berkasProv(bagian[1]) : provinsi(); setelah = function () { pasangPapan(isi); }; break;
      case "arsip": html = arsip(); setelah = setelahArsip; break;
      case "ruu-pemilu": html = ruu(); setelah = setelahRuu; titik = bagian[1] || null; break;
      case "metode": html = metode(); break;
      case "presentasi": html = presentasi(bagian[1]); setelah = setelahPresentasi; break;
      default: html = '<section class="kertas blok"><div class="lebar"><h1 class="j-hal">Halaman tidak ditemukan</h1><p><a href="#/">Kembali ke beranda</a></p></div></section>';
    }
    document.body.className = "hal-" + (rute || "beranda") + (E.cetak ? " cetak" : "");
    isi.innerHTML = html;
    if (setelah) setelah();
    var berkas = rute === "provinsi" && bagian[1] ? E.PROVINSI.filter(function (x) { return E.slug(x) === bagian[1]; })[0] : null;
    document.title = rute ? (berkas || JUDUL[rute] || "Halaman tidak ditemukan") + " · EPPOS Political Outlook" : JUDUL[""];
    $$(".navi a, .navi-bawah a").forEach(function (a) {
      var aktif = a.getAttribute("href") === "#/" + rute;
      if (aktif) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    if (titik) { var el = document.getElementById(titik); if (el) { el.scrollIntoView(); return; } }
    window.scrollTo(0, 0);
  }

  // satu file bundel menaruh logo di sini; versi repo memakai berkas
  var L = window.EPPOS_LOGO;
  E.logo = L ? L.biasa : "assets/lockup/eppos.png";
  E.logoInv = L ? L.inverse : "assets/lockup/eppos-inverse.png";
  E.logoPolgov = L ? L.polgov : "assets/lockup/polgov.png";
  E.logoPolgovInv = L ? L.polgovInverse : "assets/lockup/polgov-inverse.png";

  E.muat().then(function () {
    $("#navi").innerHTML = NAV.map(function (n) { return '<a href="#/' + n[0] + '">' + esc(n[1]) + "</a>"; }).join("");
    $("#navi-bawah").innerHTML = NAV_HP.map(function (n) { return '<a href="#/' + n[0] + '">' + esc(n[1]) + "</a>"; }).join("");
    $("#kaki").innerHTML = kaki();
    window.addEventListener("hashchange", jalankan);
    jalankan();
  }).catch(function (e) {
    $("#isi").innerHTML = '<section class="kertas blok"><div class="lebar"><h1 class="j-hal">Data gagal dimuat</h1><p>' + esc(e.message) + "</p></div></section>";
    if (window.console) console.error(e);
  });
})(window.EPPOS);
