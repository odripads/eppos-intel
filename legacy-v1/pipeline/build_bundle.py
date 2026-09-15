#!/usr/bin/env python3
"""Bundle the site into one self-contained HTML (dist/eppos-bundle.html) for hosting as a single page.
Inlines CSS, JS and every data table; the three pages become views switched by the top nav."""
import json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
def main_of(name):
    h = (ROOT / name).read_text()
    return re.search(r"<main[^>]*>(.*?)</main>", h, re.S).group(1)
css = (ROOT / "assets/style.css").read_text().replace("@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,300..700,0..100&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');", "")
data = {p.stem: json.loads(p.read_text()) for p in (ROOT / "data").glob("*.json")}
data["topo"] = json.loads((ROOT / "assets/indonesia.topo.json").read_text())
koreksi_js = re.search(r"<script>(.*?)</script>", (ROOT / "koreksi.html").read_text(), re.S).group(1).replace("fetch('data/koreksi.json').then(r => r.json())", "Promise.resolve(window.EPPOS_DATA.koreksi)")
html = f"""<title>EPPOS Electoral Intelligence</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,300..700,0..100&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">
<style>{css}
.view[hidden] {{ display: none; }}
a[href^="data/"] {{ pointer-events: none; text-decoration: none; }}
</style>
<header class="topbar"><div class="wrap">
  <a class="brand" href="#peta" data-view="peta">EPPOS GROUP <span>DPP UGM</span></a>
  <nav><a href="#peta" data-view="peta" aria-current="page">Peta</a><a href="#metodologi" data-view="metodologi">Metodologi <span class="mono">v0.1</span></a><a href="#koreksi" data-view="koreksi">Koreksi</a></nav>
</div></header>
<div class="banner" id="fixture-banner" hidden><b>DATA FIKTIF</b> — situs sedang dibangun dengan baris rekaan. Outlet nyata hanya membawa fakta publik; semua angka rekaan menempel pada domain <b>.example</b>.</div>
<main class="wrap view" id="view-peta">{main_of('index.html').replace('<main class="wrap">','')}</main>
<main class="wrap prose view" id="view-metodologi" hidden>{main_of('metodologi.html')}</main>
<main class="wrap view" id="view-koreksi" hidden>{main_of('koreksi.html')}</main>
<footer><div class="wrap">
  <div><b>EPPOS GROUP DPP UGM</b><p>Kelompok studi Departemen Politik dan Pemerintahan, Universitas Gadjah Mada. Temuan dibingkai sebagai skor anomali dan penanda yang memerlukan penelusuran, bukan tuduhan. Identitas penerima bansos dihapus saat ingesti (UU 27/2022). Info A1 tidak pernah masuk indeks.</p></div>
  <div><b>Data</b><p>Rilis <span class="mono" id="foot-ver"></span><br>Rilis JSON/CSV lengkap ada di repositori. Setiap baris membawa <code>source_url</code>, <code>archive_url</code>, <code>retrieved_at</code>.</p></div>
  <div><b>Koreksi</b><p><a href="#koreksi" data-view="koreksi">Ajukan koreksi</a> · <a href="#metodologi" data-view="metodologi">Metodologi</a><br>Artikel yang hilang dari situs dicatat sebagai peristiwa, bukan nilai kosong.</p></div>
</div></footer>
<div class="tooltip" id="tooltip"></div>
<script>window.EPPOS_DATA = {json.dumps(data, ensure_ascii=False, separators=(',', ':'))};</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js"></script>
<script>{(ROOT / 'assets/charts.js').read_text()}</script>
<script>{(ROOT / 'assets/app.js').read_text()}</script>
<script>
(function () {{
  const views = ['peta', 'metodologi', 'koreksi'];
  function show(v) {{
    if (!views.includes(v)) v = 'peta';
    views.forEach(x => document.getElementById('view-' + x).hidden = x !== v);
    document.querySelectorAll('[data-view]').forEach(a => a.toggleAttribute('aria-current', a.dataset.view === v));
    window.scrollTo(0, 0);
  }}
  document.querySelectorAll('[data-view]').forEach(a => a.addEventListener('click', e => {{ e.preventDefault(); location.hash = a.dataset.view; }}));
  window.addEventListener('hashchange', () => show(location.hash.slice(1)));
  show(location.hash.slice(1));
{koreksi_js}
}})();
</script>
"""
# the index main carried its own footer/tooltip? no — index.html keeps them outside <main>. Strip duplicate ids just in case.
out = ROOT / "dist" / "eppos-bundle.html"; out.parent.mkdir(exist_ok=True); out.write_text(html)
print(out, f"{out.stat().st_size/1e6:.2f} MB")
