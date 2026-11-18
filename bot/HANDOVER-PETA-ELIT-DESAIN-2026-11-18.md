# Peta Elit — design checkpoint, 18 November 2026

## Stop state
- Implementation paused at Odri's request, relayed by EPPOS Posisi. Resume only on a new request.
- Local changes only. No commit, push or publication performed by Desain.
- Main research handover: `bot/HANDOVER-PETA-ELIT-2026-11-18.md` (Posisi owns it).
- Read `AGENTS.md`, `bot/desain.md`, and `bot/peta-elit-prompt.md` before resuming. Publishing permissions differ between instructions; resolve current approval requirements before publishing. Desain's first publish needs before/after review under its standing instructions.

## Implemented changes
1. `assets/halaman.js`
   - Added `petaElit()` and `setelahElit()` near the top, before shared helpers.
   - Dedicated `#/peta-elit` route and document title.
   - Added Peta Elit to `NAV` (also used in footer), Elit to `NAV_HP`.
   - Editorial chronological list: date/id rail, actor → target, institution, statement type, verification badge, verbatim quotation, linked source, optional issue and note.
   - Actor/institution substring search, type filter, inclusive from/to dates, reset; live result count; empty dataset and no-match states.
   - Intro explicitly distinguishes sourced statements from candidacy predictions and says missing records do not establish an actor's position. Links to RUU Pemilu.
   - No orbit assignment, inferred candidacy, aggregate relationship weighting or invented research rows.
2. `assets/app.css`
   - Added scoped `.elit-*` styles before `/* bilah atas */`: responsive filter grid, chronological rail, actor/target columns, quotation typography, status and source treatments, empty state.
   - Breakpoints 1100 and 600 px. Last change added 36 px top padding to `.elit-halaman`.
3. `assets/inti.js`
   - Data-loading-only addition: `BERKAS.push("peta_elit")` immediately before `E.muat`.
   - No normalization, numerical or method changes.
4. `scripts/build_bundle.py`
   - Optional `data/peta_elit.json` loading into bundle; missing file yields `[]`.
   - This loading integration was disclosed to Posisi; pipeline/data ownership remains theirs. Have Posisi review it.

## Current schema assumptions / integration risk
- `E.D.peta_elit` is a flat array, not a metadata wrapper.
- Each record: string `id`, `aktor`, `lembaga`, `tanggal` (ISO YYYY-MM-DD), `jenis`, `sasaran`, `kutipan`, `sumber_url`, `outlet`, `status`; optional strings `isu`, `catatan`.
- Sort uses `tanggal.localeCompare`, then `id.localeCompare`: missing/non-string keys will fail. Validate before integration or guard appropriately.
- `jenis` options exactly: `dukung capres`, `dukung cawapres`, `pasangkan`, `tolak/berbenturan`, `isu`.
- `status === "dicek tim"` displays that label; everything else displays `belum dicek tim`. Confirm this mapping with Posisi (expected raw alternate: `otomatis`).
- Content uses existing `esc()` and source href uses `E.url()`; verify hostile-string escaping and URL handling with isolated test fixtures before release.
- `data/peta_elit.json` was absent at last check. Source preview consequently logs a 404 and shows empty state; bundle intentionally uses empty array.
- Actor search currently excludes target names. Confirm whether target search is wanted rather than silently changing semantics.

## Checks actually completed
- Before edits: `git diff -- assets/halaman.js assets/app.css assets/inti.js scripts/build_bundle.py` was empty.
- `scripts/terbitkan.sh "bot-desain: peta elit UI lokal" --coba` passed position validation (53 rows), bundle build and eight existing route checks; no deployment.
- That dry run preceded the last 36 px heading-padding change. Re-run after final integration.
- `git diff --check` passed after the padding change.
- Embedded-browser empty-state inspection confirmed heading, navigation, fields, reset and empty message.
- Empty new-page/main-navigation rectangle checks passed at 375, 500, 820, 1024, 1440 and 1905 CSS px. This did not clear the pre-existing footer issue.
- Source preview font downloads failed in embedded browser (`ERR_CACHE_MISS`); do not treat that preview as final typography proof.
- Captured fresh Chrome screenshots after padding change via scratch runner; image capture succeeded, but these new-page image files were not visually inspected before pausing.
- Populated cards, sorting, filter interactions, reset, invalid date ranges, long names, keyboard behavior, URL escaping and screen-reader behavior remain untested.
- Existing automated eight-route test does NOT include the new page.

## Evidence paths
Workspace: `/Users/odripads/OpenBot/Agents/agent-2e0ca8ab-6082-4e32-bd6a-a00e7e1a1e51/`
- `peta-elit-check/peta-elit-1440.png`
- `peta-elit-check/peta-elit-500.png`
- Corresponding `-full.png` files, `rectangles.json`, `run.json`.
- `audit.mjs`: scratch capture runner; `ELIT=1 node audit.mjs` selects localhost new page. Earlier full-site audit in `audit-2026-11-18/`, normal-mode checks in `audit-2026-11-18-normal/`.
- Runner provenance caveat: `run.json` source label still says live site even in ELIT mode; ELIT screenshots actually use localhost source.
- Current user instructions require embedded browser for subsequent browser work; do not automatically reuse old Chrome runner without checking instructions.

## Remaining work, in order
1. Coordinate with Posisi and read their handover. Inspect git diff before touching shared files.
2. Integrate real, validated flat-array JSON; do not invent rows or change their meaning.
3. Verify populated render, filters/reset/date ordering, long strings, keyboard labels/focus and source URLs. If data still unavailable, test clearly labeled synthetic fixtures only in isolated browser memory, never in research files.
4. Inspect screenshots at phone and desktop widths with loaded fonts. Recheck global header/mobile navigation after adding an item. Verify mobile active state.
5. Check CSS token names against project definitions (new code references `--kertas-2`, `--garis`, `--garis-2`, existing typography tokens); avoid silent invalid colors.
6. Inspect all affected routes and footers. Known prior issue: footer PolGov logo extends to x389 at width375 (14 px clipped); not fixed by this work.
7. Run Posisi's new data validator when available; `node --check assets/halaman.js`; `git diff --check`; then `scripts/terbitkan.sh "bot-desain: peta elit UI lokal" --coba`. Add explicit new-route populated verification since script covers only existing routes.
8. Return proof and file ownership to Posisi. No publish/push/commit until resumed and applicable permission requirements are satisfied.

## Files not owned by this checkpoint
- `dist/eppos-outlook.html` was already modified before Desain started. Dry-run build regenerated it; do not discard/stage it blindly.
- `bot/peta-elit-prompt.md` was already untracked; `riset/peta-elit.md` appeared during Posisi's parallel work. Do not overwrite them.
- No data files intentionally edited. Dry-run build can regenerate `data/ringkas.json`; git status did not show a change there.
- Last git status: modified app.css, halaman.js, inti.js, dist/eppos-outlook.html, scripts/build_bundle.py; untracked brief and riset/peta-elit.md. This checkpoint adds another untracked file.

## Local process
- Desain launched `python3 -m http.server 8765 --bind 127.0.0.1` in repo, PID 94364. It is being stopped on pause; verify status before assuming it exists.
- Preview after restarting server: `http://127.0.0.1:8765/?cetak=1#/peta-elit`.
- Browser tab may remain open on the local preview. No build or deployment job is pending.
