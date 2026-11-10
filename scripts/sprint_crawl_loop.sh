#!/bin/bash
# Sprint 10–13 Nov 2026 (Odri's approval, AGENTS.md §0): run the crawl pipeline every 40 minutes while the Mac is
# awake, so bot-media's routine runs only have to audit and publish. Never starts a second copy, stops by itself
# after Fri 13 Nov 23:59 WIB. Pauses naturally while the Mac sleeps. Stop early: pkill -f "[s]print_crawl_loop.sh"
REPO="$HOME/eppos-intel"
AKHIR=$(TZ=Asia/Jakarta date -j -f "%Y-%m-%d %H:%M" "2026-11-13 23:59" +%s)
while [ "$(date +%s)" -lt "$AKHIR" ]; do
  if ! pgrep -f "[r]utin_harian.sh" >/dev/null; then
    "$REPO/scripts/rutin_harian.sh" 40
  fi
  sleep 2400
done
echo "$(date '+%F %T') sprint crawl loop selesai (batas Jumat 13 Nov)" >> "$REPO/data/rutin.log"
