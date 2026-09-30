"""Data ingestion: Open-Meteo (NWP met + CAMS composition) and NASA FIRMS active fires."""
import io
import time
import numpy as np
import pandas as pd
import requests
from .config import *

def _get(url, params, tries=5):
    for i in range(tries):
        try:
            r = requests.get(url, params=params, timeout=90)
            if r.status_code == 200:
                return r.json()
        except (requests.RequestException, ValueError):
            time.sleep(3)
            continue
        if r.status_code == 429:
            time.sleep(20 * (i + 1))
            continue
        time.sleep(2)
    raise RuntimeError(f"request failed: {url}")

def _multi(url, lats, lons, hourly, extra):
    out = _get(url, dict(latitude=",".join(map(str, lats)), longitude=",".join(map(str, lons)),
                         hourly=",".join(hourly), timezone=TZ, **extra))
    return out if isinstance(out, list) else [out]

def _frames(res, names):
    dfs = []
    for name, r in zip(names, res):
        d = pd.DataFrame(r["hourly"])
        d["time"] = pd.to_datetime(d["time"])
        d["station"] = name
        dfs.append(d)
    return dfs

def fetch_station_series(mode, start=None, end=None):
    """mode='history' -> (start,end) archive; mode='forecast' -> past 3d + next 4d.
    Returns dict var -> array (S, T) plus time index."""
    if mode == "history":
        met_url = "https://historical-forecast-api.open-meteo.com/v1/forecast"
        aq_url = "https://air-quality-api.open-meteo.com/v1/air-quality"
        extra = dict(start_date=start, end_date=end, wind_speed_unit="ms")
        extra_aq = dict(start_date=start, end_date=end)
    else:
        met_url = "https://api.open-meteo.com/v1/forecast"
        aq_url = "https://air-quality-api.open-meteo.com/v1/air-quality"
        extra = dict(past_days=3, forecast_days=5, wind_speed_unit="ms")
        extra_aq = dict(past_days=3, forecast_days=5)
    names = [s[0] for s in STATIONS]
    met_dfs, aq_dfs = [], []
    for i in range(0, len(STATIONS), 10):
        chunk = STATIONS[i:i + 10]
        la, lo = [c[1] for c in chunk], [c[2] for c in chunk]
        met_dfs += _frames(_multi(met_url, la, lo, MET_VARS, extra), [c[0] for c in chunk])
        aq_dfs += _frames(_multi(aq_url, la, lo, AQ_VARS, extra_aq), [c[0] for c in chunk])
    met = pd.concat(met_dfs); aq = pd.concat(aq_dfs)
    df = met.merge(aq, on=["station", "time"], how="outer")
    times = np.array(sorted(df["time"].unique()))
    arrs = {}
    for v in MET_VARS + AQ_VARS:
        p = df.pivot(index="station", columns="time", values=v).reindex(index=names, columns=times)
        arrs[v] = p.to_numpy(dtype=float)
    return times, arrs

def fetch_wind_grid(hours_from_now_start_iso=None):
    """Regional wind/PBL grid for the plume engine. Returns times, lats, lons and (T,Ny,Nx) arrays."""
    pts = [(la, lo) for la in WIND_LATS for lo in WIND_LONS]
    res = []
    for i in range(0, len(pts), 55):
        ch = pts[i:i + 55]
        res += _multi("https://api.open-meteo.com/v1/forecast", [p[0] for p in ch], [p[1] for p in ch],
                      ["wind_speed_10m", "wind_direction_10m", "wind_speed_925hPa",
                       "wind_direction_925hPa", "boundary_layer_height"],
                      dict(past_days=1, forecast_days=5, wind_speed_unit="ms"))
    times = pd.to_datetime(res[0]["hourly"]["time"]).to_numpy()
    ny, nx = len(WIND_LATS), len(WIND_LONS)
    out = {}
    for v in ["wind_speed_10m", "wind_direction_10m", "wind_speed_925hPa", "wind_direction_925hPa", "boundary_layer_height"]:
        out[v] = np.array([r["hourly"][v] for r in res], dtype=float).reshape(ny, nx, -1).transpose(2, 0, 1)
    return times, out

def fetch_fires():
    """Real NASA FIRMS VIIRS 24h detections over Punjab/Haryana (public feed, no key needed)."""
    url = "https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_South_Asia_24h.csv"
    r = requests.get(url, timeout=90); r.raise_for_status()
    d = pd.read_csv(io.StringIO(r.text))
    d = d[(d.latitude.between(*FIRE_BBOX["lat"])) & (d.longitude.between(*FIRE_BBOX["lon"]))]
    d = d[d.confidence.astype(str).str.lower().isin(["n", "h", "nominal", "high"])]
    return d[["latitude", "longitude", "frp"]].reset_index(drop=True)

def synthetic_peak_fires(seed=7, n=650):
    """CLEARLY-LABELLED scenario: a typical early-November stubble-burning day (not real data)."""
    rng = np.random.default_rng(seed)
    centers = [(30.25, 75.85, 1.4), (30.33, 76.40, 1.2), (30.90, 75.85, 1.0), (30.20, 74.95, 1.1),
               (30.93, 74.60, 0.8), (31.63, 74.87, 0.8), (29.68, 76.99, 1.0), (29.80, 76.40, 1.1),
               (29.97, 76.87, 0.9), (29.32, 76.31, 0.7), (29.50, 75.45, 0.6), (29.53, 75.03, 0.6)]
    w = np.array([c[2] for c in centers]); w /= w.sum()
    idx = rng.choice(len(centers), n, p=w)
    lat = np.array([centers[i][0] for i in idx]) + rng.normal(0, 0.22, n)
    lon = np.array([centers[i][1] for i in idx]) + rng.normal(0, 0.25, n)
    frp = rng.lognormal(2.6, 0.7, n)
    return pd.DataFrame(dict(latitude=lat, longitude=lon, frp=frp))
