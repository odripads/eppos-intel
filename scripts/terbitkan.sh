#!/bin/bash
# Terbitkan EPPOS Political Outlook ke https://eppos-outlook.vercel.app. Satu-satunya jalan deploy untuk bot:
# kunci (dua bot tidak boleh deploy bersamaan) → cek data → bangun → uji halaman di Chrome → deploy → buktikan → catat.
# Kalau satu langkah gagal, tidak ada yang terbit.
# Pakai:  scripts/terbitkan.sh "bot-media: apa yang berubah"          (terbit)
#         scripts/terbitkan.sh "bot-posisi: apa yang berubah" --coba  (semua langkah kecuali deploy)
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
PESAN="${1:-}"; COBA="${2:-}"
[ -z "$PESAN" ] && { echo 'pakai: scripts/terbitkan.sh "bot-media: apa yang berubah" [--coba]'; exit 2; }
URL=https://eppos-outlook.vercel.app
KUNCI=.terbit.lock
if ! mkdir "$KUNCI" 2>/dev/null; then
  echo "TERKUNCI: sedang ada yang menerbitkan ($(cat "$KUNCI/siapa" 2>/dev/null)). Tunggu beberapa menit, lalu ulangi."
  echo "Kunci basi (lebih dari 15 menit, tidak ada proses yang jalan)? Hapus dengan: rm -rf $PWD/$KUNCI"
  exit 3
fi
PROF=$(mktemp -d)
trap 'rm -rf "$KUNCI" "$PROF"' EXIT
echo "$PESAN · mulai $(date '+%F %T')" > "$KUNCI/siapa"
gagal() { echo "GAGAL: $1. Tidak ada yang diterbitkan."; exit 1; }

echo "1/5 cek data posisi";   python3 scripts/cek_posisi.py || gagal "data/posisi_aktor.json tidak lolos cek"
echo "2/5 bangun situs";      python3 scripts/build_bundle.py >/dev/null || gagal "build_bundle.py"
echo "3/5 uji halaman";        CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SITUS="file://$PWD/dist/eppos-outlook/index.html"
# rute|penanda yang harus ada di DOM sesudah JavaScript jalan
for uji in "|class=\"pita-angka\"" "intervensi|id=\"papan-A\"" "skema|class=\"mek-daftar\"" "provinsi/papua|class=\"berkas-isi\"" \
           "arsip|id=\"a-daftar\"" "ruu-pemilu|id=\"posisi\"" "metode|class=\"alur\"" "presentasi/5|class=\"plat malam\""; do
  rute="${uji%%|*}"; tanda="${uji#*|}"
  # hanya isi <main> yang sudah dirender: bundel menyisipkan JavaScript-nya, jadi teks dan penanda yang sama juga ada di sumber skrip
  DOM=$("$CH" --headless=new --disable-gpu --no-first-run --user-data-dir="$PROF" --virtual-time-budget=6000 --dump-dom "$SITUS?cetak=1#/$rute" 2>/dev/null |
        python3 -c 'import sys,re; m=re.search(r"<main id=\"isi\"[^>]*>(.*?)</main>", sys.stdin.read(), re.S); print(m.group(1) if m else "")')
  [ -z "$DOM" ] && gagal "#/$rute: halaman kosong"
  echo "$DOM" | grep -q "Data gagal dimuat" && gagal "#/$rute: data gagal dimuat"
  echo "$DOM" | grep -q "$tanda" || gagal "#/$rute tidak tampil (penanda $tanda tidak ada)"
done
echo "    8 halaman tampil"
if [ "$COBA" = "--coba" ]; then echo "--coba: semua uji lolos, tidak deploy."; exit 0; fi

echo "4/5 deploy"
OUT=$(cd dist/eppos-outlook && vercel deploy --prod --yes 2>&1) || { echo "$OUT" | tail -5; gagal "vercel deploy"; }
DEP=$(echo "$OUT" | grep -Eo 'https://eppos-outlook-[a-z0-9]+-odripads\.vercel\.app' | head -1)
echo "5/5 buktikan";           sleep 5
curl -s "$URL" -o "$PROF/live.html"
cmp -s "$PROF/live.html" dist/eppos-outlook/index.html || gagal "situs live tidak sama dengan build lokal ($DEP). Periksa, atau kembalikan: cd dist/eppos-outlook && vercel rollback"
curl -sI "$URL" | grep -qi "x-robots-tag: noindex" || gagal "header noindex hilang"
for p in /data/kandidat.json /eppos-media-intake.xlsx /.vercel/project.json; do
  [ "$(curl -s -o /dev/null -w '%{http_code}' "$URL$p")" = "404" ] || gagal "$p bisa diakses publik"
done
VER=$(python3 -c "import json;print(json.load(open('data/manifest.json'))['version'])")
echo "- $(date '+%F %H:%M') · $PESAN · data $VER · $DEP" >> TERBIT.md
echo "TERBIT: $URL ($DEP), data $VER. Tercatat di TERBIT.md."
