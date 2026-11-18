New track from Odri (call with Mas Arya, 18 Nov 2026). Read ~/eppos-intel/AGENTS.md and bot/posisi.md first; all their rules still hold.

# Goal
EPPOS will show two maps that are later triangulated:
- PETA ELIT (ours): how the 2027 elite map is forming, read from the 2026 trajectory.
- PETA PUBLIK (Nofri's team: voter preference and satisfaction): not your job. Just keep the same actor names and regions so the two maps can be joined later.
The presidential nomination threshold is now 0%, so the field is open. Prabowo is treated as running again; the vice-presidential slot is open. The core question: which elites back whom, who they want to pair with, on which issues, and who is clashing with Prabowo.

# What to build: a new "pencalonan 2029" track
Keep it separate from the threshold position map: new file data/peta_elit.json. Don't touch the closed lists in data/posisi_skema.json.
One row = one public statement or reported act:
- aktor, lembaga/partai, tanggal
- jenis: "dukung capres" | "dukung cawapres" | "pasangkan" | "tolak/berbenturan" | "isu"
- sasaran (the person backed, paired or opposed)
- isu (optional; the issue they attach to it)
- kutipan (verbatim, 3–40 words)
- sumber_url, outlet
- status: "otomatis" | "dicek tim"
Same rule as before: no verbatim quote, no row. Never infer a candidacy the source doesn't state.

# Who to watch first
Prabowo's camp and coalition parties on 2029 and the vice-presidential slot; AHY / Demokrat; Cak Imin / PKB; Jokowi and Dedi Mulyadi (KDM); PDIP and Pramono Anung; NasDem, PKS, PAN, Golkar; non-parliamentary parties. Note which parties have said nothing yet; silence is data too.

# Sources
Mainstream news plus non-mainstream sources the team asked for: party websites, the official YouTube channels of parties and figures, regional outlets, and verified public accounts of the figures themselves. Read only. Never sign in, post or comment. Start from 1 Jan 2026.

# The hard part: "bahasa elit"
Elites signal without saying it (e.g. AHY never says he is running, but his speeches about power read like positioning). Handle it in two layers:
1. FACT layer (the rows above): only what is said. This is what goes live.
2. INTERPRETATION layer: DON'T fill or publish it. Instead, draft a codebook in riset/peta-elit-kodebuku.md with Arya's orbit types:
   (a) strongly pro-incumbent; (b) seeking an alternative route for themselves (AHY, Cak Imin); (c) seeking an alternative through someone else (Jokowi × KDM); (d) PDIP / Pramono; (e) not yet visible.
   For each type, list the observable signals that would put an actor there, with 1–2 example quotes from your rows. Odri and the team decide later who codes this and how.
   You must not classify actors into orbits yourself.

# Deliverables, in order
1. riset/peta-elit.md: source list, search terms used, and what you found per actor (with links).
2. data/peta_elit.json with the first rows, and a check script modelled on scripts/cek_posisi.py.
3. riset/peta-elit-kodebuku.md (draft codebook, above).
4. A section on the RUU Pemilu page or a new #/peta-elit page: actor → sasaran links over time. Ask EPPOS Desain for the layout. Test with scripts/terbitkan.sh "bot-posisi: ..." --coba, then publish for real (see Publish below) and send Odri screenshots afterwards.
5. Report: rows by actor and type, sources, gaps (silent parties), and questions for Arya.

# Also note for Odri (don't act)
Arya's team is weighing a paid media-monitoring vendor (questions: limited or unlimited mentions, which platforms, contract length, price). Write down what our free crawler can and can't cover (it is news-only; there is no social media), so the team can judge whether a vendor is worth it.

# Publish and Git (AGENTS.md §0, updated 18 Nov; re-read it)
- Once checks pass (cek script, then --coba), publish with scripts/terbitkan.sh "bot-posisi: <what changed>". No need to wait for my review first.
- Then git add only your files (plus TERBIT.md), commit, and git push origin main. If rejected: git pull --rebase once, retry. Never force-push.
- The fact layer (quoted rows) goes live. The interpretation layer (orbit coding) stays an unpublished draft until I decide.
