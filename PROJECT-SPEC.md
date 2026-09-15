# EPPOS Electoral Intelligence — project spec (v2, 10 Sep 2026)

Supersedes v1. The media layer changed scope on 8 Sep: it is now a **national incident census**,
not a two-city media-field study. Read this whole file before proposing anything.

You are helping build the media layer for EPPOS Group, a study group in the Department of
Politics and Government, UGM. I am Odri, PIC of the media team. Two non-coders (Inan, Ravy)
collect data by hand into a spreadsheet; I do all the code with you.

## What the media layer is now

**Object:** intimidation and coercion by sitting executives for electoral advantage — mayor
pressuring lurah, bupati assembling kepala desa, superiors threatening ASN and honorer.
Media is the *sensor*, not the object of study.

**Unit of analysis: the incident.** Not the article, not the outlet. One row = one event.
Five articles about one event is one row with several source links; one article describing
three events is three rows. This is the change that makes national scope affordable —
we do retrieval, not corpus construction. Target scale is hundreds of incidents, not
millions of articles.

**Scope: all of Indonesia**, in two strata inside one table:
- `standar` — the whole country, searched with an identical, documented procedure.
- `mendalam` — Kota Makassar and Kota Kupang, searched exhaustively.

Every incident row carries `intensitas_pencarian`. **Never compare raw counts across strata** —
the deep cities are searched harder, so they will always show more. This is also why the
national census and the two focus cities are one dataset with a filter, not two projects:
the other two project layers (budget, regulatory) stay city-specific and attach to the
Makassar/Kupang subset, while the national rows give those two cities a comparison class
they otherwise would not have.

**Collection is split three ways**, same task, different territory: Odri takes Jawa (6 provinces,
densest coverage — edge cases surface there first and those coding decisions propagate), Inan
takes Sumatera and Kalimantan (15), Ravy takes Sulawesi, Bali, Nusa Tenggara, Maluku and Papua
(17) plus the deep tier, since Makassar and Kupang sit inside his own territory.

**Time:** anchored to electoral waves, not calendar years. For each pilkada wave (2015, 2017,
2018, 2020, 2024): six months before penetapan calon through one month after voting day, plus
a matched non-election window as the control. Wave 2024 is collected first and to completion;
earlier waves only if time allows.

## The measurement trap — handle this in the code, not just the writing

Counting reported incidents per kabupaten and coloring a map produces **a map of press density,
not a map of coercion.** Java goes red because journalists are there; remote regions look clean
because nobody covers them. Any raw-count choropleth is wrong and must not ship.

The design answer is **two series with differently-directed biases**:
1. `insiden` — incidents reported in media (biased toward regions with press presence).
2. `kasus_resmi` — administrative cases: Bawaslu ASN-neutrality reports, DKPP rulings,
   Ombudsman findings (biased toward regions with functioning oversight and complainants).

Where they agree, there is signal. Where they diverge, the divergence is the finding: many
media reports + few formal cases = enforcement failure; many formal cases + little coverage =
press absence or suppression. Present incidence as "reported incidents", never as "incidence",
and normalize by a coverage-capacity proxy before any cross-region comparison.

Institutional context that belongs in the analysis: **KASN was dissolved in 2023** under the new
ASN law and ASN-neutrality oversight moved to BKN, immediately before the 2024 pilkada — Bawaslu
publicly flagged the risk at the time. The administrative series has a structural break inside
the observation window.

## Typology (closed list — keywords derive from it, not the reverse)

`mekanisme` takes exactly one of:
- **paksaan aparat sipil** — punitive mutasi/demosi, threats to honorer/PPPK renewal, coerced
  apel attendance, WhatsApp-group directives, ASN in support declarations
- **paksaan kepala desa dan lurah** — kades assembled and directed, dana desa as leverage,
  threats over village budgets
- **paksaan warga penerima program** — bansos conditioned on voting, KTP collection, threats to
  withdraw assistance
- **tekanan terhadap kritik** — journalists, activists, academics pressured, reported to police,
  threatened
- **pengalihan sumber daya** — bansos accelerated, groundbreakings timed to the campaign

