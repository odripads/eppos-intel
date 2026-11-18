/* EPPOS Political Outlook: halaman dan perute. Semua angka di sini dibaca dari inti.js.
   Teks yang belum ditulis tim diberi kotak .menyusul, tidak pernah diisi angka karangan. */
(function (E) {
  "use strict";
  var $ = E.$, $$ = E.$$, esc = E.esc, f = E.f, persen = E.persen;
  var NAV = [["intervensi", "Intervensi Eksekutif"], ["skema", "Skema"], ["provinsi", "Provinsi"], ["arsip", "Arsip"], ["ruu-pemilu", "RUU Pemilu"], ["peta-elit", "Peta Elit"], ["metode", "Metode"]];
  var NAV_HP = [["", "Beranda"], ["intervensi", "Intervensi"], ["skema", "Skema"], ["ruu-pemilu", "RUU"], ["peta-elit", "Elit"], ["arsip", "Arsip"]];
  var F = { mek: null, dua: false, tahun: null, wilayah: "semua", tampilan: "tumpuk", prov: null };
  var A = { q: "", rez: "", mek: "", bukti: "", prov: "", n: 40 };
  var URL_SITUS = "eppos-outlook.vercel.app";

  /* Jejak pernyataan, bukan prediksi pencalonan atau pengelompokan orbit. */
  /* Peta Elit (#/peta-elit), lapisan fakta saja: tiap tanda adalah satu baris data/peta_elit.json berkutipan verbatim.
     Titik patah 3 Nov 2026 (Listyo Sigit tersangka penyadapan) membagi pernyataan menjadi sebelum dan sesudah; peristiwa
     kunci dari data/peta_elit_peristiwa.json, masing-masing bersumber. Dua topik: "pilpres 2029" (bawaan) dan
     "wapres 2026" (pengisian kursi wapres yang kosong sesudah Gibran mundur).
     Gambar 11 kursi DPR; Gambar 12 lintasan 2026; Gambar 13 sesudah 3 November (diperbesar); Gambar 14 kursi wapres.
     Warna jenis: token --a/--st3/--st2/--b ditambah hijau #2a8a57, lolos validator (semua pasangan; satu pasangan di
     ambang CVD, sah karena setiap jenis juga punya bentuk sendiri). */
  var EJ = [["dukung capres", "a"], ["dukung cawapres", "c"], ["pasangkan", "p"], ["usul wapres pengganti", "w"], ["tolak/berbenturan", "b"], ["isu", "i"]];
  var EJ_KODE = {}; EJ.forEach(function (j) { EJ_KODE[j[0]] = j[1]; });
  var E_PATAH = "2026-11-03";
  var E_LUAR = { psi: "PSI", buruh: "Partai Buruh", gemabangsa: "Partai Gema Bangsa", perindo: "Perindo", ppp: "PPP", hanura: "Hanura", gelora: "Gelora", pbb: "PBB", ummat: "Ummat", garuda: "Garuda", gerakanrakyat: "Partai Gerakan Rakyat" };
  var E_SEBELUM = { gerindra: ["Kongres luar biasa Gerindra, 13 Februari 2025, meminta Prabowo bersedia maju lagi pada 2029. Keputusan itu sebelum jendela data 2026.", "https://news.detik.com/berita/d-7777027/kongres-luar-biasa-gerindra-minta-prabowo-maju-capres-lagi-di-2029"] };
  var E_BELUM = "Hanura, Perindo, PPP, Gelora, Ummat, PBB, Garuda, PKN";
  function eTopik(r) { return r.topik || "pilpres 2029"; }
  function elitPeristiwa() { return (E.D.peta_elit_peristiwa || []).slice().sort(function (a, b) { return a.tanggal.localeCompare(b.tanggal); }); }
  function elitBentuk(kode, x, y, s) {
    s = s || 6;
    if (kode === "c") return '<path d="M' + x + " " + (y - s - 1) + "L" + (x + s + 1) + " " + y + "L" + x + " " + (y + s + 1) + "L" + (x - s - 1) + " " + y + 'Z"/>';
    if (kode === "p") return '<rect x="' + (x - s + 1) + '" y="' + (y - s + 1) + '" width="' + (2 * s - 2) + '" height="' + (2 * s - 2) + '" rx="1.5"/>';
    if (kode === "b") return '<path d="M' + x + " " + (y - s - 1) + "L" + (x + s + 1) + " " + (y + s) + "L" + (x - s - 1) + " " + (y + s) + 'Z"/>';
    if (kode === "w") {
      var d = ""; for (var i = 0; i < 5; i++) { var a = -Math.PI / 2 + i * 2 * Math.PI / 5; d += (i ? "L" : "M") + (x + (s + 1) * Math.cos(a)).toFixed(1) + " " + (y + (s + 1) * Math.sin(a)).toFixed(1); }
      return '<path d="' + d + 'Z"/>';
    }
    return '<circle cx="' + x + '" cy="' + y + '" r="' + (kode === "i" ? s - 1 : s) + '"/>';
  }
  function elitIkon(kode) { return '<svg class="ej ej-' + kode + '" viewBox="-8 -8 16 16" aria-hidden="true">' + elitBentuk(kode, 0, 0, 5) + "</svg>"; }
  function elitNamaPartai(k) {
    if (!k) return "Perorangan";
    if (E_LUAR[k]) return E_LUAR[k];
    var K = E.D.sikap_pt.simulasi.kode, n = k.toUpperCase();
    Object.keys(K).forEach(function (x) { if (K[x][0] === k) n = K[x][1]; });
    return n;
  }
  function elitUrut(a, b) { return a.tanggal.localeCompare(b.tanggal) || a.id.localeCompare(b.id); }
  function elitKursi() {
    var T = E.D.enp.tahun.filter(function (t) { return t.tahun === 2024; })[0] || {}, K = E.D.sikap_pt.simulasi.kode, R = E.D.peta_elit || [];
    return (T.partai || []).filter(function (p) { return p[2]; }).map(function (p) {
      var k = (K[p[0]] || [])[0], baris = R.filter(function (r) { return r.partai === k; }).sort(elitUrut);
      return { kode: k, nama: elitNamaPartai(k), kursi: p[2], baris: baris,
        dukung: baris.filter(function (r) { return r.jenis === "dukung capres" && /Prabowo/.test(r.sasaran); })[0] };
    }).sort(function (a, b) { return (!!b.dukung - !!a.dukung) || b.kursi - a.kursi; });
  }
  function elitPotong(s, n) { var w = s.split(/\s+/); return w.length > n ? w.slice(0, n).join(" ") + " …" : s; }
  function elitLogo(k, kls) {
    var L = (E.D.logo_aktor || {})[k];
    return L ? '<img class="' + kls + '" src="' + E.ASET + "logo-aktor/" + esc(L.gambar) + '" alt="">' : '<span class="' + kls + ' kosong" aria-hidden="true"></span>';
  }
  function elitBarisPendek(r, label) {
    return '<p class="ek-status">' + elitIkon(EJ_KODE[r.jenis] || "i") + " " + label + esc(r.jenis) + (r.sasaran && r.jenis !== "isu" ? " · " + esc(r.sasaran) : "") + '</p><p class="ek-kutip">“' + esc(elitPotong(r.kutipan, 14)) + '”</p><p class="ek-oleh">' + esc(r.aktor) + " · " + esc(E.tgl(r.tanggal)) + "</p>";
  }
  function elitKartu(p) {
    var seb = p.baris.filter(function (r) { return r.tanggal < E_PATAH; }), ses = p.baris.filter(function (r) { return r.tanggal >= E_PATAH; });
    var a = p.dukung && p.dukung.tanggal < E_PATAH ? p.dukung : seb[seb.length - 1];
    var isi = '<div class="ek-fase"><span>Sebelum 3 Nov</span>' + (a ? (a === p.dukung ? '<p class="ek-status on">' + elitIkon("a") + ' Mendukung Prabowo untuk 2029</p><p class="ek-kutip">“' + esc(elitPotong(a.kutipan, 14)) + '”</p><p class="ek-oleh">' + esc(a.aktor) + " · " + esc(E.tgl(a.tanggal)) + "</p>" : elitBarisPendek(a, "")) : '<p class="ek-kosong">Belum ada pernyataan dalam data</p>') + "</div>";
    var z = ses[ses.length - 1];
    isi += '<div class="ek-fase sesudah"><span>Sesudah 3 Nov</span>' + (z ? elitBarisPendek(z, "") : '<p class="ek-kosong">Belum ada pernyataan dalam data</p>') + "</div>";
    var s = E_SEBELUM[p.kode];
    return '<li class="ek-kartu' + (p.dukung ? " on" : "") + '" data-p="' + esc(p.kode) + '"><header>' + elitLogo(p.kode, "ek-logo") + "<b>" + esc(p.nama) + "</b><span>" + p.kursi + " kursi</span></header>" + isi +
      (s ? '<p class="ek-sebelum">' + esc(s[0]) + ' <a href="' + E.url(s[1]) + '" target="_blank" rel="noopener noreferrer">Sumber ↗</a></p>' : "") + "</li>";
  }
  function elitGambarKursi(P) {
    var tot = 0, dk = 0, nDk = 0;
    P.forEach(function (p) { tot += p.kursi; if (p.dukung) { dk += p.kursi; nDk++; } });
    var pct = (dk / tot * 100).toFixed(1).replace(".", ",");
    var bar = P.map(function (p) {
      return '<div class="ek-seg' + (p.dukung ? " on" : "") + '" data-p="' + esc(p.kode) + '" style="flex:' + p.kursi + ' 1 0" tabindex="0" aria-label="' + esc(p.nama + ", " + p.kursi + " kursi" + (p.dukung ? ", tercatat mendukung Prabowo" : "")) + '"><b>' + esc(p.nama) + "</b><span>" + p.kursi + "</span></div>";
    }).join("");
    var R = E.D.peta_elit || [];
    var luar = Object.keys(E_LUAR).concat([""]).map(function (k) {
      var b = R.filter(function (r) { return (r.partai || "") === k; }).sort(elitUrut);
      if (!b.length) return "";
      var jenis = []; b.forEach(function (r) { if (jenis.indexOf(r.jenis) < 0) jenis.push(r.jenis); });
      return "<li>" + (k ? elitLogo(k, "ek-logo") : "") + "<b>" + esc(elitNamaPartai(k)) + "</b><span>" + jenis.map(function (j) {
        var s = b.filter(function (r) { return r.jenis === j && r.sasaran; })[0];
        return elitIkon(EJ_KODE[j] || "i") + esc(j) + (s && j !== "isu" && j !== "dukung capres" ? " (" + esc(s.sasaran.split(" ")[0]) + ")" : "");
      }).join(" · ") + "</span></li>";
    }).join("");
    return '<figure class="ek-fig"><div class="ek-atas"><p class="ek-besar"><b>' + dk + "</b> dari " + tot + " kursi DPR</p><p>milik " + nDk + " partai yang tercatat menyatakan mendukung Prabowo maju lagi pada 2029 (" + pct + "%). Kartu di bawah membandingkan pernyataan terakhir tiap partai sebelum dan sesudah 3 November.</p></div>" +
      '<div class="ek-bar" role="img" aria-label="Kursi DPR hasil Pemilu 2024 per partai">' + bar + "</div>" +
      '<div class="ek-leg"><span><i class="on"></i>tercatat mendukung Prabowo untuk 2029</span><span><i></i>belum ada pernyataan dukungan dalam data 2026</span></div>' +
      '<ul class="ek-kartu-daftar">' + P.map(elitKartu).join("") + "</ul>" +
      '<div class="ek-luar"><p class="kicker">Di luar DPR dan perorangan</p><ul>' + luar + '</ul><p class="ek-belum">Ditelusuri 18 November, belum ditemukan pernyataan 2026 tentang Pilpres 2029: ' + E_BELUM + ".</p></div>" +
      "<figcaption><b>Sumber:</b> kursi DPR hasil Pemilu 2024 (KPU, sama dengan Gambar 9c); status dari baris berkutipan di daftar bawah. Dukungan pada pemerintahan sampai 2029 tidak dihitung sebagai dukungan pencalonan.</figcaption></figure>";
  }
  function elitLajur(R) {
    var ada = {}, urut = elitKursi().slice().sort(function (a, b) { return b.kursi - a.kursi; }).map(function (p) { return p.kode; });
    R.forEach(function (r) { ada[r.partai || ""] = 1; });
    var luar = Object.keys(E_LUAR).filter(function (k) { return ada[k]; });
    if (ada[""]) luar.push("");
    return { dpr: urut.filter(function (k) { return ada[k]; }), luar: luar };
  }
  // Lintasan yang sama dipakai dua kali: setahun penuh (skala bulan) dan diperbesar sekitar titik patah (skala hari)
  function elitLintasan(o) {
    var R = (E.D.peta_elit || []).filter(function (r) { return r.tanggal >= o.dari && r.tanggal <= o.sampai; });
    var SEMUA = elitPeristiwa(), P = SEMUA.filter(function (e) { return e.tanggal >= o.dari && e.tanggal <= o.sampai; });
    var L = elitLajur(R), semua = L.dpr.concat(L.luar);
    var W = 1000, kiri = 168, kanan = 18, pita = P.length ? (o.labelPeristiwa ? 22 + P.length * 15 : 26) : 0, atas = 30 + pita, tinggi = o.tinggi || 34, sela = L.luar.length ? 22 : 0, H = atas + semua.length * tinggi + sela + 10;
    var tg = function (s) { var d = s.split("-"); return Date.UTC(+d[0], d[1] - 1, +d[2]); };
    var t0 = tg(o.dari), t1 = tg(o.sampai) + 864e5, X = function (s) { return kiri + (tg(s) - t0) / (t1 - t0) * (W - kiri - kanan); };
    var Y = function (k) { var i = semua.indexOf(k); return atas + i * tinggi + tinggi / 2 + (i >= L.dpr.length ? sela : 0); };
    var h = '<svg class="et-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(o.aria) + '">';
    o.tik.forEach(function (t) { var x = X(t[0]); h += '<line class="et-grid" x1="' + x + '" x2="' + x + '" y1="18" y2="' + (H - 6) + '"/><text class="et-bln" x="' + (x + 4) + '" y="14">' + esc(t[1]) + "</text>"; });
    // titik patah
    if (E_PATAH >= o.dari && E_PATAH <= o.sampai) { var xp = X(E_PATAH); h += '<rect class="et-sesudah" x="' + xp + '" y="18" width="' + (W - kanan - xp) + '" height="' + (H - 24) + '"/><line class="et-patah" x1="' + xp + '" x2="' + xp + '" y1="18" y2="' + (H - 6) + '"/>'; }
    // pita peristiwa
    P.forEach(function (e, i) {
      var x = X(e.tanggal), y = 30 + (o.labelPeristiwa ? 8 + i * 15 : 10);
      h += '<g class="et-ev' + (e.mendatang ? " mendatang" : "") + '" data-ev="' + SEMUA.indexOf(e) + '" tabindex="0" role="button" aria-label="' + esc(E.tgl(e.tanggal) + ", " + e.label) + '"><circle class="et-hit" cx="' + x + '" cy="' + y + '" r="8"/><path d="M' + x + " " + (y + 5) + "L" + (x - 4.5) + " " + (y - 3) + "L" + (x + 4.5) + " " + (y - 3) + 'Z"/>' +
        (o.labelPeristiwa ? '<text x="' + (x + 8) + '" y="' + (y + 3) + '"' + (x > W - 300 ? ' text-anchor="end" dx="-16"' : "") + ">" + esc(E.tgl(e.tanggal).replace(/ 2026$/, "") + " · " + e.label) + "</text>" : "") + "</g>";
    });
    semua.forEach(function (k) {
      var y = Y(k), L2 = (E.D.logo_aktor || {})[k];
      h += '<line class="et-lajur" x1="' + kiri + '" x2="' + (W - kanan) + '" y1="' + y + '" y2="' + y + '"/>';
      if (L2) h += '<image href="' + E.ASET + "logo-aktor/" + esc(L2.gambar) + '" x="0" y="' + (y - 10) + '" width="20" height="20" preserveAspectRatio="xMidYMid meet"/>';
      h += '<text class="et-nama" x="' + (L2 ? 28 : 0) + '" y="' + (y + 4) + '">' + esc(elitNamaPartai(k)) + "</text>";
    });
    if (L.luar.length) { var yl = atas + L.dpr.length * tinggi + sela / 2 + 3; h += '<text class="et-kel" x="0" y="' + yl + '">DI LUAR DPR</text><line class="et-pisah" x1="96" x2="' + (W - kanan) + '" y1="' + (yl - 4) + '" y2="' + (yl - 4) + '"/>'; }
    var tumpuk = {};
    R.slice().sort(elitUrut).forEach(function (r) {
      var kunci = (r.partai || "") + r.tanggal, n = tumpuk[kunci] = (tumpuk[kunci] || 0) + 1;
      var x = X(r.tanggal) + (n - 1) * (o.sela || 15), y = Y(r.partai || ""), j = EJ_KODE[r.jenis] || "i";
      h += '<g class="et-m ej-' + j + (eTopik(r) === "kasus Listyo" ? " t-listyo" : "") + '" data-id="' + esc(r.id) + '" tabindex="0" role="button" aria-label="' + esc(E.tgl(r.tanggal) + ", " + r.aktor + ", " + r.jenis + (r.sasaran ? " " + r.sasaran : "")) + '">' +
        '<circle class="et-hit" cx="' + x + '" cy="' + y + '" r="9"/>' + elitBentuk(j, x, y, 6) + "</g>";
    });
    return h + "</svg>";
  }
  function elitLegenda(R) {
    var hitung = {}; R.forEach(function (r) { hitung[r.jenis] = (hitung[r.jenis] || 0) + 1; });
    return '<div class="et-leg">' + EJ.filter(function (j) { return hitung[j[0]]; }).map(function (j) { return "<span>" + elitIkon(j[1]) + esc(j[0]) + " <em>" + hitung[j[0]] + "</em></span>"; }).join("") +
      (R.some(function (r) { return eTopik(r) === "kasus Listyo"; }) ? '<span class="et-leg-listyo"><svg class="ej" viewBox="-8 -8 16 16" aria-hidden="true"><circle r="4"/></svg>isu tentang kasus Listyo</span>' : "") +
      '<span class="et-leg-patah"><i></i>3 Nov: Listyo Sigit tersangka</span><span class="et-leg-ev"><svg viewBox="-6 -6 12 12" aria-hidden="true"><path d="M0 5L-4.5 -3L4.5 -3Z"/></svg>peristiwa</span></div>';
  }
  // Gambar 14: siapa mengusulkan siapa untuk kursi wapres yang kosong; kolom = nama yang diusulkan + "tidak mengusulkan nama"
  function elitGambarWapres() {
    var R = (E.D.peta_elit || []).filter(function (r) { return eTopik(r) === "wapres 2026"; }).sort(elitUrut);
    if (!R.length) return "";
    var nama = [], hit = {};
    R.forEach(function (r) { if ((r.jenis === "usul wapres pengganti" || r.jenis === "tolak/berbenturan") && r.sasaran) { if (nama.indexOf(r.sasaran) < 0) nama.push(r.sasaran); hit[r.sasaran] = (hit[r.sasaran] || 0) + (r.jenis === "usul wapres pengganti" ? 1 : 0); } });
    nama.sort(function (a, b) { return (hit[b] || 0) - (hit[a] || 0) || a.localeCompare(b); });
    var kol = nama.concat(["—"]);
    var urut = elitKursi().slice().sort(function (a, b) { return b.kursi - a.kursi; }).map(function (p) { return p.kode; }).concat(Object.keys(E_LUAR), [""]);
    var baris = urut.filter(function (k, i) { return urut.indexOf(k) === i; });
    var sel = function (k, n) {
      var r = R.filter(function (x) { return (x.partai || "") === k && (n === "—" ? x.jenis === "isu" && /^wapres pengganti/.test(x.isu || "") : x.sasaran === n && x.jenis !== "isu"); });
      return r.length ? r.map(function (x) { return '<button class="ew-m" data-id="' + esc(x.id) + '" aria-label="' + esc(x.aktor + ", " + x.jenis + ", " + E.tgl(x.tanggal)) + '">' + elitIkon(EJ_KODE[x.jenis] || "i") + "</button>"; }).join("") : "";
    };
    var dpr = elitKursi().map(function (p) { return p.kode; });
    var rows = baris.map(function (k) {
      var ada = R.some(function (x) { return (x.partai || "") === k; });
      if (!ada && dpr.indexOf(k) < 0) return "";
      var isi = ada ? kol.map(function (n) { return sel(k, n); }) : [];
      var kosong = !ada ? "belum ada pernyataan tentang kursi wapres dalam data" : isi.join("") ? "" : "ada pernyataan, tanpa usulan atau penyerahan nama";
      return "<tr" + (kosong ? ' class="ew-kosong"' : "") + '><th scope="row">' + (k ? elitLogo(k, "ek-logo") : "") + esc(elitNamaPartai(k)) + "</th>" + (kosong ? '<td colspan="' + kol.length + '">' + kosong + "</td>" : isi.map(function (s) { return "<td>" + s + "</td>"; }).join("")) + "</tr>";
    }).join("");
    var tunda = {}, usul = {};
    R.forEach(function (x) { var k = x.partai || ""; if (x.jenis === "isu" && /^wapres pengganti/.test(x.isu || "")) tunda[k] = 1; if (x.jenis === "usul wapres pengganti") (usul[x.sasaran] = usul[x.sasaran] || {})[k] = 1; });
    var dprK = elitKursi().map(function (p) { return p.kode; });
    Object.keys(tunda).forEach(function (k) { if (dprK.indexOf(k) < 0) delete tunda[k]; });
    var nm = function (o) { return Object.keys(o).map(elitNamaPartai).join(", ").replace(/, ([^,]*)$/, " dan $1"); };
    var top = nama.filter(function (x) { return usul[x]; })[0];
    var ringkas = '<div class="ek-atas ew-atas"><p class="ek-besar"><b>' + Object.keys(tunda).length + "</b> partai DPR menyerahkan pilihan kepada Presiden</p><p>Elit " + nm(tunda) + " menyatakan tidak mengusulkan nama atau menyerahkannya kepada Presiden." + (top ? " Namun elit dari " + Object.keys(usul[top]).length + " partai (" + nm(usul[top]) + ") menyebut " + esc(top) + " secara terbuka." : "") + "</p></div>";
    return ringkas + '<div class="ew-wadah"><div class="gulir"><table class="tabel ew"><thead><tr><th scope="col">Partai / aktor</th>' + kol.map(function (n) { return '<th scope="col">' + (n === "—" ? "Tidak mengusulkan nama" : esc(n)) + "</th>"; }).join("") + "</tr></thead><tbody>" + rows + "</tbody></table></div></div>" +
      '<p class="rel-cat">Kolom terakhir memuat pernyataan yang menyerahkan pilihan kepada Presiden atau menyatakan tidak mengusulkan nama. Satu partai bisa berada di dua kolom karena elitnya berbeda suara. Klik tanda untuk membuka kutipannya di daftar. Presiden mengajukan dua nama ke MPR; MPR memilih satu (Pasal 8 ayat 2 UUD 1945).</p>';
  }
  /* Gambar 15: percakapan publik di X dari X Post Counts API (scripts/hitung_x.py). Hanya jumlah unggahan asli per hari;
     tidak ada isi unggahan atau nama pengguna. Panel kecil per tokoh dengan skala sumbu-y sendiri (Prabowo jauh lebih
     besar dan akan meratakan yang lain); tabel topik = bagian unggahan tentang tokoh itu yang juga memuat kata topik. */
  var ED_DARI = "2026-10-01";
  function eDtgl(s) { return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)); }
  // Grafik tema (pembuka Gambar 15): percakapan umum per tema, skala bersama supaya volumenya bisa dibandingkan.
  // Lima warna = palet jenis yang sudah lolos validator; label di ujung garis supaya tidak bergantung warna.
  var ED_WARNA = ["#2f4aa0", "#c4402c", "#bf8200", "#2c93c6", "#2a8a57"];
  function elitTema(D, K, hari) {
    var T = (K.tema || []).filter(function (tm) { return D.seri["tema:" + tm.id]; });
    if (!T.length) return "";
    var W = 1000, H = 280, kiri = 46, kanan = 190, atas = 18, bawah = 26;
    var V = T.map(function (tm) { var s = D.seri["tema:" + tm.id]; return hari.map(function (d) { return s[d] || 0; }); });
    var maks = Math.max.apply(null, [].concat.apply([1], V)), langkah = Math.pow(10, Math.floor(Math.log10(maks))), atasY = Math.ceil(maks / langkah) * langkah;
    var X = function (i) { return kiri + i / (hari.length - 1) * (W - kiri - kanan); }, Y = function (n) { return atas + (1 - n / atasY) * (H - atas - bawah); };
    var h = '<svg viewBox="0 0 ' + W + " " + H + '" class="et-tema" role="img" aria-label="Unggahan per hari per tema, 1 Oktober sampai ' + esc(E.tgl(hari[hari.length - 1])) + '">';
    for (var g = 0; g <= 4; g++) { var nv = atasY * g / 4, y = Y(nv); h += '<line class="et-grid" x1="' + kiri + '" x2="' + (W - kanan) + '" y1="' + y + '" y2="' + y + '"/><text class="et-bln" x="' + (kiri - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + E.f(nv) + "</text>"; }
    hari.forEach(function (d, i) { if (d.slice(8) === "01" || d.slice(8) === "15") h += '<text class="et-bln" x="' + X(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(String(E.tgl(d)).replace(/ 2026$/, "")) + "</text>"; });
    var ip = hari.indexOf(E_PATAH);
    if (ip >= 0) h += '<rect class="et-sesudah" x="' + X(ip) + '" y="' + atas + '" width="' + (X(hari.length - 1) - X(ip)) + '" height="' + (H - atas - bawah) + '"/><line class="et-patah" x1="' + X(ip) + '" x2="' + X(ip) + '" y1="' + atas + '" y2="' + (H - bawah) + '"/>';
    elitPeristiwa().forEach(function (e) { var i = hari.indexOf(e.tanggal); if (i >= 0) h += '<path class="ed-ev" d="M' + X(i) + " " + (atas - 2) + 'l-4 -7h8z"><title>' + esc(E.tgl(e.tanggal) + " · " + e.label) + "</title></path>"; });
    var ujung = V.map(function (v, k) { return { k: k, y: Y(v[v.length - 1]) }; }).sort(function (a, b) { return a.y - b.y; });
    for (var u = 1; u < ujung.length; u++) if (ujung[u].y - ujung[u - 1].y < 15) ujung[u].y = ujung[u - 1].y + 15;
    V.forEach(function (v, k) {
      h += '<path fill="none" stroke="' + ED_WARNA[k] + '" stroke-width="2" stroke-linejoin="round" d="' + v.map(function (n, i) { return (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(n).toFixed(1); }).join("") + '"/>';
    });
    ujung.forEach(function (o) { h += '<text class="et-ujung" x="' + (W - kanan + 8) + '" y="' + (o.y + 4) + '" fill="' + ED_WARNA[o.k] + '">' + esc(T[o.k].nama) + "</text>"; });
    h += '<line class="ed-garis-baca" x1="-10" x2="-10" y1="' + atas + '" y2="' + (H - bawah) + '"/><rect class="ed-tangkap" x="' + kiri + '" y="' + atas + '" width="' + (W - kiri - kanan) + '" height="' + (H - atas - bawah) + '" fill="transparent"/></svg>';
    var leg = '<div class="et-leg">' + T.map(function (tm, k) { return '<span><i class="ed-leg-garis" style="background:' + ED_WARNA[k] + '"></i>' + esc(tm.nama) + "</span>"; }).join("") + '<span class="et-leg-patah"><i></i>3 Nov: Listyo Sigit tersangka</span></div>';
    return '<div class="ek-atas"><p class="ek-besar">Apa yang sedang dibicarakan</p><p>Unggahan asli per hari di X untuk lima tema, tanpa memandang siapa yang disebut. Satu skala untuk semua tema, jadi tinggi garis bisa dibandingkan langsung.</p></div>' + leg +
      '<div class="et-wadah ed-tema-wadah"><div class="gulir">' + h + '</div><output class="ed-baca ed-baca-tema" aria-live="polite"></output></div>' +
      '<p class="rel-cat">Kata kunci tema: ' + T.map(function (tm) { return "<b>" + esc(tm.nama) + "</b>: " + esc(tm.q.replace(/"/g, "")); }).join("; ") + ".</p>" +
      '<div class="palang-jarak">' + palang("Tokoh", "Siapa yang terbawa dalam percakapan itu") + "</div>";
  }
  function setelahTema() {
    var D = E.D.diskursus_x, K = E.D.diskursus_kueri, svg = $(".et-tema"); if (!svg || !D) return;
    var T = (K.tema || []).filter(function (tm) { return D.seri["tema:" + tm.id]; }), akhir = "";
    T.forEach(function (tm) { Object.keys(D.seri["tema:" + tm.id]).forEach(function (d) { if (d > akhir) akhir = d; }); });
    var hari = []; for (var t = eDtgl(ED_DARI); t <= eDtgl(akhir); t += 864e5) hari.push(new Date(t).toISOString().slice(0, 10));
    var garis = svg.querySelector(".ed-garis-baca"), baca = $(".ed-baca-tema");
    svg.querySelector(".ed-tangkap").addEventListener("mousemove", function (ev) {
      var r = svg.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * 1000, i = Math.max(0, Math.min(hari.length - 1, Math.round((x - 46) / (1000 - 46 - 190) * (hari.length - 1))));
      var gx = 46 + i / (hari.length - 1) * (1000 - 46 - 190); garis.setAttribute("x1", gx); garis.setAttribute("x2", gx);
      baca.innerHTML = "<b>" + esc(E.tgl(hari[i])) + "</b> · " + T.map(function (tm, k) { return '<span style="color:' + ED_WARNA[k] + '">' + esc(tm.nama) + "</span> " + E.f(D.seri["tema:" + tm.id][hari[i]] || 0); }).join(" · ");
    });
    svg.querySelector(".ed-tangkap").addEventListener("mouseleave", function () { garis.setAttribute("x1", -10); garis.setAttribute("x2", -10); baca.textContent = ""; });
  }
  function elitDiskursus() {
    var D = E.D.diskursus_x, K = E.D.diskursus_kueri;
    if (!D || !K || !D.seri) return "";
    var akhir = "", nama = {};
    K.tokoh.forEach(function (t) { nama[t.id] = t.nama; var s = D.seri[t.id] || {}; Object.keys(s).forEach(function (d) { if (d > akhir) akhir = d; }); });
    if (!akhir) return "";
    var hari = []; for (var t = eDtgl(ED_DARI); t <= eDtgl(akhir); t += 864e5) hari.push(new Date(t).toISOString().slice(0, 10));
    var EV = elitPeristiwa().filter(function (e) { return e.tanggal >= ED_DARI && e.tanggal <= akhir; });
    // tokoh tanpa hitungan tidak digambar sebagai panel datar; namanya disebut dalam satu baris
    var adaSeri = function (tk) { var s = D.seri[tk.id] || {}; return Object.keys(s).some(function (d) { return s[d] > 0; }); };
    var TK = K.tokoh.filter(adaSeri), TK0 = K.tokoh.filter(function (tk) { return !adaSeri(tk); });
    var panel = TK.map(function (tk) {
      var s = D.seri[tk.id] || {}, v = hari.map(function (d) { return s[d] || 0; });
      var maks = Math.max.apply(null, v.concat([1])), W = 300, H = 96, kiri = 4, kanan = 4, atas = 8, bawah = 16;
      var X = function (i) { return kiri + i / (hari.length - 1) * (W - kiri - kanan); }, Yv = function (n) { return atas + (1 - n / maks) * (H - atas - bawah); };
      var garis = v.map(function (n, i) { return (i ? "L" : "M") + X(i).toFixed(1) + " " + Yv(n).toFixed(1); }).join("");
      var ip = hari.indexOf(E_PATAH), puncak = Math.max(0, v.indexOf(maks)), adaData = v.some(function (x) { return x > 0; });
      var seb = 0, ses = 0, nSeb = 0, nSes = 0; hari.forEach(function (d, i) { if (d < E_PATAH) { seb += v[i]; nSeb++; } else { ses += v[i]; nSes++; } });
      var rasio = nSeb && seb ? (ses / nSes) / (seb / nSeb) : 0;
      var svg = '<svg viewBox="0 0 ' + W + " " + H + '" class="ed-svg" data-k="' + esc(tk.id) + '" role="img" aria-label="' + esc(tk.nama + ": unggahan per hari, puncak " + maks + " pada " + E.tgl(hari[puncak])) + '">' +
        (ip >= 0 ? '<rect class="et-sesudah" x="' + X(ip) + '" y="' + atas + '" width="' + (X(hari.length - 1) - X(ip)) + '" height="' + (H - atas - bawah) + '"/><line class="et-patah" x1="' + X(ip) + '" x2="' + X(ip) + '" y1="' + atas + '" y2="' + (H - bawah) + '"/>' : "") +
        EV.map(function (e) { var i = hari.indexOf(e.tanggal); return i < 0 ? "" : '<path class="ed-ev" d="M' + X(i) + " " + (H - bawah + 9) + "l-3 -5h6z" + '"/>'; }).join("") +
        '<path class="ed-area" d="' + garis + "L" + X(hari.length - 1) + " " + (H - bawah) + "L" + X(0) + " " + (H - bawah) + 'Z"/><path class="ed-garis" d="' + garis + '"/>' +
        '<circle class="ed-titik" r="3" cx="-10" cy="-10"/></svg>';
      return '<figure class="ed-panel"><figcaption><b>' + esc(tk.nama) + "</b><span>" + (adaData ? "puncak " + E.f(maks) + " · " + esc(String(E.tgl(hari[puncak])).replace(/ 2026$/, "")) : "belum ada data") + "</span></figcaption>" + svg +
        '<p class="ed-rasio">' + (rasio ? "Sesudah 3 Nov: <b>" + (rasio >= 1 ? rasio.toFixed(1).replace(".", ",") + "×" : Math.round(rasio * 100) + "%") + "</b> rata-rata harian sebelumnya" : "") + '</p><output class="ed-baca" aria-live="polite"></output></figure>';
    }).join("");
    // tabel topik: bagian unggahan tentang tokoh yang memuat kata topik, sebelum dan sesudah 3 Nov
    var jumlah = function (k, dari, ke) { var s = D.seri[k] || {}, n = 0; Object.keys(s).forEach(function (d) { if (d >= dari && d < ke) n += s[d]; }); return n; };
    var seb0 = "2026-10-01", ses1 = "9999";
    var sel = function (p) { var a = Math.min(p / 0.5, 1); return '<td style="background:rgba(47,74,160,' + (0.06 + a * 0.84).toFixed(2) + ");color:" + (a > 0.5 ? "#fff" : "var(--tinta)") + '">' + (p >= 0.995 ? "99" : p < 0.005 && p > 0 ? "<1" : Math.round(p * 100)) + "%</td>"; };
    var baris = TK.map(function (tk) {
      var b0 = jumlah(tk.id, seb0, E_PATAH), b1 = jumlah(tk.id, E_PATAH, ses1);
      return '<tr><th scope="row">' + esc(tk.nama) + '<span>' + E.f(b0) + " → " + E.f(b1) + "</span></th>" + K.topik.map(function (tp) {
        var k = tk.id + "+" + tp.id, a0 = jumlah(k, seb0, E_PATAH), a1 = jumlah(k, E_PATAH, ses1);
        return (b0 ? sel(a0 / b0) : "<td>–</td>") + (b1 ? sel(a1 / b1) : "<td>–</td>");
      }).join("") + "</tr>";
    }).join("");
    var tabel = '<div class="gulir"><table class="tabel ed-tabel"><thead><tr><th scope="col" rowspan="2">Tokoh<span>unggahan sebelum → sesudah</span></th>' + K.topik.map(function (tp) { return '<th scope="colgroup" colspan="2">' + esc(tp.nama) + "</th>"; }).join("") + "</tr><tr>" + K.topik.map(function () { return '<th scope="col">seb.</th><th scope="col">ses.</th>'; }).join("") + "</tr></thead><tbody>" + baris + "</tbody></table></div>";
    return '<section class="elit-bagian" id="diskursus">' + palang("Gambar 15", "Diskursus publik di X") +
      elitTema(D, K, hari) +
      '<p class="rel-cat">Jumlah unggahan asli per hari yang menyebut nama tokoh, 1 Oktober sampai ' + esc(E.tgl(akhir)) + '. Tiap panel memakai skalanya sendiri: bandingkan bentuk dan waktunya, bukan tingginya.</p>' +
      '<div class="ed-grid' + (TK.length < 3 ? " sedikit" : "") + '">' + panel + "</div>" +
      (TK0.length ? '<p class="rel-cat ed-belum">Belum ada hitungan untuk ' + TK0.map(function (tk) { return esc(tk.nama); }).join(", ").replace(/, ([^,]*)$/, " dan $1") + ".</p>" : "") +
      '<div class="palang-jarak">' + palang("Topik", "Apa yang dibicarakan bersama nama itu") + '</div><p class="rel-cat">Persentase unggahan tentang tokoh yang juga memuat kata topik, sebelum (1 Okt–2 Nov) dan sesudah 3 November. Satu unggahan bisa memuat lebih dari satu topik. Kata kunci: ' + K.topik.map(function (tp) { return esc(tp.nama) + " = " + esc(tp.q.replace(/"/g, "")); }).join("; ") + ".</p>" + tabel +
      '<p class="rel-cat"><b>Sumber:</b> X Post Counts API, jumlah per hari UTC, diperbarui ' + esc(D.diperbarui || "") + ". Hanya angka: isi unggahan dan identitas pengguna tidak diambil. Nama umum bisa tercampur dengan orang lain bernama sama (Sugiono dibatasi dengan kata Gerindra, menteri, wapres, atau Prabowo). Hitungan X bisa sedikit berbeda dari hasil pencarian di aplikasi.</p></section>";
  }
  function setelahDiskursus() {
    var D = E.D.diskursus_x; if (!D) return;
    var hari = []; var akhir = ""; Object.keys(D.seri).forEach(function (k) { Object.keys(D.seri[k]).forEach(function (d) { if (d > akhir) akhir = d; }); });
    for (var t = eDtgl(ED_DARI); t <= eDtgl(akhir); t += 864e5) hari.push(new Date(t).toISOString().slice(0, 10));
    setelahTema();
    $$(".ed-svg").forEach(function (svg) {
      var s = D.seri[svg.dataset.k] || {}, v = hari.map(function (d) { return s[d] || 0; }), maks = Math.max.apply(null, v.concat([1]));
      var titik = svg.querySelector(".ed-titik"), baca = svg.parentNode.querySelector(".ed-baca");
      function gerak(ev) {
        var r = svg.getBoundingClientRect(), x = ((ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left) / r.width * 300;
        var i = Math.max(0, Math.min(hari.length - 1, Math.round((x - 4) / 292 * (hari.length - 1))));
        titik.setAttribute("cx", 4 + i / (hari.length - 1) * 292); titik.setAttribute("cy", 8 + (1 - v[i] / maks) * 72);
        baca.textContent = E.tgl(hari[i]) + ": " + E.f(v[i]) + " unggahan";
      }
      svg.addEventListener("mousemove", gerak); svg.addEventListener("touchmove", gerak, { passive: true });
      svg.addEventListener("mouseleave", function () { titik.setAttribute("cx", -10); baca.textContent = ""; });
    });
  }
  function elitTikBulan(sampai) { var B = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"], t = []; for (var i = 0; i < 12; i++) { var s = "2026-" + (i < 9 ? "0" : "") + (i + 1) + "-01"; if (s <= sampai) t.push([s, B[i]]); } return t; }
  function elitTikMinggu(dari, sampai) {
    var t = [], d = new Date(dari + "T00:00:00Z"), B = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
    for (; d.toISOString().slice(0, 10) <= sampai; d.setUTCDate(d.getUTCDate() + 7)) t.push([d.toISOString().slice(0, 10), d.getUTCDate() + " " + B[d.getUTCMonth()]]);
    return t;
  }
  function elitKronologi() {
    var EV = elitPeristiwa(); if (!EV.length) return "";
    return '<section class="elit-kron" aria-label="Kronologi"><p class="kicker">Kronologi</p><ol>' + EV.map(function (e) {
      return '<li' + (e.mendatang ? ' class="mendatang"' : "") + (e.tanggal === E_PATAH ? ' class="titik"' : "") + '><time datetime="' + esc(e.tanggal) + '">' + esc(E.tgl(e.tanggal)) + "</time><span>" + esc(e.label) + (e.mendatang ? " <em>(dijadwalkan)</em>" : "") + ' <a href="' + E.url(e.sumber_url) + '" target="_blank" rel="noopener noreferrer">' + esc(e.outlet) + " ↗</a></span></li>";
    }).join("") + "</ol></section>";
  }
  function petaElit() {
    var R = E.D.peta_elit || [], P = elitKursi(), dk = P.filter(function (p) { return p.dukung; });
    var akhir = R.reduce(function (m, r) { return r.tanggal > m ? r.tanggal : m; }, "");
    var nSes = R.filter(function (r) { return r.tanggal >= E_PATAH; }).length, nW = R.filter(function (r) { return eTopik(r) === "wapres 2026"; }).length;
    var dek = R.length ? "<b>3 November 2026</b>: Bareskrim menetapkan mantan Kapolri Listyo Sigit Prabowo tersangka penyadapan ilegal terhadap Presiden dan menahannya; dugaan makar diselidiki terpisah sejak 12 November. <b>11–12 November</b>: Wakil Presiden Gibran Rakabuming Raka mengundurkan diri, dua pekan sesudah MA membatalkan surat penyetaraan ijazah SMA-nya. Kursi wakil presiden kosong sampai MPR bersidang 9 Desember. Halaman ini mencatat pernyataan publik elit partai sebelum dan sesudah 3 November: tentang Pilpres 2029, tentang siapa yang mengisi kursi wapres, dan tentang kasus Listyo. Setiap tanda menaut ke kutipan dan sumbernya." : "Pernyataan bertanggal tentang Pilpres 2029 akan tampil di sini bersama kutipan dan sumbernya.";
    var hari = Date.UTC(+akhir.slice(0, 4), +akhir.slice(5, 7) - 1, +akhir.slice(8, 10));
    var zoomSampai = "2026-12-12", zoomDari = "2026-10-27";
    return '<div class="wadah elit-halaman">' + kepala("Pencalonan 2029 dan kursi wapres · lapisan fakta", "Peta Elit", dek) +
      elitKronologi() +
      (R.length ? '<section class="elit-bagian">' + palang("Gambar 11", "Kursi DPR, sebelum dan sesudah 3 November") + elitGambarKursi(P) + "</section>" +
        '<section class="elit-bagian">' + palang("Gambar 12", "Lintasan pernyataan sepanjang 2026") + elitLegenda(R) +
        '<div class="et-wadah"><div class="gulir">' + elitLintasan({ dari: "2026-01-01", sampai: "2026-12-15", tik: elitTikBulan("2026-12-15"), aria: "Lintasan pernyataan per partai sepanjang 2026" }) + '</div><div class="et-tip" hidden></div></div>' +
        '<p class="rel-cat">Satu tanda satu pernyataan; segitiga di pita atas adalah peristiwa. Bidang abu-abu: sesudah 3 November. Arahkan atau sentuh tanda untuk membaca kutipannya; klik untuk membukanya di daftar.</p></section>' +
        (nSes ? '<section class="elit-bagian">' + palang("Gambar 13", "Sesudah 3 November, diperbesar") +
          '<div class="et-wadah"><div class="gulir">' + elitLintasan({ dari: zoomDari, sampai: zoomSampai, tik: elitTikMinggu(zoomDari, zoomSampai), labelPeristiwa: true, tinggi: 36, sela: 16, aria: "Pernyataan dan peristiwa 27 Oktober sampai 12 Desember 2026" }) + '</div><div class="et-tip" hidden></div></div>' +
          '<p class="rel-cat">' + nSes + " pernyataan sesudah 3 November. Peristiwa bertanda pudar belum terjadi saat data ini disusun (" + esc(E.tgl(akhir)) + ").</p></section>" : "") +
        (nW ? '<section class="elit-bagian">' + palang("Gambar 14", "Kursi wapres yang kosong: siapa mengusulkan siapa") + elitGambarWapres() + "</section>" : "") + elitDiskursus() : "") +
      '<section class="elit-bagian" id="elit-daftar">' + palang("Daftar", "Semua pernyataan") +
      (function () { var s = R.filter(function (r) { return r.kanal === "x" || r.kanal === "threads"; }).length; return '<p class="elit-kanal-ringkas">' + (R.length - s) + " pernyataan dari pemberitaan media, " + s + " dari unggahan X atau Threads milik tokohnya sendiri (teks diambil lewat embed resmi platform).</p>"; })() +
      '<aside class="elit-batas"><b>Baca sebagai jejak pernyataan.</b> Hubungan di sini hanya merujuk pada kutipan dan sumber bertanggal, bukan prediksi pencalonan atau tafsir motif. Partai yang tidak muncul belum tentu tidak bersikap; bisa jadi pernyataannya belum terjangkau penelusuran. <a href="#/ruu-pemilu">Kajian RUU Pemilu ↗</a></aside>' +
      '<form class="elit-filter" id="elit-filter"><label>Aktor, lembaga, atau sasaran<input id="elit-aktor" type="search" placeholder="Cari nama, partai, atau sasaran"></label><label>Jenis pernyataan<select id="elit-jenis"><option value="">Semua jenis</option>' + EJ.map(function (x) { return "<option>" + esc(x[0]) + "</option>"; }).join("") +
      '</select></label><label>Topik<select id="elit-topik"><option value="">Semua topik</option><option>pilpres 2029</option><option>wapres 2026</option><option>kasus Listyo</option></select></label><label>Masa<select id="elit-masa"><option value="">Seluruh 2026</option><option value="seb">Sebelum 3 Nov</option><option value="ses">Sesudah 3 Nov</option></select></label><button type="reset" class="btn">Atur ulang</button></form>' +
      '<p class="elit-ringkas" id="elit-ringkas" role="status" aria-live="polite"></p><div id="elit-hasil"></div></section></div>';
  }
  function setelahElit() {
    var semua = (E.D.peta_elit || []).slice().sort(function (a, b) { return b.tanggal.localeCompare(a.tanggal) || a.id.localeCompare(b.id); });
    var per = {}; semua.forEach(function (r) { per[r.id] = r; });
    var EV = elitPeristiwa();
    var batas = 12; // daftar dipotong supaya halaman tidak memanjang puluhan layar; saringan mengembalikan ke 12
    function tampil(tambah) {
      batas = tambah === true ? batas + 24 : 12;
      var q = $("#elit-aktor").value.trim().toLocaleLowerCase("id"), jenis = $("#elit-jenis").value, topik = $("#elit-topik").value, masa = $("#elit-masa").value;
      var baris = semua.filter(function (r) { return (!q || (r.id + " " + r.aktor + " " + r.lembaga + " " + (r.sasaran || "")).toLocaleLowerCase("id").indexOf(q) !== -1) && (!jenis || r.jenis === jenis) && (!topik || eTopik(r) === topik) && (!masa || (masa === "seb" ? r.tanggal < E_PATAH : r.tanggal >= E_PATAH)); });
      $("#elit-ringkas").textContent = baris.length + " dari " + semua.length + " pernyataan · terbaru lebih dahulu";
      var sisa = Math.max(0, baris.length - batas);
      $("#elit-hasil").innerHTML = baris.length ? '<ol class="elit-jejak">' + baris.slice(0, batas).map(function (r) {
        return '<li class="elit-catatan" id="' + esc(r.id) + '"><div class="elit-waktu"><time datetime="' + esc(r.tanggal) + '">' + esc(E.tgl(r.tanggal)) + "</time><span>" + esc(r.id) + '</span><span class="elit-masa' + (r.tanggal >= E_PATAH ? " ses" : "") + '">' + (r.tanggal >= E_PATAH ? "sesudah 3 Nov" : "sebelum 3 Nov") + '</span></div><article><div class="elit-meta"><span>' + elitIkon(EJ_KODE[r.jenis] || "i") + esc(r.jenis) + " · " + esc(eTopik(r)) + '</span><span class="elit-status">' + (r.kanal === "x" || r.kanal === "threads" ? '<b class="elit-kanal">' + (r.kanal === "x" ? "X" : "Threads") + " " + esc(r.akun || "") + "</b> " : "") + (r.status === "dicek tim" ? "dicek tim" : "belum dicek tim") + '</span></div><h2 class="elit-relasi"><span>' + esc(r.aktor) + "<small>" + esc(r.lembaga) + '</small></span><span class="elit-panah" aria-label="tentang">→</span>' + (r.sasaran ? "<span>" + esc(r.sasaran) + "</span>" : '<span class="elit-tanpa">Tidak menyebut orang</span>') + "</h2>" +
          (r.isu ? '<p class="elit-isu">Isu: ' + esc(r.isu) + "</p>" : "") + "<blockquote>“" + esc(r.kutipan) + "”</blockquote>" +
          '<a class="elit-sumber" href="' + E.url(r.sumber_url) + '" target="_blank" rel="noopener noreferrer">Baca sumber · ' + esc(r.outlet) + " ↗</a>" +
          (r.catatan ? '<p class="elit-catatan-kaki">' + esc(r.catatan) + "</p>" : "") + "</article></li>";
      }).join("") + "</ol>" + (sisa ? '<button type="button" class="btn elit-lagi" id="elit-lagi">Tampilkan ' + Math.min(sisa, 24) + " pernyataan lagi <span>(" + sisa + " tersisa)</span></button>" : "") : '<div class="elit-kosong"><h2>' + (semua.length ? "Tidak ada pernyataan yang cocok" : "Pernyataan sedang disiapkan") + "</h2><p>" + (semua.length ? "Ubah saringan untuk melihat pernyataan lain." : "Pernyataan bertanggal akan tampil bersama kutipan, sumber, dan status pemeriksaannya.") + "</p></div>";
    }
    $("#elit-filter").addEventListener("submit", function (e) { e.preventDefault(); });
    $("#elit-filter").addEventListener("input", function () { tampil(); });
    $("#elit-filter").addEventListener("change", function () { tampil(); });
    $("#elit-filter").addEventListener("reset", function () { setTimeout(tampil, 0); });
    $("#elit-hasil").addEventListener("click", function (e) { if (e.target.closest("#elit-lagi")) tampil(true); });
    tampil();
    function bukaBaris(id) {
      $("#elit-jenis").value = $("#elit-topik").value = $("#elit-masa").value = ""; $("#elit-aktor").value = id; tampil();
      var li = document.getElementById(id); if (li) { li.scrollIntoView({ block: "center" }); li.classList.add("sorot"); }
    }
    function sorot(k, on) { $$('[data-p="' + k + '"]').forEach(function (n) { n.classList.toggle("sorot", on); }); }
    $$(".ek-seg,.ek-kartu").forEach(function (n) {
      ["mouseenter", "focus"].forEach(function (ev) { n.addEventListener(ev, function () { sorot(n.dataset.p, true); }); });
      ["mouseleave", "blur"].forEach(function (ev) { n.addEventListener(ev, function () { sorot(n.dataset.p, false); }); });
    });
    $$(".et-wadah").forEach(function (wadah) {
      var tip = wadah.querySelector(".et-tip");
      function taruh(g, html) {
        tip.innerHTML = html; tip.hidden = false;
        var a = g.getBoundingClientRect(), b = wadah.getBoundingClientRect(), lebar = tip.offsetWidth;
        tip.style.left = Math.min(Math.max(a.left - b.left + a.width / 2 - lebar / 2, 0), b.width - lebar) + "px";
        var y = a.top - b.top - tip.offsetHeight - 10; tip.style.top = (y < 0 ? a.bottom - b.top + 10 : y) + "px";
      }
      wadah.querySelectorAll(".et-m").forEach(function (g) {
        var r = per[g.dataset.id]; if (!r) return;
        var html = '<p class="et-tip-meta">' + elitIkon(EJ_KODE[r.jenis] || "i") + esc(r.jenis) + (r.sasaran ? " → " + esc(r.sasaran) : "") + "</p><b>" + esc(r.aktor) + "</b> <span>" + esc(r.lembaga) + "</span><q>" + esc(elitPotong(r.kutipan, 24)) + '</q><p class="et-tip-tgl">' + esc(E.tgl(r.tanggal)) + " · " + esc(r.outlet) + "</p>";
        ["mouseenter", "focus"].forEach(function (ev) { g.addEventListener(ev, function () { taruh(g, html); }); });
        ["mouseleave", "blur"].forEach(function (ev) { g.addEventListener(ev, function () { tip.hidden = true; }); });
        g.addEventListener("click", function () { bukaBaris(r.id); });
        g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); bukaBaris(r.id); } });
      });
      wadah.querySelectorAll(".et-ev").forEach(function (g) {
        var e = EV[+g.dataset.ev]; if (!e) return;
        var html = '<p class="et-tip-meta">' + (e.mendatang ? "dijadwalkan" : "peristiwa") + "</p><b>" + esc(e.label) + '</b><p class="et-tip-tgl">' + esc(E.tgl(e.tanggal)) + " · " + esc(e.outlet) + "</p>";
        ["mouseenter", "focus"].forEach(function (ev) { g.addEventListener(ev, function () { taruh(g, html); }); });
        ["mouseleave", "blur"].forEach(function (ev) { g.addEventListener(ev, function () { tip.hidden = true; }); });
        g.addEventListener("click", function () { if (/^https?:\/\//i.test(e.sumber_url)) window.open(e.sumber_url, "_blank", "noopener"); });
      });
    });
    $$(".ew-m").forEach(function (b) { b.addEventListener("click", function () { bukaBaris(b.dataset.id); }); b.title = (per[b.dataset.id] || {}).aktor || ""; });
    setelahDiskursus();
  }

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
      '<div class="dua-kol tumpuk"><h2 class="j2">Dari 2009 sampai 2024, siklus demi siklus.</h2><p class="lead">Dua siklus awal hampir kosong karena arsip media sebelum 2015 belum disapu, bukan karena tidak ada kejadian. Sapuan untuk jendela pilkada dimulai dari 2015.</p></div>' +
      '<div class="siklus" id="siklus"></div>' +
    "</div></section>" +

    kasusLama() +

    '<section class="kertas blok pendek" id="laju"><div class="lebar">' + palang("Gambar 4", "Perbandingan yang sah") +
      '<div class="dua-kol"><div><h2 class="j2">Laju temuan per 1.000 pencarian.</h2><p class="lead">Hanya temuan dari sapuan arsip yang sama di semua jendela. Yang diukur seberapa banyak yang diberitakan, bukan seberapa banyak yang terjadi.</p></div>' +
      '<figure class="gbr tanpa-garis">' + E.lajuHtml() + "<figcaption><b>Sumber:</b> sapuan arsip outlet (wp-grid). Pembagi: jumlah pencarian per jendela waktu. Jendela pembanding: panjang sama, tanpa pilkada.</figcaption></figure></div>" +
    "</div></section>";
  }

  /* Gambar 3b: kasus 2009-2014 kompilasi Inan (data/kasus_pilkada_lama.json), terpisah dari peta. Baris MK adalah
     dalil atau kesaksian, bukan temuan; nama terduga pelaku sengaja tidak dimuat (aturan pelaku_nama). */
  function kasusLama() {
    var K = E.D.kasus_pilkada_lama; if (!K) return "";
    var CEK = { terverifikasi: "cocok dengan sumber", sebagian: "sebagian dicek", belum: "belum dicek" };
    var n = function (s) { return K.kasus.filter(function (k) { return k.cek === s; }).length; };
    var baris = K.kasus.slice().sort(function (a, b) { return a.tahun - b.tahun || a.kode.localeCompare(b.kode); }).map(function (k) {
      return '<tr' + (k.tahun > 2014 ? ' class="kl-luar"' : "") + '><td class="r">' + k.tahun + "</td><td><b>" + esc(k.wilayah) + "</b><br><span class=\"kl-kecil\">" + esc(k.provinsi) + "</span></td>" +
        "<td><span class=\"kl-jenis\">" + esc(k.jenis_sumber) + "</span> " + esc(k.jenis) + '<p class="kl-ringkas">' + esc(k.ringkas) + "</p></td>" +
        "<td>" + esc(k.hasil) + "</td>" +
        '<td><span class="kl-cek ' + k.cek + '">' + CEK[k.cek] + '</span><p class="kl-kecil">' + esc(k.catatan_cek) + "</p>" +
        '<p class="kl-kecil">' + k.sumber.map(function (s) { return '<a href="' + E.url(s[1]) + '" target="_blank" rel="noopener">' + esc(s[0]) + "</a>"; }).join(" · ") + "</p></td></tr>";
    }).join("");
    return '<section class="kertas blok" id="kasus-lama"><div class="lebar">' + palang("Gambar 3b", "Kasus 2009–2014, data baru") +
      '<div class="dua-kol"><h2 class="j2">Sebelum arsip media menebal: jejak di putusan MK dan catatan AJI.</h2><div><p class="lead">' + K.kasus.length + " kasus dari putusan MK dan PTUN serta catatan AJI dan media, dicek ulang terhadap naskah putusan, risalah, dan berita yang ditautkan: " + n("terverifikasi") + " cocok dengan sumbernya, " + n("sebagian") + " sebagian, " + n("belum") + " belum bisa dicek.</p><p class=\"lead\">Baris MK memuat dalil pemohon atau kesaksian, bukan temuan terbukti; hampir semua permohonan ditolak. Nama terduga pelaku tidak ditampilkan. Kasus pengadilan masuk Peta I sebagai kasus resmi, catatan AJI dan media sebagai laporan media.</p></div></div>" +
      '<div class="sim-wadah"><div class="gulir"><table class="tabel kl"><thead><tr><th scope="col" class="r">Tahun</th><th scope="col">Wilayah</th><th scope="col">Dugaan dan sumber</th><th scope="col">Hasil</th><th scope="col">Pemeriksaan ulang</th></tr></thead><tbody>' + baris + "</tbody></table></div></div>" +
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
      '<div class="dua-kol tumpuk"><h2 class="j2">Sepuluh titik patah, 2014–2025.</h2><p class="lead">Peta tidak berdiri sendiri. Setiap titik di bawah mengubah siapa yang memegang kuasa di daerah menjelang pemungutan suara, atau siapa yang mengawasinya.</p></div>' +
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
    /* Satu isu sekaligus, tiga kelompok berdampingan; tiap pernyataan satu baris ringkas, kutipan dibuka saat diklik.
       Diminta Odri 13 Nov: ketiga sisi terlihat tanpa menggulir jauh. */
    var WARNA = { naikkan: "n", "ambang baru": "n", "batasi koalisi": "n", pertahankan: "p", turunkan: "t", hapus: "h", "tanpa ambang": "h", lainnya: "l", "belum jelas": "l" };
    function baris(x) {
      return '<li><details><summary><b class="ps-nama">' + esc(x.aktor) + "</b><time>" + esc(E.tgl(x.tanggal)) + "</time>" +
        '<span class="ps-meta"><span class="sikap s-' + (WARNA[x.sikap] || "l") + '">' + esc(x.sikap) + (x.angka ? " " + esc(x.angka) : "") + "</span>" +
        (x.lembaga ? '<span class="ps-lbg">' + esc(x.lembaga.split(" (")[0]) + "</span>" : "") + "</span></summary>" +
        '<div class="ps-buka">' + (x.lembaga ? '<p class="ps-lbg">' + esc(x.lembaga) + "</p>" : "") + "<q>" + esc(x.kutipan) + "</q>" +
        '<a href="' + E.url(x.sumber_url) + '" target="_blank" rel="noopener">' + esc(x.outlet || "sumber") + " · " + esc(E.tgl(x.tanggal)) + "</a>" +
        (x.status === "dicek tim" ? '<span class="ps-oto ok">dicek tim</span>' : "") + "</div></details></li>";
    }
    h += '<div class="posisi"><div class="seg terang ps-isu" role="tablist">' + S.isu.map(function (i, k) {
      return '<button role="tab" data-isu="' + esc(i.id) + '" aria-selected="' + (k ? "false" : "true") + '">' + esc(i.id) + " <span>" + P.filter(function (x) { return x.isu === i.id; }).length + "</span></button>";
    }).join("") + "</div>";
    S.isu.forEach(function (i, k) {
      h += '<div class="ps-tiga" data-isu="' + esc(i.id) + '"' + (k ? " hidden" : "") + ">" + S.jenis_aktor.map(function (j) {
        var r = P.filter(function (x) { return x.jenis_aktor === j && x.isu === i.id; });
        var hit = {}; r.forEach(function (x) { hit[x.sikap] = (hit[x.sikap] || 0) + 1; });
        var ada = i.sikap.filter(function (s) { return hit[s]; });
        var bar = ada.map(function (s) { return '<i class="s-' + (WARNA[s] || "l") + '" style="flex:' + hit[s] + '" title="' + esc(s) + ": " + hit[s] + '"></i>'; }).join("");
        var ket = ada.map(function (s) { return esc(s) + " " + hit[s]; }).join(" · ");
        return '<section class="ps-kol"><header><h3>' + esc(j) + "</h3><span>" + r.length + ' pernyataan</span><div class="ps-bar">' + bar + '</div><p class="ps-ket">' + ket + "</p></header>" +
          '<ul class="ps-sel">' + (r.length ? r.map(baris).join("") : '<li class="ps-kosong">belum ada catatan</li>') + "</ul></section>";
      }).join("") + "</div>";
    });
    return h + "</div>" + '<p class="rel-cat">Klik satu baris untuk membaca kutipan dan sumbernya. ' + f(P.length) + " pernyataan · " + f(P.filter(function (x) { return x.status === "dicek tim"; }).length) + " sudah dicek tim. Sikap diambil dari kutipan, bukan ditafsirkan.</p>";
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
  /* Gambar 9b: semua 18 partai nasional Pemilu 2024 pada ambang 1-7%, suara resmi KPU dari data/enp.json (sama dengan
     Gambar 9c). Partai tanpa kursi DPR yang punya menteri atau wakil menteri di Kabinet Merah Putih diberi tanda. */
  function simulasi() {
    var S = E.D.sikap_pt.simulasi, L = E.D.logo_aktor || {}, T = (E.D.enp.tahun.filter(function (t) { return t.tahun === 2024; })[0] || {});
    var P = (T.partai || []).map(function (r) { var k = S.kode[r[0]] || [null, r[0]]; return [k[0], k[1], r[1] / T.suara * 100, r[2]]; })
      .sort(function (a, b) { return b[2] - a[2]; });
    var c = function (v) { return v.toFixed(2).replace(".", ","); };
    var st = function (v, t) { return v < t ? ["tidak", "tidak lolos"] : v - t < 0.5 ? ["tipis", "lolos tipis"] : ["lolos", "lolos"]; };
    var h = '<table class="tabel sim"><thead><tr><th scope="col">Partai</th><th scope="col" class="r">Suara 2024</th><th scope="col" class="r">Kursi</th>' + S.ambang.map(function (t) { return '<th scope="col">' + t + "%</th>"; }).join("") + "</tr></thead><tbody>";
    P.forEach(function (r, i) {
      var kab = S.kabinet[r[0]];
      h += '<tr' + (i === 8 ? ' class="sim-batas"' : "") + '><th scope="row">' + (L[r[0]] ? '<img class="sim-logo" src="' + E.ASET + "logo-aktor/" + esc(L[r[0]].gambar) + '" alt="">' : '<span class="sim-logo"></span>') + esc(r[1]) +
        (kab ? '<span class="sim-kab" title="' + esc(kab) + '">di kabinet</span>' : (S.eks_kabinet || {})[r[0]] ? '<span class="sim-kab eks" title="' + esc(S.eks_kabinet[r[0]]) + '">eks-kabinet</span>' : "") + '</th><td class="r">' + c(r[2]) + '%</td><td class="r">' + (r[3] || "–") + "</td>" +
        S.ambang.map(function (t) { var x = st(r[2], t); return '<td class="sim-' + x[0] + '">' + x[1] + "</td>"; }).join("") + "</tr>";
    });
    h += '<tr class="sim-jumlah"><th scope="row">Partai yang lolos</th><td></td><td></td>' + S.ambang.map(function (t) { return "<td>" + P.filter(function (r) { return r[2] >= t; }).length + " dari " + P.length + "</td>"; }).join("") + "</tr>";
    h += '<tr class="sim-jumlah"><th scope="row">Suara tanpa kursi</th><td></td><td></td>' + S.ambang.map(function (t) { var v = 0; P.forEach(function (r) { if (r[2] < t) v += r[2]; }); return "<td>" + c(v) + "%</td>"; }).join("") + "</tr>";
    var li = function (r) { return "<li><b>" + esc(r[1]) + "</b> · " + esc(S.kabinet[r[0]]) + "</li>"; };
    var dg = P.filter(function (r) { return S.kabinet[r[0]] && r[3]; }).map(li).join(""), tk = P.filter(function (r) { return S.kabinet[r[0]] && !r[3]; }).map(li).join("");
    var eks = P.filter(function (r) { return (S.eks_kabinet || {})[r[0]]; }).map(function (r) { return "<li><b>" + esc(r[1]) + "</b> · " + esc(S.eks_kabinet[r[0]]) + "</li>"; }).join("");
    var a = function (x) { return '<a href="' + E.url(x[1]) + '" target="_blank" rel="noopener">' + esc(x[0]) + "</a>"; };
    return h + "</tbody></table>" + '<div class="sim-kabinet">' +
      (dg ? '<p class="kicker">Di kabinet, dengan kursi DPR</p><ul>' + dg + "</ul>" : "") +
      (tk ? '<p class="kicker">Di kabinet, tanpa kursi DPR</p><ul>' + tk + "</ul>" : "") +
      (eks ? '<p class="kicker">Tak lagi punya kader di kabinet</p><ul>' + eks + "</ul>" : "") +
      '<p class="rel-cat">Sumber: ' + a(["daftar Kabinet Merah Putih", S.kabinet_sumber]) + ", pejabat aktif per 13 Nov 2026 menurut afiliasi partai yang tercatat" + ((S.kabinet_sumber_tambahan || []).length ? "; " + S.kabinet_sumber_tambahan.map(a).join(", ") : "") + ". Jumlah pos menurut afiliasi partai di daftar itu; menteri profesional usulan partai tercatat independen" + ((S.eks_kabinet_sumber || []).length ? "; PSI: " + S.eks_kabinet_sumber.map(a).join(", ") : "") + ". Hanya partai peserta Pemilu 2024.</p></div>";
  }
  function rdpu() {
    var R = E.D.sikap_pt.rdpu;
    return '<article class="rdpu"><time>' + esc(E.tgl(R.tanggal)) + '</time><h3 class="j3">' + esc(R.judul) + '</h3><ul>' + R.butir.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") + "</ul><p>" + esc(R.catatan_rapat) +
      ' <a href="' + E.ASET + esc(R.berkas) + '" target="_blank" rel="noopener">Laporan singkat Komisi II DPR (PDF)</a></p></article>';
  }
  /* Gambar 9c: jumlah partai efektif (Laakso-Taagepera 1979), suara (ENEP) dan kursi (ENPP), 1999-2024.
     Selisih keduanya adalah fragmentasi yang disaring aturan pemilu, termasuk ambang batas. Data: data/enp.json. */
  function enpHtml() {
    var D = E.D.enp;
    if (!D) return "";
    var T = D.tahun, W = 760, H = 300, kiri = 78, kanan = 70, atas = 20, bawah = 40, maks = 10;
    var x = function (i) { return kiri + i * (W - kiri - kanan) / (T.length - 1); }, y = function (v) { return H - bawah - v / maks * (H - atas - bawah); };
    var s = "";
    [0, 2, 4, 6, 8, 10].forEach(function (v) { s += '<line class="ln-grid" x1="' + kiri + '" x2="' + (W - kanan) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="ln-sb" x="' + (kiri - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + "</text>"; });
    [["enep", "enp-suara", "suara"], ["enpp", "enp-kursi", "kursi"]].forEach(function (g) {
      s += '<polyline class="' + g[1] + '" points="' + T.map(function (t, i) { return x(i) + "," + y(t[g[0]]); }).join(" ") + '"/>';
      T.forEach(function (t, i) { s += '<circle class="' + g[1] + '" cx="' + x(i) + '" cy="' + y(t[g[0]]) + '" r="4.5"><title>' + t.tahun + " " + g[0].toUpperCase() + ": " + t[g[0]] + "</title></circle>" +
        '<text class="enp-n" x="' + x(i) + '" y="' + (y(t[g[0]]) + (g[0] === "enep" ? -10 : 18)) + '" text-anchor="middle">' + String(t[g[0]]).replace(".", ",") + "</text>"; });
      var l = T[T.length - 1];
      s += '<text class="enp-l ' + g[1] + '" x="' + (x(T.length - 1) + 12) + '" y="' + (y(l[g[0]]) + 4) + '">' + g[2] + "</text>";
    });
    T.forEach(function (t, i) { s += '<text class="ln-th" x="' + x(i) + '" y="' + (H - bawah + 18) + '" text-anchor="middle">' + t.tahun + "</text>"; });
    var tab = '<table class="tabel enp-t"><thead><tr><th scope="col">Pemilu</th><th scope="col" class="r">Ambang</th><th scope="col" class="r">Peserta</th><th scope="col" class="r">Berkursi</th><th scope="col" class="r">ENEP (suara)</th><th scope="col" class="r">ENPP (kursi)</th><th scope="col" class="r">Suara tanpa kursi</th></tr></thead><tbody>' +
      T.map(function (t) { var c = function (v) { return String(v).replace(".", ","); };
        return '<tr><th scope="row"><a href="' + E.url(t.sumber) + '" target="_blank" rel="noopener">' + t.tahun + '</a></th><td class="r">' + (t.ambang == null ? "tidak ada" : c(t.ambang) + "%") + '</td><td class="r">' + t.peserta + '</td><td class="r">' + t.berkursi + '</td><td class="r">' + c(t.enep) + '</td><td class="r">' + c(t.enpp) + '</td><td class="r">' + c(t.suara_tanpa_kursi) + "%</td></tr>"; }).join("") + "</tbody></table>";
    return '<div class="palang-jarak">' + palang("Gambar 9c", "Jumlah partai efektif, 1999–2024") + "</div>" +
      '<div class="dua-kol"><h2 class="j2">Seberapa terfragmentasi DPR?</h2><p class="lead">Indeks Laakso dan Taagepera (1979) menghitung berapa partai yang "efektif" bersaing: <b>N = 1 / Σ pᵢ²</b>, dengan pᵢ pangsa tiap partai. Dihitung atas suara (ENEP) dan atas kursi (ENPP). Jarak antara keduanya adalah fragmentasi yang disaring aturan pemilu: makin lebar, makin banyak pilihan pemilih yang tidak sampai ke parlemen.</p></div>' +
      '<div class="dua-kol ruu-kol"><figure class="gbr tanpa-garis"><div class="gulir"><svg class="enp" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="ENEP dan ENPP DPR 1999-2024">' + s + "</svg></div></figure>" +
      '<div class="gulir">' + tab + '<p class="rel-cat">' + esc(D.catatan) + " Ambang batas parlemen: 2,5% (2009), 3,5% (2014), 4% (2019, 2024).</p></div></div>";
  }

  function setelahRuu() {
    $$(".k-chip[data-i]").forEach(function (c) { c.onclick = function () { detailAktor(+c.dataset.i); }; });
    if ($("#kons-detail")) detailAktor(0);
    $$(".ps-isu button").forEach(function (b) {
      b.onclick = function () {
        $$(".ps-isu button").forEach(function (x) { x.setAttribute("aria-selected", x === b ? "true" : "false"); });
        $$(".ps-tiga").forEach(function (d) { d.hidden = d.dataset.isu !== b.dataset.isu; });
      };
    });
  }

  function ruu() {
    return '<section class="kertas blok"><div class="lebar">' +
      kepala("Fokus 2", "RUU Pemilu", "Studi baru tentang revisi aturan pemilu, khususnya ambang batas parlemen dan syarat pencapresan, sebagai konteks relevansi peta politik 2027–2029.") +
      '<div class="status-ruu"><span class="kicker">Status</span><p>Panja RUU Pemilu telah menerima masukan Koalisi Masyarakat Sipil dalam <a href="dokumen/laporan-singkat-komisi2-2026-11-12.pdf" target="_blank" rel="noopener">RDPU 12 November 2026</a>. Pada 13 November, Wakil Ketua Komisi II Agun Gunandjar Sudarsa menyebut <a href="https://tvrparlemen.dpr.go.id/berita/agun-gunandjar-tak-persoalkan-dosen-asn-non-aktif-sementara-maju-nyaleg-rss-b04fb3cce6f7f420a9a3636a1ca4a211f28b8447b23444e28738c84f0f1a9878" target="_blank" rel="noopener">target penyelesaian draf akhir Desember 2026</a>. Usulan ambang batas masih menjadi bahan pembahasan, bukan ketentuan yang telah disahkan.</p></div>' +
      palang("Gambar 9", "Tiga putusan yang memaksa revisi") +
      '<div class="tiga putusan">' + [E.PATAH[7], E.PATAH[8], E.PATAH[9]].map(function (p) {
        return '<article class="kartu-put"><time>' + esc(p.t) + '</time><h3 class="j3"><a href="' + E.url(p.url) + '" target="_blank" rel="noopener">' + esc(p.j) + "</a></h3><p>" + esc(p.k) + "</p></article>";
      }).join("") + "</div>" +
    "</div></section>" +

    '<section class="kertas blok" id="konstelasi"><div class="lebar">' + palang("Gambar 9a", "Konstelasi sikap ambang batas parlemen") +
      '<div class="dua-kol tumpuk"><h2 class="j2">Efektif, atau mewakili?</h2><p class="lead">Ambang batas parlemen memaksa pilihan antara dua nilai yang sama-sama sah. Outlook ini memakai pendekatan eklektik: tidak memilih satu kutub, tetapi menimbang keduanya.</p></div>' +
      '<div class="tiga kutub"><div class="ktb wakil"><p class="kicker">Kutub keterwakilan</p><h3 class="j3">Inklusif, sampai 0%</h3><p>Makin rendah ambang, makin sedikit suara yang tidak menjadi kursi dan makin beragam aspirasi yang terwakili. Harganya: parlemen lebih terfragmentasi. Dipegang masyarakat sipil dan partai nonparlemen.</p></div>' +
      '<div class="ktb tengah"><p class="kicker">Pendekatan Outlook ini</p><h3 class="j3">Eklektik: menimbang keduanya</h3><p>Putusan MK 116/PUU-XXI/2023 meminta angka ambang ditata ulang dengan menimbang proporsionalitas hasil pemilu, penyederhanaan partai, dan partisipasi bermakna, lewat perhitungan yang terbuka. Ukurannya: berapa efektivitas yang dibeli dengan berapa suara yang hilang.</p></div>' +
      '<div class="ktb efektif"><p class="kicker">Kutub efektivitas</p><h3 class="j3">Ramping: 5–7%</h3><p>Makin tinggi ambang, makin sedikit partai dan fraksi, negosiasi legislasi lebih sederhana, dan pemerintahan lebih stabil. Harganya: jutaan suara tidak menjadi kursi, 17,3 juta pada 2024 menurut Perindo. Dipegang sebagian besar partai parlemen.</p></div></div>' +
      '<p class="rel-cat">Setiap logo diletakkan pada angka yang diusulkan aktornya; garis menunjukkan rentang usulan. Klik logo untuk sumbernya.</p>' + konstelasi() +
      '<p class="rel-cat">Sumber: analisis terpadu tim RUU Pemilu EPPOS (Nov 2026) dan pemberitaan yang dihimpunnya; RDPU Komisi II DPR 12 Nov 2026. Angka mengikuti materi sumber. Logo dari Wikipedia/Wikimedia Commons; organisasi tanpa logo publik tampil sebagai monogram.</p>' +
      '<div class="palang-jarak">' + palang("Gambar 9b", "Simulasi ambang 1–7%, semua partai Pemilu 2024") + '</div>' +
      '<div class="sim-wadah"><div class="gulir">' + simulasi() + '</div><p class="rel-cat">' + esc(E.D.sikap_pt ? E.D.sikap_pt.simulasi.catatan : "") + "</p></div>" +
      '<div class="rdpu-wadah">' + rdpu() + "</div>" + enpHtml() +
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
      '<div class="dua-kol tumpuk"><h2 class="j2">Bagaimana peta intervensi membaca RUU?</h2><p class="lead">Kalau pemilu nasional dan pilkada dipisah lagi, kepala daerah tidak lagi menghadapi dua pemilihan sekaligus. Peta I dan Peta II memberi gambaran awal tentang apa yang bisa berubah.</p></div>' +
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
      case "peta-elit": html = petaElit(); setelah = setelahElit; break;
      case "ruu-pemilu": html = ruu(); setelah = setelahRuu; titik = bagian[1] || null; break;
      case "metode": html = metode(); break;
      case "presentasi": html = presentasi(bagian[1]); setelah = setelahPresentasi; break;
      default: html = '<section class="kertas blok"><div class="lebar"><h1 class="j-hal">Halaman tidak ditemukan</h1><p><a href="#/">Kembali ke beranda</a></p></div></section>';
    }
    document.body.className = "hal-" + (rute || "beranda") + (E.cetak ? " cetak" : "");
    isi.innerHTML = html;
    if (setelah) setelah();
    var berkas = rute === "provinsi" && bagian[1] ? E.PROVINSI.filter(function (x) { return E.slug(x) === bagian[1]; })[0] : null;
    document.title = rute ? (berkas || (rute === "peta-elit" ? "Peta Elit" : JUDUL[rute]) || "Halaman tidak ditemukan") + " · EPPOS Political Outlook" : JUDUL[""];
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
