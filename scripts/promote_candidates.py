#!/usr/bin/env python3
"""Turn the retrieval queue into a mappable layer, without inventing anything.

Odri authorised auto-inclusion "within our parameters". The parameters are PROJECT-SPEC v2, so this
derives only what a headline plus its metadata can actually support, and leaves everything else blank:

  derived      url, outlet domain, real headline (judul_status = terverifikasi, fetched from the outlet's
               own API), publication date, mechanism (from the typology bucket its query belongs to),
               kab/kota + province (only when a gazetteer name appears literally in the headline)
  NOT derived  tanggal kejadian (a publication date is not an event date), pelaku_jabatan, pelaku_nama,
               sasaran_jenis, ringkasan, hasil — these stay blank rather than guessed

  status_verifikasi is computed, not asserted: two or more DIFFERENT outlet domains reporting the same
  place + mechanism within 7 days counts as `dua sumber`; a lone report is `satu sumber`.

Output `data/insiden_otomatis.json` is a SEPARATE layer. The hand-curated census in `insiden.json` is
untouched, so the two never blur together on the map or in the dataset release.

Usage: python3 scripts/promote_candidates.py
"""
from __future__ import annotations
import datetime as dt, json, re, unicodedata, urllib.parse
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
LON_MIN, LON_MAX, LAT_MIN, LAT_MAX = 95.195138, 141.0009, -10.91942, 5.877151
S = 1000 / (LON_MAX - LON_MIN); OY = (420 - (LAT_MAX - LAT_MIN) * S) / 2
def project(lon, lat): return ((lon - LON_MIN) * S, 420 - ((lat - LAT_MIN) * S + OY))


# A headline must carry electoral context to count. Actor + action alone let through a COVID case
# count, a kades embezzlement, and an affair — the last explicitly out of scope in PROJECT-SPEC v2.
PEMILU = re.compile(r"(pilkada|pemilukada|pemilu|pilpres|pileg|\bcaleg\b|nyaleg|\bcapres\b|cawapres|(?:tak|tidak) netral|"
    r"politik praktis|intimidasi politik|balas dendam politik|beda pilihan|"
    # the race named through its candidates: "ancam stafnya pilih bupati", "mobilisasi ASN dukung istrinya",
    # a presidential ticket, or the Constitutional Court dispute that follows a regional vote
    r"\bpilih (?:bupati|gubernur|wali ?kota|walikota|calon|paslon|caleg|capres)|"
    r"dukung (?:istri|anak|suami|adik|kakak)(?:nya)?\b|pendukung (?:anak|istri)(?:nya)?\b|"
    r"prabowo-gibran|ganjar-mahfud|anies-muhaimin|dukung (?:prabowo|ganjar|anies|jokowi)|ke jokowi|"
    r"relawan (?:anies|prabowo|ganjar|jokowi|capres|paslon)|\bphpu\b|\bphp (?:bupati|gubernur|wali)|pilgub|pilbup|pilwal|paslon|pasangan calon|calon (bupati|"
    r"wali ?kota|gubernur|wakil)|cabup|cawabup|cagub|cawagub|bakal calon|bawaslu|panwaslu|gakkumdu|\bkpu\b|"
    r"netralitas|kampanye|coblos|pemungutan suara|pencoblosan|tps\b|dkpp|\bkasn\b|masa tenang|"
    r"tahapan pemilihan|pemilihan (kepala daerah|bupati|wali ?kota|gubernur)|"
    # re-votes ordered by the Constitutional Court (several Papua regencies and the Papua governor race
    # in 2025) are written as PSU, often with no other electoral word in the headline
    r"\bpsu\b|pemungutan suara ulang|pilkada ulang|"
    # an incumbent is by definition a candidate in a race; the word alone places the story in an election
    r"petahana|inkumben)", re.I)
# out of scope by the spec: personal scandal, ordinary crime, health/disaster reporting
LUAR_LINGKUP = re.compile(r"(selingkuh|perselingkuhan|asusila|mesum|zina|pelecehan|narkoba|\bsabu\b|"
    r"kecelakaan|laka lantas|kebakaran|karhutla|banjir|gempa|longsor|pencurian|begal|judi|"
    r"penggelapan|pungli|korupsi|mabuk|perkosa|cabul|"
    # ordinary crime that the mechanism words alone would otherwise let back in
    r"penipuan|ditipu|menipu|aniaya|penganiayaan|pencemaran nama baik|"
    r"jual beli tanah|sengketa lahan|pembunuhan|curanmor|tawuran|bacok|istri kedua|"
    r"\bnapi\b|\blapas\b|tanpa busana|bugil|\bsyur\b|ppdb|"
    # military and police postings are not the civilian executive the typology is about
    r"mutasi (?:tni|polri|perwira)|kepala bin|"
    r"gelapkan|menggelapkan|digelapkan|lecehkan|melecehkan|dilecehkan|protokol kesehatan|\bprokes\b|"
    # campaign-finance reporting, police postings, workplace bullying: real news, not executive coercion
    r"\blpsdk\b|\blppdk\b|\blpsdk\b|dana kampanye|penjabat kepolisian|\bkapolres\b|\bkapolsek\b|bullying|perundungan|"
    r"\bskt\b|surat keterangan tanah|lahan ptpn|sertifikat tanah|"
    # personal life and disasters that a village-head headline drags in
    r"nikah lagi|hubungan gelap|digerebek|aborsi|\bmayat\b|megathrust|tsunami|"
    # KPK stings, wealth declarations, office-selling and pandemic rules are their own beats
    r"\bott\b|fee proyek|\blhkpn\b|calo jabatan|(?:kenakan|pakai|memakai|penggunaan) masker|"
    r"kekerasan seksual|korban kekerasan|\bjudol\b|jenazah|tak senonoh|nikah siri|\btampar|menampar|payudara|raba dada|"
    r"over ?dosis|dugem|gizi buruk|stunting|dilaporkan hilang|\bbencana\b|gratifikasi|utang kampanye|mutasi penduduk|pindah domisili|"
    r"gar itb|gadai|\btewas\b|\btebas\b|\btikam\b|disuntik mati|terbakar|ijazah palsu|kekasih gelap|pembuangan bayi)", re.I)
# A reminder or an explainer is about the topic but is not an incident. Refused only when the headline
# also carries no word of something having happened to someone.
KOMENTAR = re.compile(r"(\bingatkan\b|mengingatkan|\bimbau|mengimbau|himbau|jenis pelanggaran dan sanksi|"
    r"aturan .{0,30}netral|ikrar netralitas|deklarasi netralitas|haramkan politik praktis|"
    r"isu krusial|nota kesepahaman|teken mou|"
    # statements and warnings: a conditional, an official "stressing" a rule, or a report that nothing
    # has been reported. Still admitted when the headline also says something happened.
    r"\btegaskan\b|menegaskan|\bjika\b|\bbila\b|apabila|belum ada laporan|tidak ada laporan|belum (?:terima|menerima) laporan|"
    r"\bberpotensi\b|\bm[ae]nanti\b|\bdilarang\b|waspadai|peringatkan|jaga netralitas|\bkoordinasi\b|\bdorong\b|kerawanan|diingatkan|"
    r"sanksi (?:berat |tegas )?bagi|bisa dipecat|terancam dipecat|adalah pemecatan|"
    r"apel siaga|apel kesiapan|deklarasi damai|\brawan\b|\bpotensi\b|\bawasi\b)", re.I)
