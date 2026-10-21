#!/usr/bin/env python3
"""Сверка GAMET Мурманска с фактом METAR/SYNOP по районам.

Берёт бюллетени из kola-meteo/gamet-archive/*.json, наблюдения за срок —
METAR из aviationweather.gov (до 15 сут назад) и SYNOP из OGIMET,
границы районов — kola-meteo/gamet_areas.json. Пишет kola-meteo/gamet_verif.json.
Только для анализа, не официальная оценка оправдываемости.
"""
import glob, json, os, re, sys
from datetime import datetime, timedelta, timezone

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "gamet_verif.json")
# высота станций, м (приблизительно)
ELEV = {"ULMM": 81, "22003": 11, "22004": 165, "22028": 31, "22101": 97, "22106": 102, "22113": 51,
        "22127": 158, "22212": 126, "22213": 148, "22217": 26, "22235": 156, "22249": 135, "22312": 17,
        "22324": 38, "22334": 38, "22349": 13}
WX = ["TS", "CB", "FG", "BR", "DZ", "SHRA", "SHSN", "RA", "SN", "FZRA", "FZDZ", "GR"]
RU = [("гроза", "TS"), ("туман", "FG"), ("дымка", "BR"), ("мгла", "BR"), ("морось", "DZ"), ("ливнев", "SH"),
      ("ливень", "SH"), ("снег", "SN"), ("дожд", "RA"), ("град", "GR")]
SIGNIF = {"FG", "TS", "DZ", "SN", "GR", "FZRA", "FZDZ", "CB", "BR"}  # для «пропущено» (дождь/ливень GAMET не обязан давать)
KEYS = ["SFC VIS", "SFC WIND", "SIGWX", "MT OBSC", "SIG CLD", "ICE", "TURB", "MTW", "SIGMETS APPLICABLE",
        "PSYS", "WIND/T", "CLD", "FZLVL", "MNM QNH", "VA"]


def inpoly(lon, lat, r):
    c, j = False, len(r) - 1
    for i in range(len(r)):
        if (r[i][1] > lat) != (r[j][1] > lat) and lon < (r[j][0] - r[i][0]) * (lat - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]:
            c = not c
        j = i
    return c


def area_list(s):
    out = set()
    for t in re.split(r"\s*,\s*", s.strip()):
        m = re.fullmatch(r"(\d+)-(\d+)", t)
        if m:
            out |= {str(i) for i in range(int(m[1]), int(m[2]) + 1)}
        elif t:
            out.add(t)
    return out


def sections(text):
    body = re.sub(r"^.*?BLW FL\d+\s*", "", text).rstrip("= ")
    keys = sorted(KEYS, key=len, reverse=True)
    parts = re.split(r"\s*(SECN I{1,2}(?=\s)|(?:%s)(?=:)):?\s" % "|".join(re.escape(k) for k in keys), " " + body)
    sec = {}
    for i in range(1, len(parts), 2):
        if not parts[i].startswith("SECN"):
            sec[parts[i]] = parts[i + 1].strip()
    return sec


def el_areas(v, default):
    a = set()
    for m in re.finditer(r"AREA ([0-9A-Z,\-]+)", v):
        a |= area_list(m[1])
    return a or default


def parse_bulletin(b):
    h = b["header"]
    m = re.search(r"VALID (\d\d)(\d\d)(\d\d)/(\d\d)(\d\d)(\d\d)", h)
    vf = datetime.fromisoformat(b["valid_from"].replace("Z", "+00:00"))
    end = vf.replace(hour=0, minute=0) + timedelta(days=(int(m[4]) - int(m[1])) % 28, hours=int(m[5]), minutes=int(m[6]))
    fa = re.search(r"FIR/(?:MURMANSK )?([0-9A-Z,\-]+) BLW", h)
    areas = area_list(fa[1]) if fa else set()
    s = sections(b["text"])
    fc = {"areas": areas, "start": vf, "end": end}
    if "SFC VIS" in s:
        v = s["SFC VIS"]
        main = re.search(r"\b(\d{4})M\b", v)
        lca = re.search(r"LCA (\d{4})M", v)
        fc["vis"] = {"main": int(main[1]) if main else None, "lca": int(lca[1]) if lca else None,
                     "areas": el_areas(v, areas)}
    wx = set()
    for k in ("SFC VIS", "SIGWX", "SIG CLD"):
        for t in s.get(k, "").split():
            for w in WX:
                if t == w or t.endswith(w) and len(t) <= len(w) + 2:
                    wx.add("SH" if w.startswith("SH") else w)
    fc["wx"] = wx
    bases = []
    for k in ("SIG CLD", "CLD"):
        for mm in re.finditer(r"(LCA )?(?:BKN|OVC)(?: [A-Z]{2})? (\d{3})/(\w+?)M", s.get(k, "")):
            bases.append((int(mm[2]), bool(mm[1])))
    if bases:
        fc["cld"] = {"min": min(b[0] for b in bases), "main": min([b[0] for b in bases if not b[1]] or [None], key=lambda x: x or 99999),
                     "areas": el_areas(s.get("SIG CLD", "") + " " + s.get("CLD", ""), areas)}
    q = re.search(r"(\d{3,4})HPA", s.get("MNM QNH", ""))
    if q:
        fc["qnh"] = int(q[1])
    fz = re.search(r"(\d{3,4})M", s.get("FZLVL", ""))
    if fz:
        fc["fzlvl"] = int(fz[1])
    return fc


