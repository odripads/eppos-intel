#!/usr/bin/env python3
"""Logo untuk lockup EPPOS + PolGov. Sumber asli di assets/ tidak disentuh; turunannya di assets/lockup/.
Tepi kosong dipangkas, supaya tinggi di CSS berarti tinggi tinta, bukan tinggi berkas.
Tanpa dependensi: PNG 8-bit RGBA dibaca dan ditulis langsung."""
import colorsys, struct, zlib
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent

def baca(p):
    b = Path(p).read_bytes(); i = 8; idat = b""
    while i < len(b):
        n = struct.unpack(">I", b[i:i + 4])[0]; t = b[i + 4:i + 8]; d = b[i + 8:i + 8 + n]
        if t == b"IHDR": W, H = struct.unpack(">II", d[:8]); assert d[8:10] == b"\x08\x06" and d[12] == 0
        if t == b"IDAT": idat += d
        i += 12 + n
    r = zlib.decompress(idat); st = W * 4; prev = bytearray(st); px = []; o = 0
    for y in range(H):
        f = r[o]; l = bytearray(r[o + 1:o + 1 + st]); o += 1 + st
        for x in range(st):
            a = l[x - 4] if x >= 4 else 0; c = prev[x]; d = prev[x - 4] if x >= 4 else 0
            if f == 1: l[x] = (l[x] + a) & 255
            elif f == 2: l[x] = (l[x] + c) & 255
            elif f == 3: l[x] = (l[x] + (a + c) // 2) & 255
            elif f == 4:
                q = a + c - d; pa, pb, pc = abs(q - a), abs(q - c), abs(q - d)
                l[x] = (l[x] + (a if pa <= pb and pa <= pc else c if pb <= pc else d)) & 255
        px.append(l); prev = l
    return W, H, px

def tulis(p, W, H, px):
    def cuk(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d))
    raw = b"".join(b"\0" + bytes(l) for l in px)
    Path(p).write_bytes(b"\x89PNG\r\n\x1a\n" + cuk(b"IHDR", struct.pack(">IIBBBBB", W, H, 8, 6, 0, 0, 0)) +
                        cuk(b"IDAT", zlib.compress(raw, 9)) + cuk(b"IEND", b""))

def baris_tinta(W, H, px, ambang=24):
    """rentang baris yang berisi tinta, dipisah oleh baris kosong"""
    ada = [any(px[y][x * 4 + 3] > ambang for x in range(W)) for y in range(H)]
    out = []; y = 0
    while y < H:
        if ada[y]:
            a = y
            while y < H and ada[y]: y += 1
            out.append((a, y - 1))
        else: y += 1
    return out

def potong(W, H, px, y0, y1):
    """pangkas ke baris y0..y1, lalu ke kolom yang berisi tinta"""
    rows = px[y0:y1 + 1]
    xs = [x for r in rows for x in range(W) if r[x * 4 + 3] > 0]
    x0, x1 = min(xs), max(xs)
    return x1 - x0 + 1, len(rows), [r[x0 * 4:(x1 + 1) * 4] for r in rows]

def warnai_merah(px, warna):
    """Merah gelap PolGov diganti warna; jingga dan alfa tepi tidak berubah. Rona memisahkan keduanya bersih (0-8° vs 28-36°)."""
    out = []
    for r in px:
        l = bytearray(r)
        for x in range(0, len(l), 4):
            if l[x + 3] and colorsys.rgb_to_hsv(l[x] / 255, l[x + 1] / 255, l[x + 2] / 255)[0] * 360 % 360 < 18:
                l[x:x + 3] = bytes(warna)
        out.append(l)
    return out

if __name__ == "__main__":
    tuj = ROOT / "assets/lockup"; tuj.mkdir(exist_ok=True)
    for asal, hasil in (("logo.png", "eppos.png"), ("logo-inverse.png", "eppos-inverse.png")):
        W, H, px = baca(ROOT / "assets" / asal)
        w, h, p = potong(W, H, px, 0, H - 1)
        tulis(tuj / hasil, w, h, p)
    W, H, px = baca(ROOT / "assets/logo-polgov.png")
    w, h, p = potong(W, H, px, 4, 91)
    tulis(tuj / "polgov.png", w, h, p)
    # versi permukaan gelap: merah #881810 hanya 1,9:1 di atas navy, jadi GOV dan taglinenya memakai krem wordmark EPPOS
    tulis(tuj / "polgov-inverse.png", w, h, warnai_merah(p, bytes.fromhex("f0ead8")))
    for f in sorted(tuj.glob("*.png")): print(f.name, baca(f)[:2], f.stat().st_size)