# explainer formulas that are never a report of an act, whatever verb they contain
PENJELAS = re.compile(r"(sanksi menanti|ini sanksinya|berikut sanksi|jenis pelanggaran dan sanksi|aturan .{0,20}di pemilu:|"
    r"tidak boleh mutasi|tak boleh mutasi|bisa didiskualifikasi|bisa berujung|mulai \d+ januari|berlaku \d+ januari|"
    # "nothing was found" is not an incident either
    r"tidak temukan|tak temukan|tidak menemukan|"
    # rules, bans and what the law allows: a ministry or Bawaslu stating them is not an act
    r"\blarang\b|melarang|ingatkan larangan|ingatkan petahana|ingatkan kepala daerah|bisa dipenjara|bisa dipidana|"
    r"berpotensi dipidana|akan dipidana|dapat didiskualifikasi|bisa diuji|syarat kepala daerah|bolehkan|"
    r"(?:terbitkan|keluarkan) surat edaran|surat edaran (?:larang|penundaan|mendagri|menpan)|"
    r"cara lapor|diminta melapor|minta masyarakat lapor|masyarakat laporkan|tindak tegas asn|dikhawatirkan|"
    r"^[^,:]{0,40}jadi atensi|hati-hati|terkendala regulasi|termasuk politisasi|(?:tidak netral|netralitas) jika|\bruu\b|"
    r"bakal dibekukan|akan dikenakan sanksi|siap-siap nonjob|disanksi pemberhentian|bisa dipecat|sebagian kasus|"
    r"dapat (?:me)?ngakibatkan|dapat akibatkan|tekankan sanksi|perlukah|\bzero\b|\bnihil\b|"
    r"ini sanksi|dampak jika|\bfaktor|\bpenyebab\b(?!nya)|diprediksi|\bprediksi\b|\baplikasi\b|\bsbt\b|pencegahan|"
    r"sistem merit lindungi|merit system dalam|kerap hantui|hantui (?:pemilu|pilkada)|minta laporkan|silaturahmi ke|ini ancaman|ancaman (?:pidana|sanksi) bagi|dituntut netral|cuti di ?luar tanggungan|"
    r"\d+ ?% pelanggar|terbanyak|mayoritas|paling (?:sering|banyak)|banyak melanggar|turun signifikan|"
    r"\bmeningkat\b|kali lipat|tidak ada (?:intimidasi|laporan|pelanggaran|temuan)|belum ada temuan|tekankan ancaman|"
    r"berharap tidak|stop politisasi|ancam pidanakan|"
    r"cuti kampanye|janji kampanye|kampanye damai|(?:di|saat|hadiri|pengamanan|hari terakhir) kampanye akbar|tepati janji|tagih janji|ditagih janji|pengamanan kampanye|"
    r"larangan dan sanksi|larangan pose|inilah sanksi|inilah aktivitas|harus tahu|sanksi dan aturannya|ini aturannya|"
    r"ada sanksi bagi|ada syaratnya|boleh (?:ikut|hadiri) kampanye|\bawas!|instruksi presiden|teken pp|\bpp baru\b|"
    r"siap tindak (?!lanjut)|bakal sanksi|jangan ajak|syarat mutasi|apakah bisa|\bcuti\b[^,]{0,25}kampanye|paling tidak netral|^[\d.]{3,} (?:asn|pns|kades|laporan|kasus)|"
    r"(?:terima rekomendasi|rekomendasikan) (?:dari )?(?:partai|dpp|nasdem|golkar|pdip|pdi-p|gerindra|pkb|demokrat|pks|\bpan\b|ppp|hanura|perindo|psi)|"
    r"(?:golkar|nasdem|pdip|pdi-p|gerindra|pkb|demokrat|pks|ppp|hanura|perindo|psi) rekomendasikan|\bkukuhkan\b|\burung\b|"
    r"rekomendasi (?:partai|parpol|dpp|pasangan calon)|(?:dpp|partai) \w+ rekomendasi|surat rekomendasi kepada|tolak rekomendasi|"
    r"(?:pdip|pdi-p|golkar|nasdem|gerindra|pkb|pks|\bpan\b|ppp|demokrat|psi|perindo|hanura|gelora) rekomendasi|"
    # the other sense of "kampanye": a public-health or cycling campaign, or a campaign's paperwork
    r"kampanye (?:gerakan|\")|luncurkan kampanye|kampanyekan (?:bike|gerakan|penggunaan)|"
    r"laporan (?:penggunaan |pertanggungjawaban |sisa )?dana hibah|hibah gedung|"
    r"\bboleh (?:ikut |hadiri |gunakan |berkampanye|kampanye)|tidak boleh (?:untuk|digunakan)|tidak ada pencairan|"
    r"diminta kampanye|jangan dijadikan|masa kampanye selesai|tolak gunakan|siap kampanye|izin cuti|ajukan cuti|"
    r"harus cuti|wajib cuti|fasilitas[^,]{0,40}dicabut selama|janjikampanye|tidak hadiri debat|jangan muncul pas kampanye|"
    r"kampanye[”\"] |kampanye publik|kampanye terbatas|laporan kampanye|bisa jadi temuan|bisa diberhentikan|cuti saja|ajak paslon|"
    r"ungkap \d+ alasan|\d+ bentuk politisasi|contoh pelanggaran|tidak diperkenankan|sangat banyak|lebih banyak|masih temukan|"
    r"pak lurah|hafalkan|disetop sementara|(?:bupati|wali ?kota|walikota|gubernur)\s+\w+\s+cuti\b|"
    r"ingatkan[^,]{0,40}(?:tentang|soal) mutasi|isu utama|pengamat politik soroti indikasi|^profil\b|^video: eksklusif|rancang sistem|bakal tindak tegas|\bkian\b|"
    r"bisa terkena|(?:meminta|minta) semua pihak|ada sanksi tegas|pecat atau turun pangkat|boleh terlibat|tak gentar|"
    r"terancam dibekukan|tekankan netralitas|terancam tak naik|^sebanyak [\d.]+|^(?:ratusan|ribuan) asn|ultimatum pns|satgas bidik|"
    r"pastikan ganti|\bakan bongkar|bisa diancam|\bwarning\b[^,]{0,40}soal sanksi|"
    r"boleh hadir|ini larangan|larangan gaya|awasi larangan|larangan hingga sanksi|awas sanksi|siap sanksi|"
    r"aturan dan batasan|perlu catat|pantang lakukan|daftar pose|jenis pose|pose foto asn yang dilarang|ancaman bawaslu|"
    r"rekomendasi (?:pdip|pdi-p|golkar|nasdem|gerindra|pkb|pks|\bpan\b|ppp|demokrat|psi|perindo|hanura|gelora)|"
    r"^mendagri[^,]*total ada \d|minta (?:dugaan )?pelanggaran[^,]{0,20}ditindak|\bakan dicopot\b|"
    r"bentuk tim (?:untuk|khusus)|penertiban (?:aps|apk|alat peraga|baliho)|"
    r"terkait larangan|soroti marak|jelaskan kewenangan|"
    r"mulai \d+ (?:januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)|"
    r"(?:minta|diminta|meminta)[^,]{0,40}(?:tak|tidak|jangan) (?:lakukan |melakukan )?(?:mutasi|politisasi|terlibat|libatkan|gunakan)|"
    r"penundaan (?:sementara )?(?:distribusi|mutasi)|tegaskan tak mutasi|puncak gunung es|"
    r"\bancam\b[^,]{0,25}(?:tak|tidak) netral|"
    # national tallies: a count of reports is not itself an incident, and its parts are counted where they happened
    r"^(?:mendagri|kemendagri|bawaslu ri|perludem|kasn|bkn)\b[^,]{0,40}(?:(?<!\d)(?!(?:19|20)\d\d(?!\d))\d{3,}|\d{1,3}\.\d{3}|ratusan|ribuan)\b|"
    r"(?:terima|ungkap|temukan|catat|ada|tindaklanjuti|tangani) (?:ada )?(?:lebih dari )?(?:\d{2,}|\d{1,3}\.\d{3})[\d.]* (?:laporan|dugaan|kasus|perkara|pelanggaran|usulan|aduan)|"
    r"usulan mutasi [\d.]+|masih masif)", re.I)
# Police, prosecutors, the military and the religious-affairs ministry rotate their own officers on their own
# calendar; a reshuffle there is not the regional executive the typology is about.
APARAT_PUSAT = re.compile(r"(\bpolres\b|\bpolresta\b|\bpolda\b|polrestabes|\bpolri\b|kapolri|kapolda|kepolisian|propam|kejari|kejati|kejaksaan|"
                          r"jaksa agung|kejagung|imigrasi|kemenag|\btni\b)", re.I)
