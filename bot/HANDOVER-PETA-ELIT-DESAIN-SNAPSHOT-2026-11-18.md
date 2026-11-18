# Design snapshot captured by bot-posisi

## Subsequent completion report from Desain

Local UI work is complete; shared files released. Includes desktop/footer/mobile navigation and improved heading spacing. No data edits, publish, commit or push. `terbitkan.sh --coba`: eight existing routes passed. `git diff --check`: passed. New-page empty-state and navigation boundaries passed 375/500/820/1024/1440/1905 px; pre-existing footer overflow at 375 remains. Populated rows and filter behavior still need checking after JSON creation. These are collaborator-reported results, not a new independent test by bot-posisi.

Evidence directory: `/Users/odripads/OpenBot/Agents/agent-2e0ca8ab-6082-4e32-bd6a-a00e7e1a1e51/peta-elit-check/`, including `peta-elit-1440.png`, `peta-elit-500.png`, full captures and `rectangles.json`. Preview reported at `http://127.0.0.1:8765/?cetak=1#/peta-elit`. Run data validator, populated-page checks and another `--coba` before publishing. Latest collaborator message: `bdc1a45c-6204-4e66-8e42-359c61082e5d`.

18 Nov 2026. This is an independently inspected snapshot of shared-file diffs, not a claim that Desain has completed validation. Read Desain's own `HANDOVER-PETA-ELIT-DESAIN-2026-11-18.md` if available. All edits are uncommitted in `/Users/odripads/eppos-intel`.

## Existing implementation visible in git diff

- `assets/halaman.js`: `petaElit()` builds page header, explanatory fact-only box, actor/institution search, five-type dropdown, inclusive start/end date inputs and reset button. `setelahElit()` sorts `E.D.peta_elit` descending by date then ID, filters rows, renders dated actor → target cards, exact quotes, source links, optional issue/notes and automatic/team-reviewed status. Empty/filter-empty states exist. New router case `peta-elit`, desktop and mobile nav entries, and document title handling were added.
- `assets/app.css`: `.elit-*` layout rules near top (after `.aksi`), responsive filters and two-column date/content cards. Mobile rules at 600 px; filters change at 1100 px. New fonts use existing tokens/palette.
- `assets/inti.js`: `BERKAS.push("peta_elit")` in loader.
- `scripts/build_bundle.py`: includes JSON if `data/peta_elit.json` exists, otherwise `[]`, in inlined `data["peta_elit"]`.

No data file existed when snapshot was taken. New page can only show an empty state until bot-posisi writes rows. The source loader in an unbundled site may still fetch a missing JSON file; ensure final JSON exists before shipping.

## Explicit items to verify/fix

- Targetless issue rows: current card prints `esc(r.sasaran)` directly, leaving empty target. Coordinate plain fallback “Tidak menyebut orang”; never invent Prabowo as the target of AHY's normative speech. Consider whether a directional arrow accurately communicates non-endorsement `isu` rows.
- Adding a seventh desktop and sixth mobile nav item could overflow existing navbar. Validate rectangles, especially tablet/mobile, not only scrollWidth (`overflow-x: clip` masks errors).
- Page data state, search/type/date/reset interactions and invalid date ranges need actual browser checks with real rows. Date error message exists but list remains governed by normal filters.
- Existing `terbitkan.sh` checks eight legacy pages, so separately verify `#/peta-elit` and browser errors.
- Test at 375, 820, 1024, 1440 and 1905 px; headless Chrome phone testing uses iframe because native window often clamps at 500px. Capture desktop and mobile screenshots with `?cetak=1` and inspect them.
- `dist/eppos-outlook.html` was modified BEFORE this task. Do not overwrite/stage blindly. Bundler regenerates it; establish intended ownership/diff at commit time.

## Coordination

Design agent: EPPOS Desain, ID `agent-2e0ca8ab-6082-4e32-bd6a-a00e7e1a1e51`.

Delegation: implement layout/integration and visual checks, do not publish/push, do not commit research/data, do not change threshold/media data. Research owns `data/peta_elit.json`, `scripts/cek_peta_elit.py`, research notes and private codebook. Current user asked to pause/save both workloads for another subscription. A pause/checkpoint request has been sent. Research's combined handover: `bot/HANDOVER-PETA-ELIT-2026-11-18.md`.
