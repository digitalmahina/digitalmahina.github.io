#!/usr/bin/env python3
"""Сетка модели Open-Meteo над Кольским -> kola-meteo/grid.json (каждые 3 ч)"""
import json, sys, time, urllib.request, os
OUT = sys.argv[1] if len(sys.argv) > 1 else "kola-meteo/grid.json"
LAT0, LAT1, DLAT = 65.8, 70.3, 0.3
LON0, LON1, DLON = 28.0, 41.5, 0.6
lats = [round(LAT0 + i * DLAT, 2) for i in range(int((LAT1 - LAT0) / DLAT) + 1)]
lons = [round(LON0 + j * DLON, 2) for j in range(int((LON1 - LON0) / DLON) + 1)]
if os.environ.get("FORCE") != "1" and os.path.exists(OUT):
    try:
        g = json.load(open(OUT))["generated"]
        age = time.time() - time.mktime(time.strptime(g, "%Y-%m-%dT%H:%MZ")) + time.timezone * 0
        age = time.time() - __import__("calendar").timegm(time.strptime(g, "%Y-%m-%dT%H:%MZ"))
        if age < 170 * 60: print("grid свежая, пропуск"); sys.exit(0)
    except Exception as e: print("age check", e)
pts = [(la, lo) for la in lats for lo in lons]
VARS = "temperature_2m,dew_point_2m,cloud_cover_low,visibility,precipitation,wind_speed_10m,wind_direction_10m,wind_speed_925hPa,wind_direction_925hPa,temperature_925hPa"
res = []
for k in range(0, len(pts), 100):
    chunk = pts[k:k + 100]
    url = ("https://api.open-meteo.com/v1/forecast?latitude=" + ",".join(str(p[0]) for p in chunk) +
           "&longitude=" + ",".join(str(p[1]) for p in chunk) + "&hourly=" + VARS +
           "&wind_speed_unit=ms&forecast_hours=13&past_hours=0&timezone=GMT&cell_selection=nearest")
    for attempt in range(3):
        try:
            r = json.loads(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "kola-meteo"}), timeout=60).read())
            break
        except Exception as e:
            print("retry", e); time.sleep(10)
    else:
        sys.exit("Open-Meteo недоступен")
    res += r if isinstance(r, list) else [r]
times = res[0]["hourly"]["time"]
def col(v, f=lambda x: x):
    return [[None if (x := p["hourly"][v][t]) is None else f(x) for p in res] for t in range(len(times))]
r0 = lambda x: round(x)
r1 = lambda x: round(x, 1)
T, Td = col("temperature_2m", r1), col("dew_point_2m", r1)
low = col("cloud_cover_low", r0)
# оценка НГО: 125 м на градус дефицита точки росы, только при низкой облачности >= 50 %
base = [[(None if (T[t][i] is None or Td[t][i] is None or (low[t][i] or 0) < 50)
          else max(30, round(125 * (T[t][i] - Td[t][i])))) for i in range(len(res))] for t in range(len(times))]
data = {"generated": time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()), "model": "Open-Meteo best match (ICON/ECMWF/GFS)",
        "lats": lats, "lons": lons, "times": [t + "Z" for t in times],
        "fields": {"temp": T, "low": low, "base": base, "vis": col("visibility", lambda x: round(x / 100) / 10),
                   "precip": col("precipitation", r1), "ws10": col("wind_speed_10m", r0), "wd10": col("wind_direction_10m", r0),
                   "ws925": col("wind_speed_925hPa", r0), "wd925": col("wind_direction_925hPa", r0),
                   "t925": col("temperature_925hPa", r1)}}
os.makedirs(os.path.dirname(OUT) or ".", exist_ok=True)
json.dump(data, open(OUT, "w"), separators=(",", ":"))
print(len(pts), "points", len(times), "hours", os.path.getsize(OUT), "bytes")
