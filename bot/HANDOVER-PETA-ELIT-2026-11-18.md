# SELESAI 18 Nov 2026 (Claude, lanjutan) — baca ini dulu

Peta Elit sudah TERBIT di https://eppos-outlook.vercel.app/#/peta-elit dan di-push (commit e3a32cb).
- data/peta_elit.json: 17 baris, kutipan dicek verbatim ke artikel; semua status otomatis (belum dicek tim).
- scripts/cek_peta_elit.py dibuat dan dipanggil terbitkan.sh; uji halaman kini 9 rute termasuk #/peta-elit.
- riset/peta-elit-kodebuku.md: draf lokal, sengaja TIDAK di-commit. riset/peta-elit.md dan file handover juga belum di-commit (berisi catatan internal).
- Lanjutan berikutnya: tambah baris (partai nonparlemen, kanal YouTube resmi), jangan ulang yang di bawah.

---

# Resume here: Peta Elit research and design

## Latest design result received after checkpoint

FINAL pause confirmation: Desain saved its own detailed checkpoint at `bot/HANDOVER-PETA-ELIT-DESAIN-2026-11-18.md` and stopped the local preview server. Read that checkpoint for exact edits, integration risks and restart commands. Implementation is paused; no publish/push/commit. Confirmation message: `2e5f9425-aebc-488b-8ed0-1d9bc3c5c42f`.

EPPOS Desain reports local UI complete and shared files released. No publish, commit or push. Its `terbitkan.sh --coba` passed the eight existing routes and `git diff --check` passed. Empty-state/new-navigation boundary checks passed at 375/500/820/1024/1440/1905 px; existing footer overflow at 375 px remains. Real populated rows and filter behavior are still unverified because the JSON does not exist. Repeat integration checks and dry run after adding data. Screenshots: `/Users/odripads/OpenBot/Agents/agent-2e0ca8ab-6082-4e32-bd6a-a00e7e1a1e51/peta-elit-check/peta-elit-1440.png` and `peta-elit-500.png`; that directory also contains full captures and `rectangles.json`. Preview reported at `http://127.0.0.1:8765/?cetak=1#/peta-elit` (may need restarting later). Heading spacing was improved after initial screenshots. This report supersedes the earlier uncertainty about whether design checks ran; it does not establish populated-page validation. Collaborator message ID: `bdc1a45c-6204-4e66-8e42-359c61082e5d`.

Saved 18 November 2026 at Odri's explicit request: “we're running out of tokens can u store this workload somewhere so my other subscription can continue it -- both ur workload and claude desain”. Work was paused for handover. This file and all current edits are on the same Mac in `/Users/odripads/eppos-intel`; nothing in the new Peta Elit track has been published, committed or pushed by bot-posisi.

## Read first

1. `AGENTS.md` and `bot/posisi.md` in this repository.
2. `bot/peta-elit-prompt.md`: durable copy of Odri's FULL task, including authorization. Original attachment: `/Users/odripads/OpenBot/Shared/Transfers/ac18ed71-c15c-459d-b401-22fb8f1887fc/pasted-text.txt`.
3. `riset/peta-elit.md`: completed initial research notes, source links, search log, exclusions, gaps, crawler/vendor note, and questions for Arya.
4. `bot/HANDOVER-PETA-ELIT-DESAIN-2026-11-18.md` if present: EPPOS Desain was asked to stop and save its own exact checkpoint. An independent snapshot of its visible edits is in `bot/HANDOVER-PETA-ELIT-DESAIN-SNAPSHOT-2026-11-18.md` regardless of whether its reply arrived.

## Objective and authority

Build a NEW fact track, `data/peta_elit.json`, showing dated public statements about 2029 presidential nominations: actor → target over time. This supports the elite trajectory for the 2027 outlook; Nofri's separate public-preference map is outside our assignment. Match canonical actor/region identifiers when the team supplies them.

