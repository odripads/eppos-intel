#!/usr/bin/env python3
"""Bundle index.html + assets + data into one self-contained file for hosted preview.
The repo site uses index.html with fetch(); this bundle inlines the same JSON so it runs from a single file."""
import base64, json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
JUDUL = "EPPOS Political Outlook"
html = (ROOT / "index.html").read_text()
css = (ROOT / "assets/app.css").read_text()
js = "\n".join((ROOT / "assets" / n).read_text() for n in ("inti.js", "kisi.js", "grafik.js", "halaman.js"))

# small derived figures the Metode page reads; kandidat.json itself is far too large to ship
kandidat = json.loads((ROOT / "data/kandidat.json").read_text())
(ROOT / "data/ringkas.json").write_text(json.dumps({"kandidat": len(kandidat)}))
data = {n: json.loads((ROOT / "data" / f"{n}.json").read_text()) for n in ("manifest", "periode", "insiden", "kasus_resmi", "insiden_otomatis", "kemajuan", "usaha_pencarian", "kisi", "qr", "ringkas", "posisi_aktor", "posisi_skema", "lambang", "sikap_pt", "logo_aktor")}

# the single-file bundle carries only what the page renders. The full rows, including the query that
# found each one, stay in data/*.json in the repo — the bundle is a viewer, not the dataset release.
def trim_auto(rows):
    keep = ("insiden_id", "provinsi", "kab_kota", "lokasi_dasar", "mekanisme", "tanggal_berita",
            "sumber_1_url", "sumber_1_outlet", "sumber_2_url", "status_verifikasi", "judul_sumber_1",
            "gelombang_pilkada", "lokasi_perkiraan", "saluran")
    return [{k: r.get(k) for k in keep if r.get(k) is not None} for r in rows]
data["insiden_otomatis"] = trim_auto(data["insiden_otomatis"])

def b64(p): return "data:image/png;base64," + base64.b64encode((ROOT / p).read_bytes()).decode()
logo, logo_inv = b64("assets/lockup/eppos.png"), b64("assets/lockup/eppos-inverse.png")
logo_pg, logo_pg_inv = b64("assets/lockup/polgov.png"), b64("assets/lockup/polgov-inverse.png")
body = re.search(r"<body>(.*)</body>", html, re.S).group(1)
body = re.sub(r'<script src="assets/[a-z]+\.js"></script>\n?', "", body)
body = body.replace('src="assets/lockup/eppos-inverse.png"', f'src="{logo_inv}"').replace('src="assets/lockup/polgov-inverse.png"', f'src="{logo_pg_inv}"')
fonts = re.search(r'<link rel="stylesheet" href="https://fonts[^>]*>', html).group(0)
out = (
    f"<title>{JUDUL}</title>\n{fonts}\n"
    f"<style>{css}</style>\n<body>{body}\n"
    f"<script>window.EPPOS_DATA={json.dumps(data, ensure_ascii=False, separators=(',', ':'))};"
    f"window.EPPOS_LOGO={json.dumps({'biasa': logo, 'inverse': logo_inv, 'polgov': logo_pg, 'polgovInverse': logo_pg_inv})};</script>\n"
    f"<script>{js}</script>\n</body>\n"
)
p = ROOT / "dist" / "eppos-outlook.html"; p.parent.mkdir(exist_ok=True); p.write_text(out)
print(p, f"{p.stat().st_size/1e6:.2f} MB")

# The bundle above is a fragment: the Artifact host adds the document shell. A plain static host does not, so
# dist/eppos-outlook/ carries the same page with its shell, and only that page: deploying this folder keeps data/,
# the candidate logs and the intake workbook off the host. noindex because most rows are unverified, automatic
# single-source headlines about named officials: a link to pass to colleagues, not a page for search engines.
situs = ROOT / "dist" / "eppos-outlook"; situs.mkdir(exist_ok=True)
deskripsi = re.search(r'<meta name="description" content="[^"]*">', html).group(0)
(situs / "index.html").write_text('<!doctype html>\n<html lang="id">\n<head>\n<meta charset="utf-8">\n'
                                  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
                                  f'{deskripsi}\n{out}</html>\n')
(situs / "vercel.json").write_text(json.dumps({"headers": [{"source": "/(.*)", "headers": [
    {"key": "X-Robots-Tag", "value": "noindex, nofollow"}]}]}, indent=1) + "\n")

# gambar yang tidak dibundel: lambang daerah (sekitar 550), logo aktor, dokumen sumber. Disalin ke akar situs terbit
# karena ukurannya akan membengkakkan satu berkas HTML; halaman memuatnya saat dibutuhkan (E.ASET di inti.js).
import shutil
for d in ("lambang", "logo-aktor", "dokumen"):
    asal = ROOT / "assets" / d
    if asal.exists(): shutil.copytree(asal, situs / d, dirs_exist_ok=True)
