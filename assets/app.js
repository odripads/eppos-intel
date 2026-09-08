/* App shell: load versioned data, map, city panel with four tabs. No backend. */
(async function () {
  const E = window.EPPOS, $ = s => document.querySelector(s);
  const load = n => fetch(`data/${n}.json`).then(r => r.json());
  const [manifest, regime, topo, outlet, metrik, peristiwa, liputan, kontrak, pejabat, perusahaan, relasi, tender, a1, domhist, hapus] = await Promise.all([
    load('manifest'), load('regime'), fetch('assets/indonesia.topo.json').then(r => r.json()), load('outlet'), load('metrik_mingguan'), load('peristiwa'),
    load('liputan_peristiwa'), load('kontrak_media'), load('pejabat'), load('perusahaan'), load('relasi'), load('tender'), load('info_a1'),
    load('outlet_domain_history'), load('peristiwa_penghapusan')]);

  $('#data-ver').textContent = manifest.version; $('#foot-ver').textContent = manifest.version; $('#nav-ver').textContent = 'v0.1';
  if (manifest.fixture) $('#fixture-banner').hidden = false;
  const rp = n => Number(n).toLocaleString('id-ID');
  const link = (u, t = 'sumber') => u ? `<a href="${u}" target="_blank" rel="noopener">${t}</a>` : '<span class="muted">—</span>';
  const fx = r => r.fiktif ? ' <span class="badge fiktif">fiktif</span>' : '';

  // city cards
  const cards = $('#city-cards');
  Object.values(regime).forEach(r => {
    const b = document.createElement('button'); b.className = 'city-card'; b.dataset.kota = r.kota; b.setAttribute('aria-pressed', 'false');
    const n = { outlet: outlet.filter(o => o.kota === r.kota).length, peristiwa: peristiwa.filter(p => p.kota === r.kota).length };
    b.innerHTML = `<span class="role">${r.kota === 'Makassar' ? 'Kasus utama · identifikasi kausal' : 'Kasus sekunder · validitas eksternal'}</span><h3>Kota ${r.kota}</h3>
      <span class="small muted">${r.provinsi} · <span class="mono">${r.region_id}</span></span>
      <span class="small">${r.regimes.length} rezim · ${n.outlet} outlet · ${n.peristiwa} peristiwa</span>
      <span>${r.verified ? '<span class="pill ok">garis waktu terverifikasi</span>' : '<span class="pill warn">garis waktu draft</span>'}</span>`;
    b.onclick = () => select(r.kota); cards.appendChild(b);
  });
  const map = E.map($('#map'), topo, regime, select);

  // tabs
  document.querySelectorAll('.tab').forEach(t => t.onclick = () => showTab(t.dataset.tab));
  function showTab(name) {
    document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', t.dataset.tab === name));
    document.querySelectorAll('[role=tabpanel]').forEach(p => p.hidden = p.id !== 'tab-' + name);
    E.hideTip();
  }

  let current = null;
  function select(kota, scroll = true) {
    current = kota; const r = regime[kota];
    map.setActive(kota); document.querySelectorAll('.city-card').forEach(c => c.setAttribute('aria-pressed', c.dataset.kota === kota));
    $('#panel').hidden = false;
    $('#panel-kicker').textContent = `${r.provinsi} · ${r.region_id} · ${kota === 'Makassar' ? 'kasus utama' : 'kasus sekunder'}`;
    $('#panel-title').textContent = 'Kota ' + kota;
    $('#panel-status').innerHTML = r.verified ? '<span class="pill ok">garis waktu terverifikasi</span>' : '<span class="pill warn">garis waktu draft — menunggu verifikasi Ravy</span>';
    renderMedia(kota, r); renderAnggaran(kota, r); renderRegulasi(kota, r); renderA1(kota);
    showTab('media');
    if (scroll) $('#panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderMedia(kota, r) {
    const rows = metrik.filter(m => m.kota === kota), evs = peristiwa.filter(p => p.kota === kota);
    const outs = outlet.filter(o => o.kota === kota), outIds = new Set(outs.map(o => o.outlet_id));
    const tl = E.weeklyChart($('#timeline'), r, rows, 'indeks_personalisasi', { events: evs, height: 380 });
    $('#anchor-list').innerHTML = r.anchors.map((a, i) => `<li><b>${i + 1}</b><span>${a.label}</span><span class="d">${a.tanggal}${a.approx ? ' ±' : ''}</span></li>`).join('')
      || '<li class="muted">Pancang waktu belum ditetapkan untuk kota ini.</li>';
    const fixNote = rows.length && rows.every(m => m.fiktif) ? (kota === 'Makassar' ? 'Seri mingguan FIKTIF pada domain .example, dibentuk mengikuti prediksi konstruk (lantai saat Pj, naik menjelang penetapan). Bukan temuan.' : 'Seri mingguan FIKTIF pada domain .example, tanpa struktur rezim: simetri dengan Makassar tidak diasumsikan. Bukan temuan.') : '';
    $('#timeline-cap').innerHTML = `<span>${tl.outlets} outlet · ${tl.weeks} minggu</span><span>${fixNote}</span><span>data: ${link('data/metrik_mingguan.json', 'metrik_mingguan.json')} · ${link('data/regime.json', 'regime.json')}</span>`;
    const dp = E.weeklyChart($('#dup'), r, rows, 'bagian_duplikasi', { height: 240, numbers: false });
    $('#dup-cap').innerHTML = `<span>${dp.outlets} outlet</span><span>${fixNote ? 'FIKTIF.' : ''}</span><span>data: ${link('data/metrik_mingguan.json', 'metrik_mingguan.json')}</span>`;
    const fixOuts = outs.filter(o => rows.some(m => m.outlet_id === o.outlet_id) || liputan.some(l => l.outlet_id === o.outlet_id));
    E.permeability($('#perm'), $('#perm-legend'), fixOuts, evs, liputan.filter(l => outIds.has(l.outlet_id)), kontrak.filter(k => k.kota === kota));
    $('#perm-cap').innerHTML = `<span>${evs.length} peristiwa · ${fixOuts.length} outlet</span><span>Peristiwa dan liputan FIKTIF bila bertanda.</span><span>data: ${link('data/peristiwa.json', 'peristiwa.json')} · ${link('data/liputan_peristiwa.json', 'liputan_peristiwa.json')} · ${link('data/kontrak_media.json', 'kontrak_media.json')}</span>`;

    // outlet registry + domain history + deletion events
    const dh = d3.group(domhist, d => d.outlet_id), del = d3.group(hapus, d => d.outlet_id), ky = d3.rollup(kontrak, v => v.map(c => c.tahun), c => c.outlet_id);
    $('#outlets').innerHTML = `<table class="data"><thead><tr><th>outlet_id</th><th>Nama</th><th>Dewan Pers</th><th>Aktif</th><th>Kontrak</th><th>Catatan</th><th>Sumber</th></tr></thead><tbody>` +
      outs.map(o => `<tr><td class="mono">${o.outlet_id}${fx(o)}${(dh.get(o.outlet_id) || []).map(h => `<br><span class="muted small">dulu ${h.domain}</span>`).join('')}</td><td>${o.nama_outlet}</td><td>${o.dewan_pers}</td><td>${o.aktif}</td>
        <td>${ky.has(o.outlet_id) ? `<span class="badge kontrak">${ky.get(o.outlet_id).length} thn</span>` : '<span class="muted">—</span>'}</td>
        <td class="small">${o.catatan || ''}${(del.get(o.outlet_id) || []).map(d => `<br><span class="badge">penghapusan ${d.jenis}</span> <span class="muted">${d.catatan}</span>`).join('')}</td>
        <td>${link(o.source_url, 'beranda')}${o.archive_url ? ' · ' + link(o.archive_url, 'arsip') : ''}</td></tr>`).join('') + '</tbody></table>';
    $('#outlets-cap').innerHTML = `<span>${outs.length} outlet (${outs.filter(o => !o.fiktif).length} nyata, fakta publik saja; ${outs.filter(o => o.fiktif).length} fiktif)</span><span>data: ${link('data/outlet.json', 'outlet.json')} · ${link('data/outlet_domain_history.json', 'outlet_domain_history.json')} · ${link('data/peristiwa_penghapusan.json', 'peristiwa_penghapusan.json')}</span>`;

    // kinship network — confirmed rows only
    const pj = new Map(pejabat.map(p => [p.pejabat_id, p])), pr = new Map(perusahaan.map(p => [p.perusahaan_id, p]));
    const rel = relasi.filter(x => pj.get(x.pejabat_id)?.kota === kota), pub = rel.filter(x => x.status === 'terkonfirmasi');
    $('#net').innerHTML = pub.length ? pub.map(x => {
      const p = pj.get(x.pejabat_id), c = pr.get(x.perusahaan_id), td = tender.filter(t => t.perusahaan_id === x.perusahaan_id);
      return `<div class="chain"><div class="node"><span>${p.nama_lengkap}${fx(p)}</span><small>${p.jabatan}</small></div><span class="edge">${x.jenis_hubungan} →</span>
        <div class="node"><span>${x.nama_pihak_terkait}</span><small>pihak terkait</small></div>${c ? `<span class="edge">duduk di →</span><div class="node"><span>${c.nama_perusahaan}</span><small>${c.direksi_komisaris}</small></div>` : ''}
        ${td.map(t => `<span class="edge">menang →</span><div class="node"><span>${t.nama_paket}</span><small>${t.tahun} · Rp ${rp(t.nilai_rupiah)} · ${t.instansi_pengguna} · ${link(t.source_url)}</small></div>`).join('')}
        <span class="src">${link(x.sumber_1_url, x.sumber_1_jenis)} + ${link(x.sumber_2_url, x.sumber_2_jenis)}</span></div>`;
    }).join('') : '<div class="empty">Belum ada relasi terkonfirmasi untuk kota ini.</div>';
    const hidden = rel.length - pub.length;
    $('#net-cap').innerHTML = `<span>${pub.length} relasi terbit</span><span>${hidden} baris berstatus <code>satu sumber</code>/<code>dugaan</code> disimpan, tidak terbit.</span><span>data: ${link('data/relasi.json', 'relasi.json')} · ${link('data/tender.json', 'tender.json')}</span>`;
  }

  function renderAnggaran(kota, r) {
    const ks = kontrak.filter(k => k.kota === kota), tot = d3.rollup(ks, v => d3.sum(v, k => k.nilai_rupiah), k => k.tahun);
    $('#tab-anggaran').innerHTML = `<div class="notice null">Lapisan anggaran dikerjakan tim anggaran (2023–24) dan bergabung lewat <code>region_id = ${r.region_id}</code>. Belum ada data anggaran yang masuk. Yang tampil di bawah hanya belanja publikasi/kerja sama media dari lapisan media.</div>
      <figure><div class="fig-head"><h3>Kontrak kerja sama media per tahun</h3><p>Dari LPSE, SIRUP, e-katalog, pemberitaan, atau jawaban KIP. Kosong karena tidak ada dan kosong karena tidak ditampilkan portal adalah dua hal berbeda.</p></div>
      ${ks.length ? `<div class="scroll-x"><table class="data"><thead><tr><th>Tahun</th><th>Outlet</th><th>Instansi</th><th>Jenis</th><th class="num">Nilai (Rp)</th><th>Keyakinan</th><th>Sumber</th></tr></thead><tbody>` +
        ks.sort((a, b) => a.tahun - b.tahun || a.outlet_id.localeCompare(b.outlet_id)).map(k => `<tr><td>${k.tahun}</td><td class="mono">${k.outlet_id}${fx(k)}</td><td>${k.instansi}</td><td>${k.jenis_kontrak}</td><td class="num">${rp(k.nilai_rupiah)}</td><td>${k.tingkat_keyakinan}</td><td>${link(k.source_url, k.sumber_jenis)}</td></tr>`).join('') +
        `</tbody></table></div><figcaption><span>${ks.length} kontrak · total per tahun: ${Array.from(tot, ([y, v]) => `${y} Rp ${rp(v)}`).join(' · ')}</span><span>data: ${link('data/kontrak_media.json', 'kontrak_media.json')}</span></figcaption>` : '<div class="empty">Belum ada kontrak media tercatat.</div>'}</figure>
      <figure><div class="fig-head"><h3>Tender publikasi dan pemenang</h3></div>${tender.filter(t => t.kota === kota).length ? `<div class="scroll-x"><table class="data"><thead><tr><th>Tahun</th><th>Paket</th><th>Instansi</th><th>Pemenang</th><th class="num">Nilai (Rp)</th><th>Sumber</th></tr></thead><tbody>` +
        tender.filter(t => t.kota === kota).map(t => `<tr><td>${t.tahun}</td><td>${t.nama_paket}${fx(t)}</td><td>${t.instansi_pengguna}</td><td>${t.pemenang_nama}</td><td class="num">${rp(t.nilai_rupiah)}</td><td>${link(t.source_url, 'LPSE')}</td></tr>`).join('') + '</tbody></table></div>' : '<div class="empty">Belum ada tender tercatat.</div>'}</figure>`;
  }

  function renderRegulasi(kota, r) {
    $('#tab-regulasi').innerHTML = `<div class="notice null">Lapisan regulasi dikerjakan anggota lain dan bergabung lewat <code>region_id = ${r.region_id}</code>. Belum ada data regulasi yang masuk. Di bawah: pancang waktu elektoral dan rezim yang menjadi sumbu seluruh analisis.</div>
      <div class="two"><figure><div class="fig-head"><h3>Rezim</h3></div><table class="data"><thead><tr><th>Periode</th><th>Pemimpin</th><th>Peran</th></tr></thead><tbody>${r.regimes.map(g => `<tr><td class="mono">${g.mulai} → ${g.selesai || 'sekarang'}</td><td>${g.label}</td><td>${g.jenis === 'null' ? '<span class="pill null">kondisi nol</span>' : 'petahana terpilih'}<br><span class="small muted">${g.keterangan}</span></td></tr>`).join('')}</tbody></table></figure>
      <figure><div class="fig-head"><h3>Pancang waktu</h3></div>${r.anchors.length ? `<table class="data"><thead><tr><th>#</th><th>Tanggal</th><th>Peristiwa</th></tr></thead><tbody>${r.anchors.map((a, i) => `<tr><td class="mono">${i + 1}</td><td class="mono">${a.tanggal}${a.approx ? ' ±' : ''}</td><td>${a.label}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">Belum ada pancang waktu. Garis waktu kepemimpinan Kupang menunggu daftar Ravy.</div>'}</figure></div>
      ${kota === 'Makassar' ? `<div class="prose"><h3>Dasar hukum yang dipakai</h3><p><b>Putusan MA 2018</b> yang menguatkan diskualifikasi pasangan petahana (PT TUN Makassar, 2018-04-23) adalah kebenaran dasar yang sudah diadili: tindakan yang diuraikan majelis menjadi definisi operasional “intervensi”. Putusan diambil dari Direktori Putusan MA — belum diunggah.</p>
      <p><b>Pasal 71 UU 10/2016</b> mengandaikan petahana mencalonkan diri untuk kursinya sendiri. Konfigurasi 2024 — wali kota yang term-limited maju sebagai calon gubernur sambil wakilnya ada di tiket lawan — nyaris tidak tercakup pasal itu.</p>
      <p><b>Kebenaran dasar untuk backtest</b> 2018, 2020, 2024: temuan Bawaslu, putusan DKPP, putusan MK PHPU. Belum diisi.</p></div>` : ''}`;
  }

  function renderA1(kota) {
    const rows = a1.filter(x => x.kota === kota);
    $('#tab-a1').innerHTML = `<div class="notice">Keterangan orang lapangan. Hanya peran yang disimpan, tidak pernah nama. Tidak pernah masuk indeks mana pun; ditampilkan terpisah dengan label belum terverifikasi.</div>
      ${rows.length ? `<div class="cards">${rows.map(x => `<div class="card"><div class="tags"><span class="pill ${x.status_verifikasi === 'terverifikasi' ? 'ok' : x.status_verifikasi === 'gugur' ? 'null' : 'warn'}">${x.status_verifikasi}</span><span class="pill">keyakinan ${x.tingkat_keyakinan}</span>${x.boleh_dikutip === 'ya' ? '<span class="pill">boleh dikutip</span>' : ''}${x.fiktif ? '<span class="badge fiktif">fiktif</span>' : ''}</div>
        <div class="role">${x.peran_narasumber}</div><p style="margin:0">${x.ringkasan}</p><span class="small muted mono">${x.a1_id} · ${x.tanggal_info}</span></div>`).join('')}</div>` : '<div class="empty">Belum ada Info A1 untuk kota ini.</div>'}`;
  }

  if (location.hash === '#kupang') select('Kupang', false); else if (location.hash === '#makassar') select('Makassar', false);
})();
