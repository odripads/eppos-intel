#!/usr/bin/env python3
"""Kode QR tanpa dependensi: mode byte, koreksi galat M, versi 1-6. Cukup untuk satu URL pendek di pelat presentasi.
Hasil: data/qr.json {url, n, d}, d = satu path SVG per modul gelap. Dipakai: python3 scripts/qr.py [URL]"""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
# (kapasitas data byte, EC per blok, jumlah blok) untuk tingkat M
VERSI = {1: (16, 10, 1), 2: (28, 16, 1), 3: (44, 26, 1), 4: (64, 18, 2), 5: (86, 24, 2), 6: (108, 16, 4)}
EXP, LOG = [0] * 512, [0] * 256
x = 1
for i in range(255):
    EXP[i] = x; LOG[x] = i
    x <<= 1
    if x & 256: x ^= 0x11d
for i in range(255, 512): EXP[i] = EXP[i - 255]
def kali(a, b): return 0 if not a or not b else EXP[LOG[a] + LOG[b]]
def pembangkit(n):
    g = [1]
    for i in range(n):
        h = [0] * (len(g) + 1)
        for j, c in enumerate(g):
            h[j] ^= c; h[j + 1] ^= kali(c, EXP[i])
        g = h
    return g
def rs(data, n):
    g, sisa = pembangkit(n), list(data) + [0] * n
    for i in range(len(data)):
        c = sisa[i]
        if c:
            for j in range(1, len(g)): sisa[i + j] ^= kali(g[j], c)
    return sisa[len(data):]

def buat(url):
    b = url.encode()
    v = next(k for k, (c, _, _) in VERSI.items() if len(b) + 2 <= c)
    cap, ec, blok = VERSI[v]
    bit = "0100" + format(len(b), "08b") + "".join(format(c, "08b") for c in b)
    bit += "0" * min(4, cap * 8 - len(bit)); bit += "0" * (-len(bit) % 8)
    data = [int(bit[i:i + 8], 2) for i in range(0, len(bit), 8)]
    pad = 0
    while len(data) < cap: data.append((0xEC, 0x11)[pad % 2]); pad += 1
    k = cap // blok
    bagi = [data[i * k:(i + 1) * k] for i in range(blok)]
    ecs = [rs(d, ec) for d in bagi]
    susun = [d[i] for i in range(k) for d in bagi] + [e[i] for i in range(ec) for e in ecs]
    n = 17 + 4 * v
    M = [[None] * n for _ in range(n)]
    def finder(r0, c0):
        for r in range(-1, 8):
            for c in range(-1, 8):
                if 0 <= r0 + r < n and 0 <= c0 + c < n:
                    M[r0 + r][c0 + c] = int(0 <= r <= 6 and 0 <= c <= 6 and (r in (0, 6) or c in (0, 6) or (2 <= r <= 4 and 2 <= c <= 4)))
    finder(0, 0); finder(0, n - 7); finder(n - 7, 0)
    for i in range(8, n - 8): M[6][i] = M[i][6] = (i + 1) % 2
    if v >= 2:
        a = n - 7
        for r in range(a - 2, a + 3):
            for c in range(a - 2, a + 3):
                M[r][c] = int(max(abs(r - a), abs(c - a)) != 1)
    M[n - 8][8] = 1
    cadang = [[M[r][c] is not None for c in range(n)] for r in range(n)]
    for i in range(9):
        if i < n: cadang[8][i] = cadang[i][8] = True
    for i in range(8): cadang[8][n - 1 - i] = cadang[n - 1 - i][8] = True
    urut = []
    c, naik = n - 1, True
    while c > 0:
        if c == 6: c -= 1
        for r in (range(n - 1, -1, -1) if naik else range(n)):
            for d in (c, c - 1):
                if not cadang[r][d]: urut.append((r, d))
        naik = not naik; c -= 2
    bits = "".join(format(x, "08b") for x in susun)
    TOPENG = [lambda r, c: (r + c) % 2 == 0, lambda r, c: r % 2 == 0, lambda r, c: c % 3 == 0, lambda r, c: (r + c) % 3 == 0,
              lambda r, c: (r // 2 + c // 3) % 2 == 0, lambda r, c: r * c % 2 + r * c % 3 == 0,
              lambda r, c: (r * c % 2 + r * c % 3) % 2 == 0, lambda r, c: ((r + c) % 2 + r * c % 3) % 2 == 0]
    def format_bit(mask):
        d = (0 << 3 | mask) << 10                 # tingkat M = 00
        g = d
        for i in range(14, 9, -1):
            if g >> i & 1: g ^= 0x537 << (i - 10)
        return (d | g) ^ 0x5412
    def jadi(mask):
        A = [row[:] for row in M]
        for i, (r, c) in enumerate(urut):
            b_ = int(bits[i]) if i < len(bits) else 0
            A[r][c] = b_ ^ int(TOPENG[mask](r, c))
        f = format_bit(mask)
        for i in range(15):
            b_ = f >> i & 1
            A[i if i < 6 else i + 1 if i < 8 else 8][8 if i < 8 else 7 if i == 8 else 14 - i] = b_   # salinan pertama
            A[8 if i < 8 else n - 15 + i][n - 1 - i if i < 8 else 8] = b_                            # salinan kedua
        return A
    def denda(A):
        p = 0
        for g in (A, [list(k) for k in zip(*A)]):
            for row in g:
                run = 1
                for i in range(1, n):
                    run = run + 1 if row[i] == row[i - 1] else 1
                    if run == 5: p += 3
                    elif run > 5: p += 1
        for r in range(n - 1):
            for c in range(n - 1):
                if A[r][c] == A[r][c + 1] == A[r + 1][c] == A[r + 1][c + 1]: p += 3
        hitam = sum(map(sum, A)) * 100 // (n * n)
        return p + abs(hitam - 50) // 5 * 10
    return min((jadi(m) for m in range(8)), key=denda), n

url = sys.argv[1] if len(sys.argv) > 1 else "https://eppos-outlook.vercel.app"
A, n = buat(url)
d = "".join(f"M{c} {r}h1v1h-1z" for r in range(n) for c in range(n) if A[r][c])
(ROOT / "data/qr.json").write_text(json.dumps({"url": url, "n": n, "d": d}))
print(url, f"{n}x{n}")