Every row needs a verbatim 3–40-word quote, date, original source URL and outlet. Never infer candidacy from hints. Five allowed `jenis`: `dukung capres`, `dukung cawapres`, `pasangkan`, `tolak/berbenturan`, `isu`. New rows are `otomatis`; UI says “belum dicek tim”. Do not change `data/posisi_skema.json` or mix with the threshold position dataset.

Prepare, but DO NOT publish or assign actors to, the interpretive orbit codebook at `riset/peta-elit-kodebuku.md`. Arya's five types and required examples are in the original brief. The repository is public: leave this draft out of git staging/push as well as out of the website. Do not create unsupported example quotes to fill a category.

Odri explicitly restored publication AND git-push authorization in this task and `AGENTS.md` §0 update 18 November. After completing and verifying the work, the continuing session may use `scripts/terbitkan.sh "bot-posisi: ..." --coba`, then publish via the same script without `--coba`, commit selected fact/code files plus `TERBIT.md`, and `git push origin main`. On rejection: pull --rebase ONCE and retry, never force push. Earlier sprint-expiry restrictions in old notes do not override the new explicit authorization. The present session stopped to save work at Odri's latest request; it did not deploy the unfinished page.

## Completed by bot-posisi

- Read task and repository instructions; initial git status was modified `dist/eppos-outlook.html` plus untracked `bot/peta-elit-prompt.md`.
- Read mainstream, party, regional and public fact-check sources. Initial research is saved in `riset/peta-elit.md`, including specific source URLs, per-actor findings, query strings and limitations.
- Asked EPPOS Desain to implement page layout and integration. Its agent ID is `agent-2e0ca8ab-6082-4e32-bd6a-a00e7e1a1e51`. Original delegation message ID: `e9806c48-ad91-4244-abdd-91786e266523`.
- Requested its pause/checkpoint via message `f02d6958-8358-42e5-a342-e98c99de25d0`. Do not send duplicate implementation work before reading its checkpoint/reply.

## NOT yet created or finished

- `data/peta_elit.json`: NOT CREATED. No ELIT rows exist yet.
- `scripts/cek_peta_elit.py`: NOT CREATED.
- `riset/peta-elit-kodebuku.md`: NOT CREATED, despite a forward reference to it in the research notes.
- Peta Elit data/source validation, integrated dry run, live publication, screenshots and final counts/report: NOT DONE by bot-posisi.
- Official YouTube transcripts and verified public figure accounts have NOT been systematically checked. Results/snippets were not used as evidence. Initial research does not exhaust January–November 2026 or all non-parliamentary parties.

## Proposed row contract sent to Desain

```json
{
  "id": "ELIT-0001",
  "aktor": "Nama kanonis",
  "lembaga": "Partai / organisasi",
  "tanggal": "2026-04-10",
  "jenis": "dukung capres",
  "sasaran": "Nama orang",
  "isu": "opsional",
  "kutipan": "Kutipan verbatim dari sumber",
  "sumber_url": "https://...",
  "outlet": "kompas.com",
  "status": "otomatis",
  "catatan": "opsional, untuk batas konteks / tanggal terbit ulang",
  "wilayah": "Nasional"
}
```

`kode_bps` optional; do not invent a code for national statements. `wilayah` describes statement scope, not where a person was interviewed or a claimed voter base. `diisi_oleh: "bot-posisi"` can be included consistently if desired. For genuinely non-personal `isu`, `sasaran` may need to be empty rather than inventing a target. This was recorded in notes but still needs coordination with Desain: its visible code initially prints `esc(r.sasaran)` with no fallback. Use “Tidak menyebut orang” or another plain rendering; do not draw an implied endorsement from an issue row.

## Evidence worth preserving when making rows

Read the linked articles again for exact quote text, speaker and event date before writing JSON. The notes list all URLs; the following are guidance and known excerpts, not a substitute for source verification.

