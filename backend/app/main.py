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


def _whatif_payload(P):
    """Cached what-if run for already-cleaned parameters."""
    from . import forecast
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


@app.get("/api/whatif")
def whatif(fire_scale: float | None = None, wind_scale: float | None = None,
           pbl_scale: float | None = None, start_pm25: float | None = None):
    """Re-run the stubble-season scenario with custom fire load / wind / mixing depth / starting haze."""
    from . import forecast
    return _whatif_payload(forecast.clean_params(dict(fire_scale=fire_scale, wind_scale=wind_scale,
                                                      pbl_scale=pbl_scale, start_pm25=start_pm25)))


@app.get("/api/backtest")
def backtest():
    f = CACHE / "backtest.json"
    if not f.exists():
        raise HTTPException(404, "backtest not generated yet (run: python -m app.backtest)")
    return json.loads(f.read_text())


@app.get("/api/validation")
def validation():
    f = CACHE / "validation.json"
    if not f.exists():
        raise HTTPException(404, "validation not generated yet (run: python -m app.validation)")
    return json.loads(f.read_text())


@app.get("/api/verification")
def verification_status():
    from . import verification
    return verification.evaluate()


@app.get("/api/export.csv")
def export_csv(scenario: str = "live"):
    """Hourly station forecast as CSV (open data download)."""
    import csv
    import io
    from fastapi.responses import Response
    payload = get_forecast(scenario)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["time_ist", "station", "lat", "lon", "aqi", "pm25", "pm25_low", "pm25_high", "pm10", "no2", "o3",
                "pbl_m", "temp_c", "wind_ms", "inversion_c", "stubble_pm25"])
    for s in payload["stations"]:
        for i, t in enumerate(payload["times"]):
            w.writerow([t, s["name"], s["lat"], s["lon"], s["aqi"][i], s["pm25"][i], s["pm25_lo"][i], s["pm25_hi"][i],
                        s["pm10"][i], s["no2"][i], s["o3"][i], s["pbl"][i], s["t2m"][i], s["ws"][i], s["inv"][i], s["stubble"][i]])
    return Response(buf.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": f"attachment; filename=aircouple_{scenario}_forecast.csv"})


@app.get("/api/llm")
def llm_status():
    from . import llm
    return llm.status()


def _payload_for(scenario, fire_scale, wind_scale, pbl_scale, start_pm25):
    """The forecast the user is looking at: the cached live/peak run, or a custom what-if run when sliders were moved."""
    from . import forecast
    custom = [v for v in (fire_scale, wind_scale, pbl_scale, start_pm25) if v is not None]
    if scenario == "peak" and custom:
        P = forecast.clean_params(dict(fire_scale=fire_scale, wind_scale=wind_scale, pbl_scale=pbl_scale, start_pm25=start_pm25))
        if P != forecast.DEFAULTS:
            return _whatif_payload(P)
    return get_forecast(scenario)


@app.get("/api/briefing")
def briefing_endpoint(scenario: str = "live", lang: str = "en", fire_scale: float | None = None,
                      wind_scale: float | None = None, pbl_scale: float | None = None, start_pm25: float | None = None):
    """Plain-language outlook. Uses an LLM only if configured; numbers always come from the forecast."""
    from . import llm
    return llm.briefing(_payload_for(scenario, fire_scale, wind_scale, pbl_scale, start_pm25), "hi" if lang == "hi" else "en")


@app.get("/api/ask")
def ask_endpoint(q: str, scenario: str = "live", lang: str = "en", fire_scale: float | None = None,
                 wind_scale: float | None = None, pbl_scale: float | None = None, start_pm25: float | None = None):
    from . import llm
    if not q.strip() or len(q) > 300:
        raise HTTPException(400, "question must be 1-300 characters")
    return llm.ask(_payload_for(scenario, fire_scale, wind_scale, pbl_scale, start_pm25), q, "hi" if lang == "hi" else "en")


DIST = ROOT.parent / "frontend" / "dist"
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{path:path}")
    def spa(path: str):
        f = DIST / path
        if f.is_file() and path:
            return FileResponse(f)
        return FileResponse(DIST / "index.html", headers={"Cache-Control": "no-cache"})