MUTASI_KATA = re.compile(r"(mutasi|dimutasi|dirotasi|rotasi|dicopot|pindah ?tugas|dipindahtugaskan)", re.I)
# "jika melanggar", "agar tak melanggar", "yang sering langgar": a violation that is threatened or
# hypothetical, which is exactly what a reminder talks about; removed before looking for an act
BERSYARAT = re.compile(r"(?:jika|bila|apabila|kalau|agar (?:tak|tidak)|supaya (?:tak|tidak)|jangan|tidak boleh|"
                       r"tak boleh|dilarang|yang(?: sering)?|tak|tidak)\s+(?:\w+\s+){0,2}?"
                       r"(?:me)?(?:langgar|mutasi|lantik|copot|nonjob)\w*", re.I)
# a village-head election is not a pilkada; refused unless the headline also names the regional race
PILKADES = re.compile(r"(pilkades|cakades|calon kepala desa|calon kades|pemilihan kepala desa|pemilihan rt|pilpanag|"
                      r"pemilihan pangulu|pemilihan wali nagari|pemilihan lurah|kampanye lurah desa|\bpilur\b|paslon lurah|calon lurah|"
                      r"calon (?:ketua )?rt\b|calon kepling|jabatan kepling|kades terpilih|paw kades)", re.I)
PILKADA_KATA = re.compile(r"(pilkada|pilbup|pilwal|pilgub|paslon|cabup|cagub|calon bupati|calon wali)", re.I)
TERJADI = re.compile(r"(dilaporkan|melaporkan|laporkan|diperiksa|dipanggil|terbukti|disanksi|dijatuhi|"
    # the verb, not the noun: "ASN langgar netralitas" reports an act, "cegah pelanggaran" does not
    r"\blanggar\b|melanggar|sesalkan|menyesalkan|terindikasi|terima laporan|menerima laporan|"
    # the executive's own acts, which are the mechanism itself even inside a quoted warning
    r"\blantik\b|melantik|memutasi|\bmutasi\b|rotasi|mencopot|non-?job|"
    r"dicopot|dimutasi|diberhentikan|ditegur|teguran|direkomendasikan|ditetapkan|diduga|dugaan)", re.I)


# Mechanism signatures from the closed typology. Inside a pilkada window these are plausibly electoral
# even when the headline never says "pilkada" — a mass transfer of officials weeks before a vote is the
# mechanism itself. Outside such a window the same words are just ordinary administration.
MEKANISME_SIG = re.compile(r"(mutasi|rotasi jabatan|dimutasi|digeser|dicopot|demosi|non-?job|lelang jabatan|"
    # word boundaries matter: "camat" sits inside every "kecamatan" and "lurah" inside every "kelurahan",
    # which let any story about a sub-district office through during a pilkada window
    r"kepala desa|\bkades\b|\blurah\b|perangkat desa|apdesi|paguyuban kades|\bASN\b|\bPNS\b|pegawai negeri|"
    # Papua's names for the same offices: without them a Papuan village-head story never matched
    r"kepala kampung|\bkakam\b|aparat kampung|kepala distrik|kadistrik|"
    # and elsewhere: Aceh keuchik/geuchik, Sumatera Barat wali nagari, Lampung kepala pekon/peratin,
    # Bali perbekel, Toraja kepala lembang
    r"keuchik|geuchik|wali nagari|kepala nagari|kepala pekon|peratin|perbekel|kepala lembang|hukum tua|kumtua|"
    r"honorer|\bPPPK\b|aparatur sipil|\bcamat\b|bansos|bantuan sosial|sembako|\bPKH\b|"
    r"intimidasi|diancam|ancaman|ditekan|dipaksa|dimobilisasi|dikumpulkan|ketua rt|\brt/rw\b|\brt dan rw\b|\brt-rw\b)", re.I)
JENDELA_PILKADA = {"2024", "2020", "2018", "2017", "2015"}
# Village-fund disputes (a kades cutting cash aid, an APBDes audit) carry the office words of the
# typology but are administration or graft, not an election. They stand on the weaker path only;
# a headline that also names the race still gets in on the first path.
DANA_DESA = re.compile(r"(dana desa|alokasi dana desa|\bapbdes\b|\bBLT[ -]?DD\b|pemangkasan blt|"
    r"potong(?:an)? blt|pemotongan blt|blt dipotong)", re.I)
# The same holds for graft, ordinary disputes and village staffing: an office word plus "dilaporkan"
# inside a pilkada window is not enough when the headline names what the report was about.
BUKAN_PEMILIHAN = re.compile(r"(gratifikasi|\bsuap\b|\bkpk\b|raskin|\blpj\b|fiktif|kerugian negara|selewengkan|"
    r"penyelewengan|penyimpangan|manipulasi dana|sunat dana|\bupeti\b|pemotongan (?:tkp|bst|dana)|block gran|"
    r"dana talangan|\bpades\b|bumdes|proyek komputer|komputer sid|ilegal|developer|serobot|ijazah palsu|"
    r"\bcuri\b|mencuri|\btipu\b|ujaran kebencian|keroyok|pengeroyokan|penyeroyokan|\bptsl\b|seleksi pppk|"
    r"pengisian perangkat desa|mutasi perdes|seleksi mutasi|uji kompetensi|ke ki\b|\bbst\b|bprs|khilafah|"
    r"aksi [24]12|\bhina\b|menghina|awak media|personel perwira|\bproyek\b|uang honor|mobil dinas|\bthr\b|parcel|"
    r"\bperades\b|pengisian perangkat|disuap|supriyani|somasi|pelantikan kades|cantik|akan disanksi|jarang .{0,3}ngantor|"
    r"aset lahan|kasus aset|\bcadar\b|\bperas\b|pemerasan|\bvonis\b|divonis|penjara|dibui|covid|corona|fitnah|difitnah|"
    r"ancaman serius|janji netral|antisipasi)", re.I)
# Warnings and promises about what would happen to an official who took sides report no act, whether
# or not the headline names the race, so these are refused on both paths.
PERINGATAN = re.compile(r"(bisa kena|bisa di ?sanksi|\bintai\b|wanti-wanti|ada sanksinya|siap beri sanksi|"
    r"\byang\b[^,]{0,40}akan diberi(?:kan)? sanksi|(?:tidak|tak) boleh (?:lagi )?(?:melakukan )?mutasi|siap-siap (?:kena|dapat|di ?sanksi|ditindak|dijerat|dipecat)|(?:asn|pns|kades)\b[^,]{0,40}(?:siap-siap|bakal) (?:kena|di ?sanksi)|"
    r"sanksi berat!|konsekuensinya|peringatan terbaru|jangan mau|\bancam (?:akan )?(?:berikan |beri )?sanksi|"
    r"sebut akan sanksi|diberikan sanksi tegas|sanksi (?:\w+ )?menanti|siap terima sanksi|tak segan|"
    r"akan diberikan (?:surat )?teguran)", re.I)


# Someone holding or wielding executive office. "Calon bupati" is a candidate, not yet an executive,
# so candidate phrases are removed before looking.
AKTOR_EKSEKUTIF = re.compile(r"(bupati|wali ?kota|walikota|\bwako\b|gubernur|\bcamat\b|\blurah\b|kepala desa|\bkades\b|"
    r"sekda|\basn\b|\bpns\b|\bpj\b|\bpjs\b|penjabat|petahana|inkumben|incumbent|perangkat desa|honorer|pppk|"
    r"kepala dinas|\bkadis|pegawai|kepala kampung|\bkakam\b|distrik|keuchik|geuchik|nagari|pekon|peratin|perbekel|"
    r"lembang|hukum tua|kumtua|pemkab|pemkot|pemprov|pemda|aparat|pejabat|birokra|dinas|\bopd\b|\bplt\b|kepsek|"
    r"kepala sekolah|guru|\brt\b|\brw\b|dukuh|sangadi|kepala daerah|\bbpd\b|apdesi|satpol|tenaga kontrak|\bptt\b|"
    r"\bthl\b|sekdes|kadus|kepala dusun|kepala lingkungan|kepling|kapus|puskesmas|menteri|\bmendes\b|mendagri|"
    # a report to the civil-service commission is a report about a civil servant; "kepala DKRTH",
    # "kepala dispenduk": an agency head named by the agency's acronym
    r"\bkasn\b|komisi asn|demosi|\bkepala d(?!esa)[a-z]{2,}|\bsekjen\b|sekretaris jenderal|"
    # the resources an incumbent commands are the mechanism even when only the candidate is named
    r"fasilitas negara|\bpip\b|bansos|bantuan sosial|\bpkh\b|sembako|\banggaran\b|\bapbd\b)", re.I)
