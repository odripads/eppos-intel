#!/bin/bash
# Format statis Outlook: tiap pelat presentasi jadi PNG 3840x2160, dan satu PDF berisi semuanya. Dari halaman yang sama
# dengan situs (mode ?cetak=), jadi versi statis dan interaktif tidak mungkin berbeda angka.
# Pakai: scripts/ekspor_pelat.sh     Hasil: dist/pelat/  (jalankan build_bundle.py lebih dulu)
cd "$(dirname "$0")/.." || exit 1
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SITUS="file://$PWD/dist/eppos-outlook/index.html"
mkdir -p dist/pelat
PROF=$(mktemp -d)
for i in 1 2 3 4 5 6 7 8 9 10; do
  "$CH" --headless=new --disable-gpu --hide-scrollbars --no-first-run --user-data-dir="$PROF" --force-device-scale-factor=2 \
    --window-size=1920,1080 --virtual-time-budget=7000 --screenshot="$PWD/dist/pelat/pelat-$(printf %02d $i).png" "$SITUS?cetak=1#/presentasi/$i" >/dev/null 2>&1
done
"$CH" --headless=new --disable-gpu --no-first-run --user-data-dir="$PROF" --no-pdf-header-footer --virtual-time-budget=9000 \
  --print-to-pdf="$PWD/dist/pelat/EPPOS-Political-Outlook-pelat.pdf" "$SITUS?cetak=semua#/presentasi" >/dev/null 2>&1
rm -rf "$PROF"
ls -la dist/pelat | awk 'NR>3{print $5, $9}'
