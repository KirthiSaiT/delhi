import json
import threading
import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from .config import *

app = FastAPI(title="AirCouple API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
STATE = {}            # scenario -> (timestamp, payload)
OFFLINE = set()       # scenarios whose last refresh failed (serving cache)
LOCK = threading.Lock()
TTL = 30 * 60


def _refresh(scenario):
    from . import forecast
    try:
        p = forecast.build(scenario)
        STATE[scenario] = (time.time(), p)
        OFFLINE.discard(scenario)
    except Exception as e:  # network/model failure -> keep serving cache
        OFFLINE.add(scenario)
        print("refresh failed:", scenario, repr(e))


def _cached(scenario):
    f = CACHE / f"forecast_{scenario}.json"
    if f.exists():
        return json.loads(f.read_text()), f.stat().st_mtime
    return None, 0


@app.get("/api/health")
def health():
    return {"ok": True, "models": (MODELS / "models.joblib").exists()}


@app.get("/api/forecast")
def get_forecast(scenario: str = "live", refresh: bool = False):
    if scenario not in ("live", "peak"):
        raise HTTPException(400, "scenario must be live|peak")
    ts, payload = STATE.get(scenario, (0, None))
    if payload is None:
        payload, ts = _cached(scenario)
    stale = (time.time() - ts) > TTL
    if payload is None or refresh:
        with LOCK:
            _refresh(scenario)
        ts, payload = STATE.get(scenario, (0, None))
        if payload is None:
            payload, ts = _cached(scenario)
        if payload is None:
            raise HTTPException(503, "forecast unavailable (no network and no cache)")
        return dict(payload, offline=scenario in OFFLINE)
    if stale and not LOCK.locked():
        threading.Thread(target=lambda: (LOCK.acquire(), _refresh(scenario), LOCK.release()), daemon=True).start()
        return dict(payload, offline=scenario in OFFLINE, refreshing=True)
    return dict(payload, offline=scenario in OFFLINE)


WHATIF = {}           # rounded-params key -> (timestamp, payload)


@app.get("/api/whatif")
def whatif(fire_scale: float | None = None, wind_scale: float | None = None,
           pbl_scale: float | None = None, start_pm25: float | None = None):
    """Re-run the stubble-season scenario with custom fire load / wind / mixing depth / starting haze."""
    from . import forecast
    P = forecast.clean_params(dict(fire_scale=fire_scale, wind_scale=wind_scale, pbl_scale=pbl_scale, start_pm25=start_pm25))
    key = tuple(round(v, 3) for v in P.values())
    hit = WHATIF.get(key)
    if hit and time.time() - hit[0] < TTL:
        return hit[1]
    with LOCK:
        try:
            payload = forecast.build("peak", P, save=False)
        except Exception as e:
            raise HTTPException(503, f"what-if run failed: {e!r}")
    WHATIF[key] = (time.time(), payload)
    if len(WHATIF) > 12:
        WHATIF.pop(min(WHATIF, key=lambda k: WHATIF[k][0]))
    return payload


@app.get("/api/backtest")
def backtest():
    f = CACHE / "backtest.json"
    if not f.exists():
        raise HTTPException(404, "backtest not generated yet (run: python -m app.backtest)")
    return json.loads(f.read_text())


DIST = ROOT.parent / "frontend" / "dist"
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{path:path}")
    def spa(path: str):
        f = DIST / path
        if f.is_file() and path:
            return FileResponse(f)
        return FileResponse(DIST / "index.html", headers={"Cache-Control": "no-cache"})
