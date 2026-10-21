#!/usr/bin/env python3
"""Собирает METAR (aviationweather.gov) и SYNOP (OGIMET) по Кольскому в kola-meteo/data.json"""
import json, re, sys, time, urllib.request, datetime as dt

OUT = sys.argv[1] if len(sys.argv) > 1 else "kola-meteo/data.json"
UA = {"User-Agent": "kola-meteo/1.0 (github.com/digitalmahina)"}

AIRPORTS = {
 "ULMM": ("Мурманск", "Мурмаши"), "ENKR": ("Киркенес", "Норвегия"),
 "EFIV": ("Ивало", "Финляндия"), "EFKS": ("Куусамо", "Финляндия"),
}
STATIONS = {
 "22003": ("Вайда-Губа", 69.93, 31.98), "22004": ("Никель", 69.40, 30.23),
 "22012": ("Цып-Наволок", 69.73, 33.10), "22018": ("Ура-Губа", 69.28, 32.82),
 "22019": ("Полярное", 69.20, 33.47), "22028": ("Териберка", 69.20, 35.12),
 "22101": ("Янискоски", 68.97, 28.78), "22106": ("Падун", 68.62, 31.78),
 "22113": ("Мурманск", 68.97, 33.05), "22123": ("Туманная", 68.88, 35.67),
 "22127": ("Ловозеро", 68.00, 35.03), "22204": ("Ковдор", 67.57, 30.38),
 "22212": ("Мончегорск", 67.95, 32.92), "22213": ("Апатиты", 67.55, 33.33),
 "22214": ("Зашеек", 66.27, 31.10), "22217": ("Кандалакша", 67.15, 32.35),
 "22235": ("Краснощелье", 67.35, 37.05), "22249": ("Каневка", 67.13, 39.67),
 "22302": ("Зареченск", 66.67, 31.40), "22312": ("Ковда", 66.70, 32.87),
 "22324": ("Умба", 66.68, 34.35), "22334": ("Кашкаранцы", 66.35, 36.03),
 "22349": ("Пялица", 66.18, 39.53),
}

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
        return r.read().decode("utf-8", "replace")

def metars():
    out = []
    try:
        data = json.loads(get("https://aviationweather.gov/api/data/metar?ids=" + ",".join(AIRPORTS) + "&format=json"))
    except Exception as e:
        print("METAR error", e); return out
    for m in data:
        icao = m.get("icaoId")
        if icao not in AIRPORTS: continue
        kt = 0.514444
        vis = m.get("visib")
        if isinstance(vis, str): vis_m = 10000 if "+" in vis else int(float(vis.strip("+")) * 1609)
        else: vis_m = min(10000, int((vis or 10) * 1609))
        if re.search(r"\b9999\b|CAVOK", m.get("rawOb", "")): vis_m = 10000
        mv = re.search(r"(?:KT|MPS)\s+(?:\d{3}V\d{3}\s+)?(\d{4})\b", m.get("rawOb", ""))
        if mv: vis_m = min(10000, int(mv.group(1)) or 50)
        ceil = 99999
        for c in m.get("clouds", []) or []:
            if c.get("cover") in ("BKN", "OVC", "OVX") and c.get("base") is not None:
                ceil = min(ceil, c["base"])
        vv = re.search(r"\bVV(\d{3})\b", m.get("rawOb", ""))
        if vv: ceil = min(ceil, int(vv.group(1)) * 100)
        wdir = m.get("wdir"); wdir = wdir if isinstance(wdir, int) else 0
        t = dt.datetime.fromtimestamp(m.get("obsTime", 0), dt.timezone.utc)
        name, place = AIRPORTS[icao]
        out.append({"icao": icao, "name": name, "place": place, "lat": m["lat"], "lon": m["lon"],
            "cat": m.get("fltCat") or "VFR", "wdir": wdir,
            "wspd": round((m.get("wspd") or 0) * kt), "wgst": round((m.get("wgst") or 0) * kt) or None,
            "vis": vis_m, "ceil": ceil, "temp": m.get("temp"), "dew": m.get("dewp"),
            "qnh": m.get("altim"), "time": t.strftime("%H:%MZ"), "raw": m.get("rawOb", "")})
    return out

H_M = {"0": 25, "1": 75, "2": 150, "3": 250, "4": 450, "5": 800, "6": 1250, "7": 1750, "8": 2250, "9": 2600}
WW = [(range(40, 50), "туман"), (range(10, 11), "дымка"), (range(4, 6), "мгла/дымка"),
      (range(50, 60), "морось"), (range(60, 70), "дождь"), (range(70, 80), "снег"),
      (range(80, 85), "ливневый дождь"), (range(85, 91), "ливневый снег"), (range(91, 100), "гроза"),
      (range(20, 30), "осадки в последний час"), (range(36, 40), "метель")]

def vv_km(vv):
    v = int(vv)
    if v <= 50: return v / 10
    if 56 <= v <= 80: return v - 50
    if 81 <= v <= 89: return 30 + (v - 80) * 5
    return {90: 0.05, 91: 0.05, 92: 0.2, 93: 0.5, 94: 1, 95: 2, 96: 4, 97: 10, 98: 20, 99: 50}.get(v, 10)

