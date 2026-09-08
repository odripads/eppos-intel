# EPPOS Electoral Intelligence — lapisan media

Static site + versioned dataset for detecting executive (incumbent) intervention in Indonesian local
elections. EPPOS GROUP, Dept. of Politics and Government, UGM. Cases: Kota Makassar (primary), Kota Kupang.

- `index.html`, `metodologi.html`, `koreksi.html`, `assets/` — the site (GitHub Pages, no backend).
- `data/` — the citable dataset release: JSON + CSV + `manifest.json` (version, fixture flag, hashes).
- `pipeline/` — `validate_intake.py` (xlsx → reject rows without a source), `collect_wp.py` (WordPress JSON
  + sitemap), `collect_wayback.py` (CDX for years no live site serves), `metrics.py` (personalization v0,
  duplication, days-to-penetapan), `make_fixtures.py` (fake rows on `.example` domains), `regimes.py`.
- `archive-recall/` — the recall test that gates the four-regime design.

```bash
pip install -r pipeline/requirements.txt
python3 pipeline/validate_intake.py ../eppos-media-intake.xlsx      # before ingesting anything
python3 pipeline/make_fixtures.py                                   # regenerate fixture data/
python3 -m http.server 8765                                         # open http://127.0.0.1:8765
```

Non-negotiables live in `../PROJECT-SPEC.md`. Real outlets carry only public facts; every invented
number attaches to a `.example` domain; every row carries provenance; deletion is a finding.
