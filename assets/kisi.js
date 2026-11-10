/* EPPOS Political Outlook: papan kisi. Indonesia digambar sebagai papan sel: tiap sel milik satu kab/kota, sel menyala
   kalau ada catatan di sana. Canvas, bukan SVG, karena satu papan berisi 9.000-an sel dan satu halaman bisa punya enam papan.
   Dua lapis kanvas: dasar (sel, batas provinsi) hanya dilukis ulang saat data berubah; lapis atas untuk denyut dan sorotan. */
(function (E) {
  "use strict";
  var TAU = Math.PI * 2, HEX = [];
  for (var h = 0; h < 6; h++) HEX.push([Math.cos(Math.PI / 6 + h * TAU / 6), Math.sin(Math.PI / 6 + h * TAU / 6)]);

  // divalidasi dengan validate_palette.js di atas --malam, --pairs all; "keduanya" juga lebih besar supaya tidak bergantung warna
  E.WARNA = { redup: "rgba(150,172,232,.36)", prov: "rgba(214,160,40,.62)", 2: "#bf8200", 3: "#2c93c6", 4: "#e63e5c" };
  E.KETERANGAN = [
    { st: 4, t: "Media dan kasus resmi", k: "dua deret menunjuk ke tempat yang sama" },
    { st: 2, t: "Media saja", k: "diberitakan, belum ada perkara resmi" },
    { st: 3, t: "Kasus resmi saja", k: "tercatat lembaga, tidak ditemukan beritanya" },
    { st: 1, t: "Tingkat provinsi", k: "berita menyebut provinsi, tanpa kab/kota" },
    { st: 0, t: "Belum ada catatan", k: "bukan berarti tidak ada kejadian" }
  ];

  E.WILAYAH = [
    { id: "semua", t: "Indonesia", vb: [-10, 0, 1024, 424] },
    { id: "sumatera", t: "Sumatera", vb: [-6, 8, 262, 292] },
    { id: "jawa", t: "Jawa–Bali", vb: [208, 272, 240, 84] },
    { id: "kalimantan", t: "Kalimantan", vb: [290, 50, 200, 196] },
    { id: "sulawesi", t: "Sulawesi", vb: [496, 118, 170, 172] },
    { id: "nusra", t: "Nusa Tenggara", vb: [430, 318, 240, 84] },
    { id: "timur", t: "Maluku–Papua", vb: [640, 50, 372, 318] }
  ];
  // semua di laut: label tidak boleh menumpang di sel yang sedang menyala
  var LABEL = [["SUMATERA", 186, 112], ["JAWA", 300, 372], ["KALIMANTAN", 386, 58], ["SULAWESI", 560, 108], ["MALUKU", 706, 80], ["PAPUA", 900, 128], ["NUSA TENGGARA", 560, 408]];

  /* peta sel: indeks tetangga dan segmen batas provinsi dihitung sekali, lalu dipakai semua papan */
  var G = null;
  function geo() {
    if (G) return G;
    var K = E.D.kisi, s = K.s, b = K.baris, peta = {}, n = E.nSel, seg = [], i;
    function kunci(r, c) { return r * 4096 + c; }
    function rc(x, y) { var r = Math.round(y / b); return [r, Math.round((x - (r % 2 ? s / 2 : 0)) / s)]; }
    for (i = 0; i < n; i++) { var p = rc(K.sel[i * 3], K.sel[i * 3 + 1]); peta[kunci(p[0], p[1])] = i; }
    var sisi = s / Math.sqrt(3) / 2;
    for (i = 0; i < n; i++) {
      var x = K.sel[i * 3], y = K.sel[i * 3 + 1], q = rc(x, y), g = q[0] % 2 ? 0 : -1, prov = K.unit[K.sel[i * 3 + 2]][1];
      // tiga arah cukup: arah sebaliknya sudah terhitung dari sel seberang
      [[q[0], q[1] + 1], [q[0] + 1, q[1] + g], [q[0] + 1, q[1] + g + 1]].forEach(function (t) {
        var j = peta[kunci(t[0], t[1])];
        if (j == null || K.unit[K.sel[j * 3 + 2]][1] === prov) return;
        var xj = K.sel[j * 3], yj = K.sel[j * 3 + 1], mx = (x + xj) / 2, my = (y + yj) / 2, dx = xj - x, dy = yj - y, l = Math.sqrt(dx * dx + dy * dy);
        seg.push(mx - dy / l * sisi, my + dx / l * sisi, mx + dy / l * sisi, my - dx / l * sisi);
      });
    }
    var perProv = {};
    for (i = 0; i < n; i++) { var pn = K.unit[K.sel[i * 3 + 2]][1]; (perProv[pn] = perProv[pn] || []).push(i); }
    G = { peta: peta, rc: rc, kunci: kunci, seg: seg, perProv: perProv };
    return G;
  }

  function kanvas(kelas) { var c = document.createElement("canvas"); c.className = kelas; c.setAttribute("aria-hidden", "true"); return c; }

  /* o: {vb, nilai, hidup, label, sel(i), arah(i), keluar()} */
  function Papan(wadah, o) {
    this.wadah = wadah; this.o = o || {};
    this.vb = this.o.vb || E.WILAYAH[0].vb;
    this.nilai = this.o.nilai || new Uint8Array(E.nSel);
    this.nilai2 = null; this.garis = 0.5;
    this.dasar = kanvas("papan-dasar"); this.lapis = kanvas("papan-lapis");
    wadah.appendChild(this.dasar); wadah.appendChild(this.lapis);
    this.ctx = this.dasar.getContext("2d"); this.ctxL = this.lapis.getContext("2d");
    this.sorot = null; this.selSorot = null; this.t = 0;
    this.ukur(); this.lukis();
    var self = this;
    if (window.ResizeObserver) { this.ro = new ResizeObserver(function () { if (self.ukur()) self.lukis(); }); this.ro.observe(wadah); }
    if (this.o.arah || this.o.pilih) this.pasang();
    if (this.o.hidup && !E.tenang) this.hidupkan();
    if (this.o.label && document.fonts && document.fonts.ready) document.fonts.ready.then(function () { self.lukis(); });
    Papan.semua.push(this);
  }
  Papan.semua = [];
  Papan.lepasSemua = function () { Papan.semua.forEach(function (p) { p.lepas(); }); Papan.semua = []; };

  Papan.prototype.lepas = function () { this.mati = true; if (this.ro) this.ro.disconnect(); if (this.io) this.io.disconnect(); };

  Papan.prototype.ukur = function () {
    var w = this.wadah.clientWidth, h = this.wadah.clientHeight;
    if (!w || !h) return false;
    if (w === this.w && h === this.h) return false;
    var d = E.cetak ? 2 : Math.min(window.devicePixelRatio || 1, 2.5);
    this.w = w; this.h = h; this.d = d;
    [this.dasar, this.lapis].forEach(function (c) { c.width = Math.round(w * d); c.height = Math.round(h * d); });
    this.skala();
    return true;
  };

  Papan.prototype.skala = function () {
    var v = this.vb;
    this.k = Math.min(this.w / v[2], this.h / v[3]);
    this.ox = (this.w - v[2] * this.k) / 2 - v[0] * this.k;
    this.oy = (this.h - v[3] * this.k) / 2 - v[1] * this.k;
  };

  Papan.prototype.setel = function (nilai, nilai2) {
    this.nilai = nilai; this.nilai2 = nilai2 || null;
    this.menyala = null; this.lukis();
  };
  Papan.prototype.arahkan = function (vb) { this.vb = vb; this.skala(); this.lukis(); };

  Papan.prototype.gambarSel = function (c, nilai) {
    var K = E.D.kisi, s = K.s * this.k, n = E.nSel, ox = this.ox, oy = this.oy, k = this.k, w = this.w, h = this.h;
    var rRedup = Math.max(0.42, s * 0.2), rProv = Math.max(0.55, s * 0.27), rNyala = Math.max(0.8, s * 0.5), rDua = Math.max(0.95, s * 0.58);
    var jalur = { 0: new Path2D(), 1: new Path2D(), 2: new Path2D(), 3: new Path2D(), 4: new Path2D() }, lain = new Path2D();
    for (var i = 0; i < n; i++) {
      var x = K.sel[i * 3] * k + ox, y = K.sel[i * 3 + 1] * k + oy, st = nilai[i], p = jalur[st];
      if (x < -6 || y < -6 || x > w + 6 || y > h + 6) continue;
      if (this.o.hanya && K.unit[K.sel[i * 3 + 2]][1] !== this.o.hanya) { lain.moveTo(x + rRedup, y); lain.arc(x, y, rRedup, 0, TAU); continue; }
      if (st < 2) { var r = st ? rProv : rRedup; p.moveTo(x + r, y); p.arc(x, y, r, 0, TAU); }
      else {
        var q = st === 4 ? rDua : rNyala;
        p.moveTo(x + HEX[0][0] * q, y + HEX[0][1] * q);
        for (var j = 1; j < 6; j++) p.lineTo(x + HEX[j][0] * q, y + HEX[j][1] * q);
        p.closePath();
      }
    }
    c.fillStyle = "rgba(150,172,232,.1)"; c.fill(lain);
    c.fillStyle = E.WARNA.redup; c.fill(jalur[0]);
    c.fillStyle = E.WARNA.prov; c.fill(jalur[1]);
    c.fillStyle = E.WARNA[2]; c.fill(jalur[2]);
    c.fillStyle = E.WARNA[3]; c.fill(jalur[3]);
    c.fillStyle = E.WARNA[4]; c.fill(jalur[4]);
  };

  Papan.prototype.gambarBatas = function (c) {
    var g = geo(), k = this.k, ox = this.ox, oy = this.oy, seg = g.seg;
    c.beginPath();
    for (var i = 0; i < seg.length; i += 4) { c.moveTo(seg[i] * k + ox, seg[i + 1] * k + oy); c.lineTo(seg[i + 2] * k + ox, seg[i + 3] * k + oy); }
    c.lineWidth = Math.max(0.5, k * 0.28); c.strokeStyle = "rgba(190,205,245,.17)"; c.stroke();
  };

  Papan.prototype.lukis = function () {
    if (!this.w) return;
    var c = this.ctx;
    c.setTransform(this.d, 0, 0, this.d, 0, 0);
    c.clearRect(0, 0, this.w, this.h);
    if (this.nilai2) {                       // mode geser: Peta I di kiri garis, Peta II di kanan
      var gx = this.garis * this.w;
      c.save(); c.beginPath(); c.rect(0, 0, gx, this.h); c.clip(); this.gambarSel(c, this.nilai); c.restore();
      c.save(); c.beginPath(); c.rect(gx, 0, this.w - gx, this.h); c.clip(); this.gambarSel(c, this.nilai2); c.restore();
    } else this.gambarSel(c, this.nilai);
    this.gambarBatas(c);
    if (this.o.label && this.vb[2] > 900) {
      c.font = "500 " + Math.max(8.5, this.k * 9.2) + "px 'IBM Plex Mono', monospace";
      c.fillStyle = "rgba(205,216,245,.62)"; c.textAlign = "center";
      var k = this.k, ox = this.ox, oy = this.oy;
      LABEL.forEach(function (l) { c.fillText(l[0].split("").join(" "), l[1] * k + ox, l[2] * k + oy); });
    }
    this.menyala = null;
    this.lapisUlang();
  };

  /* denyut: gelombang terang berjalan barat ke timur di atas sel yang menyala. Hanya sel menyala dan hanya 15 fps. */
  Papan.prototype.lapisUlang = function () {
    var c = this.ctxL, K = E.D.kisi, s = K.s * this.k, k = this.k, ox = this.ox, oy = this.oy, i;
    if (!this.w) return;
    c.setTransform(this.d, 0, 0, this.d, 0, 0);
    c.clearRect(0, 0, this.w, this.h);
    if (this.hidup_) {
      if (!this.menyala) {
        this.menyala = [];
        for (i = 0; i < E.nSel; i++) if (this.nilai[i] >= 2) this.menyala.push(i);
      }
      var t = this.t, p = new Path2D(), r = s * 0.5, m = this.menyala;
      for (var a = 0; a < m.length; a++) {
        i = m[a];
        var sx = K.sel[i * 3], f = Math.sin(t * 0.85 - sx * 0.019) + Math.sin(t * 2.3 + i * 12.9898) * 0.28;
        if (f < 0.88) continue;
        var x = sx * k + ox, y = K.sel[i * 3 + 1] * k + oy;
        p.moveTo(x + r, y); p.arc(x, y, r * 0.86, 0, TAU);
      }
      c.fillStyle = "rgba(255,244,214,.62)"; c.fill(p);
    }
    if (this.sorot) {
      var d = geo().perProv[this.sorot] || [], q = new Path2D(), rr = Math.max(0.8, s * 0.3);
      for (i = 0; i < d.length; i++) { var dx = K.sel[d[i] * 3] * k + ox, dy = K.sel[d[i] * 3 + 1] * k + oy; q.moveTo(dx + rr, dy); q.arc(dx, dy, rr, 0, TAU); }
      c.fillStyle = "rgba(255,255,255,.5)"; c.fill(q);
    }
    if (this.selSorot != null) {
      var u = K.sel[this.selSorot * 3 + 2];
      c.strokeStyle = "#fff"; c.lineWidth = 1.2; c.fillStyle = "rgba(255,255,255,.92)";
      for (i = 0; i < E.nSel; i++) if (K.sel[i * 3 + 2] === u) { c.beginPath(); c.arc(K.sel[i * 3] * k + ox, K.sel[i * 3 + 1] * k + oy, Math.max(1.1, s * 0.46), 0, TAU); c.fill(); }
    }
  };

  Papan.prototype.hidupkan = function () {
    var self = this, kini = 0, tampak = true;
    this.hidup_ = true;
    if (window.IntersectionObserver) {
      this.io = new IntersectionObserver(function (e) { tampak = e[0].isIntersecting; if (tampak) raf(); });
      this.io.observe(this.wadah);
    }
    var jalan = false;
    function raf() { if (!jalan) { jalan = true; requestAnimationFrame(langkah); } }
    function langkah(t) {
      jalan = false;
      if (self.mati || !tampak) return;
      if (t - kini > 66) { kini = t; self.t = t / 1000; self.lapisUlang(); }
      raf();
    }
    raf();
  };

  Papan.prototype.selDi = function (ex, ey) {
    var b = this.lapis.getBoundingClientRect(), K = E.D.kisi, g = geo();
    // lebar tampil bisa berbeda dari clientWidth saat panggung presentasi diskalakan
    var sx = this.w / b.width, x = ((ex - b.left) * sx - this.ox) / this.k, y = ((ey - b.top) * sx - this.oy) / this.k;
    var q = g.rc(x, y), best = null, bd = K.s * K.s * 3;
    for (var r = q[0] - 1; r <= q[0] + 1; r++) for (var c = q[1] - 1; c <= q[1] + 1; c++) {
      var i = g.peta[g.kunci(r, c)];
      if (i == null) continue;
      var d = Math.pow(K.sel[i * 3] - x, 2) + Math.pow(K.sel[i * 3 + 1] - y, 2);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  };

  Papan.prototype.pasang = function () {
    var self = this, el = this.lapis;
    el.style.pointerEvents = "auto"; el.style.cursor = "crosshair";
    el.addEventListener("pointermove", function (e) {
      if (self.tahanGeser) return;
      var i = self.selDi(e.clientX, e.clientY);
      self.selSorot = i; self.lapisUlang();
      if (self.o.arah) self.o.arah(i, e, self);
    });
    el.addEventListener("pointerleave", function () { self.selSorot = null; self.lapisUlang(); if (self.o.arah) self.o.arah(null, null, self); });
    el.addEventListener("click", function (e) {
      var i = self.selDi(e.clientX, e.clientY);
      if (i != null && self.o.pilih) self.o.pilih(i, self);
    });
  };

  E.Papan = Papan;
  E.sorotSemua = function (prov) {
    Papan.semua.forEach(function (p) { if (p.o.arah || p.o.pilih) { p.sorot = prov; p.lapisUlang(); } });
  };
})(window.EPPOS);