CALON_FRASA = re.compile(r"(?:bakal calon|bacalon|balon|bapaslon|paslon|calon|cabup|cagub|cawalkot|cawali|mantan|eks)\s+(?:wakil\s+)?"
                         r"(?:bupati|wali ?kota|walikota|gubernur|kepala daerah)"
                         r"(?:\s+(?:dan|&)\s+wakil\s+(?:bupati|wali ?kota|walikota|gubernur))?", re.I)


# user-blog platforms: a citizen's essay is not a news report of an incident
BUKAN_BERITA = {"kompasiana.com"}


def dalam_lingkup(judul, gelombang=None):
    """(ok, reason, basis). Scope is electoral coercion by executives, not every official in the news.

    Two ways in, recorded separately so the weaker basis stays visible:
      1. the headline itself carries electoral context — strongest
      2. a typology mechanism appears inside a pilkada window — weaker, flagged as such
    Out-of-scope topics (personal scandal, ordinary crime, disaster) are refused on either path."""
    if LUAR_LINGKUP.search(judul):
        return False, "topik di luar lingkup (skandal pribadi / kriminal umum / bencana)", None
    if PILKADES.search(judul) and not PILKADA_KATA.search(PILKADES.sub(" ", judul)):
        return False, "pemilihan kepala desa, bukan pilkada", None
    if APARAT_PUSAT.search(judul) and MUTASI_KATA.search(judul):
        return False, "rotasi di kepolisian, kejaksaan, TNI atau Kemenag, bukan eksekutif daerah", None
    if PENJELAS.search(judul) or PERINGATAN.search(judul):
        return False, "penjelasan aturan, bukan peristiwa", None
    if KOMENTAR.search(judul) and not TERJADI.search(BERSYARAT.sub(" ", judul)):
        return False, "imbauan atau penjelasan aturan, bukan peristiwa", None
    if not AKTOR_EKSEKUTIF.search(CALON_FRASA.sub(" ", judul)):
        return False, "hanya calon yang disebut, bukan pemegang jabatan eksekutif", None
    if PEMILU.search(judul):
        return True, None, "konteks elektoral di judul"
    if gelombang in JENDELA_PILKADA and MEKANISME_SIG.search(judul):
        if DANA_DESA.search(judul):
            return False, "urusan dana desa tanpa konteks elektoral di judul", None
        if BUKAN_PEMILIHAN.search(judul):
            return False, "perkara non-pemilihan atau peringatan, tanpa konteks elektoral di judul", None
        return True, None, "mekanisme tipologi di dalam jendela pilkada"
    return False, "tidak ada konteks elektoral, dan bukan mekanisme tipologi di jendela pilkada", None


STOP_JUDUL = {"di","ke","dari","yang","untuk","dengan","pada","dan","atau","ini","itu","akan","sudah",
              "telah","dalam","oleh","atas","se","para","tak","tidak","juga","usai","jadi","soal"}


def shingles(text, k=2):
    """Content words plus adjacent pairs. Headlines are short, so 4-grams were far too brittle —
    one inserted word halved the score, which is exactly how outlets retitle a press release."""
    w = [x for x in re.findall(r"\w+", (text or "").lower()) if x not in STOP_JUDUL and len(x) > 2]
    grams = {" ".join(w[i:i + k]) for i in range(max(0, len(w) - k + 1))}
    return set(w) | grams or {(text or "").lower()}


def jaccard(a, b):
    u = a | b
    return len(a & b) / len(u) if u else 0.0


def norm(s):
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode().lower()
    return re.sub(r"\s+", " ", s).strip()


def rings(d):
    out = []
    for chunk in d.split("M")[1:]:
        pts = [tuple(map(float, m.groups())) for m in re.finditer(r"(-?\d+\.?\d*)[ ,](-?\d+\.?\d*)", chunk)]
        if len(pts) >= 3: out.append(pts)
    return out


def inside(rs, x, y):
    c = False
    for ring in rs:
        n = len(ring)
        for i in range(n):
            x1, y1 = ring[i]; x2, y2 = ring[(i + 1) % n]
            if (y1 > y) != (y2 > y):
                if x < x1 + (y - y1) / (y2 - y1) * (x2 - x1): c = not c
    return c


# Home province of each outlet in the registry. Used ONLY as a province-level fallback when the headline
# names no kab/kota, and always flagged `lokasi_dasar = "wilayah edar outlet"` so it is never mistaken for
# a located incident. National outlets are deliberately absent: they have no home region to fall back on.
OUTLET_PROV = {
    "sulselsatu.com": "Sulawesi Selatan", "gosulsel.com": "Sulawesi Selatan", "fajar.co.id": "Sulawesi Selatan",
    "gopos.id": "Sulawesi Selatan", "beritajatim.com": "Jawa Timur", "suarasurabaya.net": "Jawa Timur",
    "radarbanten.co.id": "Banten", "bantennews.co.id": "Banten", "kabarbanten.com": "Banten",
    "radarbekasi.id": "Jawa Barat", "radarkarawang.id": "Jawa Barat", "balipost.com": "Bali",
    "floresa.co": "Nusa Tenggara Timur", "timexkupang.com": "Nusa Tenggara Timur",
    "langgam.id": "Sumatera Barat", "padangkita.com": "Sumatera Barat", "ulasan.co": "Kepulauan Riau",
    "beritamanado.com": "Sulawesi Utara", "sultengraya.com": "Sulawesi Tengah",
    "sultrakini.com": "Sulawesi Tenggara", "kalselpos.com": "Kalimantan Selatan",
    "niaga.asia": "Kalimantan Timur", "malutpost.id": "Maluku Utara",
    # added 6 Oct 2026 after reading each outlet's own recent headlines; only outlets whose coverage is
    # plainly one province. Cenderawasih Pos, Suara Papua, Teropong News and Odiyaiwuu cover several
    # Papua provinces at once, so they stay out: their stories are placed by the kab/kota they name.
    "papuakini.co": "Papua Barat", "balleonews.com": "Papua Barat Daya",
    "babelreview.co.id": "Kepulauan Bangka Belitung", "bangkaterkini.id": "Kepulauan Bangka Belitung",
    "hariankepri.com": "Kepulauan Riau", "batampos.co.id": "Kepulauan Riau",
    "kepri.batampos.co.id": "Kepulauan Riau", "news.batampos.co.id": "Kepulauan Riau",
    "metro.batampos.co.id": "Kepulauan Riau", "metropolis.batampos.co.id": "Kepulauan Riau",
    "halmaherapost.com": "Maluku Utara", "halosultra.com": "Sulawesi Tenggara",
    "banggainews.com": "Sulawesi Tengah", "harianmuria.com": "Jawa Tengah", "bacajogja.id": "Yogyakarta",
    # island-wide outlets: Halmahera and Madura each span several regencies, so the home is the province
    "halmaheraraya.id": "Maluku Utara", "koranmadura.com": "Jawa Timur", "madurazone.com": "Jawa Timur",
    "portalmadura.com": "Jawa Timur",
}


