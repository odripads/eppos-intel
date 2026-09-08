"""Deterministic, extractive article summaries and rule-based topic labels. No LLM: the corpus is
never classified by a model (spec §Build order 4). ringkasan = the lead, trimmed; kategori = keyword rules."""
from __future__ import annotations
import re
from collections import Counter

STOP = set("""yang dan di ke dari untuk pada dengan ini itu adalah akan oleh atau juga sebagai dalam tidak telah sudah karena
agar bahwa serta para kata ujar saat lalu tersebut secara bagi kami kita mereka ia dia kepada hingga setelah sebelum
tahun bulan hari senin selasa rabu kamis jumat sabtu minggu kota makassar kupang wali walikota pemerintah pemkot""".split())

KATEGORI = [
    ("bantuan sosial", r"\b(bantuan|bansos|sembako|santunan|hibah|beasiswa|penerima)\b"),
    ("infrastruktur", r"\b(jalan|jembatan|drainase|kanal|lorong|pembangunan|perbaikan|infrastruktur|proyek)\b"),
    ("peresmian / seremoni", r"\b(meresmikan|peresmian|diresmikan|meluncurkan|peluncuran|kunjungan|meninjau)\b"),
    ("penindakan / pengawasan", r"\b(kpk|kejaksaan|inspektorat|ombudsman|bpk|bawaslu|temuan|maladministrasi|laporan|perkara|penyidikan)\b"),
    ("mobilisasi / protes", r"\b(unjuk\s+rasa|demo|demonstrasi|aksi|menolak|penolakan|warga|mahasiswa)\b"),
    ("kebijakan / regulasi", r"\b(perwali|perda|perkada|peraturan|retribusi|tarif|kebijakan|dicabut|pencabutan)\b"),
    ("anggaran / publikasi", r"\b(anggaran|apbd|belanja|publikasi|kerja\s+sama\s+media|tender|lpse|kontrak)\b"),
    ("pilkada / politik", r"\b(pilkada|calon|penetapan|kampanye|kpu|gubernur|pemilih|partai)\b"),
]

def sentences(text: str):
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text or "") if s.strip()]

def ringkasan(text: str, max_chars: int = 240) -> str:
    out = ""
    for s in sentences(text):
        if out and len(out) + len(s) + 1 > max_chars: break
        out = (out + " " + s).strip()
        if len(out) >= max_chars * 0.6: break
    return out[:max_chars].rstrip() + ("…" if len(out) > max_chars else "")

def kategori(text: str) -> str:
    t = (text or "").lower()
    hits = [(len(re.findall(pat, t)), name) for name, pat in KATEGORI]
    hits = [h for h in hits if h[0]]
    return max(hits)[1] if hits else "lainnya"

def topik(text: str, n: int = 4):
    words = [w for w in re.findall(r"[a-zà-ÿ]{4,}", (text or "").lower()) if w not in STOP]
    return [w for w, _ in Counter(words).most_common(n)]

def enrich(article: dict) -> dict:
    t = f"{article.get('judul') or ''}. {article.get('teks') or ''}"
    article["ringkasan"] = ringkasan(article.get("teks") or "")
    article["kategori"] = kategori(t)
    article["topik"] = topik(t)
    return article
