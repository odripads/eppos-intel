#!/usr/bin/env python3
"""One way to write data/kandidat.json, shared by every script that touches it.

Four scripts write this file and they routinely run at the same time: two crawlers, the URL resolver
and the queue stamper. Each used to read the file, change its copy, and write the whole copy back.
That produced three kinds of damage, all found in the data on 6 Oct 2026:

  * lost work: whoever wrote last erased what the others had added or changed in between;
  * colliding ids: two crawlers both numbered from the same max(id)+1, so 153 kandidat_id values
    were shared by different articles, and 45 of them reached the published automated layer;
  * the same article twice: a resolved copy is keyed by its URL and an unresolved copy by its
    Google link, so one story stored as two rows.

Every write now happens under an exclusive lock, starts from what is on disk, and is atomic.
Disk wins: a crawler's in-memory list is only allowed to ADD rows and fill fields that are empty on
disk, never to overwrite a value another script has set (a resolved URL, a review stamp).
"""
from __future__ import annotations
import contextlib, fcntl, json, os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
P = ROOT / "data" / "kandidat.json"
KUNCI = ROOT / "data" / ".kandidat.lock"


@contextlib.contextmanager
def _terkunci():
    with open(KUNCI, "w") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try: yield
        finally: fcntl.flock(f, fcntl.LOCK_UN)


def _baca():
    try: return json.loads(P.read_text())
    except FileNotFoundError: return []


def _tulis(rows):
    tmp = P.with_name(f".kandidat.{os.getpid()}.tmp")
    tmp.write_text(json.dumps(rows, ensure_ascii=False, indent=1) + "\n")
    os.replace(tmp, P)


def _nomor(i):
    try: return int(str(i).split("-")[-1])
    except Exception: return 0


def _kunci_identitas(r):
    """Every key under which this row could be recognised as the same article."""
    ks = []
    if r.get("url"): ks.append(("u", r["url"]))
    if r.get("url_google"): ks.append(("g", r["url_google"]))
    return ks


def simpan(rows):
    """Merge a crawler's in-memory list into the file. Returns the number of rows on disk.

    New rows whose kandidat_id is already taken by a different article get the next free number, and
    the caller's dict is renumbered in place so its later saves stay consistent.
    """
    with _terkunci():
        disk = _baca()
        idx, by_id = {}, {}
        for i, r in enumerate(disk):
            for k in _kunci_identitas(r): idx.setdefault(k, i)
            by_id.setdefault(r.get("kandidat_id"), i)
        maks = max((_nomor(r.get("kandidat_id")) for r in disk), default=0)
        for r in rows:
            hit = next((idx[k] for k in _kunci_identitas(r) if k in idx), None)
            if hit is None and not _kunci_identitas(r):
                j = by_id.get(r.get("kandidat_id"))
                if j is not None and disk[j].get("judul") == r.get("judul"): hit = j
            if hit is not None:
                d = disk[hit]
                for kk, vv in r.items():
                    if vv is not None and d.get(kk) is None: d[kk] = vv
                if r.get("kandidat_id") != d.get("kandidat_id"): r["kandidat_id"] = d["kandidat_id"]
                for k in _kunci_identitas(d): idx.setdefault(k, hit)
                continue
            if r.get("kandidat_id") in by_id:
                maks += 1; r["kandidat_id"] = f"KAN-{maks:05d}"
            else:
                maks = max(maks, _nomor(r.get("kandidat_id")))
            disk.append(dict(r)); j = len(disk) - 1
            by_id[r["kandidat_id"]] = j
            for k in _kunci_identitas(r): idx.setdefault(k, j)
        _tulis(disk)
        return len(disk)


def ubah(fn):
    """Read-modify-write under the lock. `fn` receives the on-disk list and changes it in place."""
    with _terkunci():
        disk = _baca()
        hasil = fn(disk)
        _tulis(disk)
        return hasil


def id_berikut():
    with _terkunci():
        return max((_nomor(r.get("kandidat_id")) for r in _baca()), default=0)


def perbaiki():
    """One-off repair of what the unlocked writers left behind. Idempotent.

    1. Rows that are the same article (same URL or same Google link) collapse into the earliest row;
       fields the earliest lacks are filled from the later copies.
    2. Remaining rows that share a kandidat_id are different articles: the first keeps the id, the
       rest are renumbered after the current maximum.
    """
    def _fix(disk):
        keep, idx, gabung = [], {}, 0
        for r in disk:
            hit = next((idx[k] for k in _kunci_identitas(r) if k in idx), None)
            if hit is not None:
                d = keep[hit]
                for kk, vv in r.items():
                    if vv is not None and d.get(kk) is None: d[kk] = vv
                for k in _kunci_identitas(r): idx.setdefault(k, hit)
                gabung += 1; continue
            keep.append(r)
            for k in _kunci_identitas(r): idx.setdefault(k, len(keep) - 1)
        maks = max((_nomor(r.get("kandidat_id")) for r in keep), default=0)
        dipakai, ganti = set(), []
        for r in keep:
            i = r.get("kandidat_id")
            if i in dipakai:
                maks += 1; baru = f"KAN-{maks:05d}"
                ganti.append((i, baru)); r["kandidat_id"] = baru
            dipakai.add(r["kandidat_id"])
        disk[:] = keep
        return gabung, ganti
    return ubah(_fix)


if __name__ == "__main__":
    import sys
    if sys.argv[1:] == ["perbaiki"]:
        g, ganti = perbaiki()
        print(f"{g} baris kembar digabung; {len(ganti)} kandidat_id dinomori ulang")
        for a, b in ganti[:10]: print(f"   {a} -> {b}")
    else:
        print("pakai: python3 scripts/kandidat_io.py perbaiki")