_SRC = open(os.path.join(BASE, "fetch_kola.py"), encoding="utf-8").read()
_NS = {}
exec(_SRC[:_SRC.index("data = {")], _NS)  # get, parse_synop, STATIONS, AIRPORTS без запуска сбора
_METAR = None


def metar_hist(hours):
    global _METAR
    if _METAR is None:
        try:
            _METAR = json.loads(_NS["get"]("https://aviationweather.gov/api/data/metar?ids=" + ",".join(_NS["AIRPORTS"]) +
                                           "&format=json&hours=" + str(min(hours, 360))))
        except Exception as e:
            print("METAR error", e); _METAR = []
    return _METAR


def metar_vis(m):
    raw = m.get("rawOb", "")
    if " CAVOK" in raw:
        return 9999
    t = re.search(r"\s(\d{4})(?:NDV)?\s", raw)
    if t:
        return int(t[1])
    v = str(m.get("visib", ""))
    try:
        return 9999 if "+" in v else round(float(v) * 1609)
    except ValueError:
        return None


def observations(start, end, oldest_h):
    """{станция: [наблюдения]} за срок: METAR aviationweather + SYNOP OGIMET."""
    obs, pos = {}, {}
    for m in metar_hist(oldest_h):
        t = datetime.fromtimestamp(m["obsTime"], timezone.utc)
        if not (start <= t <= end):
            continue
        cl = [c.get("base") for c in (m.get("clouds") or []) if c.get("cover") in ("BKN", "OVC", "VV", "OVX") and c.get("base") is not None]
        k = m["icaoId"]
        pos[k] = (m["lat"], m["lon"])
        obs.setdefault(k, []).append({"t": t.strftime("%d%H%MZ"), "vis": metar_vis(m), "ceil": round(min(cl) * 0.3048) if cl else None,
                                      "qnh": m.get("altim"), "wx": metar_wx(m.get("rawOb", ""))})
    try:
        txt = _NS["get"]("https://www.ogimet.com/cgi-bin/getsynop?block=22&begin=%s&end=%s" % (start.strftime("%Y%m%d%H%M"), end.strftime("%Y%m%d%H%M")))
    except Exception as e:
        print("SYNOP error", e); txt = ""
    for line in txt.splitlines():
        p = line.split(",", 6)
        if len(p) < 7 or p[0] not in _NS["STATIONS"]:
            continue
        r = _NS["parse_synop"](p[6].rstrip("="))
        if not r:
            continue
        _, lat, lon = _NS["STATIONS"][p[0]]
        pos[p[0]] = (lat, lon)
        obs.setdefault(p[0], []).append({"t": "".join(p[3:5]) + "Z", "vis": r["vis"] * 1000, "ceil": r["cloud"] if r["cloud"] < 2500 else None,
                                         "qnh": r.get("press"), "wx": synop_wx(r.get("phen"))})
    return obs, pos


def synop_wx(p):
    p = (p or "").lower()
    return {c for k, c in RU if k in p}


def metar_wx(raw):
    out = set()
    for t in raw.split()[3:]:
        if re.fullmatch(r"(\+|-|VC)?(SH|FZ|TS)?(RA|SN|DZ|GR|GS|PL)*|(\+|-|VC)?(FG|BR|BCFG|MIFG|PRFG|FZFG|TS|TSRA)", t) and len(t) > 1:
            for w in ("TS", "FG", "BR", "DZ", "SN", "RA", "GR"):
                if w in t:
                    out.add(w)
            if t.lstrip("+-").startswith("SH"):
                out.add("SH")
    return out


