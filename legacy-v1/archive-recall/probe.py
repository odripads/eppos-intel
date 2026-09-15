import json, re, sys, time, urllib.request, urllib.parse, urllib.error, ssl
ssl_ctx = ssl.create_default_context(); ssl_ctx.check_hostname=False; ssl_ctx.verify_mode=ssl.CERT_NONE
UA = "EPPOS-DPP-UGM academic research probe (archive-recall test)"
# outlet -> list of domains (current first, historical after)
OUTLETS = {
 "Tribun Timur": ["makassar.tribunnews.com","tribun-timur.com"],
 "Harian Fajar": ["fajar.co.id"],
 "Rakyat Sulsel": ["rakyatsulsel.co","rakyatsulsel.com"],
 "Antara Sulsel": ["makassar.antaranews.com","antarasulsel.com"],
 "Kabar Makassar": ["kabarmakassar.com"],
 "Ujung Pandang Ekspres": ["upeks.co.id"],
 "Berita Kota Makassar": ["beritakotamakassar.com"],
 "Sulsel Satu": ["sulselsatu.com"],
 "Terkini.id": ["makassar.terkini.id","terkini.id"],
 "Gosulsel": ["gosulsel.com"],
 "Inikata": ["inikata.com"],
 "Sindo Makassar": ["makassar.sindonews.com"],
}
YEARS = [2014,2015,2016,2017]
LOG = open(sys.argv[1]+".log","a")
def log(*a):
    print(*a, file=LOG, flush=True); print(*a, flush=True)

def get(url, timeout=60):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    r = urllib.request.urlopen(req, timeout=timeout, context=ssl_ctx)
    return r.status, dict(r.headers), r.read()

def cdx_year(domain, year):
    q = urllib.parse.urlencode({"url": domain, "matchType":"domain", "from": str(year), "to": str(year),
        "filter": ["statuscode:200","mimetype:text/html"], "collapse":"urlkey",
        "fl":"original", "limit":"20000"}, doseq=True)
    for attempt in range(3):
        try:
            st, hd, body = get("https://web.archive.org/cdx/search/cdx?"+q, timeout=240)
            urls = [l for l in body.decode("utf-8","ignore").split("\n") if l.strip()]
            dated = sum(1 for u in urls if re.search(rf"/{year}/\d{{2}}/|/{year}\d{{4}}|-{year}-|\?{year}", u))
            return {"urls": len(urls), "year_in_path": dated, "capped": len(urls)>=20000}
        except urllib.error.HTTPError as e:
            err = f"HTTP {e.code}"
        except Exception as e:
            err = str(e)[:60]
        time.sleep(25*(attempt+1))
    return {"error": err}

def wp_probe(domain):
    out = {}
    base = f"https://{domain}"
    try:
        st, hd, body = get(base+"/wp-json/wp/v2/posts?per_page=1&order=asc&orderby=date", timeout=40)
        data = json.loads(body)
        if isinstance(data, list) and data:
            out["wp_json"] = True; out["earliest_post"] = data[0].get("date"); out["total_posts"] = hd.get("X-WP-Total")
            out["per_year"] = {}
            for y in YEARS+[2018,2019]:
                try:
                    st, hd, body = get(base+f"/wp-json/wp/v2/posts?per_page=1&after={y}-01-01T00:00:00&before={y}-12-31T23:59:59", timeout=40)
                    out["per_year"][y] = hd.get("X-WP-Total")
                except Exception as e:
                    out["per_year"][y] = f"err {str(e)[:30]}"
                time.sleep(1)
            return out
        out["wp_json"] = False; out["note"] = "no list"
    except urllib.error.HTTPError as e:
        out["wp_json"] = False; out["note"] = f"HTTP {e.code}"
    except Exception as e:
        out["wp_json"] = False; out["note"] = str(e)[:60]
    return out

results = {}
for name, domains in OUTLETS.items():
    results[name] = {}
    for d in domains:
        r = {"wp": wp_probe(d), "cdx": {}}
        for y in YEARS:
            r["cdx"][y] = cdx_year(d, y); time.sleep(4)
        results[name][d] = r
        log(json.dumps({"outlet": name, "domain": d, **r}, ensure_ascii=False))
    json.dump(results, open(sys.argv[1],"w"), ensure_ascii=False, indent=1)
log("PROBE_DONE")