# Local shorthand and city names that are not themselves kab/kota entries in the gazetteer.
# Each maps to the kab/kota it belongs to, so a headline saying "Bawaslu Kotim" still places.
ALIAS_TEMPAT = {
    "kotim": "Kotawaringin Timur", "sampit": "Kotawaringin Timur", "kobar": "Kotawaringin Barat",
    "pangkalanbun": "Kotawaringin Barat", "luwuk": "Banggai", "kotabaru": "Kota Baru",
    "bumiaji": "Kota Batu", "batu": "Kota Batu",
    "inhu": "Indragiri Hulu", "inhil": "Indragiri Hilir", "pekanbaru": "Kota Pekanbaru",
    "tanjungpinang": "Kota Tanjung Pinang", "batam": "Kota Batam", "lingga": "Lingga",
    "ternate": "Kota Ternate", "sofifi": "Tidore Kepulauan",
    "banjarbaru": "Kota Banjar Baru", "martapura": "Banjar", "kendari": "Kota Kendari",
    "baubau": "Kota Bau-Bau", "palu": "Kota Palu", "gorontalo": "Kota Gorontalo",
    "jayapura": "Kota Jayapura", "sorong": "Kota Sorong", "ambon": "Kota Ambon",
    "kupang": "Kota Kupang", "mataram": "Kota Mataram", "denpasar": "Kota Denpasar",
    "makassar": "Kota Makassar", "parepare": "Kota Pare-Pare", "manado": "Kota Manado",
    "bitung": "Kota Bitung", "tomohon": "Kota Tomohon", "minut": "Minahasa Utara",
    "mitra": "Minahasa Tenggara", "bolmong": "Bolaang Mongondow", "jember": "Jember",
    "gresik": "Gresik", "sidoarjo": "Sidoarjo", "bogor": "Kota Bogor", "depok": "Kota Depok",
    "bekasi": "Kota Bekasi", "karawang": "Karawang", "cirebon": "Kota Cirebon",
    "tasikmalaya": "Kota Tasikmalaya", "sukabumi": "Kota Sukabumi", "garut": "Garut",
    "semarang": "Kota Semarang", "solo": "Kota Surakarta", "surakarta": "Kota Surakarta",
    "jogja": "Kota Yogyakarta", "yogya": "Kota Yogyakarta", "magelang": "Kota Magelang",
    "salatiga": "Kota Salatiga", "kudus": "Kudus", "jambi": "Kota Jambi",
    "palembang": "Kota Palembang", "lampung": "Kota Bandar Lampung", "medan": "Kota Medan",
    "padang": "Kota Padang", "bengkulu": "Kota Bengkulu", "pontianak": "Kota Pontianak",
    "samarinda": "Kota Samarinda", "balikpapan": "Kota Balikpapan", "banjarmasin": "Kota Banjarmasin",
    "surabaya": "Kota Surabaya", "malang": "Kota Malang", "kediri": "Kota Kediri",
    "madiun": "Kota Madiun", "pasuruan": "Kota Pasuruan", "probolinggo": "Kota Probolinggo",
    "mojokerto": "Kota Mojokerto", "blitar": "Kota Blitar", "banda": "Kota Banda Aceh",
    # provinsi yang belum punya satu catatan pun: singkatan setempat yang tidak ada di gazetteer
    "polman": "Polewali Mandar", "mateng": "Mamuju Tengah", "pangkalpinang": "Pangkal Pinang",
    "babel": "Bangka", "timika": "Mimika", "wamena": "Jayawijaya", "agats": "Asmat",
    "tanjungselor": "Bulungan", "manokwari": "Manokwari",
    "tangsel": "Tangerang Selatan", "kukar": "Kutai Kartanegara", "kutim": "Kutai Timur", "kubar": "Kutai Barat", "tala": "Tanah Laut",
    "hsu": "Hulu Sungai Utara", "hss": "Hulu Sungai Selatan", "hst": "Hulu Sungai Tengah",
    "lobar": "Lombok Barat", "loteng": "Lombok Tengah", "lotim": "Lombok Timur", "klu": "Lombok Utara",
    "sbd": "Sumba Barat Daya", "tts": "Timor Tengah Selatan", "ttu": "Timor Tengah Utara",
    "labuhanbatu": "Labuhanbatu", "taput": "Tapanuli Utara", "tapsel": "Tapanuli Selatan",
    # common kabupaten abbreviations in local headlines (6 Oct 2026); ones that are also ordinary words
    # (benteng, balut, tuba, mura) are left out on purpose
    "malra": "Maluku Tenggara",
    "malteng": "Maluku Tengah",
    "sbb": "Seram Bagian Barat",
    "sbt": "Seram Bagian Timur",
    "mbd": "Maluku Barat Daya",
    "kkt": "Kepulauan Tanimbar",
    "bursel": "Buru Selatan",
    "halbar": "Halmahera Barat",
    "halteng": "Halmahera Tengah",
    "halsel": "Halmahera Selatan",
    "haltim": "Halmahera Timur",
    "halut": "Halmahera Utara",
    "minsel": "Minahasa Selatan",
    "bolsel": "Bolaang Mongondow Selatan",
    "boltim": "Bolaang Mongondow Timur",
    "bolmut": "Bolaang Mongondow Utara",
    "sitaro": "Kepulauan Siau Tagulandang Biaro",
    "parimo": "Parigi Moutong",
    "touna": "Tojo Una-Una",
    "morut": "Morowali Utara",
    "bangkep": "Banggai Kepulauan",
    "konsel": "Konawe Selatan",
    "konut": "Konawe Utara",
    "konkep": "Konawe Kepulauan",
    "koltim": "Kolaka Timur",
    "kolut": "Kolaka Utara",
    "busel": "Buton Selatan",
    "buteng": "Buton Tengah",
    "mubar": "Muna Barat",
    "kku": "Kayong Utara",
    "pangkep": "Pangkajene dan Kepulauan",
    "sidrap": "Sidenreng Rappang",
    "lutim": "Luwu Timur",
    "lutra": "Luwu Utara",
    "tator": "Tana Toraja",
    "torut": "Toraja Utara",
    "madina": "Mandailing Natal",
    "paluta": "Padang Lawas Utara",
    "sergai": "Serdang Bedagai",
    "humbahas": "Humbang Hasundutan",
    "tobasa": "Toba",
    "labusel": "Labuhanbatu Selatan",
    "labura": "Labuhanbatu Utara",
    "pessel": "Pesisir Selatan",
    "pasbar": "Pasaman Barat",
    "solsel": "Solok Selatan",
    "kuansing": "Kuantan Singingi",
    "rohil": "Rokan Hilir",
    "rohul": "Rokan Hulu",
    "tanjabbar": "Tanjung Jabung Barat",
    "tanjabtim": "Tanjung Jabung Timur",
    "tanjabbarat": "Tanjung Jabung Barat",
    "tanjabtimur": "Tanjung Jabung Timur",
    "tanjab barat": "Tanjung Jabung Barat",
    "tanjab timur": "Tanjung Jabung Timur",
    # the regency's everyday name; a kecamatan in Lingga (Kepri) is also called Selayar, and read alone
    # it put a Sulawesi Selatan bansos story in the Riau islands
    "selayar": "Kepulauan Selayar",
    "tapteng": "Tapanuli Tengah",
    "palas": "Padang Lawas",
    "morotai": "Pulau Morotai",
    "linggau": "Lubuk Linggau",
    # not "mura": it is Musi Rawas in Sumatera Selatan and Murung Raya in Kalimantan Tengah
    "butur": "Buton Utara",
    "tolitoli": "Toli-Toli",
    "toli toli": "Toli-Toli",
    "limapuluh kota": "Lima Puluh Kota",
    "tanah daftar": "Tanah Datar",   # a common misspelling in headlines
    "karang asem": "Karangasem",
    "taliabu": "Pulau Taliabu",
    "tidore": "Tidore Kepulauan",
    "meranti": "Kepulauan Meranti",
    "oku": "Ogan Komering Ulu",
    "oki": "Ogan Komering Ilir",
    "okut": "Ogan Komering Ulu Timur",
    "okus": "Ogan Komering Ulu Selatan",
    "muba": "Musi Banyuasin",
    "muratara": "Musi Rawas Utara",
    "pali": "Penukal Abab Lematang Ilir",
    "lamsel": "Lampung Selatan",
    "lamtim": "Lampung Timur",
    "lamteng": "Lampung Tengah",
    "lambar": "Lampung Barat",
    "lampura": "Lampung Utara",
    "tubaba": "Tulang Bawang Barat",
    "bateng": "Bangka Tengah",
    "basel": "Bangka Selatan",
    "babar": "Bangka Barat",
    "beltim": "Belitung Timur",
    "abdya": "Aceh Barat Daya",
    "agara": "Aceh Tenggara",
    "kbb": "Bandung Barat",
    "ksb": "Sumbawa Barat",
    "matim": "Manggarai Timur",
    "mabar": "Manggarai Barat",
    "flotim": "Flores Timur",
    "gumas": "Gunung Mas",
    "pulpis": "Pulang Pisau",
    "barsel": "Barito Selatan",
    "bartim": "Barito Timur",
    "barut": "Barito Utara",
    "batola": "Barito Kuala",
    "tanbu": "Tanah Bumbu",
    "mahulu": "Mahakam Ulu",
    "ppu": "Penajam Paser Utara",
    "ktt": "Tana Tidung",
    "bonebol": "Bone Bolango",
    "gorut": "Gorontalo Utara",
}

