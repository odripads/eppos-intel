/* Charts for the EPPOS media layer. Vanilla D3 v7. Every figure links through to its source rows. */
window.EPPOS = window.EPPOS || {};
(function (E) {
  const parse = d3.timeParse('%Y-%m-%d'), fmt = d3.timeFormat('%Y-%m-%d');
  const WINDOW = [parse('2014-01-01'), parse('2025-12-31')];
  const tip = () => document.getElementById('tooltip');

  function showTip(html, ev) {
    const t = tip(); t.innerHTML = html; t.classList.add('on');
    const pad = 14, w = t.offsetWidth, h = t.offsetHeight;
    let x = ev.pageX + pad, y = ev.pageY + pad;
    if (x + w > window.scrollX + window.innerWidth - 8) x = ev.pageX - w - pad;
    if (y + h > window.scrollY + window.innerHeight - 8) y = ev.pageY - h - pad;
    t.style.left = x + 'px'; t.style.top = y + 'px';
  }
  function hideTip() { tip().classList.remove('on'); }
  E.hideTip = hideTip;

  function median(arr) { const a = arr.filter(v => v != null).sort(d3.ascending); return a.length ? d3.median(a) : null; }

  /* Shared frame: regime strip + anchors + time axis anchored to events (years faint). */
  function frame(svg, region, x, W, H, m, opts = {}) {
    const defs = svg.append('defs');
    const p = defs.append('pattern').attr('id', 'hatch').attr('patternUnits', 'userSpaceOnUse').attr('width', 7).attr('height', 7).attr('patternTransform', 'rotate(45)');
    p.append('rect').attr('width', 7).attr('height', 7).attr('fill', '#e3e6ea');
    p.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 7).attr('stroke', '#8b95a0').attr('stroke-width', 2.2)
      .append('animate').attr('attributeName', 'x1').attr('values', '0;7').attr('dur', '3s').attr('repeatCount', 'indefinite');
    p.select('line').append('animate').attr('attributeName', 'x2').attr('values', '0;7').attr('dur', '3s').attr('repeatCount', 'indefinite');

    const stripY = m.top - 34, stripH = 22;
    const reg = svg.append('g').attr('class', 'regime');
    const cols = { incumbent: ['#d8c393', '#c8ae6c', '#e2d1a5', '#cbb27a', '#d8c393'], null: 'url(#hatch)' };
    let k = 0;
    region.regimes.forEach(r => {
      const x0 = Math.max(x(parse(r.mulai)), m.left), x1 = Math.min(x(r.selesai ? parse(r.selesai) : WINDOW[1]), W - m.right);
      if (x1 <= x0) return;
      reg.append('rect').attr('x', x0).attr('y', stripY).attr('width', x1 - x0).attr('height', stripH)
        .attr('fill', r.jenis === 'null' ? cols.null : cols.incumbent[k++ % cols.incumbent.length])
        .append('title').text(`${r.label}: ${r.mulai} → ${r.selesai || 'sekarang'} · ${r.keterangan}`);
      if (x1 - x0 > 70) reg.append('text').attr('x', x0 + 6).attr('y', stripY + 15).attr('class', r.jenis === 'null' ? 'null-lbl' : '')
        .text(r.jenis === 'null' ? 'KONDISI NOL · ' + r.label.toUpperCase() : r.label + (region.verified ? '' : ' (draft)'));
    });
    // years, faint, for orientation only
    const yrs = svg.append('g').attr('class', 'axis years');
    d3.timeYears(WINDOW[0], WINDOW[1]).forEach(y => {
      yrs.append('line').attr('x1', x(y)).attr('x2', x(y)).attr('y1', H - m.bottom).attr('y2', H - m.bottom + 5).attr('stroke', '#c4b99f');
      yrs.append('text').attr('x', x(y) + 3).attr('y', H - m.bottom + 15).attr('fill', '#a09a8c').attr('font-size', 10).text(d3.timeFormat('%Y')(y));
    });
    // anchors: numbered so labels never collide (2018 has three within ten weeks)
    const an = svg.append('g').attr('class', 'anchors');
    region.anchors.forEach((a, i) => {
      const ax = x(parse(a.tanggal));
      const g = an.append('g').attr('class', 'anchor');
      g.append('line').attr('x1', ax).attr('x2', ax).attr('y1', stripY + stripH + 2).attr('y2', H - m.bottom);
      if (opts.numbers !== false) {
        g.append('circle').attr('cx', ax).attr('cy', stripY + stripH + 12).attr('r', 7.5);
        g.append('text').attr('x', ax).attr('y', stripY + stripH + 15.5).text(i + 1);
      }
      g.append('title').text(`${i + 1}. ${a.label} — ${a.tanggal}${a.approx ? ' (perkiraan)' : ''}`);
    });
  }

  function crosshair(svg, x, y, W, H, m, weeks, byWeek, region, valueKey, label) {
    const ch = svg.append('line').attr('class', 'crosshair').attr('y1', m.top).attr('y2', H - m.bottom).style('display', 'none');
    const bisect = d3.bisector(d => d).center;
    svg.append('rect').attr('x', m.left).attr('y', m.top).attr('width', W - m.left - m.right).attr('height', H - m.top - m.bottom).attr('fill', 'transparent')
      .on('mousemove', ev => {
        const [mx] = d3.pointer(ev); const t = x.invert(mx); const i = bisect(weeks, t); const wk = weeks[i]; if (!wk) return;
        ch.attr('x1', x(wk)).attr('x2', x(wk)).style('display', null);
        const rows = byWeek.get(fmt(wk)) || [];
        const reg = region.regimes.find(r => parse(r.mulai) <= wk && (!r.selesai || wk < parse(r.selesai)));
        const dtp = rows[0] && rows[0].hari_ke_penetapan;
        let html = `<b>Minggu ${fmt(wk)}</b><br><span class="k">rezim</span> ${reg ? reg.label : '—'}${dtp != null ? ` · <span class="k">hari ke penetapan</span> ${dtp > 0 ? '+' : ''}${dtp}` : ''}<table>`;
        rows.forEach(r => { html += `<tr><td>${r.outlet_id}</td><td><b>${r[valueKey] == null ? '—' : d3.format('.2f')(r[valueKey])}</b></td><td>${r.jumlah_artikel} art.</td><td><a href="${r.source_url}" target="_blank" rel="noopener">sumber</a></td></tr>`; });
        const med = median(rows.map(r => r[valueKey]));
        html += `<tr><td><b>median</b></td><td><b>${med == null ? '—' : d3.format('.2f')(med)}</b></td></tr></table>`;
        showTip(html, ev);
      })
      .on('mouseleave', () => { ch.style('display', 'none'); hideTip(); });
  }

  /* Weekly series chart: gray per outlet, ink median, shared frame. */
  E.weeklyChart = function (el, region, rows, valueKey, opts = {}) {
    el.innerHTML = '';
    const W = Math.max(640, el.clientWidth), H = opts.height || 360, m = { top: 76, right: 70, bottom: 30, left: 40 };
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const x = d3.scaleTime().domain(WINDOW).range([m.left, W - m.right]);
    const y = d3.scaleLinear().domain([0, 1]).range([H - m.bottom, m.top]);
    frame(svg, region, x, W, H, m, opts);
    const g = svg.append('g').attr('class', 'grid');
    [0, .25, .5, .75, 1].forEach(v => { g.append('line').attr('x1', m.left).attr('x2', W - m.right).attr('y1', y(v)).attr('y2', y(v)); svg.append('text').attr('x', m.left - 6).attr('y', y(v) + 3.5).attr('text-anchor', 'end').text(d3.format('.2f')(v)); });
    const byOutlet = d3.group(rows, r => r.outlet_id);
    const weeks = Array.from(new Set(rows.map(r => r.minggu))).sort().map(parse);
    const byWeek = d3.group(rows, r => r.minggu);
    const line = d3.line().defined(d => d[valueKey] != null).x(d => x(parse(d.minggu))).y(d => y(d[valueKey])).curve(d3.curveMonotoneX);
    byOutlet.forEach((rs, oid) => {
      svg.append('path').attr('class', 'series').attr('d', line(rs.sort((a, b) => a.minggu < b.minggu ? -1 : 1)))
        .append('title').text(oid);
    });
    const med = weeks.map(w => ({ minggu: fmt(w), [valueKey]: median((byWeek.get(fmt(w)) || []).map(r => r[valueKey])) }));
    svg.append('path').attr('class', 'series emph').attr('d', line(med));
    const last = med.filter(d => d[valueKey] != null).at(-1);
    if (last) svg.append('text').attr('class', 'endlabel').attr('x', x(parse(last.minggu)) + 6).attr('y', y(last[valueKey]) + 3.5).text('median ' + d3.format('.2f')(last[valueKey]));
    if (opts.events) {
      const rug = svg.append('g').attr('class', 'rug');
      opts.events.forEach(ev => {
        const ex = x(parse(ev.tanggal));
        rug.append('path').attr('class', ev.jenis).attr('d', `M${ex - 5},${H - m.bottom - 1} L${ex + 5},${H - m.bottom - 1} L${ex},${H - m.bottom - 9} Z`)
          .append('title').text(`${ev.tanggal} · ${ev.jenis} · ${ev.ringkasan_satu_kalimat}`);
      });
    }
    crosshair(svg, x, y, W, H, m, weeks, byWeek, region, valueKey);
    return { weeks: weeks.length, outlets: byOutlet.size };
  };

  /* Scandal permeability matrix: outlets × events; cell = lag (sequential) or silence (hatched). */
  E.permeability = function (el, legendEl, outlets, events, coverage, contracts, onCell) {
    el.innerHTML = ''; legendEl.innerHTML = ''; el.className = 'perm';
    if (!events.length) { el.innerHTML = '<div class="empty">Belum ada peristiwa untuk kota ini.</div>'; return; }
    const ev = events.slice().sort((a, b) => a.tanggal < b.tanggal ? -1 : 1);
    const cov = new Map(coverage.map(c => [c.peristiwa_id + '|' + c.outlet_id, c]));
    const lags = coverage.filter(c => c.covered && c.lag_jam != null).map(c => c.lag_jam);
    const ramp = ['#f1e6c9', '#dcc48e', '#b8944a', '#7d5d1c', '#4a3407'];
    const scale = d3.scaleQuantize().domain([0, Math.max(24, d3.max(lags) || 72)]).range(ramp.slice().reverse());
    const kyears = d3.rollup(contracts, v => v.map(c => c.tahun).sort(), c => c.outlet_id);
    el.style.gridTemplateColumns = `minmax(160px, 1.4fr) repeat(${ev.length}, minmax(64px, 1fr))`;
    el.appendChild(Object.assign(document.createElement('div'), { className: 'h' }));
    ev.forEach(e => {
      const h = document.createElement('div'); h.className = 'h';
      h.innerHTML = `<b>${e.tanggal}</b><span>${e.jenis}</span><a href="${e.bukti_independen_url}" target="_blank" rel="noopener" title="${e.ringkasan_satu_kalimat}">bukti · ${e.bukti_jenis}</a>`;
      el.appendChild(h);
    });
    outlets.forEach(o => {
      const r = document.createElement('div'); r.className = 'r';
      const ky = kyears.get(o.outlet_id);
      r.innerHTML = `<b>${o.nama_outlet}</b><span class="mono muted small">${o.outlet_id}</span>${ky ? `<span><span class="badge kontrak">kontrak ${ky[0]}–${ky.at(-1)}</span></span>` : ''}`;
      el.appendChild(r);
      ev.forEach(e => {
        const c = cov.get(e.peristiwa_id + '|' + o.outlet_id);
        const d = document.createElement('div'); d.className = 'c';
        if (!c) { d.classList.add('silent'); d.textContent = '?'; d.title = 'belum diperiksa'; }
        else if (!c.covered) { d.classList.add('silent'); d.textContent = 'DIAM'; d.title = `${o.nama_outlet} tidak memuat peristiwa ${e.peristiwa_id}`; }
        else { d.style.background = scale(c.lag_jam); d.style.color = c.lag_jam < scale.domain()[1] * .45 ? '#f3eee4' : '#171613'; d.textContent = `${c.lag_jam} j`; d.title = `${o.nama_outlet}: ${c.jumlah_artikel} artikel, ${c.lag_jam} jam setelah peristiwa`; }
        if (c && onCell) { d.style.cursor = 'pointer'; d.tabIndex = 0; d.setAttribute('role', 'button'); d.onclick = () => { el.querySelectorAll('.c.sel').forEach(x => x.classList.remove('sel')); d.classList.add('sel'); onCell({ outlet: o, event: e, cov: c }); }; d.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); d.click(); } }; }
        el.appendChild(d);
      });
    });
    legendEl.innerHTML = `<span>jeda liputan (jam)</span><span class="ramp">${ramp.slice().reverse().map(c => `<i style="background:${c}"></i>`).join('')}</span><span>0 → ${scale.domain()[1]}+</span><span class="c silent" style="min-height:20px;padding:2px 8px">DIAM</span><span>= tidak memuat</span>`;
  };

  /* Indonesia map with two clickable cities. */
  E.map = function (svgEl, topo, regions, onSelect) {
    const svg = d3.select(svgEl), W = 900, H = 420;
    const idn = topojson.feature(topo, topo.objects.indonesia), nb = topojson.feature(topo, topo.objects.tetangga);
    const proj = d3.geoMercator().fitExtent([[24, 24], [W - 24, H - 24]], idn);
    const path = d3.geoPath(proj);
    svg.append('g').selectAll('path').data(nb.features).join('path').attr('class', 'land neighbour').attr('d', path);
    svg.append('g').selectAll('path').data(idn.features).join('path').attr('class', 'land').attr('d', path);
    const cities = Object.values(regions);
    const g = svg.append('g').selectAll('g').data(cities).join('g').attr('class', 'city').attr('data-kota', d => d.kota)
      .attr('transform', d => `translate(${proj([d.lon, d.lat])})`).on('click', (ev, d) => onSelect(d.kota));
    g.append('circle').attr('class', 'ring').attr('r', 9);
    g.append('circle').attr('class', 'ring r2').attr('r', 9);
    g.append('circle').attr('class', 'dot').attr('r', 5.5);
    g.append('text').attr('x', d => d.kota === 'Makassar' ? -12 : 12).attr('y', d => d.kota === 'Makassar' ? -12 : 20).attr('text-anchor', d => d.kota === 'Makassar' ? 'end' : 'start').text(d => d.kota);
    return { setActive(kota) { svg.selectAll('.city').classed('active', d => d.kota === kota); } };
  };
})(window.EPPOS);
