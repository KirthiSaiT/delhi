"""Decision-support modules built on top of the forecast: GRAP stage, ozone/NOx summary,
model drivers (SHAP-style contributions) and uncertainty bands."""
import json
import joblib
import numpy as np
import pandas as pd
from .config import *
from . import model

# ---- GRAP (Graded Response Action Plan) -------------------------------------------------------------
# AQI thresholds for GRAP stages I-IV as commonly published by CAQM (indicative: verify against the current CAQM order).
GRAP_EDGES = [200, 300, 400, 450]      # >200 stage I, >300 II, >400 III, >450 IV


def grap(aqi):
    """aqi: Delhi-mean AQI per hour (index 0 = now). Returns the stage per hour and a summary."""
    a = np.asarray(aqi, float)
    stage = np.searchsorted(GRAP_EDGES, a, side="left").astype(int)          # 0 = below stage I
    first = {}
    for s in (1, 2, 3, 4):
        idx = np.where(stage[1:] >= s)[0]
        first[str(s)] = int(idx[0] + 1) if len(idx) else None
    return dict(stage=stage.tolist(), thresholds=GRAP_EDGES, first_hour=first, max_stage=int(stage[1:].max()),
                hours_in_stage={str(s): int((stage[1:] == s).sum()) for s in range(5)},
                basis="Delhi-mean AQI (CPCB averaging); indicative only, not an official GRAP decision")


# ---- ozone and NOx -----------------------------------------------------------------------------------
def ozone_nox(times, o3, no2, pbl, o3_pre, no2_pre):
    """times: 'YYYY-MM-DDTHH:MM' strings (73), o3/no2/pbl Delhi-mean series (73), *_pre: the 24 h before now."""
    o3 = np.asarray(o3, float); no2 = np.asarray(no2, float); pbl = np.asarray(pbl, float)
    full = np.concatenate([o3_pre[-7:], o3]); c = np.cumsum(np.concatenate([[0], full]))
    o3_8h = (c[8:] - c[:-8]) / 8
    full = np.concatenate([no2_pre[-23:], no2]); c = np.cumsum(np.concatenate([[0], full]))
    no2_24h = (c[24:] - c[:-24]) / 24
    ts = pd.DatetimeIndex(times)
    daily = []
    for d in sorted(set(ts.date)):
        m = np.array([t.date() == d for t in ts])
        if m.sum() < 8:
            continue
        i_o = int(np.argmax(np.where(m, o3, -1))); i_n = int(np.argmax(np.where(m, no2, -1)))
        daily.append(dict(date=str(d), o3_peak=round(float(o3[i_o]), 0), o3_peak_hour=int(ts[i_o].hour),
                          no2_peak=round(float(no2[i_n]), 0), no2_peak_hour=int(ts[i_n].hour),
                          o3_8h_max=round(float(o3_8h[m].max()), 0)))
    hr = ts.hour.values
    night = (hr >= 20) | (hr <= 5)
    day = (hr >= 11) & (hr <= 16)
    inv_pbl = 1000.0 / np.maximum(pbl, 50.0)
    corr = float(np.corrcoef(no2, inv_pbl)[0, 1]) if np.std(no2) > 1e-6 and np.std(inv_pbl) > 1e-6 else 0.0
    return dict(o3_8h=np.round(o3_8h, 1).tolist(), no2_24h=np.round(no2_24h, 1).tolist(), daily=daily,
                hours_o3_8h_above_100=int((o3_8h[1:] > 100).sum()), hours_no2_24h_above_80=int((no2_24h[1:] > 80).sum()),
                no2_night_to_day=round(float(no2[night].mean() / max(no2[day].mean(), 1e-6)), 2) if night.any() and day.any() else None,
                no2_vs_trapping_corr=round(corr, 2), standards=dict(o3_8h=100, no2_24h=80))


# ---- explainability ----------------------------------------------------------------------------------
GROUPS = [
    ("Air right now", ["pm2_5_0", "pm10_0", "ozone_0", "nitrogen_dioxide_0", "aerosol_optical_depth_0", "pm25_24m_0"]),
    ("Smoke arriving from upwind", ["up_pm25_0", "reg_pm25_0"]),
    ("Mixing depth (PBL)", ["boundary_layer_height_0", "boundary_layer_height"]),
    ("Wind and ventilation", ["wind_speed_10m", "wd_s", "wd_c", "wind_speed_925hPa", "vent"]),
    ("Inversion (warm lid)", ["inv", "temperature_925hPa"]),
    ("Temperature and sunlight", ["temperature_2m", "shortwave_radiation"]),
    ("Humidity and rain", ["relative_humidity_2m", "precipitation", "precip6"]),
    ("Time of day and season", ["hr_s", "hr_c", "doy_s", "doy_c"]),
    ("Place and lead time", ["lat", "lon", "h"]),
]
_GIDX = [[model.FEATS.index(f) for f in fs] for _, fs in GROUPS]


def drivers(models, X, n_delhi):
    """Per-hour percentage effect of each feature group on the PM2.5 forecast, averaged over Delhi stations,
    relative to the model's average case (SHAP values from LightGBM, on the log scale)."""
    contrib = models["pm25"].predict(X, pred_contrib=True)               # (S*H, F+1)
    H = HORIZON
    c = contrib.reshape(-1, H, contrib.shape[1])[:n_delhi].mean(0)     # (H, F+1)
    g = np.stack([c[:, idx].sum(1) for idx in _GIDX], axis=1)            # (H, G) log units
    pct = (np.exp(g) - 1.0) * 100.0
    pct = np.vstack([pct[:1], pct])                                      # index 0 = hour 0 -> same as hour 1
    now = float(np.nanmean(X[:, model.FEATS.index("pm2_5_0")]))
    return dict(groups=[n for n, _ in GROUPS], pct=np.round(pct, 1).tolist(), baseline_pm25=round(now, 1),
                note="Explains the machine-learned chemistry step (before feedback and plume): the % push on PM2.5 relative to staying at today's level.")


# ---- uncertainty bands -------------------------------------------------------------------------------
def load_quantile_models():
    p = MODELS / "models_q.joblib"
    return joblib.load(p) if p.exists() else None


def bands(qmodels, X, mean_pred, coupled, S, H):
    """Scale the coupled forecast by the 10th/90th-percentile ratios predicted for the same inputs."""
    b = model.base_log(X, "pm25")
    lo = np.expm1(b + qmodels[0.1].predict(X)).reshape(S, H)
    hi = np.expm1(b + qmodels[0.9].predict(X)).reshape(S, H)
    base = np.maximum(mean_pred, 1.0)
    w = model.nowcast_weight(X).reshape(S, H)                      # near-term forecasts lean on the current value: tighter band
    r_lo = w + (1 - w) * np.clip(lo / base, 0.05, 1.0)
    r_hi = w + (1 - w) * np.clip(hi / base, 1.0, 6.0)
    return coupled * r_lo, coupled * r_hi


def quantile_meta():
    p = MODELS / "meta_q.json"
    return json.loads(p.read_text()) if p.exists() else None
