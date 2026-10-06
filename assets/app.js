/* EPPOS — peta insiden. Provinsi adalah sasaran klik; titik hanya penanda letak di dalamnya.
   Data dari /data/*.json (dibangun scripts/build_data.py). Peramban tidak pernah membaca xlsx. */
(function () {
  "use strict";
  var LON_MIN = 95.195138, LON_MAX = 141.0009, LAT_MIN = -10.91942, LAT_MAX = 5.877151;
  var S = 1000 / (LON_MAX - LON_MIN), OY = (420 - (LAT_MAX - LAT_MIN) * S) / 2;
  function project(lon, lat) { return [(lon - LON_MIN) * S, 420 - ((lat - LAT_MIN) * S + OY)]; }

  var D = {}, state = { periode: null, prov: null, layers: { oto: true } };
  var $ = function (s) { return document.querySelector(s); };
  var all = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); };
  var blank = '<span class="blank">—</span>';
  var val = function (v) { return (v == null || v === "") ? blank : esc(v); };
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
  function fmtDate(s) { if (!s) return null; var d = new Date(s); return isNaN(d) ? s : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }); }

  function insidenAktif() {
    return D.insiden.filter(function (r) {
      return (r.status_kurasi === "masuk" || r.status_kurasi === "ragu") && r.periode_pilpres === state.periode;
    });
  }
  function kasusAktif() { return D.kasus_resmi.filter(function (r) { return r.periode_pilpres === state.periode; }); }
  function otoAktif() {
    if (!state.layers.oto) return [];
    return (D.otomatis || []).filter(function (r) { return r.periode_pilpres === state.periode; });
  }

  /* ---------- per-province tallies ----------
     Fill encodes which of the two series is present, never how many rows there are: a raw-count
     choropleth would map press density, not coercion (PROJECT-SPEC v2). */
  var NASIONAL = "(tingkat nasional)";
  function stats() {
    var m = {};
    var touch = function (p) { return (m[p] = m[p] || { ins: 0, kas: 0, oto: 0, dua: 0, kab: {} }); };
    insidenAktif().forEach(function (r) {
      var s = touch(r.provinsi || NASIONAL); s.ins++;
      if (r.status_verifikasi === "dua sumber") s.dua++;
      s.kab[r.kab_kota || "(tingkat provinsi)"] = 1;
    });
    kasusAktif().forEach(function (r) { touch(r.provinsi || NASIONAL).kas++; });
    otoAktif().forEach(function (r) { touch(r.provinsi || NASIONAL).oto++; });
    Object.keys(m).forEach(function (p) {
      var s = m[p];
      // Two series, named plainly. Archive finds are media reports, so they count as media coverage
      // rather than forming a separate "automated" category the reader has to decode.
      s.media = s.ins + s.oto;
      s.cat = s.media && s.kas ? "keduanya" : s.kas ? "resmi" : s.media ? "media" : "kosong";
    });
    return m;
  }

  /* ---------- map ---------- */
  var KATEGORI = { keduanya: "liputan media dan kasus resmi", resmi: "kasus resmi saja",
    media: "liputan media saja", kosong: "belum ada catatan" };

  function paintMap() {
    var st = stats(), paths = all("#provs .prov"), labels = "", pts = "";
    paths.forEach(function (el, i) {
      var names = D.pathProv[i] || [];
      var withData = names.filter(function (n) { return st[n] && n !== NASIONAL; });
      var cat = withData.length ? st[withData[0]].cat : "kosong";
      el.setAttribute("class", "prov cat-" + cat + (withData.length ? " live" : ""));
      el.setAttribute("data-idx", i);
      if (withData.length) {
        var n = withData[0], s = st[n], c = D.pathXY[i];
        el.setAttribute("tabindex", "0"); el.setAttribute("role", "button");
        // the label says what the fill says: the colour encodes which series is present, not a count
        el.setAttribute("aria-label", n + ": " + KATEGORI[s.cat] + ", " +
          s.media + " liputan media, " + s.kas + " kasus resmi");
        el.classList.toggle("sel", state.prov === n);
        if (c && state.prov === n) labels += '<text class="plab on" x="' + c[0] + '" y="' + c[1] + '" text-anchor="middle">' + esc(n.toUpperCase()) + "</text>";
      } else {
        el.removeAttribute("tabindex"); el.removeAttribute("role"); el.classList.remove("sel");
      }
    });
    // points: where inside the province the records sit. Reference only — the province is the click target.
    function plot(rows, cls) {
      rows.forEach(function (r) {
        var c = D.koordinat[(r.provinsi || "") + "|" + (r.kab_kota || "")];
        if (!c) return;
        var p = project(c.lon, c.lat), id = r.insiden_id || r.kasus_id;
        var a = hash(id) * Math.PI * 2, rad = 2.2 + hash(id + "r") * 2.6;
        var x = p[0] + Math.cos(a) * rad, y = p[1] + Math.sin(a) * rad;
        var on = state.prov && r.provinsi === state.prov ? " on" : "";
        if (cls === "ins") pts += '<circle class="dot ins' + on + '" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="2.6"/>';
        else pts += '<rect class="dot kas' + on + '" x="' + (x - 2.2).toFixed(1) + '" y="' + (y - 2.2).toFixed(1) + '" width="4.4" height="4.4" transform="rotate(45 ' + x.toFixed(1) + " " + y.toFixed(1) + ')"/>';
      });
    }
    plot(insidenAktif(), "ins"); plot(kasusAktif(), "kas");
    otoAktif().forEach(function (r) {
      var c = r.kab_kota ? D.koordinat[(r.provinsi || "") + "|" + r.kab_kota] : null;
      if (!c) c = D.koordinat[(r.provinsi || "") + "|"] || null;
      if (!c && r.provinsi) { for (var k in D.koordinat) { if (k.indexOf(r.provinsi + "|") === 0) { c = D.koordinat[k]; break; } } }
      if (!c) return;
      var p = project(c.lon, c.lat), id = r.insiden_id;
      var a2 = hash(id) * Math.PI * 2, rad = 2.6 + hash(id + "r") * 3.2;
      var x = p[0] + Math.cos(a2) * rad, y = p[1] + Math.sin(a2) * rad;
      var on = state.prov && r.provinsi === state.prov ? " on" : "";
      pts += '<path class="dot oto' + on + '" d="M' + x.toFixed(1) + " " + (y - 2.6).toFixed(1) +
        "L" + (x + 2.4).toFixed(1) + " " + (y + 1.8).toFixed(1) + "L" + (x - 2.4).toFixed(1) + " " + (y + 1.8).toFixed(1) + 'Z"/>';
    });
    $("#pts").innerHTML = pts;
    $("#plabels").innerHTML = labels;
    // stagger west→east so the map assembles in a readable order, not at random
    var urut = paths.slice().sort(function (a, b) {
      var ba = a.getBBox(), bb = b.getBBox(); return (ba.x + ba.width / 2) - (bb.x + bb.width / 2);
    });
    urut.forEach(function (el, i) { el.style.setProperty("--i", i); });
    all("#pts .dot").forEach(function (el, i) { el.style.setProperty("--j", i); });
    var svg = $("#map") || document.querySelector(".mapfig svg");
    if (svg && !svg.classList.contains("siap")) requestAnimationFrame(function () { svg.classList.add("siap"); });
    paths.forEach(function (el) {
      el.onclick = function () { pickPath(+el.dataset.idx); };
      el.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickPath(+el.dataset.idx); } };
    });
  }

  function pickPath(i) {
    var names = (D.pathProv[i] || []), st = stats();
    var withData = names.filter(function (n) { return st[n]; });
    if (withData.length) return bukaFokus(withData[0]);
    showEmptyProv(names.join(" / ") || "Provinsi ini");
  }

  /* ---------- panel ---------- */
  function verifPill(r) {
    var v = r.status_verifikasi; if (!v) return "";
    return '<span class="pill ' + (v === "dua sumber" ? "dua" : v === "satu sumber" ? "satu" : "dugaan") + '">' + esc(v) + "</span>";
  }

  function autoHtml(r) {
    var h = '<article class="rec oto"><h3><a href="' + esc(r.sumber_1_url) + '" target="_blank" rel="noopener">' + esc(r.judul_sumber_1) + " \u2197</a></h3>";
    h += '<div class="tags"><span class="pill kat">' + esc(r.mekanisme || "liputan media") + "</span>" +
      '<span class="pill ' + (r.status_verifikasi === "dua sumber" ? "dua" : "satu") + '">' + esc(r.status_verifikasi) + "</span>" +
      '<span class="pill lbg">' + esc(r.sumber_1_outlet || "") + "</span></div>";
    h += '<dl class="meta">';
    h += "<dt>Wilayah</dt><dd>" + (r.kab_kota ? esc(r.kab_kota) : (r.provinsi ? esc(r.provinsi) : blank)) +
      (r.lokasi_dasar ? ' <span class="muted small">(' + esc(r.lokasi_dasar) +
        (r.lokasi_perkiraan ? " \u00b7 perkiraan" : "") + ")</span>" : "") + "</dd>";
    h += "<dt>Tanggal kejadian</dt><dd>" + blank + ' <span class="muted small">tidak diturunkan dari tanggal berita</span></dd>';
    h += "<dt>Tanggal berita</dt><dd>" + (r.tanggal_berita ? esc(fmtDate(r.tanggal_berita)) : blank) + "</dd>";
    h += "<dt>Mekanisme</dt><dd>" + val(r.mekanisme) + ' <span class="muted small">dari kelompok kata kunci</span></dd>';
    h += "<dt>Pelaku</dt><dd>" + blank + "</dd><dt>Sasaran</dt><dd>" + blank + "</dd><dt>Hasil</dt><dd>" + blank + "</dd>";
    h += "</dl>";
    h += '<div class="srcs"><a href="' + esc(r.sumber_1_url) + '" target="_blank" rel="noopener">sumber 1 \u00b7 ' + esc(r.sumber_1_outlet || "") + "</a>";
    if (r.sumber_2_url) h += '<a href="' + esc(r.sumber_2_url) + '" target="_blank" rel="noopener">sumber 2</a>';
    h += "</div>";
    h += '<div class="attrib">' + esc(r.diisi_oleh) + " \u00b7 " + esc(r.tanggal_isi) + "</div></article>";
    return h;
  }

  function recordHtml(r) {
    var isIns = !!r.insiden_id, url = isIns ? r.sumber_1_url : r.sumber_url;
    var judul = r.judul_sumber_1 ? esc(r.judul_sumber_1) : (url ? esc(url) : "(tanpa judul)");
    var h = '<article class="rec"><h3><a href="' + esc(url) + '" target="_blank" rel="noopener">' + judul + " ↗</a></h3>";
    h += '<div class="tags"><span class="pill lbg">' + esc(isIns ? r.insiden_id : r.kasus_id) + "</span>";
    if (isIns) { h += verifPill(r); if (r.status_kurasi === "ragu") h += '<span class="pill ragu">kurasi: ragu</span>'; }
    else if (r.lembaga) h += '<span class="pill lbg">' + esc(r.lembaga) + "</span>";
    if (r.judul_status === "otomatis, belum diverifikasi") h += '<span class="pill judul">otomatis dari situs lembaga · belum diverifikasi</span>';
    else if (r.judul_status !== "terverifikasi") h += '<span class="pill judul">judul belum diverifikasi (dari URL)</span>';
    h += "</div>";
    if (isIns) h += '<p class="ring">' + val(r.ringkasan_satu_kalimat) + "</p>";
    h += '<dl class="meta">';
    h += "<dt>Wilayah</dt><dd>" + (r.kab_kota ? esc(r.kab_kota) : blank) + "</dd>";
    if (isIns) {
      h += "<dt>Tanggal</dt><dd>" + (r.tanggal ? esc(fmtDate(r.tanggal)) : blank) + "</dd>";
      h += "<dt>Mekanisme</dt><dd>" + val(r.mekanisme) + "</dd>";
      h += "<dt>Pelaku</dt><dd>" + val(r.pelaku_jabatan) + "</dd>";
      h += "<dt>Sasaran</dt><dd>" + val(r.sasaran_jenis) + "</dd>";
      h += "<dt>Hasil</dt><dd>" + val(r.hasil) + "</dd>";
    } else {
      h += "<dt>Tahun</dt><dd>" + val(r.tahun) + "</dd><dt>Pelanggaran</dt><dd>" + val(r.jenis_pelanggaran) +
        "</dd><dt>Jumlah kasus</dt><dd>" + val(r.jumlah_kasus) + "</dd>";
    }
    h += "</dl>";
    h += '<div class="srcs"><a href="' + esc(url) + '" target="_blank" rel="noopener">sumber 1' + (r.sumber_1_outlet ? " · " + esc(r.sumber_1_outlet) : "") + "</a>";
    if (r.sumber_2_url) h += '<a href="' + esc(r.sumber_2_url) + '" target="_blank" rel="noopener">sumber 2</a>';
    h += "</div>";
    h += '<div class="attrib">dikumpulkan oleh <b>' + val(r.diisi_oleh) + "</b> · diisi " + val(r.tanggal_isi) + "</div></article>";
    return h;
  }

  function group(rows) {
    var g = {}, order = [];
    rows.forEach(function (r) {
      var k = r.kab_kota || "— tingkat provinsi";
      if (!g[k]) { g[k] = []; order.push(k); }
      g[k].push(r);
    });
    order.sort();
    return order.map(function (k) {
      return '<div class="kab"><h4>' + esc(k) + '<span>' + g[k].length + "</span></h4>" + g[k].map(recordHtml).join("") + "</div>";
    }).join("");
  }


  /* ───── tampilan fokus: satu provinsi, tanpa peta dan tanpa teks lain ───── */

  function catatanProvinsi(name) {
    var m = function (r) { return name === NASIONAL ? !r.provinsi : r.provinsi === name; };
    return { ins: insidenAktif().filter(m), kas: kasusAktif().filter(m), oto: otoAktif().filter(m) };
  }

  /* Sorotan dihitung dari barisnya, bukan dikarang: mekanisme terbanyak, keseimbangan dua deret,
     pemusatan waktu, kab/kota teratas, dan korroborasi. Semua angka bisa ditelusuri ke barisnya. */
  function sorotan(name) {
    var c = catatanProvinsi(name), med = c.ins.concat(c.oto), out = [];
    var nMed = med.length, nKas = c.kas.length;

    var mek = {};
    med.forEach(function (r) { if (r.mekanisme) mek[r.mekanisme] = (mek[r.mekanisme] || 0) + 1; });
    var mekUrut = Object.keys(mek).sort(function (a, b) { return mek[b] - mek[a]; });

    var kab = {};
    med.concat(c.kas).forEach(function (r) { if (r.kab_kota) kab[r.kab_kota] = (kab[r.kab_kota] || 0) + 1; });
    var kabUrut = Object.keys(kab).sort(function (a, b) { return kab[b] - kab[a]; });

    var dua = med.filter(function (r) { return r.status_verifikasi === "dua sumber"; }).length;
    var tgl = med.concat(c.kas).map(function (r) { return r.tanggal || r.tanggal_berita || (r.tahun ? r.tahun + "-01-01" : null); })
      .filter(Boolean).sort();
    var musim = med.filter(function (r) { return ["2024", "2020", "2018", "2017", "2015"].indexOf(r.gelombang_pilkada) >= 0; }).length;

    out.push({ t: "Dua deret", n: nMed + " : " + nKas,
      k: nMed && nKas ? "Pemberitaan dan kasus resmi sama-sama ada di sini."
        : nKas ? "Hanya kasus resmi. Pengawas mencatat, pers tidak memberitakan."
        : "Hanya pemberitaan. Tidak ada perkara yang masuk jalur resmi." });
    if (mekUrut.length) out.push({ t: "Pola paling sering", n: mekUrut[0],
      k: mek[mekUrut[0]] + " dari " + nMed + " pemberitaan" + (mekUrut[1] ? "; disusul " + mekUrut[1] + " (" + mek[mekUrut[1]] + ")" : "") + "." });
    if (kabUrut.length) out.push({ t: "Paling banyak disebut", n: kabUrut[0],
      k: kab[kabUrut[0]] + " catatan" + (kabUrut[1] ? "; lalu " + kabUrut[1] + " (" + kab[kabUrut[1]] + ")" : "") + "." });
    out.push({ t: "Diberitakan dua outlet", n: dua + " dari " + nMed,
      k: dua ? "Dua outlet berbeda memberitakan peristiwa yang sama." : "Belum ada yang diberitakan dua outlet berbeda." });
    if (nMed) out.push({ t: "Terkait musim pilkada", n: Math.round(musim / nMed * 100) + "%",
      k: musim + " dari " + nMed + " pemberitaan jatuh di rentang gelombang pilkada." });
    if (tgl.length) out.push({ t: "Rentang waktu", n: tgl[0].slice(0, 4) + "\u2013" + tgl[tgl.length - 1].slice(0, 4),
      k: tgl.length + " catatan bertanggal." });
    return { sorot: out, c: c, nMed: nMed, nKas: nKas, dua: dua, musim: musim };
  }

  function bukaFokus(name) {
    var S = sorotan(name), c = S.c;
    $("#fokus-nama").textContent = name;
    $("#fokus-sub").textContent = state.periode + " · " + S.nMed + " liputan media · " + S.nKas + " kasus resmi";

    var idx = null;
    Object.keys(D.pathProv).forEach(function (i) { if (D.pathProv[i].indexOf(name) >= 0) idx = i; });

    $("#fokus-kaki").innerHTML = '<span class="pill lbg">' + S.nMed + " liputan media</span>" +
      '<span class="pill lbg">' + S.nKas + " kasus resmi</span>" +
      (S.dua ? '<span class="pill dua">' + S.dua + " dua sumber</span>" : "");

    // sorotan sebagai kisi kartu: kolomnya sekarang lebar, satu lajur panjang hanya menyisakan ruang kosong
    $("#fokus-sorotan").innerHTML = '<p class="fk-judul">Sorotan</p><div class="sorot-kisi">' +
      S.sorot.map(function (x) {
        return '<div class="sorot-kartu"><span class="t">' + esc(x.t) + "</span>" +
          '<span class="n">' + esc(x.n) + "</span>" +
          '<p class="k">' + esc(x.k) + "</p></div>";
      }).join("") + "</div>" +
      '<div class="fk-blok" style="margin-top:14px"><h3>Cara membacanya</h3>' +
      '<p class="fk-catatan">Angka di sini <b>bukan jumlah kejadian</b>, melainkan jumlah yang berhasil ditemukan ' +
      "lewat prosedur pencarian kami. Provinsi dengan pers yang tebal akan tampak lebih ramai, dan itu sifat " +
      "sumbernya, bukan sifat daerahnya.</p>" +
      '<p class="fk-catatan">Yang lebih bisa dipercaya adalah <b>selisih antara dua deret</b>: kalau ada pemberitaan ' +
      "tanpa kasus resmi, pertanyaannya kenapa tidak ditindak; kalau ada kasus resmi tanpa pemberitaan, " +
      "pertanyaannya kenapa tidak diberitakan.</p></div>";

    var semua = c.ins.map(function (r) { return { r: r, t: r.tanggal || "", jenis: "insiden" }; })
      .concat(c.oto.map(function (r) { return { r: r, t: r.tanggal_berita || "", jenis: "oto" }; }))
      .concat(c.kas.map(function (r) { return { r: r, t: (r.tahun ? r.tahun + "-01-01" : ""), jenis: "kasus" }; }))
      .filter(function (x) { return x.t; })
      .sort(function (a, b) { return b.t < a.t ? -1 : 1; });
    var tanpaTgl = c.ins.filter(function (r) { return !r.tanggal; }).length +
      c.oto.filter(function (r) { return !r.tanggal_berita; }).length;
    var html = '<p class="fk-judul">Semua catatan, dari yang terbaru</p>';
    var th = null;
    semua.forEach(function (x) {
      var y = x.t.slice(0, 4);
      if (y !== th) { th = y; html += '<div class="fk-tahun">' + esc(y) + "</div>"; }
      html += (x.jenis === "oto" ? autoHtml(x.r) : recordHtml(x.r));
    });
    if (tanpaTgl) html += '<p class="fk-catatan" style="margin-top:12px">' + tanpaTgl +
      " catatan lain tidak punya tanggal yang bisa dipastikan, jadi tidak masuk urutan di atas.</p>";
    $("#fokus-catatan").innerHTML = semua.length ? html : '<div class="fk-blok">Belum ada catatan.</div>';

    var fk = $("#fokus");
    fk.classList.remove("tampil");
    fk.hidden = false;
    document.body.style.overflow = "hidden";
    document.body.classList.add("fokus-aktif");
    pemicuFokus = document.activeElement;   // so Esc puts the keyboard back where it came from
    fk.focus();
    fk.scrollTop = 0;
    // getBBox only returns real numbers once the element is laid out, so the shape
    // is measured after the panel stops being display:none, never before
    gambarBentuk(idx, name, c);
    all("#fokus-catatan .rec").forEach(function (el, i) { el.style.setProperty("--r", Math.min(i, 14)); });
    // rAF gives a clean animation start; the timer is a backstop, because a browser that is not
    // painting (hidden tab, reduced-motion shells) never runs rAF and the panel must still appear
    var sv = $("#fokus-bentuk");
    sv.classList.remove("siap");
    var lepas = function () { sv.classList.add("siap"); };
    sv.addEventListener("animationend", lepas, { once: true });
    setTimeout(lepas, 760);                 // backstop: no paint means no animationend
    var nyala = function () { fk.classList.add("tampil"); };
    requestAnimationFrame(function () { requestAnimationFrame(nyala); });
    setTimeout(nyala, 80);
  }

  // muka atas dan sisi tebal untuk tiap kategori; sisinya warna yang sama tapi digelapkan
  var MUKA = {
    keduanya: ["#c4402c", "#7f2718"], resmi: ["#e8873a", "#8f5119"],
    media: ["#f0c243", "#95741c"], kosong: ["#1c1c1c", "#000000"]
  };

  // the province outline, lifted out of the map and given thickness: the same path is stamped
  // repeatedly along one diagonal to build the side wall, then the top face is laid over it
  function gambarBentuk(idx, name, c) {
    var sv = $("#fokus-bentuk");
    if (idx == null || !D.pathD[idx]) {
      // some provinces have no shape in the base map at all (Kepulauan Riau is small islands and
      // was never drawn); say so rather than leaving a blank where a map is expected
      sv.innerHTML = ""; sv.setAttribute("viewBox", "0 0 100 100");
      sv.removeAttribute("aria-label");
      var ket = $("#fokus-tanpa-bentuk");
      if (ket) { ket.hidden = false; ket.textContent = "Peta dasar yang kami pakai tidak menggambar " +
        name + ", jadi bentuknya tidak bisa ditampilkan. Catatannya tetap lengkap di sebelah."; }
      return;
    }
    var ket0 = $("#fokus-tanpa-bentuk"); if (ket0) ket0.hidden = true;
    sv.setAttribute("viewBox", "0 0 1000 420");
    sv.setAttribute("aria-label", "Bentuk wilayah " + name + ", dengan titik di kab/kota yang disebut");
    var d = D.pathD[idx];
    sv.innerHTML = '<path class="bentuk" d="' + d + '"/>';
    var node = sv.querySelector(".bentuk"), bb = node.getBBox();
    if (!bb.width || !bb.height) return;          // still not laid out; leave the map-wide box
    var sisi = Math.max(bb.width, bb.height) * 0.075, lapis = 16;
    // the box has to leave room for the thickness, or the extrusion gets clipped at the bottom edge
    var pad = Math.max(bb.width, bb.height) * 0.07;
    sv.setAttribute("viewBox", (bb.x - pad) + " " + (bb.y - pad) + " " +
      (bb.width + pad * 2 + sisi) + " " + (bb.height + pad * 2 + sisi));

    var st = stats()[name];
    var kat = st && st.media && st.kas ? "keduanya" : st && st.kas ? "resmi" : st && st.media ? "media" : "kosong";
    var warna = MUKA[kat], dx = sisi / lapis * 0.55, dy = sisi / lapis;

    var tumpuk = "";
    for (var k = lapis; k >= 1; k--) {
      tumpuk += '<path class="sisi" d="' + d + '" fill="' + warna[1] +
        '" transform="translate(' + (k * dx).toFixed(2) + " " + (k * dy).toFixed(2) + ')"/>';
    }
    node.setAttribute("fill", warna[0]);
    node.setAttribute("stroke-width", (Math.max(bb.width, bb.height) * 0.005).toFixed(3));
    sv.insertAdjacentHTML("afterbegin", tumpuk);

    // kab/kota points stay, so the shape still carries where inside the province things happened
    var rad = Math.max(bb.width, bb.height) * 0.013, tt = "";
    c.ins.concat(c.oto, c.kas).forEach(function (r) {
      var k2 = D.koordinat[(r.provinsi || "") + "|" + (r.kab_kota || "")];
      if (!k2) return;
      var pt = project(k2.lon, k2.lat);
      tt += '<circle class="tt" cx="' + pt[0].toFixed(1) + '" cy="' + pt[1].toFixed(1) + '" r="' + rad.toFixed(2) +
        '" stroke-width="' + (rad * 0.28).toFixed(3) +
        '" fill="' + (r.kasus_id ? "#8a4a12" : "var(--navy-deep)") + '" fill-opacity=".85"/>';
    });
    sv.insertAdjacentHTML("beforeend", tt);
  }

  var pemicuFokus = null;

  // the shape tilts toward the pointer. The entrance keyframes hold the transform while they run
  // (fill-mode both), so the tilt only takes over once .siap turns that animation off.
  function wireMiring() {
    var pg = document.querySelector(".panggung"), sv = $("#fokus-bentuk");
    if (!pg || !sv || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    pg.addEventListener("pointermove", function (e) {
      var r = pg.getBoundingClientRect();
      if (!r.width || !r.height) return;
      sv.style.setProperty("--rx", (11 - ((e.clientY - r.top) / r.height - 0.5) * 17).toFixed(1) + "deg");
      sv.style.setProperty("--ry", (-7 + ((e.clientX - r.left) / r.width - 0.5) * 24).toFixed(1) + "deg");
    });
    pg.addEventListener("pointerleave", function () {
      sv.style.removeProperty("--rx"); sv.style.removeProperty("--ry");
    });
  }


  function tutupFokus() {
    if ($("#fokus").hidden) return;
    $("#fokus").classList.remove("tampil");
    $("#fokus").hidden = true;
    document.body.style.overflow = "";
    document.body.classList.remove("fokus-aktif");
    if (pemicuFokus && document.contains(pemicuFokus)) pemicuFokus.focus();
    pemicuFokus = null;
  }

  function selectProv(name) {
    state.prov = name === NASIONAL ? null : name; paintMap();
    var match = function (r) { return name === NASIONAL ? !r.provinsi : r.provinsi === name; };
    var ins = insidenAktif().filter(match), kas = kasusAktif().filter(match), oto = otoAktif().filter(match);
    var nMedia = ins.length + oto.length;
    var cat = nMedia && kas.length ? "<b>Liputan media dan kasus resmi.</b> Keduanya ada di provinsi ini." :
      kas.length ? "<b>Kasus resmi saja.</b> Ada catatan dari pengawas, tidak ada liputan media \u2014 bisa jadi persnya tidak sampai ke sana." :
        nMedia ? "<b>Liputan media saja.</b> Ada pemberitaan, tidak ada kasus resmi \u2014 bisa jadi laporannya tidak ditindak." :
        "Belum ada catatan di provinsi ini.";
    var h = '<div class="pnl-hd"><div><h3>' + esc(name) + "</h3>" +
      '<p class="sub">' + nMedia + " liputan media \u00b7 " + kas.length + " kasus resmi</p></div>" +
      '<button class="btn-x" id="pnl-back">\u2190 semua provinsi</button></div>' +
      '<div class="note div-' + (nMedia && kas.length ? "keduanya" : kas.length ? "resmi" : nMedia ? "media" : "kosong") + '">' + cat + "</div>";
    if (ins.length) h += '<h4 class="grp">Liputan media \u00b7 ' + ins.length + " insiden</h4>" + group(ins);
    if (kas.length) h += '<h4 class="grp">Kasus resmi \u00b7 ' + kas.length + " catatan</h4>" + group(kas);
    if (oto.length) {
      h += '<h4 class="grp oto">Liputan media \u00b7 ' + oto.length + " dari arsip outlet</h4>" +
        '<div class="note oto-note">Judul, tautan, outlet dan tanggal terbit diambil dari arsip outlet. Tanggal kejadian, ' +
        "pelaku dan hasilnya dibiarkan kosong karena tidak bisa dipastikan dari judul saja.</div>" +
        oto.map(autoHtml).join("");
    }
    if (!ins.length && !kas.length) h += '<div class="pnl-empty"><b>Tidak ada catatan</b><p>Belum ada baris untuk provinsi ini pada ' + esc(state.periode) + ".</p></div>";
    $("#pnl").innerHTML = '<div class="scrolly">' + h + "</div>";
    all("#pnl .rec").forEach(function (el, i) { el.style.setProperty("--r", Math.min(i, 14)); });
    $("#pnl-back").onclick = function () { state.prov = null; paintMap(); provinceList(); };
    $("#pnl").scrollTop = 0;
  }

  function showEmptyProv(name) {
    state.prov = null; paintMap();
    $("#pnl").innerHTML = '<div class="pnl-hd"><h3>' + esc(name) + '</h3><button class="btn-x" id="pnl-back">← semua provinsi</button></div>' +
      '<div class="pnl-empty"><b>Belum ada catatan</b><p>Provinsi ini belum punya baris pada ' + esc(state.periode) +
      ". Ketiadaan titik di sini berarti belum ada yang ditemukan lewat prosedur pencarian, bukan berarti tidak ada kejadian.</p></div>";
    $("#pnl-back").onclick = provinceList;
  }

  /* Wave window vs its matched non-election window, on the automated layer.
     Windows are the same length and cover the same outlets, so the pair is comparable; what it is NOT
     is a measure of incidence — both series still follow press attention, which itself rises at election
     time. Read it as "how much more is reported", never as "how much more happens". */
  var PASANGAN = [["2024", "kontrol-2024", "Pilkada 2024", "2023"],
                  ["2020", "kontrol-2020", "Pilkada 2020", "2019"],
                  ["2018", "kontrol-2018", "Pilkada 2018", "2019/20"]];

  /* How much more gets reported during an election season than outside it.
     Both windows are the same length and cover the same outlets, and the rate is per 1,000 searches
     because the two were not searched equally hard. */
  function bandingGelombang() {
    // only the WordPress archive grid: it searches every window with the same queries, and only its
    // searches are counted in the denominator. Targeted sweeps were aimed at election windows on purpose.
    var oto = (D.otomatis || []).filter(function (r) { return r.saluran === "wp-grid"; }), usaha = D.usaha || {};
    if (!oto.length) return "";
    var rows = PASANGAN.map(function (p) {
      var a = oto.filter(function (r) { return r.gelombang_pilkada === p[0]; }).length;
      var b = oto.filter(function (r) { return r.gelombang_pilkada === p[1]; }).length;
      var ua = usaha[p[0]], ub = usaha[p[1]];
      if (!a && !b) return "";
      var ra = ua ? a / ua * 1000 : null, rb = ub ? b / ub * 1000 : null;
      var max = Math.max(ra || 0, rb || 0, 0.001);
      var lipat = (ra && rb) ? (ra / rb).toFixed(1) : null;
      return '<tr><td><b>' + esc(p[2]) + "</b></td>" +
        '<td class="bar"><i data-w="' + ((ra || 0) / max * 100) + '" style="width:0"></i><b>' + (ra ? ra.toFixed(1) : "\u2014") + "</b></td>" +
        '<td class="bar k"><i data-w="' + ((rb || 0) / max * 100) + '" style="width:0"></i><b>' + (rb ? rb.toFixed(1) : "\u2014") + "</b></td>" +
        '<td class="r">' + (lipat ? lipat + "\u00d7 lebih banyak" : "\u2014") + "</td></tr>";
    }).join("");
    if (!rows.replace(/\s/g, "")) return "";
    return '<div class="banding"><h4 class="grp">Musim pilkada vs tahun biasa</h4>' +
      '<p class="hint" style="margin:0 0 8px">Berapa banyak pemberitaan paksaan yang muncul <b>saat musim pilkada</b> ' +
      "dibandingkan <b>tahun biasa tanpa pilkada</b>, di rentang bulan yang sama dan outlet yang sama.</p>" +
      '<table class="bandingtab"><thead><tr><th></th><th>musim pilkada</th><th>tahun biasa</th><th class="r">bedanya</th></tr></thead><tbody>' +
      rows + "</tbody></table>" +
      '<p class="hint" style="margin:8px 0 0">Angkanya temuan per 1.000 pencarian, bukan jumlah mentah, karena kedua rentang ' +
      "belum dicari sama banyak. Hanya temuan dari sapuan arsip outlet yang sama di kedua rentang yang dihitung di sini; " +
      "pencarian yang sengaja diarahkan ke musim pilkada tidak ikut. Yang diukur <b>seberapa banyak yang diberitakan</b>, " +
      "bukan seberapa banyak yang terjadi.</p></div>";
  }

  function provinceList() {
    state.prov = null; paintMap();
    var st = stats(), p = D.periode.filter(function (x) { return x.periode === state.periode; })[0] || {};
    var names = Object.keys(st).sort(function (a, b) {
      if (a === NASIONAL) return 1; if (b === NASIONAL) return -1;
      // sort by what the row actually shows; sorting on the curated layer alone buried provinces
      // whose record is entirely automatic (Kepulauan Riau has 61 of them and would rank as zero)
      return (st[b].media + st[b].kas) - (st[a].media + st[a].kas) || a.localeCompare(b);
    });
    if (!names.length) {
      $("#pnl").innerHTML = '<div class="pnl-hd"><h3>' + esc(state.periode) + "</h3></div>" +
        '<div class="pnl-empty"><b>Belum dikumpulkan</b><p>Tidak ada baris untuk ' + esc(state.periode) + " (" + esc(p.mulai || "") + " → " + esc(p.selesai || "") +
        "). Periode ini menunggu pengumpulan data.</p>" +
        '<p style="margin-top:10px">Gelombang pilkada yang akan mengisinya:<br><b class="wave">' + esc(p.gelombang_pilkada_di_dalamnya || "—") + "</b></p></div>";
      return;
    }
    var tot = names.reduce(function (a, n) { return { med: a.med + st[n].media, kas: a.kas + st[n].kas }; }, { med: 0, kas: 0 });
    var nProv = names.filter(function (n) { return n !== NASIONAL; }).length;
    var h = '<div class="pnl-hd"><div><h3>' + esc(state.periode) + '</h3><p class="sub">' + esc(p.presiden_terpilih || "") + " · " + esc(p.gelombang_pilkada_di_dalamnya || "") + "</p></div></div>" +
      '<div class="note"><b>' + tot.med + " liputan media</b> dan <b>" + tot.kas + " kasus resmi</b> di " + nProv +
      " provinsi. Keduanya meleset ke arah yang berlawanan: pemberitaan mengikuti ke mana pers hadir, kasus resmi mengikuti ke mana pengawasnya bekerja. " +
      "Yang menarik justru di mana keduanya tidak cocok.</div>" +
      bandingGelombang() +
      '<p class="pick">Pilih provinsi — di peta atau dari daftar ini:</p><div class="plist">';
    names.forEach(function (n) {
      var s = st[n];
      h += '<button class="prow" data-prov="' + esc(n) + '"><span class="pn">' + esc(n) + "</span>" +
        '<span class="pc"><i class="sw ins"></i>' + s.media + '<i class="sw kas"></i>' + s.kas + "</span>" +
        '<span class="pcat cat-' + s.cat + '" title="' + esc(s.deret || "") + '">' +
        (s.cat === "keduanya" ? "media + resmi" : s.cat === "resmi" ? "kasus resmi" : "liputan media") + "</span></button>";
    });
    $("#pnl").innerHTML = h + "</div>";
    all(".prow").forEach(function (b) { b.onclick = function () { bukaFokus(b.dataset.prov); }; });
    requestAnimationFrame(function () {
      all(".bandingtab td.bar i").forEach(function (el) { el.style.width = el.dataset.w + "%"; });
    });
  }

  /* ---------- chrome ---------- */
  function wireLegendHelp() {
    var b = $("#legend-toggle"), box = $("#legend-help");
    if (!b || !box) return;
    b.onclick = function () {
      var open = box.hidden;
      box.hidden = !open;
      b.setAttribute("aria-expanded", String(open));
      b.textContent = open ? "tutup penjelasan" : "apa arti tanda-tanda ini?";
    };
  }

  function drawPeriods() {
    $("#periods").innerHTML = D.periode.map(function (p) {
      var n = D.insiden.filter(function (r) { return r.periode_pilpres === p.periode && (r.status_kurasi === "masuk" || r.status_kurasi === "ragu"); }).length +
        D.kasus_resmi.filter(function (r) { return r.periode_pilpres === p.periode; }).length +
        (D.otomatis || []).filter(function (r) { return r.periode_pilpres === p.periode; }).length;
      return '<button class="ptab' + (n ? "" : " kosong") + '" role="tab" data-p="' + esc(p.periode) + '" aria-selected="' + (p.periode === state.periode) + '">' +
        "<b>" + esc(p.periode) + "</b><span>" + esc(String(p.mulai || "").slice(0, 4)) + "–" + esc(String(p.selesai || "").slice(0, 4)) +
        " · " + (n ? n + " catatan" : "belum dikumpulkan") + "</span></button>";
    }).join("");
    all(".ptab").forEach(function (b) {
      b.onclick = function () { state.periode = b.dataset.p; state.prov = null; drawPeriods(); provinceList(); updateStats(); };
    });
  }

  function hitungNaik(el, target) {
    var n = parseInt(target, 10);
    if (isNaN(n) || n < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = target; return; }
    var t0 = performance.now(), dur = Math.min(900, 300 + n * 0.7);
    (function step(t) {
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(n * e).toLocaleString("id-ID");
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  function updateStats() {
    var ins = insidenAktif(), kas = kasusAktif(), provs = {};
    ins.concat(kas).forEach(function (r) { if (r.provinsi) provs[r.provinsi] = 1; });
    var oto = otoAktif();
    oto.forEach(function (r) { if (r.provinsi) provs[r.provinsi] = 1; });
    $("#stats").innerHTML =
      '<div class="stat"><b>' + (ins.length + oto.length) + "</b><span>liputan media</span></div>" +
      '<div class="stat"><b>' + kas.length + "</b><span>kasus resmi</span></div>" +
      '<div class="stat"><b>' + Object.keys(provs).length + "</b><span>provinsi</span></div>" +
      '<div class="stat sub"><b>' + esc(state.periode.replace("Periode ", "")) + "</b><span>periode dipilih</span></div>";
    // read the target from a data attribute: once the animation writes "1.084" with a thousands
    // separator, re-reading textContent would parse it back as 1
    all("#stats .stat:not(.sub) b").forEach(function (el) {
      if (!el.dataset.t) el.dataset.t = el.textContent;
      hitungNaik(el, el.dataset.t);
    });
  }

  /* retrieval progress. The queue is accepted in bulk under a standing authorisation, so this reports
     what is on the map and how it is sourced — not a backlog waiting on anyone. */
  function pipeline() {
    fetch("data/kemajuan.json").then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
      .then(function (cs) {
        var oto = (D.otomatis || []);
        if (!oto.length && !cs) return;
        var done = cs ? (cs.sel_selesai != null ? cs.sel_selesai : (cs.n_done != null ? cs.n_done : 0)) : 0;
        var last = cs ? (cs.run_terakhir || (cs.runs && cs.runs.length ? cs.runs[cs.runs.length - 1].tanggal : null)) : null;
        var dua = oto.filter(function (r) { return r.status_verifikasi === "dua sumber"; }).length;
        $("#pipeline").hidden = false;
        $("#pipeline").innerHTML =
          "<span><b>" + oto.length + "</b> liputan media dari arsip outlet \u00b7 <b>" + dua + "</b> diberitakan dua outlet</span>" +
          '<span class="grow"></span>' +
          '<span class="mono muted">' + done.toLocaleString("id-ID") + " kueri dijalankan" + (last ? " \u00b7 terakhir " + last : "") + "</span>";
      });
  }

  fetch("data/manifest.json").then(function (r) { return r.json(); }).then(function (m) {
    D.manifest = m;
    return Promise.all(["periode", "insiden", "kasus_resmi", "koordinat", "provinsi_path", "insiden_otomatis", "usaha_pencarian"].map(function (n) {
      return fetch("data/" + n + ".json").then(function (r) { return r.json(); });
    }));
  }).then(function (a) {
    D.periode = a[0]; D.insiden = a[1]; D.kasus_resmi = a[2]; D.koordinat = a[3];
    D.otomatis = a[5] || []; D.usaha = a[6] || {};
    var pp = a[4];
    D.pathProv = {}; D.pathXY = {};
    pp.paths.forEach(function (L) { D.pathXY[L.path_index] = [L.x, L.y]; });
    Object.keys(pp.provinsi_data).forEach(function (name) {
      var i = pp.provinsi_data[name]; (D.pathProv[i] = D.pathProv[i] || []).push(name);
    });
    pp.paths.forEach(function (L) { if (!D.pathProv[L.path_index]) D.pathProv[L.path_index] = L.provinsi_wikidata; });
    D.pathD = {};
    all("#provs .prov").forEach(function (el, i) { D.pathD[i] = el.getAttribute("d"); });
    var withRows = D.periode.filter(function (p) {
      return D.insiden.some(function (r) { return r.periode_pilpres === p.periode; }) || D.kasus_resmi.some(function (r) { return r.periode_pilpres === p.periode; });
    });
    state.periode = (withRows[withRows.length - 1] || D.periode[D.periode.length - 1]).periode;
    var vEl = $("#ver");
    if (vEl) vEl.textContent = "seluruh data \u00b7 " + ((D.insiden || []).length + (D.otomatis || []).length) +
      " liputan media \u00b7 " + (D.kasus_resmi || []).length + " kasus resmi";
    var ex = D.insiden.length - D.insiden.filter(function (r) { return r.status_kurasi === "masuk" || r.status_kurasi === "ragu"; }).length;
    var xEl = $("#excl"); if (xEl) xEl.textContent = ex ? ex + " baris berstatus kurasi 'keluar' tetap di dataset tetapi tidak dipetakan." : "";
    drawPeriods(); provinceList(); updateStats(); pipeline(); wireLegendHelp();
    var tb = $("#fokus-tutup"); if (tb) tb.onclick = tutupFokus;
    wireMiring();
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") tutupFokus(); });
  }).catch(function (e) {
    $("#pnl").innerHTML = '<div class="pnl-empty"><b>Data gagal dimuat</b><p>' + esc(e.message) + "</p></div>";
  });
})();