- **Muhaimin Iskandar / PKB, 10 April:** Kompas 11 April quotes `Pak Prabowo kalau maju pasti menang, dan kita dukung yang menang lah,` and `2029 Pak Prabowo masih maju dan masih sangat kuat, karena itu ya PKB harus realistis,`. Explicit Prabowo support. Separate personal-candidacy disclaimer may be `isu` if useful.
- **Hanif Dhakiri / PKB, 10 April:** Kompas 10 April describes a goal of Muhaimin becoming president **or** vice president. The full sentence is long; take a contiguous exact 3–40-word excerpt only after rereading. Keep the ambiguity, e.g. `isu`; do not turn one statement into two certain endorsements.
- **Agus Harimurti Yudhoyono / Demokrat, 5 September:** Kompas 9 September quotes `Kekuasaan bukan milik seseorang untuk selamanya, kekuasaan adalah amanah rakyat yang memiliki batas waktu,`. Normative issue only: does not name Prabowo or announce candidacy. Empty target requires a UI fallback.
- **Partai Demokrat, written statement 8 September:** detik quotes `Demokrat menegaskan pidato AHY sama sekali tidak berkaitan dengan kepentingan politik praktis, apalagi terkait Pilpres 2029.` Explicit denial of that interpretation, not a declaration.
- **Herzaky Mahendra Putra / Demokrat, 10 October:** CNN says no capres/cawapres discussions yet. `isu`, not opposition or neutrality.
- **Ahmad Doli Kurnia / Golkar, 8 October:** original CNN article published 9 October says Prabowo is the agreed capres, VP later. Use 8 October event date rather than republication date.
- **Faisol Riza / PKB, 12 October:** detik NasDem article also quotes explicit Prabowo 2029 support. Verify quote and role in article.
- **Viva Yoga Mauladi / PAN, 12 October:** official PAN article published 10 November quotes `Sikap PAN sudah jelas untuk mendukung kembali Presiden Prabowo di Pilpres 2029 nanti,`. It explicitly dates quote to 12 October and cites detik. Count as one event, not separate October/November statements. Article also says VP choice left to capres; separate issue only if a distinct useful statement.
- **Hermawi Taslim / NasDem, 12 October:** support through 2029; next-term choice waits for election stages. `isu`. Support for the current government is not a 2029 candidacy endorsement.
- **Muhammad Kholid / PKS, 12 October:** Harian Disway 13 October: government support until 2029 and no next-candidate decision yet. Same distinction.
- **Dedi Mulyadi, 22 September:** detikJabar says focus on governor duties in response to Gibran pairing rumor. `isu`, not a pairing or rejection of Gibran as a person.
- **Joko Widodo, 27 September:** Radar Bekasi only records smile/laugh and `Hehe`. No qualifying quote, NO ROW endorsing KDM–Gibran. Saber Hoaks Jabar refutes claimed official endorsement. This is a source gap/exclusion, not neutrality.
- **Andreas Hugo Pareira / PDIP, 18 September:** kumparan says `Pilpres masih jauh, kita kerja dulu` and discusses Pramono's work. No nomination/pairing endorsement.
- **Sugiat Santoso / Gerindra, 17 September:** Kompas 18 September discusses Prabowo–Pramono cooperation, not candidate mapping. Potential issue row only with exact quote and context.
- **Bestari Barus / PSI, 9 November:** Kompas 10 November quotes government support for Prabowo–Gibran after PSI resignations. Not automatically a 2029 pair endorsement. Keep horizon explicit if included at all.

No defensible `pasangkan`, `dukung cawapres` or `tolak/berbenturan` row was confirmed in the selected initial sources. Do not force every category to have a record. For orbit examples not supported by rows, mark evidence pending.

## Research gaps and vendor note

Hanura, Perindo, PPP and Gelora queries produced no admissible statement in this initial pass; Buruh, Ummat, PBB and Garuda were not individually searched. Do not equate not found with politically silent. Track coverage/window/access and explicit “belum memutuskan” separately. Official Demokrat and PSI URLs returned 403; PAN was readable. YouTube titles and social search hits are leads only, not verified quotes.

