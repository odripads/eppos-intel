# Archive recall test — Makassar outlets, pass 1

Run: 2026-09-09, ~1 hour, single-threaded, honest user-agent. Build-order step 1 (spec).
Question: is 2014–2017 (Danny Pomanto I) retrievable, or does the four-regime design collapse?

**Answer: retrievable. The four-regime design stands.** At least four outlets have thousands
of archived pages per year across 2014–2017, and two more join from 2016.

## Method

Two channels per domain:

1. **Live WordPress API** — `/wp-json/wp/v2/posts?per_page=1&order=asc&orderby=date` gives the
   earliest post the live site still serves; `after=/before=` per year with the `X-WP-Total`
   header gives the live post count per year.
2. **Wayback CDX** — `matchType=domain`, `statuscode:200`, `mimetype:text/html`,
   `collapse=urlkey`, capped at 20 000 rows per year. Count = distinct archived URLs, which
   includes tag/category/pagination pages. `year_in_path` = URLs whose path contains the year
   (a lower bound on dated article URLs; meaningless for outlets without dated URL schemes).

Raw output: `results-2026-09-09.json`, `wp-per-year-2026-09-09.json`. Script: `probe.py`.

## Results

Wayback = distinct archived 200/HTML URLs per year (≥20k means the cap was hit).

| Outlet | Domain probed | Live WP API | 2014 | 2015 | 2016 | 2017 |
|---|---|---|---|---|---|---|
| Tribun Timur | makassar.tribunnews.com | not WordPress (403) | ≥20 000 | ≥20 000 | ≥20 000 | ≥20 000 |
| Harian Fajar | fajar.co.id | yes; live posts start 2017-03; 0 / 0 / 0 / 15 081 | 12 321 | 8 718 | ≥20 000 | ≥20 000 |
| Rakyat Sulsel | rakyatsulsel.com (old) | no | 6 345 | 7 017 | 8 029 | 13 027 |
| Rakyat Sulsel | rakyatsulsel.co (current) | no | 0 | 0 | 0 | 0 |
| Berita Kota Makassar | beritakotamakassar.com | 403 | 13 994 | 2 436 | 799 | 6 |
| Antara Sulsel | makassar.antaranews.com | not WordPress | 2 313 | 1 398 | 2 229 | 4 151 |
| Antara Sulsel | antarasulsel.com (old) | not WordPress | 1 116 | 1 708 | 2 549 | 8 829 |
| Kabar Makassar | kabarmakassar.com | yes; 67 499 posts total but 1 / 1 / 0 / 108 for 2014–17 | 2 365 | 1 748 | 4 527 | 2 192 |
| Ujung Pandang Ekspres | upeks.co.id | yes; live posts start 2019-01; then 403 (blocked us) | 2 528 | 1 707 | 304 | 107 |
| Gosulsel | gosulsel.com | yes; **site reset**: live posts start 2025-01, 3 911 total | 0 | 3 730 | 14 843 | 11 860 |
| Inikata | inikata.com | TLS broken, unreachable | 0 | 0 | 5 130 | 10 091 |
| Sulsel Satu | sulselsatu.com | yes; live posts start 2015-08; no count header | 0 | 0 | 37 | 1 550 |
| Terkini.id | makassar.terkini.id + terkini.id | yes; live posts start 2019-01 | 0 | 64 | 87 | 522 |
| Sindo Makassar | makassar.sindonews.com | no | 0 | 0 | 0 | 3 |

## What this means for the collector

- **Wayback-first for 2014–2017, live API for 2017 onward.** No live site reaches back to
  2014. The early regime exists only in the archive. Order in the spec ("WP JSON, then sitemap,
  then CDX") should be inverted for the early years.
- **Domain history is data.** Rakyat Sulsel (.com → .co), Antara (antarasulsel.com →
  makassar.antaranews.com), Terkini (terkini.id → makassar.terkini.id). `outlet_id` stays the
  current bare domain per the schema, but the pipeline needs an `outlet_domain_history` table
  (outlet_id, domain, valid_from, valid_to, source_url) or early-year recall silently reads as zero.
- **Site resets are events.** Gosulsel (wiped, restarted 2025-01), Kabar Makassar (migrated
  ~late 2017, pre-2017 gone from live site), Fajar (live archive starts 2017-03). These belong in
  the deletion-event log, not as missing values.
- **Non-WordPress majors need their own adapters**: Tribun Timur (Kompas Gramedia CMS) and
  Antara. Both are big enough to matter.
- **Rate limiting**: Upeks returned 403 after ~8 calls in a minute. Per-host backoff, ≤1
  request per 3–5 s, and cache everything.
- **Undated URL schemes** (Rakyat Sulsel, Antara, Kabar Makassar): `tanggal_terbit` must come
  from page content (`article:published_time`, JSON-LD, or the byline), not from the URL.

## What this pass did not do (pass 2, still needed)

- Sample ~50 archived URLs per outlet per year and fetch them from Wayback to measure the
  **article share** of captured URLs and whether title, date and body text extract cleanly.
  The numbers above are page counts, not article counts.
- Confirm which of these outlets are on the Dewan Pers list and which Inan's frame will keep.
  Tribun Timur, Fajar, Rakyat Sulsel and Berita Kota are the obvious anchors for 2014–2017.
- Try `sulsel.sindonews.com` and `daerah.sindonews.com` for Sindo; the subdomain probed is
  probably wrong.
