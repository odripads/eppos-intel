# AGENTS.md — EPPOS Political Outlook handover (read this first, every session)

You are helping **Odri** finish and maintain **EPPOS Political Outlook**, released **2 December 2026** by **EPPOS
GROUP** under **PolGov** (Research Center for Politics and Government), Departemen Politik dan Pemerintahan, UGM.
Odri's previous assistant (Claude) is near its usage limit, so two **OpenBot** agents take over. This file
replaces that assistant's memory. Last updated 10 Nov 2026.

The two agents (how to create them in OpenBot: `bot/OPENBOT-SETUP.md`):
- **EPPOS Media** keeps Fokus 1 (executive intervention) fresh. Its full instructions: `bot/media.md`.
- **EPPOS Posisi** builds Fokus 2: positions of civil society, parliamentary elites and non-parliamentary elites on
  the RUU Pemilu. Its full instructions: `bot/posisi.md`.
Each agent has its own OpenBot workspace folder, but **all project work happens in `~/eppos-intel`**. Both publish
to the same Vercel site, only through `scripts/terbitkan.sh`.

## 0. Hard stops — your permission is "allow", so you are the only brake
- **Publish only with `scripts/terbitkan.sh "<bot>: <what changed>"`.** Odri has authorised both bots to keep
  https://eppos-outlook.vercel.app up to date this way. The script locks, so two bots can't deploy at once. It
  checks the position data, builds, tests 8 pages in Chrome, deploys, proves the deploy and logs it in
  `TERBIT.md`. Never run `vercel deploy` yourself. Never deploy another Vercel project, and never deploy the repo root.
- **Ask Odri first, and wait for a yes, before:**
  method decisions (the map cut-off date, scope or mechanism rules, relabelling or deleting rows, the closed lists
  in `data/posisi_skema.json`); running crawlers by hand (`crawl_outlets.py`, `crawl_candidates.py`,
  `discover_outlets.py`, `dateline.py`), since ad-hoc crawling is paused until Odri says "continue" (the 09:30
  launchd routine may keep running). **Exception, sprint 10–13 Nov 2026:** Odri said (10 Nov) "as long as I'm here
  and chatting … keep crawling and putting changes to our website", and the same for bot-posisi, "so that by Friday we
  have it updated, fresh and perfected". Until Fri 13 Nov 23:59 WIB, bot-media may run `scripts/rutin_harian.sh`
  (never while another copy runs: check `pgrep -f "[r]utin_harian.sh"`) and both bots may publish after their checks.
  Odri added (10 Nov): "no need to commit locally for me to check first, just keep committing to our Vercel, I give
  you both bypass permission level discretion". So in the sprint, publish with `terbitkan.sh` on your own judgement
  without waiting for Odri's review. Odri then approved `git push` too (10 Nov, "publish it on git too so we have
  double cloud safety … just keep posting public it's ok"): after each publish, `git add` your changed files,
  commit, and `git push origin main`. If the push is rejected, `git pull --rebase` once and retry; never force-push.
  Odri confirmed the push to bot-posisi directly as well (10 Nov). Data integrity rules (§0 Never, §6) still hold.
  New crawl windows (e.g. 2009/2014) are scope, so they still need Odri's yes; outside the sprint, `git push` (the
  repo is public and feeds GitHub Pages); emails, messages, posts, accounts or money; changing partner assets such
  as the PolGov logo.
- **Commit** after each publish, staging only the files you changed (plus `TERBIT.md` if you published). During
  the sprint (until Fri 13 Nov 23:59 WIB), then `git push origin main`; never force-push. After the sprint: commit
  locally only, never push.