def parse_synop(msg):
    g = msg.split()
    # g: AAXX YYGGi IIiii iRiXhVV Nddff ...
    i = g.index("AAXX") if "AAXX" in g else -1
    if i < 0 or len(g) < i + 5: return None
    yyggi, st, ir, nddff = g[i+1], g[i+2], g[i+3], g[i+4]
    if "NIL" in msg: return None
    r = {"st": st, "hour": yyggi[2:4]}
    unit_kt = yyggi[4] in "34"
    h, vv = ir[2], ir[3:5]
    r["cloud"] = 30 if h == "/" else H_M.get(h, 2500)
    try: r["vis"] = vv_km(vv)
    except: r["vis"] = 10
    N = nddff[0]
    dd, ff = nddff[1:3], nddff[3:5]
    try: r["wdir"] = int(dd) * 10 % 360
    except: r["wdir"] = 0
    try: r["wspd"] = int(ff)
    except: r["wspd"] = 0
    if unit_kt: r["wspd"] = round(r["wspd"] * 0.514444)
    r["phen"] = ""
    sec = g[i+5:]
    s3 = sec.index("333") if "333" in sec else len(sec)
    for x in sec[:s3]:
        if len(x) != 5: continue
        if x[0] == "1" and x[1] in "01" and x[2:].isdigit(): r["temp"] = (-1 if x[1] == "1" else 1) * int(x[2:]) / 10
        elif x[0] == "4" and x[1:].isdigit(): p = int(x[1:]) / 10; r["press"] = round(p + 1000 if p < 100 else p, 1)
        elif x[0] == "7" and x[1:3].isdigit():
            ww = int(x[1:3])
            for rg, txt in WW:
                if ww in rg: r["phen"] = txt; break
        elif x[0] == "8" and x[2] != "/" and x[1:2].isdigit():
            pass
    for x in sec[s3+1:]:
        if x.startswith("910") and x[3:].isdigit():
            gust = int(x[3:]); r["wgst"] = round(gust * 0.514444) if unit_kt else gust
    if N == "0" and r["cloud"] == 2500: r["phen"] = r["phen"] or "ясно"
    return r

def synops():
    now = dt.datetime.fromtimestamp(time.time(), dt.timezone.utc)
    begin = (now - dt.timedelta(hours=12)).strftime("%Y%m%d%H00")
    try:
        txt = get(f"https://www.ogimet.com/cgi-bin/getsynop?block=22&begin={begin}")
    except Exception as e:
        print("SYNOP error", e); return []
    latest = {}
    for line in txt.splitlines():
        parts = line.split(",", 6)
        if len(parts) < 7 or parts[0] not in STATIONS: continue
        key = "".join(parts[1:5])
        r = parse_synop(parts[6].rstrip("="))
        if not r: continue
        if parts[0] not in latest or key > latest[parts[0]][0]:
            latest[parts[0]] = (key, r)
    out = []
    for st, (k, r) in sorted(latest.items()):
        name, lat, lon = STATIONS[st]
        out.append({"id": st, "name": name, "lat": lat, "lon": lon, "temp": r.get("temp"),
            "wdir": r["wdir"], "wspd": r["wspd"], "wgst": r.get("wgst") or r["wspd"],
            "vis": r["vis"], "cloud": r["cloud"], "press": r.get("press"),
            "phen": ((r["phen"] or "без явлений") + " · " + r["hour"] + "Z")})
    return out

def tafs():
    out = {}
    try:
        for t in json.loads(get("https://aviationweather.gov/api/data/taf?ids=" + ",".join(AIRPORTS) + "&format=json")):
            if t.get("icaoId") in AIRPORTS and t.get("rawTAF"): out[t["icaoId"]] = t["rawTAF"]
    except Exception as e:
        print("TAF error", e)
    return out

# SIGMET по РПИ вокруг Кольского (Мурманск, Санкт-Петербург, Финляндия, Норвегия) + всё, что задевает район
SIG_FIRS = {"ULMM", "ULLL", "EFIN", "ENOR", "ENOB", "ULAA"}
def sigmets():
    out = []
    try:
        data = json.loads(get("https://aviationweather.gov/api/data/isigmet?format=json"))
    except Exception as e:
        print("SIGMET error", e); return out
    for g in data:
        cs = g.get("coords") or []
        while cs and isinstance(cs[0], list): cs = cs[0]
        cs = [c for c in cs if isinstance(c, dict)]
        near = any(64 <= c["lat"] <= 72 and 24 <= c["lon"] <= 46 for c in cs)
        if (g.get("validTimeTo") or 0) < time.time(): continue
        if (g.get("firId") or "")[:4] != "ULMM" and not near: continue
        out.append({"fir": g.get("firId"), "name": g.get("firName"), "hazard": g.get("hazard"), "qual": g.get("qualifier"),
                    "from": g.get("validTimeFrom"), "to": g.get("validTimeTo"), "base": g.get("base"), "top": g.get("top"),
                    "coords": [[c["lat"], c["lon"]] for c in cs], "raw": g.get("rawSigmet")})
    return out

data = {"generated": time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()), "metar": metars(), "synop": synops(), "taf": tafs(), "sigmet": sigmets()}
import os; os.makedirs(os.path.dirname(OUT) or ".", exist_ok=True)
json.dump(data, open(OUT, "w"), ensure_ascii=False, indent=1)
print(f"metar={len(data['metar'])} synop={len(data['synop'])} taf={len(data['taf'])} sigmet={len(data['sigmet'])}")
