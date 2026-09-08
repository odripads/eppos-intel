"""Polite HTTP: honest user-agent, robots.txt, per-host rate limit, exponential backoff, raw-HTML archiving."""
from __future__ import annotations
import hashlib, json, time, datetime as dt, urllib.robotparser
from pathlib import Path
from urllib.parse import urlparse
import requests

UA = "EPPOS-DPP-UGM research collector/0.1 (academic study group, Dept. of Politics and Government UGM)"
MIN_GAP = 3.0            # seconds between requests to the same host
_last: dict[str, float] = {}
_robots: dict[str, urllib.robotparser.RobotFileParser | None] = {}
RAW = Path(__file__).resolve().parent.parent / "raw"
session = requests.Session(); session.headers["User-Agent"] = UA

def now_iso(): return dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="seconds")

def allowed(url: str) -> bool:
    host = urlparse(url).netloc
    if host.endswith("web.archive.org"): return True
    if host not in _robots:
        rp = urllib.robotparser.RobotFileParser()
        try:
            r = session.get(f"https://{host}/robots.txt", timeout=20)
            rp.parse(r.text.splitlines() if r.status_code == 200 else [])
        except requests.RequestException:
            rp.parse([])
        _robots[host] = rp
    return _robots[host].can_fetch(UA, url)

def get(url: str, timeout=60, retries=4, params=None) -> requests.Response | None:
    host = urlparse(url).netloc
    if not allowed(url):
        print(f"  robots.txt melarang: {url}"); return None
    for attempt in range(retries):
        gap = MIN_GAP - (time.time() - _last.get(host, 0))
        if gap > 0: time.sleep(gap)
        _last[host] = time.time()
        try:
            r = session.get(url, timeout=timeout, params=params)
        except requests.RequestException as e:
            print(f"  gagal ({e.__class__.__name__}) {url}"); time.sleep(10 * (attempt + 1)); continue
        if r.status_code == 200: return r
        if r.status_code in (403, 429) or r.status_code >= 500:
            wait = 30 * (2 ** attempt)
            print(f"  HTTP {r.status_code} dari {host}; menunggu {wait}s"); time.sleep(wait); continue
        return r  # 404 etc: let caller decide
    return None

def archive_raw(outlet_id: str, url: str, body: bytes, kind="html") -> str:
    """Store the raw response next to extracted text. Returns the relative path."""
    h = hashlib.sha1(url.encode()).hexdigest()[:20]
    p = RAW / outlet_id / kind; p.mkdir(parents=True, exist_ok=True)
    fp = p / f"{h}.{ 'json' if kind=='json' else 'html'}"
    fp.write_bytes(body)
    return str(fp.relative_to(RAW.parent))

def append_jsonl(path: Path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a") as f:
        for r in rows: f.write(json.dumps(r, ensure_ascii=False) + "\n")
