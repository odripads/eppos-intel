/* EPPOS — peta insiden. Data dari /data/*.json (dibangun scripts/build_data.py). Tidak ada xlsx di browser. */
(function () {
  "use strict";
  var LON_MIN = 95.195138, LON_MAX = 141.0009, LAT_MIN = -10.91942, LAT_MAX = 5.877151;
  var S = 1000 / (LON_MAX - LON_MIN), OY = (420 - (LAT_MAX - LAT_MIN) * S) / 2;
  function project(lon, lat) { return [(lon - LON_MIN) * S, 420 - ((lat - LAT_MIN) * S + OY)]; }

  var D = {}, state = { periode: null, layers: { insiden: true, kasus: true }, sel: null };
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); };
  var blank = '<span class="blank">—</span>';
  var val = function (v) { return (v == null || v === "") ? blank : esc(v); };
  var key = function (r) { return (r.provinsi || "") + "|" + (r.kab_kota || ""); };

  /* deterministic jitter: hash the record id so a point never moves between reloads */
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
  function jitter(id, i) { var a = hash(id) * Math.PI * 2, r = 3.2 + hash(id + "|r") * 3.4; return [Math.cos(a) * r, Math.sin(a) * r]; }

  function fmtDate(s) {
    if (!s) return null;
    var d = new Date(s); if (isNaN(d)) return s;
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  }

  /* ---------- rows in scope ---------- */
  function insidenAktif() {
    return D.insiden.filter(function (r) {
      return (r.status_kurasi === "masuk" || r.status_kurasi === "ragu") && r.periode_pilpres === state.periode;
    });
  }
  function kasusAktif() { return D.kasus_resmi.filter(function (r) { return r.periode_pilpres === state.periode; }); }

  /* ---------- map ---------- */
  function buildPoints() {
    var groups = {}, unmapped = { insiden: [], kasus: [] };
    function add(rows, layer) {
      rows.forEach(function (r) {
        var k = key(r), c = D.koordinat[k];
        if (!c) { unmapped[layer].push(r); return; }
        var gk = layer + "@" + k;
        (groups[gk] = groups[gk] || { layer: layer, k: k, coord: c, rows: [] }).rows.push(r);
      });
    }
    if (state.layers.insiden) add(insidenAktif(), "insiden");
    if (state.layers.kasus) add(kasusAktif(), "kasus");
    return { groups: Object.keys(groups).map(function (g) { return groups[g]; }), unmapped: unmapped };
  }

  function markerPath(layer, x, y, r) {
    if (layer === "insiden") return '<circle class="mk ins" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r + '"/>';
    var d = r * 1.25;
    return '<rect class="mk kas" x="' + (x - d / 2).toFixed(1) + '" y="' + (y - d / 2).toFixed(1) + '" width="' + d + '" height="' + d + '" transform="rotate(45 ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"/>';
  }

  function drawMap() {
    var res = buildPoints(), out = "";
    res.groups.forEach(function (g) {
      var p = project(g.coord.lon, g.coord.lat), provLvl = g.coord.tingkat === "provinsi";
      var idOf = function (r) { return r.insiden_id || r.kasus_id; };
      if (g.rows.length > 3) {
        var r = 8.5 + Math.min(g.rows.length, 12) * 0.5;
        out += '<g class="pt" data-gk="' + esc(g.layer + "@" + g.k) + '" tabindex="0" role="button" aria-label="' +
          esc(g.rows.length + " catatan di " + (g.k.split("|")[1] || g.k.split("|")[0])) + '">' +
          markerPath(g.layer, p[0], p[1], r).replace('class="mk', 'class="mk cluster' + (provLvl ? " prov-lvl" : "")) +
          '<text class="cl-n" x="' + p[0].toFixed(1) + '" y="' + (p[1] + 3.4).toFixed(1) + '">' + g.rows.length + "</text></g>";
      } else {
        g.rows.forEach(function (row, i) {
          var j = g.rows.length > 1 ? jitter(idOf(row), i) : [0, 0];
          var x = p[0] + j[0], y = p[1] + j[1];
          var cls = [provLvl ? "prov-lvl" : "", row.status_verifikasi === "satu sumber" ? "satu" : "", row.status_verifikasi === "dugaan" ? "dugaan" : ""].join(" ").trim();
          out += '<g class="pt" data-gk="' + esc(g.layer + "@" + g.k) + '" tabindex="0" role="button" aria-label="' + esc(idOf(row)) + '">' +
            markerPath(g.layer, x, y, 6).replace('class="mk', 'class="mk ' + cls) + "</g>";
        });
      }
    });
    $("#pts").innerHTML = out;
    Array.prototype.forEach.call(document.querySelectorAll(".pt"), function (el) {
      el.addEventListener("click", function () { openGroup(el.dataset.gk); });
      el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openGroup(el.dataset.gk); } });
    });
    var nUn = res.unmapped.insiden.length + res.unmapped.kasus.length;
    $("#unmapped").innerHTML = nUn
      ? '<b>' + nUn + " catatan tanpa koordinat</b> — lokasi tidak terpetakan (sel berisi banyak kab/kota, atau baris nasional). Tetap tercatat di dataset; lihat <code>data/koordinat_gagal.json</code>. <button class=\"btn-x\" id=\"show-un\">Tampilkan</button>"
      : "";
    if (nUn) $("#show-un").addEventListener("click", function () { showRecords("Tanpa koordinat", res.unmapped.insiden.concat(res.unmapped.kasus)); });
    return res;
  }

  /* ---------- panel ---------- */
  function verifPill(r) {
    var v = r.status_verifikasi;
    if (!v) return "";
    var c = v === "dua sumber" ? "dua" : v === "satu sumber" ? "satu" : "dugaan";
    return '<span class="pill ' + c + '">' + esc(v) + "</span>";
  }

  function recordHtml(r) {
    var isIns = !!r.insiden_id;
    var url = isIns ? r.sumber_1_url : r.sumber_url;
    var judulRaw = r.judul_sumber_1;
    var judul = judulRaw ? esc(judulRaw) : (url ? esc(url) : "(tanpa judul)");
    var unver = r.judul_status !== "terverifikasi";
    var h = '<article class="rec">';
    h += '<h3><a href="' + esc(url) + '" target="_blank" rel="noopener">' + judul + " ↗</a></h3>";
    h += '<div class="tags">';
    h += '<span class="pill lbg">' + esc(isIns ? r.insiden_id : r.kasus_id) + "</span>";
    if (isIns) { h += verifPill(r); if (r.status_kurasi === "ragu") h += '<span class="pill ragu">kurasi: ragu</span>'; }
    else if (r.lembaga) h += '<span class="pill lbg">' + esc(r.lembaga) + "</span>";
    if (unver) h += '<span class="pill judul">judul belum diverifikasi (dari URL)</span>';
    h += "</div>";
    if (isIns) h += '<p class="ring">' + val(r.ringkasan_satu_kalimat) + "</p>";
    h += '<dl class="meta">';
    var wilayah = [r.kab_kota, r.provinsi].filter(Boolean).join(", ");
    h += "<dt>Wilayah</dt><dd>" + (wilayah ? esc(wilayah) : blank) + "</dd>";
    if (isIns) {
      h += "<dt>Tanggal</dt><dd>" + (r.tanggal ? esc(fmtDate(r.tanggal)) : blank) + "</dd>";
      h += "<dt>Mekanisme</dt><dd>" + val(r.mekanisme) + "</dd>";
      h += "<dt>Pelaku</dt><dd>" + val(r.pelaku_jabatan) + "</dd>";
      h += "<dt>Sasaran</dt><dd>" + val(r.sasaran_jenis) + "</dd>";
      h += "<dt>Hasil</dt><dd>" + val(r.hasil) + "</dd>";
    } else {
      h += "<dt>Tahun</dt><dd>" + val(r.tahun) + "</dd>";
      h += "<dt>Pelanggaran</dt><dd>" + val(r.jenis_pelanggaran) + "</dd>";
      h += "<dt>Jumlah kasus</dt><dd>" + val(r.jumlah_kasus) + "</dd>";
    }
    h += "</dl>";
    h += '<div class="srcs"><a href="' + esc(url) + '" target="_blank" rel="noopener">sumber 1' + (r.sumber_1_outlet ? " · " + esc(r.sumber_1_outlet) : "") + "</a>";
    if (r.sumber_2_url) h += '<a href="' + esc(r.sumber_2_url) + '" target="_blank" rel="noopener">sumber 2</a>';
    h += "</div>";
    h += '<div class="attrib">dikumpulkan oleh <b>' + val(r.diisi_oleh) + "</b> · diisi " + val(r.tanggal_isi) + "</div>";
    return h + "</article>";
  }

  function showRecords(title, rows) {
    $("#pnl").innerHTML = '<div class="pnl-hd"><h3>' + esc(title) + '</h3><button class="btn-x" id="pnl-close">tutup</button></div>' +
      '<div class="scrolly">' + rows.map(recordHtml).join("") + "</div>";
    $("#pnl-close").addEventListener("click", resetPanel);
    $("#pnl").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function openGroup(gk) {
    Array.prototype.forEach.call(document.querySelectorAll(".pt"), function (e) { e.classList.toggle("sel", e.dataset.gk === gk); });
    var layer = gk.split("@")[0], k = gk.slice(layer.length + 1);
    var rows = (layer === "insiden" ? insidenAktif() : kasusAktif()).filter(function (r) { return key(r) === k; });
    var parts = k.split("|"), name = parts[1] || parts[0] || "(tanpa wilayah)";
    var c = D.koordinat[k];
    var label = name + (c && c.tingkat === "provinsi" ? " · titik tingkat provinsi" : "");
    showRecords(label + " — " + rows.length + (layer === "insiden" ? " insiden" : " kasus resmi"), rows);
  }

  function resetPanel() {
    var ins = insidenAktif(), kas = kasusAktif();
    var p = D.periode.filter(function (x) { return x.periode === state.periode; })[0] || {};
    if (!ins.length && !kas.length) {
      $("#pnl").innerHTML = '<div class="pnl-empty"><b>Belum dikumpulkan</b>' +
        "<p>Tidak ada baris untuk " + esc(state.periode) + " (" + esc(p.mulai || "") + " → " + esc(p.selesai || "") + "). Periode ini menunggu pengumpulan data.</p>" +
        '<p style="margin-top:10px">Gelombang pilkada yang akan mengisinya:<br><b style="font-family:var(--mono);font-size:12.5px;color:var(--ink-2)">' + esc(p.gelombang_pilkada_di_dalamnya || "—") + "</b></p></div>";
      return;
    }
    var byMek = {}, byLbg = {};
    ins.forEach(function (r) { if (r.mekanisme) byMek[r.mekanisme] = (byMek[r.mekanisme] || 0) + 1; });
    kas.forEach(function (r) { if (r.lembaga) byLbg[r.lembaga] = (byLbg[r.lembaga] || 0) + 1; });
    var rank = function (o) {
      return Object.keys(o).sort(function (a, b) { return o[b] - o[a]; }).map(function (k2) {
        return '<dt>' + esc(k2) + "</dt><dd>" + o[k2] + "</dd>";
      }).join("");
    };
    var nDua = ins.filter(function (r) { return r.status_verifikasi === "dua sumber"; }).length;
    $("#pnl").innerHTML = '<div class="pnl-hd"><h3>' + esc(state.periode) + '</h3><span class="mono muted">klik titik untuk membuka catatannya</span></div>' +
      '<p class="hint" style="margin:10px 0 14px">' + esc(p.presiden_terpilih || "") + " · " + esc(p.mulai || "") + " → " + esc(p.selesai || "") +
      " · " + esc(p.gelombang_pilkada_di_dalamnya || "") + "</p>" +
      '<div class="note" style="margin-bottom:14px"><b>' + ins.length + " insiden dilaporkan media</b> (" + nDua + " berstatus dua sumber) dan <b>" + kas.length +
      " kasus administratif</b>. Keduanya punya bias arah berbeda: liputan mengikuti kehadiran pers, kasus resmi mengikuti pengawasan yang berfungsi. Perbedaan keduanya adalah temuannya, bukan hitungan mentahnya.</div>" +
      (Object.keys(byMek).length ? '<h4 style="font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--red);margin-bottom:6px">Mekanisme · insiden</h4><dl class="meta" style="margin-bottom:14px">' + rank(byMek) + "</dl>" : "") +
      (Object.keys(byLbg).length ? '<h4 style="font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--red);margin-bottom:6px">Lembaga · kasus resmi</h4><dl class="meta">' + rank(byLbg) + "</dl>" : "");
  }

  /* ---------- chrome ---------- */
  function drawPeriods() {
    $("#periods").innerHTML = D.periode.map(function (p) {
      var n = D.insiden.filter(function (r) { return r.periode_pilpres === p.periode && (r.status_kurasi === "masuk" || r.status_kurasi === "ragu"); }).length +
        D.kasus_resmi.filter(function (r) { return r.periode_pilpres === p.periode; }).length;
      return '<button class="ptab' + (n ? "" : " kosong") + '" role="tab" data-p="' + esc(p.periode) + '" aria-selected="' + (p.periode === state.periode) + '">' +
        "<b>" + esc(p.periode) + "</b><span>" + esc((p.mulai || "").slice(0, 4)) + "–" + esc(String(p.selesai || "").slice(0, 4)) + " · " +
        (n ? n + " catatan" : "belum dikumpulkan") + "</span></button>";
    }).join("");
    Array.prototype.forEach.call(document.querySelectorAll(".ptab"), function (b) {
      b.addEventListener("click", function () { state.periode = b.dataset.p; state.sel = null; drawPeriods(); drawMap(); resetPanel(); updateStats(); });
    });
  }

  function updateStats() {
    var ins = insidenAktif(), kas = kasusAktif();
    var provs = {}; ins.concat(kas).forEach(function (r) { if (r.provinsi) provs[r.provinsi] = 1; });
    $("#stats").innerHTML =
      '<div class="stat"><b>' + ins.length + '</b><span>insiden</span></div>' +
      '<div class="stat"><b>' + kas.length + '</b><span>kasus resmi</span></div>' +
      '<div class="stat"><b>' + Object.keys(provs).length + '</b><span>provinsi</span></div>';
  }

  function wireLayers() {
    Array.prototype.forEach.call(document.querySelectorAll(".lyr"), function (b) {
      b.addEventListener("click", function () {
        var k = b.dataset.layer; state.layers[k] = !state.layers[k];
        b.setAttribute("aria-pressed", String(state.layers[k])); drawMap();
      });
    });
  }

  fetch("data/manifest.json").then(function (r) { return r.json(); }).then(function (m) {
    D.manifest = m;
    return Promise.all(["periode", "insiden", "kasus_resmi", "koordinat"].map(function (n) {
      return fetch("data/" + n + ".json").then(function (r) { return r.json(); });
    }));
  }).then(function (all) {
    D.periode = all[0]; D.insiden = all[1]; D.kasus_resmi = all[2]; D.koordinat = all[3];
    var withRows = D.periode.filter(function (p) {
      return D.insiden.some(function (r) { return r.periode_pilpres === p.periode; }) || D.kasus_resmi.some(function (r) { return r.periode_pilpres === p.periode; });
    });
    state.periode = (withRows[withRows.length - 1] || D.periode[D.periode.length - 1]).periode;
    $("#ver").textContent = "data " + D.manifest.version + " · " + D.manifest.insiden + " insiden · " + D.manifest.kasus_resmi + " kasus resmi";
    var ex = D.insiden.length - D.insiden.filter(function (r) { return r.status_kurasi === "masuk" || r.status_kurasi === "ragu"; }).length;
    $("#excl").textContent = ex ? ex + " baris berstatus kurasi 'keluar' tetap di dataset tetapi tidak dipetakan." : "";
    drawPeriods(); wireLayers(); drawMap(); resetPanel(); updateStats();
  }).catch(function (e) {
    $("#pnl").innerHTML = '<div class="pnl-empty"><b>Data gagal dimuat</b><p>' + esc(e.message) + "</p></div>";
  });
})();