# Place names that are also ordinary words in outlet names: "jurnalmetro" is a Jakarta-area outlet, not
# Kota Metro in Lampung; "batu" sits inside every "batubara".
DOMAIN_BUKAN = {"metro", "batu", "lingga"}  # "lingga" sits inside linggauklik (Lubuk Linggau)

# A province named in the headline is weaker evidence than a kab/kota but it is still the story's own
# words, so it outranks the outlet's home address. Shorthand included: headlines rarely spell it out.
PROV_POLA = [
    ("Sulawesi Barat", r"sulawesi barat|sulbar"), ("Sulawesi Selatan", r"sulawesi selatan|sulsel|\btoraja\b"),
    ("Sulawesi Tengah", r"sulawesi tengah|sulteng"), ("Sulawesi Tenggara", r"sulawesi tenggara|sultra"),
    ("Sulawesi Utara", r"sulawesi utara|sulut"),
    ("Kepulauan Bangka Belitung", r"bangka belitung|babel(?:itung)?"),
    ("Kepulauan Riau", r"kepulauan riau|kepri"),
    ("Kalimantan Barat", r"kalimantan barat|kalbar"), ("Kalimantan Tengah", r"kalimantan tengah|kalteng"),
    ("Kalimantan Selatan", r"kalimantan selatan|kalsel"), ("Kalimantan Timur", r"kalimantan timur|kaltim"),
    ("Kalimantan Utara", r"kalimantan utara|kaltara"),
    ("Sumatera Barat", r"sumatera barat|sumbar"), ("Sumatera Utara", r"sumatera utara|sumut"),
    ("Sumatera Selatan", r"sumatera selatan|sumsel"),
    # islands that span several regencies still settle the province ("Kades di Lombok", "di Madura")
    ("Nusa Tenggara Barat", r"nusa tenggara barat|ntb|\blombok\b"),
    ("Nusa Tenggara Timur", r"nusa tenggara timur|ntt|\bflores\b|\bsumba\b|pulau timor"),
    ("Jawa Barat", r"jawa barat|jabar"), ("Jawa Tengah", r"jawa tengah|jateng"), ("Jawa Timur", r"jawa timur|jatim|\bmadura\b"),
    ("Maluku Utara", r"maluku utara|malut|\bhalmahera\b"),
    # most specific first: "Papua Barat Daya" before "Papua Barat" before plain "Papua"
    ("Papua Barat Daya", r"papua barat daya|\bpbd\b"), ("Papua Pegunungan", r"papua pegunungan"),
    ("Papua Selatan", r"papua selatan"), ("Papua Tengah", r"papua tengah"),
    ("Papua Barat", r"papua barat"), ("Papua", r"papua"),
    ("Yogyakarta", r"di yogyakarta|d\.i\. yogyakarta|yogyakarta|jogja"),
    # Jakarta's administrative cities are not typed as kab/kota in Wikidata, so the province name and
    # the city abbreviations are the only way a Jakarta story gets placed at all
    ("Jakarta", r"\bjakarta\b|\bdki\b|jaksel|jakut|jaktim|jakbar|jakpus|kepulauan seribu"),
    ("Aceh", r"\baceh\b"), ("Banten", r"\bbanten\b"), ("Bengkulu", r"\bbengkulu\b"),
    ("Gorontalo", r"\bgorontalo\b"), ("Jambi", r"\bjambi\b"), ("Lampung", r"\blampung\b"),
    ("Maluku", r"\bmaluku\b|\bseram\b"), ("Riau", r"\briau\b"), ("Bali", r"\bbali\b"),
]
PROV_POLA = [(n, re.compile(r"(?<![a-z])(?:" + pat + r")(?![a-z])", re.I)) for n, pat in PROV_POLA]

KAB_PREFIX = re.compile(r"^(kabupaten|kab\.?|kota administrasi|kota adm\.?|kota)\s+", re.I)
PREFIX = re.compile(r"^(radar|kabar|info|berita|suara|harian|warta|media|tribun|jurnal|koran|portal|lintas|fokus)")
SUFFIX = re.compile(r"(pos|news|today|raya|terkini|ekspres|update|kita|post|hits|online|satu|net|id|co|com|"
                    r"voice|zone|link|channel|kini|expose|ekspos|times|daily|metro|media|bicara|aktual)$")


def outlet_city(domain):
    """Most regional outlets name their city in the domain (kabarnganjuk.com -> nganjuk).
    Used only to place a point at province level when the headline names no place."""
    base = domain.split(".")[0]
    base = PREFIX.sub("", base)
    base = SUFFIX.sub("", base)
    return base if len(base) >= 4 else None


# The wave-vs-control comparison divides finds by searches made. Only the WordPress archive grid searches
# every window with the same queries on the same outlets, and only its cells are counted as effort, so it
# is the only channel whose finds may enter that comparison. Everything else (Google News, the town-name
# sweeps aimed at thin provinces, browser searches) was pointed at election windows on purpose, and would
# inflate the election side if counted there.
def _cari_grid():
    import importlib.util
    spec = importlib.util.spec_from_file_location("co", ROOT / "scripts" / "crawl_outlets.py")
    co = importlib.util.module_from_spec(spec); spec.loader.exec_module(co)
    return {q for qs in co.CARI.values() for q in qs}
CARI_GRID = None


def saluran(k):
    global CARI_GRID
    q = k.get("kueri") or ""
    if "peramban" in q: return "gnews-peramban"
    m = re.search(r"search='([^']*)'", q)
    if m:
        if CARI_GRID is None: CARI_GRID = _cari_grid()
        return "wp-grid" if m.group(1) in CARI_GRID else "wp-kabkota"
    if "after:" in q: return "gnews-rss"
    return "lain"


