"""Prospective verification.

Every live forecast the server produces is logged. Once the forecast hours have passed, they are scored against what
CAMS later reported for the same Delhi stations, next to the CAMS forecast issued at the same time and a
'no change' (persistence) forecast. This is a genuine out-of-sample test that grows the longer the server runs."""
import json
import time
import numpy as np
import pandas as pd
from .config import *
from . import data

VDIR = CACHE / "verification"
VDIR.mkdir(exist_ok=True)
KEEP = 80
N_DELHI = 11
BUCKETS = [("0-24h", 1, 24), ("25-48h", 25, 48), ("49-72h", 49, 72)]
_truth_cache = {}


def log_run(payload):
    if payload.get("scenario") != "live":
        return
    d = payload["delhi"]
    rec = dict(issued=payload["times"][0], times=payload["times"], ours=d["pm25"], cams=d["pm25_cams"],
               persistence=[d["pm25"][0]] * len(d["pm25"]), lo=d.get("pm25_lo"), hi=d.get("pm25_hi"))
    name = payload["times"][0].replace(":", "").replace("T", "_") + ".json"
    (VDIR / name).write_text(json.dumps(rec))
    for f in sorted(VDIR.glob("*.json"))[:-KEEP]:
        f.unlink()


def _truth():
    if time.time() - _truth_cache.get("t", 0) < 1800 and "v" in _truth_cache:
        return _truth_cache["v"]
    st = STATIONS[:N_DELHI]
    res = data._multi("https://air-quality-api.open-meteo.com/v1/air-quality", [s[1] for s in st], [s[2] for s in st],
                      ["pm2_5"], dict(past_days=14, forecast_days=1))
    arr = np.array([r["hourly"]["pm2_5"] for r in res], float)
    s = pd.Series(np.nanmean(arr, axis=0), index=pd.to_datetime(res[0]["hourly"]["time"]))
    _truth_cache.update(t=time.time(), v=s)
    return s


def evaluate():
    files = sorted(VDIR.glob("*.json"))
    if not files:
        return dict(logged=0, runs=0, points=0, buckets=[], message="No live forecasts logged yet. Leave the server running; each live forecast is scored once its hours have passed.")
    try:
        truth = _truth()
    except Exception as e:
        return dict(logged=len(files), runs=0, points=0, buckets=[], message=f"Could not fetch the latest observations ({e.__class__.__name__}).")
    cutoff = pd.Timestamp.now(tz=TZ).tz_localize(None) - pd.Timedelta(hours=3)   # recent hours are not settled yet
    acc = {b[0]: dict(o=[], c=[], p=[], inside=[]) for b in BUCKETS}
    used = 0
    for f in files:
        r = json.loads(f.read_text())
        t = pd.to_datetime(r["times"])
        got = 0
        for i in range(1, len(t)):
            if t[i] > cutoff or t[i] not in truth.index or not np.isfinite(truth[t[i]]):
                continue
            y = float(truth[t[i]])
            for name, a, b in BUCKETS:
                if a <= i <= b:
                    A = acc[name]
                    A["o"].append(abs(r["ours"][i] - y)); A["c"].append(abs(r["cams"][i] - y)); A["p"].append(abs(r["persistence"][i] - y))
                    if r.get("lo") and r.get("hi"):
                        A["inside"].append(r["lo"][i] <= y <= r["hi"][i])
            got += 1
        used += 1 if got else 0
    rows, pts = [], 0
    for name, _, _ in BUCKETS:
        A = acc[name]
        n = len(A["o"]); pts += n
        if n:
            rows.append(dict(lead=name, n=n, ours=round(float(np.mean(A["o"])), 1), cams=round(float(np.mean(A["c"])), 1),
                             persistence=round(float(np.mean(A["p"])), 1),
                             band_coverage=round(100 * float(np.mean(A["inside"])), 1) if A["inside"] else None))
    msg = None if rows else "Forecasts are logged, but none of their hours have settled yet. Check back later."
    return dict(logged=len(files), runs=used, points=pts, buckets=rows, message=msg)