Research notes already explain free crawler limitations: news-only, query/outlet/window limited, no social-media collector or complete mention coverage. Paid-vendor questions include mention quotas, platforms, historical access, transcript/source/export support, retention, contract length and full price. Do not buy/contact vendors.

## Git/worktree state at checkpoint

Repository: `/Users/odripads/eppos-intel` (shared checkout, not the agent scratch directory). Latest visible commit `ad25b29`: AGENTS.md restores publish/push. Previous commits `f0724e8` and `e25213b` belong to the earlier threshold update. Initial status before Desain started had `dist/eppos-outlook.html` modified and `bot/peta-elit-prompt.md` untracked; preserve these.

Visible uncommitted design files now: `assets/app.css`, `assets/halaman.js`, `assets/inti.js`, `scripts/build_bundle.py`. `dist/eppos-outlook.html` is also modified; this was already modified before the new track and was not researched for ownership. Untracked research: `riset/peta-elit.md`, original prompt, and handover files. Inspect status/diff afresh because Desain may still be finishing its checkpoint.

Do not reset/stash/delete shared changes blindly. Do not stage the orbit codebook or accidentally sweep all `riset/` into a public push.

## Finish sequence for the next subscription

1. Read the files above and Desain's own checkpoint. Check `git status --short` and shared-file diffs; confirm no other agent is editing.
2. Re-read primary articles from `riset/peta-elit.md`; create initial fact JSON rows with exact quotes, explicit event dates and context. A smaller defensible first set is preferable to speculative coverage.
3. Create meaningful validator modeled on `scripts/cek_posisi.py`: list/object shape, required strings, unique IDs, allowed types/status, real ISO dates since 1 Jan 2026 and not future, 3–40-word quotes, valid http(s) URLs, duplicate events, correct optional field types. Handle targetless issue rows explicitly; require named targets for person-support/pairing/opposition types.
4. Draft local orbit codebook with observable signals, exclusions/ambiguity and 1–2 sourced row examples where available; no actor classifications. Clarify gaps rather than invent examples. Keep draft off public outputs.
5. Coordinate final page fixes; see design handover. Run validator, `python3 scripts/cek_posisi.py`, relevant JS syntax checks, `git diff --check`, build and test filters/empty states with REAL rows.
6. Check page rectangles at 375, 820, 1024, 1440, 1905 px. Chrome headless may require phone-sized iframe. Capture and inspect desktop + mobile screenshots; test added nav does not overflow. `?cetak=1` prevents animation issues. Verify screenshots show real rows rather than only the empty state.
7. Run `scripts/terbitkan.sh "bot-posisi: peta elit pencalonan 2029" --coba`. Existing publish script checks eight old routes; explicitly validate new `#/peta-elit` too. Do not interpret the old eight-page pass as coverage of new page.
8. Publish with the script once checks pass (authorized), verify live route and facts, update publication record through script. Commit only relevant approved files plus TERBIT.md, excluding private interpretive draft. Push normally under the authorization above. Be aware earlier unpushed commits may also go with the push; inspect local/remote history.
9. Send Odri live link, desktop/mobile screenshots, counts by actor/type, source coverage/gaps and questions for Arya. All automatic facts remain “belum dicek tim”.

## Prior threshold work (already completed, preserve)

53 rows in `data/posisi_aktor.json`, all automatic, zero human-reviewed. POS-0052 Heroik M Pratama (12 Nov) and POS-0053 Agun Gunandjar Sudarsa (13 Nov, proposal **60 DPR seats**, not vote percent or collective Golkar stance). RUU status updated to completed 12 November hearing and target **draft** by late December. Published earlier to https://eppos-outlook.vercel.app/#/ruu-pemilu; frozen deployment https://eppos-outlook-5dstsyw94-odripads.vercel.app. This publication predates the new elite track. Earlier checks passed. Remaining separate research gaps: Bawaslu selection, roughly 270-region figure, exhaustive 14–18 Nov coverage. Do not let these distract from resuming the new track.