def main():
    kand = json.loads((DATA / "kandidat.json").read_text())
    wd = json.loads((ROOT / "scripts" / "wikidata_id_regions.json").read_text())
    pp = json.loads((DATA / "provinsi_path.json").read_text())
    html = (ROOT / "index.html").read_text()
    ds = re.findall(r'<path class="prov"[^>]*\sd="([^"]+)"', re.search(r'<g id="provs">(.*?)</g>', html, re.S).group(1))
    prings = [rings(d) for d in ds]
    path_names = {L["path_index"]: L["provinsi_wikidata"] for L in pp["paths"]}

    # gazetteer: longest names first so "Kabupaten Semarang" wins over "Semarang"
    gaz = []
    for r in wd:
        t = r["type"].lower()
        if "provin" in t: continue
        gaz.append((norm(r["label"]), r))
    # headlines write many compound names as one word ("Lubuklinggau", "Muarojambi", "Palangkaraya"),
    # the gazetteer writes them as two; index both spellings of the same place
    for nm, r in list(gaz):
        if " " in nm: gaz.append((nm.replace(" ", ""), r))
    gaz.sort(key=lambda g: -len(g[0]))

    # Four-letter names (Pati, Belu, Alor, Bima, Buru) are ordinary syllables too often to match bare, so
    # they count only right after an office or institution that is always followed by a place name.
    INSTANSI = (r"(?:di|bawaslu|panwaslu|panwaslih|kpu|kpud|pilbup|pilwalkot|pilkada|bupati|wabup|pj bupati|asn|pns|"
                r"pemkab|pemkot|pemda|kabupaten|kab|kota|dprd|polres|kejari|sekda|kesbangpol|bkpsdm|disdik)\s+")

    # compiled once: ~1,100 names is past re's internal cache, and recompiling each pattern for each of
    # ~3,000 candidates turned a seconds-long step into minutes
    gaz_rx, gaz_rx5 = [], []
    for name, r in gaz:
        if len(name) >= 5:
            rx = re.compile(r"(?<![a-z])" + re.escape(name) + r"(?![a-z])")
            gaz_rx.append((rx, r)); gaz_rx5.append((rx, r))
        elif len(name) == 4:
            gaz_rx.append((re.compile(r"(?<![a-z])" + INSTANSI + re.escape(name) + r"(?![a-z])"), r))

    # an office named after the city it sits in, where the story is about somewhere else: a report sent
    # "ke BKN Makassar" is about Polman; "AJI Palembang" is the union chapter commenting on Ambon
    BUKAN_LOKASI = re.compile(r"(?:ke )?(?:bkn|kanreg|kanwil|aji|lbh|ombudsman ri perwakilan) [a-z]+")

    def place_of(title):
        n = " " + BUKAN_LOKASI.sub(" ", norm(title)) + " "
        k = kec_dalam_nama(n)
        if k: return k
        for rx, r in gaz_rx:
            if rx.search(n): return r
        return None

    gaz_by_name = {}
    for nm, r in gaz: gaz_by_name.setdefault(nm, r)

    alias_rx = [(re.compile(r"(?<![a-z])" + ali + r"(?![a-z])"), target) for ali, target in ALIAS_TEMPAT.items()]

    # Kecamatan named in the headline ("Camat Kragan", "Kades di Baturetno"): placed at the kabupaten the
    # BPS code says it belongs to. Only nationally unique names (scripts/kecamatan_bps.json), and only
    # right after a word that introduces a place, so a kecamatan that is also an ordinary word cannot fire.
    kec_rx = []
    kp = ROOT / "scripts" / "kecamatan_bps.json"
    if kp.exists():
        by_qid = {r["qid"]: r for r in wd}
        for kc in json.loads(kp.read_text())["kecamatan"]:
            r = by_qid.get(kc["kab_qid"])   # linked by name at build time; BPS and Kemendagri codes differ
            if not r: continue
            nk = norm(kc["label"])
            # after a bare "di", only long or multi-word names: "di ujung tanduk" is an idiom, Ujung is
            # also a kecamatan in Parepare
            awal = r"(?:camat|kecamatan|kec|distrik|di)" if (len(nk) >= 7 or " " in nk) else r"(?:camat|kecamatan|kec|distrik)"
            kec_rx.append((re.compile(r"(?<![a-z])" + awal + r"\s+" + re.escape(nk) + r"(?![a-z])"), r))

    # A kecamatan whose name contains a kab/kota name ("Pangkalan Kerinci" in Pelalawan, "Mataram Baru" in
    # Lampung Timur) was read as that kab/kota, a province away. Those few are checked before the
    # gazetteer. Headlines also run two-word names together ("Camat Negerikaton"), so both spellings count.
    nama_gaz = {nm for nm, _ in gaz}
    kec_konflik, kec_gabung = [], []
    if kp.exists():
        for kc in json.loads(kp.read_text())["kecamatan"]:
            r = by_qid.get(kc["kab_qid"]); nk = norm(kc["label"]); w = nk.split()
            if not r or len(w) < 2: continue
            kec_gabung.append((re.compile(r"(?<![a-z])(?:camat|kecamatan|kec|distrik)\s+" + re.escape(nk.replace(" ", ""))
                                          + r"(?![a-z])"), r))
            if any(x in nama_gaz for x in w + [" ".join(w[i:i + 2]) for i in range(len(w) - 1)]):
                kec_konflik.append((re.compile(r"(?<![a-z])(?:camat|kecamatan|kec|distrik|di)\s+" + re.escape(nk)
                                               + r"(?![a-z])"), r))

    def kec_dalam_nama(n):
        for rx, r in kec_konflik:
            if rx.search(n): return r
        return None

    def place_from_kecamatan(text):
        t = " " + norm(text) + " "
        for rx, r in kec_rx:
            if rx.search(t): return r
        for rx, r in kec_gabung:
            if rx.search(t): return r
        return None

    def place_from_alias(text):
        t = BUKAN_LOKASI.sub(" ", norm(text))
        for rx, target in alias_rx:
            if rx.search(t):
                r = gaz_by_name.get(norm(target)) or gaz_by_name.get(norm(KAB_PREFIX.sub("", target)))
                if r: return r
        return None

    def place_from_domain(domain):
        """Outlet names embed their city (malangvoice, jurnalbogor). Longest gazetteer name that
        appears inside the domain wins; the alias table covers local shorthand the gazetteer lacks."""
        if not domain: return None
        base = norm(domain.split(".")[0])
        for nm, r in gaz:
            if len(nm) >= 5 and nm.replace(" ", "") in base and nm not in DOMAIN_BUKAN: return r
        for ali, target in ALIAS_TEMPAT.items():
            # substrings of a domain: short aliases (oki, pali, tala) turn up inside unrelated words
            if len(ali) >= 5 and ali in base and ali not in DOMAIN_BUKAN:
                r = gaz_by_name.get(norm(target)) or gaz_by_name.get(norm(KAB_PREFIX.sub("", target)))
                if r: return r
        return None

    def place_from_url(url):
        """Article slugs often carry the kab/kota even when the headline does not
        (…/pilkada/d-123/bawaslu-sleman-limpahkan…). Same gazetteer, same word-boundary rule."""
        if not url: return None
        # the path only: the host is the outlet's address, not the story's place. Reading it put a story
        # about Maluku's governor in Bangka because the outlet is bangka.tribunnews.com
        path = urllib.parse.urlsplit(url).path
        slug = re.sub(r"[^a-z]+", " ", path.lower())
        n = " " + BUKAN_LOKASI.sub(" ", slug) + " "
        # five letters and up only: a slug has no office word in front of a short name to anchor it
        for rx, r in gaz_rx5:
            if rx.search(n): return r
        return None

    # BPS code -> province. The gazetteer carries the official code on every entry, and its first two
    # digits ARE the province, so this is a lookup rather than a guess.
    BPS_PROV = {r["bps"]: r["label"] for r in wd if "provin" in r["type"].lower() and r.get("bps")}

    def province_of(r):
        """Province from the official BPS code; the shape index still comes from the geometry.

        Ray-casting alone cannot answer this. The base map merges provinces that were split off
        later — Sulawesi Barat sits inside the Sulawesi Selatan shape, Kalimantan Utara inside
        Kalimantan Timur, and all four 2022 Papua provinces inside their parents — so the geometric
        answer is always the older, larger parent and the child province reads as empty.
        """
        x, y = project(r["lon"], r["lat"])
        pidx = None
        for i, rs in enumerate(prings):
            if inside(rs, x, y): pidx = i; break
        kode = (r.get("bps") or "")[:2]
        if kode in BPS_PROV: return BPS_PROV[kode], pidx
        names = path_names.get(pidx, []) if pidx is not None else []
        return (names[0] if names else None), pidx

    prov_centroid = {norm(r["label"]): r for r in wd if "provin" in r["type"].lower()}
    qid_wd = {r["qid"]: r for r in wd}
    DATELINE = json.loads((DATA / "dateline.json").read_text()) if (DATA / "dateline.json").exists() else {}
    PROV_ALIAS = {"di yogyakarta": "yogyakarta", "dki jakarta": "jakarta"}
    rows, unplaced, ditolak = [], 0, []
    for k in kand:
        if not k.get("url"): continue
        ok, why, basis = dalam_lingkup(k["judul"], k.get("gelombang_pilkada"))
        u = urllib.parse.urlsplit(k["url"])
        if ok and (u.netloc.lower().removeprefix("www.") in BUKAN_BERITA or u.path.startswith("/tag/")
                   or re.search(r"/(?:kolom|opini|opinion|newsletter)/", u.path)):
            ok, why = False, "platform blog warga atau halaman tag, bukan pemberitaan"
        if not ok:
            ditolak.append({"kandidat_id": k["kandidat_id"], "judul": k["judul"], "alasan": why}); continue
        # everything the headline says comes before the link: a slug can carry an outlet's section name
        # ("…/mata-jambi/…") that has nothing to do with where the story happened
        p = place_of(k["judul"])
        dasar = "nama kab/kota di judul" if p else None
        if not p:
            p = place_from_alias(k["judul"])
            if p: dasar = "singkatan tempat di judul"
        if not p:
            p = place_from_kecamatan(k["judul"])
            if p: dasar = "nama kecamatan di judul"
        if not p:
            p = place_from_url(k.get("url"))
            if p: dasar = "nama kab/kota di tautan"
        if not p:
            pj0 = next((nm for nm, rx in PROV_POLA if rx.search(k["judul"] or "")), None)
        else:
            pj0 = None
        # the reporter's dateline (scripts/dateline.py): the article's own words, so it comes before
        # the outlet's address. Jakarta datelines mostly mark a national desk, not the place, and are
        # taken only when the headline is about Jakarta; a headline naming another province wins.
        if not p:
            d = DATELINE.get(k.get("url")) or {}
            r_dl = qid_wd.get(d.get("qid")) if d.get("status") == "ok" else None
            if r_dl:
                pv, _ix = province_of(r_dl)
                jkt = pv == "Jakarta" and not re.search(r"jakarta|\bdki\b", (k["judul"] or "").lower())
                if pv and not jkt and (not pj0 or pv == pj0):
                    p, dasar = r_dl, "kota dateline berita"
        if not p and not pj0:
            p = place_from_domain(k.get("outlet"))
            if p: dasar = "nama kota di domain outlet"
        prov, pidx = (province_of(p) if p else (None, None))
        # no kab/kota or kecamatan, but the headline names the province: the story's own words outrank
        # the outlet's address, which is why the domain guess above is skipped in this case
        if not p:
            pj = next((nm for nm, rx in PROV_POLA if rx.search(k["judul"] or "")), None)
            if pj:
                prov, dasar = pj, "nama provinsi di judul"
                pr = prov_centroid.get(PROV_ALIAS.get(norm(pj), norm(pj)))
                if pr: _, pidx = province_of(pr)
        if not p and not prov:
            hp = OUTLET_PROV.get(k.get("outlet"))
            if not hp and k.get("outlet"):
                city = outlet_city(k["outlet"])
                if city:
                    for nm, gr in gaz:
                        if nm == city or nm.replace(" ", "") == city:
                            pv, _ix = province_of(gr)
                            if pv: hp = pv
                            break
            if hp:
                pr = prov_centroid.get(PROV_ALIAS.get(norm(hp), norm(hp)))
                if pr:
                    prov, pidx = province_of(pr)
                    prov = prov or hp
                    dasar = "wilayah edar outlet"
        rows.append({
            "insiden_id": k["kandidat_id"].replace("KAN", "AUTO"),
            "tanggal": None,                       # event date unknown; a publication date is not it
            "tanggal_berita": k.get("tanggal_terbit"),
            "provinsi": prov, "kab_kota": (p["label"] if p else None),
            "lokasi_dasar": dasar,
            # True where the place came from the outlet rather than from the story itself: the article
            # never names it, so the point marks where the outlet is based, not where the incident was.
            # a dateline is the story's own words but names where the reporter filed, which for a city that
            # shares its name with the surrounding regency, or a provincial desk, is close rather than exact
            "lokasi_perkiraan": dasar in ("wilayah edar outlet", "nama kota di domain outlet", "kota dateline berita"),
            "lokasi_tingkat": ("kab_kota" if p else ("provinsi" if prov else None)),
            "pelaku_jabatan": None, "sasaran_jenis": None,
            "mekanisme": k.get("mekanisme_dugaan"),
            "ringkasan_satu_kalimat": None, "hasil": None,
            "sumber_1_url": k["url"], "sumber_1_outlet": k.get("outlet"), "sumber_2_url": None,
            "status_verifikasi": None,             # computed below
            "status_kurasi": "otomatis",
            "periode_pilpres": None,               # set from the wave window below
            "gelombang_pilkada": k.get("gelombang_pilkada"),
            "judul_sumber_1": k["judul"],
            "judul_status": "terverifikasi" if k.get("status_url") == "terselesaikan" else "dari URL",
            "diisi_oleh": "penelusuran otomatis", "tanggal_isi": k.get("ditemukan_pada"),
            "kueri": k.get("kueri"), "lingkup_dasar": basis, "_path": pidx, "saluran": saluran(k),
        })
        if not prov: unplaced += 1

    # periode from the wave the query targeted (waves sit wholly inside one presidential period)
    WAVE_PERIODE = {"2024": "Periode V", "2020": "Periode IV", "2018": "Periode III",
                    "2017": "Periode III", "2015": "Periode III", "2026": "Periode V", "2025": "Periode V",
                    "2023": "Periode IV", "2022": "Periode IV", "2021": "Periode IV", "2019b": "Periode III",
                    "2016": "Periode III", "kontrol-2024": "Periode IV", "kontrol-2020": "Periode IV",
                    "kontrol-2018": "Periode IV", "kontrol-2017": "Periode III"}
    for r in rows: r["periode_pilpres"] = WAVE_PERIODE.get(r["gelombang_pilkada"])

    # corroboration: same place + mechanism, different outlet domains, within 7 days
    buckets = defaultdict(list)
    for r in rows:
        if r["kab_kota"] and r["tanggal_berita"]:
            buckets[(r["kab_kota"], r["mekanisme"])].append(r)
    for group in buckets.values():
        group.sort(key=lambda r: r["tanggal_berita"])
        for i, r in enumerate(group):
            d0 = dt.date.fromisoformat(r["tanggal_berita"])
            sh_r = shingles(r["judul_sumber_1"])
            mate = None
            for o in group:
                if o is r or o["sumber_1_outlet"] == r["sumber_1_outlet"]: continue
                if abs((dt.date.fromisoformat(o["tanggal_berita"]) - d0).days) > 7: continue
                # Same kab/kota + mechanism + week is NOT the same event: checking the pairs showed
                # about half were unrelated stories that merely shared a regency and a week. Require the
                # two headlines to actually be about the same thing before calling it corroboration.
                sim = jaccard(sh_r, shingles(o["judul_sumber_1"]))
                if sim < 0.25:
                    r["catatan_duplikat"] = "kandidat sumber kedua ditolak: judulnya bukan peristiwa yang sama"
                    continue
                mate = o; r["kemiripan_pasangan"] = round(sim, 2); break
            if mate:
                r["status_verifikasi"] = "dua sumber"
                r["sumber_2_url"] = mate["sumber_1_url"]
                r.pop("catatan_duplikat", None)
    for r in rows:
        if not r["status_verifikasi"]: r["status_verifikasi"] = "satu sumber"

    (DATA / "insiden_otomatis.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1) + "\n")
    # effort per window: a wave searched twice as hard as its control will "find" twice as much,
    # which is the same trap as a raw-count choropleth. Store cells searched so rates can be compared.
    state = json.loads((DATA / "crawl_state.json").read_text()) if (DATA / "crawl_state.json").exists() else {"done": []}
    usaha = {}
    for cid in state.get("done", []):
        if cid.startswith("wp|"):
            parts = cid.split("|")
            if len(parts) > 1: usaha[parts[1]] = usaha.get(parts[1], 0) + 1
    runs = state.get("runs", [])
    (DATA / "kemajuan.json").write_text(json.dumps({
        "sel_selesai": len(state.get("done", [])),
        "run_terakhir": (runs[-1].get("tanggal") if runs else None),
        "catatan": "Ringkasan kemajuan untuk strip di situs; crawl_state.json penuh tidak perlu diunduh pengunjung."
    }, ensure_ascii=False, indent=1) + "\n")

    (DATA / "usaha_pencarian.json").write_text(json.dumps(usaha, ensure_ascii=False, indent=1) + "\n")

    (DATA / "otomatis_diluar_lingkup.json").write_text(json.dumps(ditolak, ensure_ascii=False, indent=1) + "\n")
    print(f"{len(ditolak)} kandidat disisihkan sebagai di luar lingkup (tercatat, tidak dibuang)")
    dua = sum(1 for r in rows if r["status_verifikasi"] == "dua sumber")
    placed = sum(1 for r in rows if r["kab_kota"])
    provlvl = sum(1 for r in rows if not r["kab_kota"] and r["provinsi"])
    byprov = defaultdict(int)
    for r in rows:
        if r["provinsi"]: byprov[r["provinsi"]] += 1
    print(f"{len(rows)} baris otomatis · {placed} punya kab/kota · {unplaced} tanpa lokasi · {dua} dua sumber")
    print(f"{len(byprov)} provinsi tersentuh: " + ", ".join(f"{k}({v})" for k, v in sorted(byprov.items(), key=lambda x: -x[1])[:12]))


if __name__ == "__main__":
    main()
