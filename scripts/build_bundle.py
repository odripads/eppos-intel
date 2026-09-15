#!/usr/bin/env python3
"""Bundle index.html + assets + data into one self-contained file (dist/eppos-peta.html) for hosted preview.
The GitHub Pages site uses index.html with fetch(); this bundle inlines the same JSON so it runs from a single file."""
import base64, json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "index.html").read_text()
css = (ROOT / "assets/app.css").read_text()
js = (ROOT / "assets/app.js").read_text()
data = {n: json.loads((ROOT / "data" / f"{n}.json").read_text()) for n in ("manifest", "periode", "insiden", "kasus_resmi", "koordinat", "provinsi_path")}
def b64(p): return "data:image/png;base64," + base64.b64encode((ROOT / p).read_bytes()).decode()
logo, logo_inv = b64("assets/logo.png"), b64("assets/logo-inverse.png")
css = css.replace('url("logo-inverse.png")', f'url("{logo_inv}")').replace('url("logo.png")', f'url("{logo}")')
# fetch() -> inlined constant
js = re.sub(r'fetch\("data/manifest\.json"\)\.then\(function \(r\) \{ return r\.json\(\); \}\)',
            'Promise.resolve(window.EPPOS_DATA.manifest)', js)
js = re.sub(r'return Promise\.all\(\["periode", "insiden", "kasus_resmi", "koordinat", "provinsi_path"\]\.map\(function \(n\) \{\s*return fetch\("data/" \+ n \+ "\.json"\)\.then\(function \(r\) \{ return r\.json\(\); \}\);\s*\}\)\);',
            'return Promise.resolve(["periode","insiden","kasus_resmi","koordinat","provinsi_path"].map(function(n){return window.EPPOS_DATA[n];}));', js)
body = re.search(r"<body>(.*)</body>", html, re.S).group(1)
body = body.replace('<script src="assets/app.js"></script>', "")
body = body.replace('src="assets/logo.png"', f'src="{logo}"')
out = (
    "<title>Peta Intervensi Eksekutif</title>\n"
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">\n'
    f"<style>{css}</style>\n{body}\n"
    f"<script>window.EPPOS_DATA={json.dumps(data, ensure_ascii=False, separators=(',', ':'))};</script>\n"
    f"<script>{js}</script>\n"
)
p = ROOT / "dist" / "eppos-peta.html"; p.parent.mkdir(exist_ok=True); p.write_text(out)
print(p, f"{p.stat().st_size/1e6:.2f} MB")