## Data model

Hand-collected tables come from `eppos-media-intake.xlsx` — sheet names and column headers are
the schema, verbatim, do not rename them.

**Active now:** `insiden` (the main table), `kasus_resmi`, `info_a1`.
**Deep tier, two cities:** `outlet`, `pejabat`.
**Phase 2, not yet collected:** `kontrak_media`, `perusahaan`, `relasi`, `tender`.

Pipeline-derived fields I compute, not them:
- `hari_ke_pemungutan` — signed days from the incident date to the nearest voting day in that
  region's wave. This is the temporal axis; calendar months are never the axis.
- `kode_wilayah` — BPS kab/kota code, joined from the province + kab_kota strings.
- `region_id` — the join key across the three project layers.

Every row carries `sumber_1_url`, `sumber_2_url`, `status_verifikasi`, and the collection date.
Add `archive_url`, `retrieved_at`, `first_seen`, `last_checked` at ingestion. An article that
later disappears is recorded as an event, never as a missing value.

## Verification rules (enforce these in the ingestion script)

- `status_verifikasi` = `dua sumber` requires two different outlet domains AND a near-duplicate
  check that shows the two texts are not the same press release. Compute the shingle overlap;
  do not trust the collector's judgment alone.
- Reject rows with no `sumber_1_url`. Report which rows and why — do not repair them.
- `pelaku_nama` may be blank and usually should be. Only rows with `dua sumber` publish.
- Deduplicate on (tanggal, kab_kota, mekanisme, sasaran_jenis) and surface likely duplicates for
  my review rather than merging silently — two similar incidents in one regency is plausible.

## Site

Static. Versioned JSON/CSV in the repo, JS frontend, GitHub Pages. No backend; the data
directory doubles as the citable dataset release.

`eppos-mockup.html` in this folder is the design reference — read it before writing any frontend
code. Single self-contained file: projected SVG map of Indonesia, four-tab panel, regime-band
chart with hover crosshair, tables, Info A1 treatment, full light/dark token system. Its data is
fake, inlined as JS arrays near the bottom.

Do not redesign it. Extend it: keep the markup, CSS tokens, type scale and chart code, replace
the inlined arrays with `fetch()` against `/data`. Three changes the new scope requires:
1. **All provinces become clickable**, not just two — the national layer is now the main view.
   Makassar and Kupang keep a distinct marker as deep-tier cases.
2. **The national map shows the two-series comparison**, not a raw incident count. Default view
   should encode media-vs-administrative divergence, with raw counts available but labelled
   "reported incidents".
3. The regime-timeline chart stays, but scoped to the Makassar/Kupang panel where it belongs.

## Non-negotiables

- Publishing under **EPPOS GROUP DPP UGM**. Incidents are presented as *reported*, with source
  links, never as adjudicated findings. Versioned methodology page and a correction mechanism.
- Two-source rule as above. Only `dua sumber` rows publish.
- Never fabricate values against a real named entity. In fixtures, real outlets carry only
  publicly-true facts; invented numbers attach to `.example` domains.
- Info A1 stores the source's role, never their name, and never feeds any index or map.
- Personal scandal (affairs, private misconduct) is out of scope.
- The search procedure must be documented and reproducible — keyword lists, sources queried,
  date of search. We claim a census of *incidents findable by a stated procedure*, never
  completeness.

## Build order

1. Ingestion + validation script for `insiden` (rules above), run against whatever rows exist.
2. `hari_ke_pemungutan` computation, which needs a table of penetapan and voting dates per wave
   per region — build that first as reference data.
3. Fixture data + frontend, in parallel with collection.
4. The two-series comparison view. This is the analytical core; get it right before anything
   decorative.

## Open

Weekly hours and deadline still not fixed. Budget and regulatory layers remain city-specific
(Makassar, Kupang) — they attach to the deep-tier subset only.

## How I will work with you

I will paste new rows from Inan and Ravy as they arrive, usually as spreadsheet extracts.
Validate against this schema before ingesting — reject rows missing a source URL rather than
repairing them, and tell me which rows and why.
