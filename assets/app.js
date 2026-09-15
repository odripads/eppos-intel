/* EPPOS — peta insiden. Provinsi adalah sasaran klik; titik hanya penanda letak di dalamnya.
   Data dari /data/*.json (dibangun scripts/build_data.py). Peramban tidak pernah membaca xlsx. */
(function () {
  "use strict";
  var LON_MIN = 95.195138, LON_MAX = 141.0009, LAT_MIN = -10.91942, LAT_MAX = 5.877151;
  var S = 1000 / (LON_MAX - LON_MIN), OY = (420 - (LAT_MAX - LAT_MIN) * S) / 2;
  function project(lon, lat) { return [(lon - LON_MIN) * S, 420 - ((lat - LAT_MIN) * S + OY)]; }

  var D = {}, state = { periode: null, prov: null };
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

  /* ---------- per-province tallies ----------
     Fill encodes which of the two series is present, never how many rows there are: a raw-count
     choropleth would map press density, not coercion (PROJECT-SPEC v2). */
  var NASIONAL = "(tingkat nasional)";
  function stats() {
    var m = {};
    var touch = function (p) { return (m[p] = m[p] || { ins: 0, kas: 0, dua: 0, kab: {} }); };
    insidenAktif().forEach(function (r) {
      var s = touch(r.provinsi || NASIONAL); s.ins++;
      if (r.status_verifikasi === "dua sumber") s.dua++;
      s.kab[r.kab_kota || "(tingkat provinsi)"] = 1;
    });
    kasusAktif().forEach(function (r) { touch(r.provinsi || NASIONAL).kas++; });
    Object.keys(m).forEach(function (p) {
      var s = m[p];
      s.cat = s.ins && s.kas ? "keduanya" : s.ins ? "media" : s.kas ? "resmi" : "kosong";
    });
    return m;
  }

  /* ---------- map ---------- */
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
        el.setAttribute("aria-label", n + ": " + s.ins + " insiden, " + s.kas + " kasus resmi");
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
    $("#pts").innerHTML = pts;
    $("#plabels").innerHTML = labels;
    paths.forEach(function (el) {
      el.onclick = function () { pickPath(+el.dataset.idx); };
      el.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickPath(+el.dataset.idx); } };
    });
  }

  function pickPath(i) {
    var names = (D.pathProv[i] || []), st = stats();
    var withData = names.filter(function (n) { return st[n]; });
    if (withData.length) return selectProv(withData[0]);
    showEmptyProv(names.join(" / ") || "Provinsi ini");
  }

  /* ---------- panel ---------- */
  function verifPill(r) {
    var v = r.status_verifikasi; if (!v) return "";
    return '<span class="pill ' + (v === "dua sumber" ? "dua" : v === "satu sumber" ? "satu" : "dugaan") + '">' + esc(v) + "</span>";
  }

  function recordHtml(r) {
    var isIns = !!r.insiden_id, url = isIns ? r.sumber_1_url : r.sumber_url;
    var judul = r.judul_sumber_1 ? esc(r.judul_sumber_1) : (url ? esc(url) : "(tanpa judul)");
    var h = '<article class="rec"><h3><a href="' + esc(url) + '" target="_blank" rel="noopener">' + judul + " ↗</a></h3>";
    h += '<div class="tags"><span class="pill lbg">' + esc(isIns ? r.insiden_id : r.kasus_id) + "</span>";
    if (isIns) { h += verifPill(r); if (r.status_kurasi === "ragu") h += '<span class="pill ragu">kurasi: ragu</span>'; }
    else if (r.lembaga) h += '<span class="pill lbg">' + esc(r.lembaga) + "</span>";
    if (r.judul_status !== "terverifikasi") h += '<span class="pill judul">judul belum diverifikasi (dari URL)</span>';
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

  function selectProv(name) {
    state.prov = name === NASIONAL ? null : name; paintMap();
    var match = function (r) { return name === NASIONAL ? !r.provinsi : r.provinsi === name; };
    var ins = insidenAktif().filter(match), kas = kasusAktif().filter(match);
    var dua = ins.filter(function (r) { return r.status_verifikasi === "dua sumber"; }).length;
    var cat = ins.length && kas.length ? "Keduanya hadir: liputan media dan kasus administratif." :
      ins.length ? "Hanya liputan media, tanpa kasus administratif di deret ini — periksa kemungkinan kegagalan penegakan." :
        "Hanya kasus administratif, tanpa liputan media di deret ini — periksa kemungkinan ketiadaan pers.";
    var h = '<div class="pnl-hd"><div><h3>' + esc(name) + "</h3>" +
      '<p class="sub">' + ins.length + " insiden · " + kas.length + " kasus resmi · " + dua + " berstatus dua sumber</p></div>" +
      '<button class="btn-x" id="pnl-back">← semua provinsi</button></div>' +
      '<div class="note div-' + (ins.length && kas.length ? "keduanya" : ins.length ? "media" : "resmi") + '">' + cat + "</div>";
    if (ins.length) h += '<h4 class="grp">Insiden dilaporkan media</h4>' + group(ins);
    if (kas.length) h += '<h4 class="grp">Kasus administratif</h4>' + group(kas);
    if (!ins.length && !kas.length) h += '<div class="pnl-empty"><b>Tidak ada catatan</b><p>Belum ada baris untuk provinsi ini pada ' + esc(state.periode) + ".</p></div>";
    $("#pnl").innerHTML = '<div class="scrolly">' + h + "</div>";
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

  /* default panel: pick a province from a list, so nobody has to hunt for a dot */
  function provinceList() {
    state.prov = null; paintMap();
    var st = stats(), p = D.periode.filter(function (x) { return x.periode === state.periode; })[0] || {};
    var names = Object.keys(st).sort(function (a, b) {
      if (a === NASIONAL) return 1; if (b === NASIONAL) return -1;
      return (st[b].ins + st[b].kas) - (st[a].ins + st[a].kas) || a.localeCompare(b);
    });
    if (!names.length) {
      $("#pnl").innerHTML = '<div class="pnl-hd"><h3>' + esc(state.periode) + "</h3></div>" +
        '<div class="pnl-empty"><b>Belum dikumpulkan</b><p>Tidak ada baris untuk ' + esc(state.periode) + " (" + esc(p.mulai || "") + " → " + esc(p.selesai || "") +
        "). Periode ini menunggu pengumpulan data.</p>" +
        '<p style="margin-top:10px">Gelombang pilkada yang akan mengisinya:<br><b class="wave">' + esc(p.gelombang_pilkada_di_dalamnya || "—") + "</b></p></div>";
      return;
    }
    var tot = names.reduce(function (a, n) { return { ins: a.ins + st[n].ins, kas: a.kas + st[n].kas }; }, { ins: 0, kas: 0 });
    var h = '<div class="pnl-hd"><div><h3>' + esc(state.periode) + '</h3><p class="sub">' + esc(p.presiden_terpilih || "") + " · " + esc(p.gelombang_pilkada_di_dalamnya || "") + "</p></div></div>" +
      '<div class="note"><b>' + tot.ins + " insiden dilaporkan media</b> dan <b>" + tot.kas + " kasus administratif</b> di " + names.length +
      " wilayah. Kedua deret punya bias arah berbeda: liputan mengikuti kehadiran pers, kasus resmi mengikuti pengawasan yang berfungsi. Perbedaan keduanya adalah temuannya, bukan hitungan mentahnya.</div>" +
      '<p class="pick">Pilih provinsi — di peta atau dari daftar ini:</p><div class="plist">';
    names.forEach(function (n) {
      var s = st[n];
      h += '<button class="prow" data-prov="' + esc(n) + '"><span class="pn">' + esc(n) + "</span>" +
        '<span class="pc"><i class="sw ins"></i>' + s.ins + '<i class="sw kas"></i>' + s.kas + "</span>" +
        '<span class="pcat cat-' + s.cat + '">' + (s.cat === "keduanya" ? "keduanya" : s.cat === "media" ? "hanya media" : "hanya resmi") + "</span></button>";
    });
    $("#pnl").innerHTML = h + "</div>";
    all(".prow").forEach(function (b) { b.onclick = function () { selectProv(b.dataset.prov); }; });
  }

  /* ---------- chrome ---------- */
  function drawPeriods() {
    $("#periods").innerHTML = D.periode.map(function (p) {
      var n = D.insiden.filter(function (r) { return r.periode_pilpres === p.periode && (r.status_kurasi === "masuk" || r.status_kurasi === "ragu"); }).length +
        D.kasus_resmi.filter(function (r) { return r.periode_pilpres === p.periode; }).length;
      return '<button class="ptab' + (n ? "" : " kosong") + '" role="tab" data-p="' + esc(p.periode) + '" aria-selected="' + (p.periode === state.periode) + '">' +
        "<b>" + esc(p.periode) + "</b><span>" + esc(String(p.mulai || "").slice(0, 4)) + "–" + esc(String(p.selesai || "").slice(0, 4)) +
        " · " + (n ? n + " catatan" : "belum dikumpulkan") + "</span></button>";
    }).join("");
    all(".ptab").forEach(function (b) {
      b.onclick = function () { state.periode = b.dataset.p; state.prov = null; drawPeriods(); provinceList(); updateStats(); };
    });
  }

  function updateStats() {
    var ins = insidenAktif(), kas = kasusAktif(), provs = {};
    ins.concat(kas).forEach(function (r) { if (r.provinsi) provs[r.provinsi] = 1; });
    $("#stats").innerHTML =
      '<div class="stat"><b>' + ins.length + "</b><span>insiden</span></div>" +
      '<div class="stat"><b>' + kas.length + "</b><span>kasus resmi</span></div>" +
      '<div class="stat"><b>' + Object.keys(provs).length + "</b><span>provinsi</span></div>";
  }

  fetch("data/manifest.json").then(function (r) { return r.json(); }).then(function (m) {
    D.manifest = m;
    return Promise.all(["periode", "insiden", "kasus_resmi", "koordinat", "provinsi_path"].map(function (n) {
      return fetch("data/" + n + ".json").then(function (r) { return r.json(); });
    }));
  }).then(function (a) {
    D.periode = a[0]; D.insiden = a[1]; D.kasus_resmi = a[2]; D.koordinat = a[3];
    var pp = a[4];
    D.pathProv = {}; D.pathXY = {};
    pp.paths.forEach(function (L) { D.pathXY[L.path_index] = [L.x, L.y]; });
    Object.keys(pp.provinsi_data).forEach(function (name) {
      var i = pp.provinsi_data[name]; (D.pathProv[i] = D.pathProv[i] || []).push(name);
    });
    pp.paths.forEach(function (L) { if (!D.pathProv[L.path_index]) D.pathProv[L.path_index] = L.provinsi_wikidata; });
    var withRows = D.periode.filter(function (p) {
      return D.insiden.some(function (r) { return r.periode_pilpres === p.periode; }) || D.kasus_resmi.some(function (r) { return r.periode_pilpres === p.periode; });
    });
    state.periode = (withRows[withRows.length - 1] || D.periode[D.periode.length - 1]).periode;
    $("#ver").textContent = "data " + D.manifest.version + " · " + D.manifest.insiden + " insiden · " + D.manifest.kasus_resmi + " kasus resmi";
    var ex = D.insiden.length - D.insiden.filter(function (r) { return r.status_kurasi === "masuk" || r.status_kurasi === "ragu"; }).length;
    $("#excl").textContent = ex ? ex + " baris berstatus kurasi 'keluar' tetap di dataset tetapi tidak dipetakan." : "";
    drawPeriods(); provinceList(); updateStats();
  }).catch(function (e) {
    $("#pnl").innerHTML = '<div class="pnl-empty"><b>Data gagal dimuat</b><p>' + esc(e.message) + "</p></div>";
  });
})();