def verify(b, polys):
    fc = parse_bulletin(b)
    oldest_h = int((datetime.now(timezone.utc) - fc["start"]).total_seconds() // 3600) + 2
    obs, pos = observations(fc["start"], fc["end"], oldest_h)
    st_area = {k: {f["properties"]["area"] for f in polys if inpoly(lo, la, f["geometry"]["coordinates"][0])} for k, (la, lo) in pos.items()}
    res = {"header": b["header"], "valid_from": b["valid_from"], "valid_to": fc["end"].strftime("%Y-%m-%dT%H:%MZ"),
           "obs": sum(len(v) for v in obs.values())}

    def stations(areas):
        return [k for k, a in st_area.items() if a & areas and k in obs]


    if not obs:
        res["status"] = "нет наблюдений"
        return res
    # видимость
    if "vis" in fc:
        v = fc["vis"]
        sts = stations(v["areas"])
        if sts:
            mins = {k: min(o["vis"] for o in obs[k] if o["vis"] is not None) for k in sts if any(o["vis"] is not None for o in obs[k])}
            if mins:
                worst = min(mins, key=mins.get)
                thr = v["lca"] or v["main"]
                verdict = "хуже" if mins[worst] < thr else ("лучше" if thr < 5000 and min(mins.values()) >= 5000 else "совпало")
                res["vis"] = {"fc": v["main"], "fc_lca": v["lca"], "obs_min": mins[worst], "obs_station": worst,
                              "stations": len(mins), "verdict": verdict}
    # облачность (м над уровнем моря)
    if "cld" in fc:
        c = fc["cld"]
        sts = stations(c["areas"])
        vals = {}
        for k in sts:
            cs = [o["ceil"] for o in obs[k] if o["ceil"] is not None]
            if cs:
                vals[k] = min(cs) + ELEV.get(k, 0)
        if vals:
            worst = min(vals, key=vals.get)
            res["cld"] = {"fc_min": c["min"], "obs_min": vals[worst], "obs_station": worst, "stations": len(vals),
                          "verdict": "хуже" if vals[worst] < c["min"] - 30 else ("лучше" if vals[worst] > c["min"] * 3 and c["min"] < 300 else "совпало")}
    # QNH
    if "qnh" in fc:
        qs = [(o["qnh"], k) for k in stations(fc["areas"]) for o in obs[k] if o["qnh"]]
        if qs:
            q, k = min(qs)
            res["qnh"] = {"fc": fc["qnh"], "obs_min": round(q, 1), "obs_station": k, "verdict": "хуже" if q < fc["qnh"] - 0.5 else "совпало"}
    # явления
    sts = stations(fc["areas"])
    if not sts:
        res["status"] = "нет станций в районах"
        return res
    seen = set()
    for k in sts:
        for o in obs[k]:
            seen |= o["wx"]
    res["wx"] = {"fc": sorted(fc["wx"]), "obs": sorted(seen),
                 "hit": sorted(fc["wx"] & seen), "miss": sorted((seen - fc["wx"]) & SIGNIF),
                 "false": sorted(fc["wx"] - seen)}
    res["stations"] = sorted(sts)
    res["status"] = "ok"
    return res


def main():
    now = datetime.now(timezone.utc)
    try:
        prev = json.load(open(OUT))
    except Exception:
        prev = {"items": []}
    done = {(i["header"], i["valid_from"]) for i in prev.get("items", []) if i.get("status") in ("ok", "нет станций в районах")}
    polys = json.load(open(os.path.join(BASE, "gamet_areas.json")))["features"]
    items = [i for i in prev.get("items", []) if (i["header"], i["valid_from"]) in done]
    for f in sorted(glob.glob(os.path.join(BASE, "gamet-archive", "20*.json"))):
        for b in json.load(open(f)).get("items", []):
            key = (b["header"], b["valid_from"])
            if key in done:
                continue
            fc = parse_bulletin(b)
            if fc["end"] + timedelta(minutes=45) > now and not os.environ.get("VERIFY_ALL"):
                continue
            r = verify(b, polys)
            items = [i for i in items if (i["header"], i["valid_from"]) != key] + [r]
            if r.get("status") != "нет наблюдений":
                done.add(key)
    items.sort(key=lambda i: i["valid_from"])
    summ = {}
    for el in ("vis", "cld", "qnh"):
        c = {"хуже": 0, "совпало": 0, "лучше": 0}
        for i in items:
            if el in i:
                c[i[el]["verdict"]] += 1
        summ[el] = c
    ph = {}
    for i in items:
        w = i.get("wx")
        if not w:
            continue
        for x in w["hit"]:
            ph.setdefault(x, {"hit": 0, "miss": 0, "false": 0})["hit"] += 1
        for x in w["false"]:
            ph.setdefault(x, {"hit": 0, "miss": 0, "false": 0})["false"] += 1
        for x in w["miss"]:
            ph.setdefault(x, {"hit": 0, "miss": 0, "false": 0})["miss"] += 1
    summ["wx"] = ph
    summ["bulletins"] = sum(1 for i in items if i.get("status") == "ok")
    out = {"generated": now.strftime("%Y-%m-%dT%H:%MZ"),
           "note": "Автоматическая сверка для анализа, не официальная оценка оправдываемости. хуже = факт хуже прогноза.",
           "summary": summ, "items": items}
    json.dump(out, open(OUT, "w"), ensure_ascii=False, indent=1)
    print("verified", summ["bulletins"], "bulletins")


if __name__ == "__main__":
    main()