- **Never:** classify the media corpus with a language model (that includes you), because the spec forbids it, and
  scope, mechanism and place come from written regex rules only; invent a number, date, name, quote or source;
  publish `pelaku_nama` (alleged perpetrators' names); open `~/Documents/EPPOS-master/` unless asked; edit the
  other bot's files.

## 1. People, decisions and what is still open
- **Odri**: PIC of the media team, a researcher rather than a career engineer. Short, plain updates (English or
  Indonesian); recommend one option; show proof; say what you did not verify.
- **Inan** and **Ravy** fill `eppos-media-intake.xlsx` by hand (Inan: Sumatera and Kalimantan; Ravy: Sulawesi,
  Bali, Nusa Tenggara, Maluku, Papua, plus Makassar and Kupang).
- **Beckham's team** tracks civil-society advocacy on the parliamentary threshold and presidential nomination rules.
  They split into three groups (masyarakat sipil, elit parlemen, elit non-parlemen) and plan to merge their work
  "this week" (said around 10 Nov). bot-posisi works alongside them.
- **Team meeting decisions:** the Outlook has two foci. (1) Executive intervention from media tracking is the
  foundation, and the most visible and measurable part. (2) A new study of the RUU Pemilu (parliamentary
  threshold, presidential nomination rules) as context for the 2027–2029 political map. The **budgetary study** is
  on hold (RUU Keuangan Negara may change; FEB collaboration needs more than 30 days). The **regulatory study** is
  on hold (the RUU model is unclear). The intervention map is presented static (Pemilu 2024 and earlier, back to
  2009) and shared by WhatsApp, plus the interactive site via QR. Odri's rule: call it "EPPOS Political Outlook",
  never "the map".
- **Human confirmations, not bot work (remind Odri, don't act):** release time, ideally midday for print
  deadlines (Mbak Linda and the auditorium managers); interactive hosting format (currently Vercel); whether the
  PolGov website, under repair, can host the research.

## 2. The product
- **Live:** https://eppos-outlook.vercel.app. Public, no login, `noindex`. Every publish is logged in `TERBIT.md`.
  The old map is still at https://eppos-peta.vercel.app, a separate project; don't touch it.
- **Pages (hash routes):** `#/` · `#/intervensi` · `#/skema` · `#/provinsi`, `#/provinsi/<slug>` · `#/arsip` ·
  `#/ruu-pemilu` (with the position map, `#posisi`) · `#/metode` · `#/presentasi/1`…`10`.
  `?cetak=1` turns animation off for screenshots; `?cetak=semua#/presentasi` renders all plates.
- **Two maps:** Peta I is before **2022-06-14**, Peta II is from then on. That date is the official start of the
  Pemilu 2024 stages (PKPU 3/2022), set in one constant, `E.BATAS` in `assets/inti.js`. Odri has not confirmed it (§8).
- **The map** is a lattice of 9,351 cells owned by 484 kab/kota units covering all 38 provinces. Colour shows which
  series is present, never a count: gold = media only, blue = official case only, red = both, small dot =
  province-level only. The palette was validated for colour-blind readers; don't add hues.
- **Position map** (`petaPosisi()` in `assets/halaman.js`): a grid of three actor groups by two issues, read from
  `data/posisi_aktor.json`. Each row shows its stance, a verbatim quote and a source link. Rows not checked by
  Beckham's team show "belum dicek tim". It is empty until bot-posisi adds rows.
- **Static version:** 10 plates in `dist/pelat/` (PNG at 3840×2160, plus `EPPOS-Political-Outlook-pelat.pdf` for
  WhatsApp), rendered from the same page as the site.
- **Logo rule:** EPPOS and PolGov are equal. No white box behind either, both keep their tagline, sized by ink
  mass (`.logo-dua`: EPPOS height `--u`, PolGov `.682u`). On dark backgrounds PolGov's dark red is swapped for EPPOS
  cream (the original is 1.9:1 on navy). That reversal is ours, not an official PolGov file.

## 3. Where everything lives
| Path | What |
|---|---|
| `~/eppos-intel/` | The repo. `~/Desktop/EPPOS GROUP /eppos-intel` is a symlink to it (note the space in the folder name) |
| `PROJECT-SPEC.md` | **The contract for the media layer.** Read it before proposing method changes |
| `AGENTS.md`, `bot/` | This handover; the two bots' instructions; `bot/OPENBOT-SETUP.md` (how to create them in OpenBot) |
| `TERBIT.md` | Publish log, one line per deploy |
| `index.html`, `assets/` | Site: `inti.js` data and every derived number, `kisi.js` canvas map, `grafik.js` shared figures and the legal timeline `E.PATAH`, `halaman.js` pages, router and plates, `app.css` |
| `assets/lockup/` | Logos in use, built by `scripts/logo_turunan.py` from the untouched originals in `assets/` |
| `data/*.json` | Media dataset (`manifest.json`, `insiden_otomatis.json`, `insiden.json`, `kasus_resmi.json`, `kandidat.json`, `kisi.json`, `peta_dasar.json`) and `posisi_aktor.json` with its closed lists in `posisi_skema.json` |
| `riset/` | bot-posisi's sourced research notes |
| `scripts/` | Pipeline; each script's first docstring line says what it does |
| `dist/eppos-outlook/`, `dist/pelat/` | Built site (what gets deployed) and plates. Gitignored |
| `tinjau.html` | Old review page; keeps the old look via `assets/tinjau.css` |
| `~/Desktop/EPPOS GROUP /` | Team folder: briefs, logos, intake sheets, speech analyses |
| `~/Documents/EPPOS-master/eppos-media-intake-LENGKAP.xlsx` | Full workbook **with names**. Do not copy it anywhere |

## 4. Media pipeline
`crawl_outlets.py` + `crawl_candidates.py` → `data/kandidat.json` (written only through `scripts/kandidat_io.py`)
→ `resolve_urls.py` → `verify_titles.py` → `confirm_queue.py` (stamps `diterima otomatis`) →
`promote_candidates.py` (scope rules, place from the BPS code, two-source check) → `data/insiden_otomatis.json`
→ `build_data.py` → `build_bundle.py`. The launchd job `id.eppos.rutin` runs all of it daily at 09:30
(`scripts/rutin_harian.sh`), logs to `data/rutin.log`, and commits `data/` locally. It does **not** deploy:
bot-media does that after auditing. Lately the crawlers find 0 new candidates; the grid is about 99% done.
(`promote_candidates.py` crashed every day from 4 to 10 Nov because it read the old `index.html`. Fixed on
10 Nov: it now reads `data/peta_dasar.json`.)

## 5. Commands
```bash
cd ~/eppos-intel
scripts/terbitkan.sh "bot-media: apa yang berubah"     # THE way to publish (locks, checks, tests, deploys, logs)
scripts/terbitkan.sh "bot-posisi: uji" --coba          # every step except the deploy
python3 scripts/cek_posisi.py                          # validate data/posisi_aktor.json
python3 scripts/build_bundle.py                        # rebuild dist/eppos-outlook/ only
scripts/ekspor_pelat.sh                                # plates → dist/pelat/ (PNG + PDF); after build_bundle
lsof -iTCP:8765 -sTCP:LISTEN || python3 -m http.server 8765   # dev server; Odri sometimes runs one already
```
If the site breaks after a publish: `cd dist/eppos-outlook && vercel rollback`, then tell Odri and log it in `TERBIT.md`.
Screenshot, for the `ui` agent:
```bash
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CH" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$(mktemp -d)" --window-size=1440,900 \
  --virtual-time-budget=6000 --screenshot=/tmp/s.png "file://$HOME/eppos-intel/dist/eppos-outlook/index.html?cetak=1#/ruu-pemilu"
```

## 6. Rules
- Media is the **sensor**, not the object. Everything is "dilaporkan" (reported) with a source link, never an
  adjudicated finding; frame results as anomaly flags, never accusations. Personal scandal is out of scope.
- **Never a raw-count choropleth.** Raw counts across periods aren't comparable either. The valid comparison is the
  rate per 1,000 searches from the `wp-grid` channel only (`E.laju()`).
- Keep the two series apart: `insiden` = media reports; `kasus_resmi` = Bawaslu, DKPP, BKN, KPK or MK cases.
- Every record needs a source URL; rows without one are rejected, not repaired. Undated rows aren't imported.
- Province comes from the **BPS code**, never from map geometry. Automatic rows are stamped `diterima otomatis`.
- **Positions:** the verbatim quote decides the stance. No quote, no row. Public actors' public statements only.
- Site copy is plain Bahasa Indonesia. Unwritten analysis goes in a `menyusul("…")` box, never placeholder numbers.
- Code style: match the surrounding code (Indonesian identifiers, `var`/`function`, comments that explain why).

## 7. Traps that already cost hours
- `body` has `overflow-x: clip`: a too-wide element is silently cut off with no sideways scroll. Check element
  rectangles against `innerWidth`, not `scrollWidth`. Test at 375, 820, 1024, 1440 and 1905 px.
- Headless Chrome on this Mac won't go below about 500 px. Test phones inside a 390 px `<iframe>`.
- Animations don't advance in a page that isn't being painted. Screenshot with `?cetak=1`.
- The bundle inlines its JavaScript, so text you grep for in a dumped page also appears in the script source. Check
  only the rendered `<main id="isi">` (as `terbitkan.sh` does).
- Regex substring traps: "anggaran" in "pelanggaran", "akan" in "blak-blakan", "sabu" in "sabun", "ancam" in
  "terancam". Always use `\b`.
- Google News ignores `after:`/`before:` and blocks bursts. launchd can't read `~/Desktop`. Keep 15 GB or more free.
- `scripts/label_provinces.py` is a retired one-off that still reads the old `index.html`.

## 8. Open work
**Waiting on Odri (don't act until answered):**
1. Map cut-off: keep 2022-06-14 and rename the maps ("Sebelum siklus 2024" / "Siklus 2024 dan sesudahnya"), or
   switch to 2024-01-01? Rows (Peta I / Peta II): 754 / 1,822 now, 998 / 1,578 with 1 Jan 2024. 189 of the 244
   rows in between are from the second half of 2023.
2. Mislabelled mechanism: 134 of the 145 "pengalihan sumber daya" rows are ASN stories, because `SUMBER` in
   `scripts/impor_peramban.py` matches "anggaran" inside "pelanggaran" (flagged on the site by `E.keandalan`).
   When approved: change it to `\banggaran`, relabel the rows in `kandidat.json` with `kandidat_io.ubah`, run
   `promote_candidates.py`, diff `insiden_otomatis.json` before and after, then publish and re-export the plates.
3. Redirect `eppos-peta.vercel.app`? · Plates count single-source rows, but the spec says only `dua sumber` rows
   publish: which version goes on stage? · A real corrections email (the Metode page has a placeholder).

**bot-media:** the daily audit-and-publish loop (`bot/media.md`). Then the small checks: "Camat Batu Ampar" is
misplaced in Kota Batu, Jawa Timur; 22 "Jayapura" rows need a city vs regency check; 35 candidates have no URL.
"Back to 2009": the 2009 and 2014 cycles have 1 and 5 rows, because search windows start at Pilkada 2015.
Propose crawl windows, but don't run them while crawling is paused.

**bot-posisi:** fill the position map and `riset/ruu-pemilu.md` (`bot/posisi.md`); import Beckham's merged sheet;
check the legal facts in `E.PATAH` (`assets/grafik.js`) against official documents (the current links are news
reports; "sekitar 270 daerah" is rounded because sources say 271 or 272); keep the RUU status line current.

**Before 2 Dec (remind Odri):** test the QR with a real phone, test the plates on the auditorium projector, and
re-export the plates PDF after the last data change.

## 9. Working together
- One publish at a time: if `terbitkan.sh` says TERKUNCI, wait a few minutes and retry. A lock older than
  15 minutes with no `terbitkan.sh` process running is stale: `rm -rf .terbit.lock`.
- Before editing a shared code file (`assets/halaman.js`, `assets/app.css`, `assets/inti.js`), run
  `git diff -- <file>` to see whether the other bot has uncommitted changes there, and keep your edits inside your
  own functions.
- Visual checks: take a screenshot (§5) and look at it if your model can read images; either way, run the rectangle
  checks in §7 and report the numbers.
- VoiceStudio and HyperFrames are on this Mac if Odri wants a narrated explainer video (Odri's voice only through
  VoiceStudio).
- Read sources with your fetch tool or OpenBot's browser, read-only: never sign in, post, comment or fill a form.
  If a source can't be fetched, tell Odri instead of guessing what it says.
