#!/bin/bash
# Rutin harian EPPOS: satu petak grid penelusuran, lalu bangun ulang data dan situs.
# Tidak pernah menerbitkan apa pun ke peta — hasilnya masuk antrean tinjauan (tinjau.html).
set -uo pipefail
REPO="$HOME/eppos-intel"
LOG="$REPO/data/rutin.log"
CELLS="${1:-40}"
cd "$REPO" || exit 1
PY="$(command -v python3 || echo /opt/homebrew/bin/python3)"

{
  echo "════════ $(date '+%Y-%m-%d %H:%M:%S') · rutin harian ($CELLS sel) ════════"
  echo "── sapuan arsip outlet (WordPress REST, tanpa batas laju bersama)"
  "$PY" scripts/crawl_outlets.py --cells 150 2>&1 | tail -6
  echo "── sapuan Google News (dibatasi laju; pelan)"
  "$PY" scripts/crawl_candidates.py --cells "$CELLS" 2>&1 | tail -6
  echo "── selesaikan URL kandidat (bertahap, endpoint Google membatasi laju)"
  "$PY" scripts/resolve_urls.py --max 25 --gap 8 2>&1 | tail -3
  echo "── verifikasi judul sumber baru"
  "$PY" scripts/verify_titles.py 2>&1 | tail -3
  echo "── terima kandidat baru (izin berdiri Odri, 29 Sep 2026)"
  "$PY" scripts/confirm_queue.py 2>&1 | tail -1
  echo "── masukkan temuan otomatis ke lapisan peta"
  "$PY" scripts/promote_candidates.py 2>&1 | tail -3
  echo "── bangun ulang data dari xlsx"
  "$PY" scripts/build_data.py 2>&1 | grep -E '"(insiden|kasus_resmi|koordinat|judul_terverifikasi)"' || true
  echo "── bangun ulang bundel situs"
  "$PY" scripts/build_bundle.py 2>&1
  BELUM=$("$PY" -c "import json,pathlib; p=pathlib.Path('data/kandidat.json'); d=json.loads(p.read_text()) if p.exists() else []; print(sum(1 for k in d if not k.get('status_tinjau')))" 2>/dev/null || echo "?")
  echo "── selesai · $BELUM kandidat menunggu tinjauan · buka tinjau.html"
} >> "$LOG" 2>&1

# simpan hasil ke git bila ada perubahan data (bukan menerbitkan, hanya mencatat)
cd "$REPO" || exit 1
if [ -n "$(git status --porcelain data/ 2>/dev/null)" ]; then
  git add data/ >/dev/null 2>&1
  git -c user.name="Odri" -c user.email="odripads@gmail.com" \
      commit -q -m "Rutin harian $(date '+%Y-%m-%d'): kandidat dan log penelusuran" >/dev/null 2>&1
fi
# jaga agar log tidak tumbuh tanpa batas
tail -n 2000 "$LOG" > "$LOG.tmp" 2>/dev/null && mv "$LOG.tmp" "$LOG"
