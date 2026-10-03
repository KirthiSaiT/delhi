"""Direct multi-horizon LightGBM emulator of the chemical-transport step.
PM(t0+h) = f(state at t0, meteorology at t0+h, upwind regional load, calendar, h)."""
import json
import joblib
import numpy as np
import pandas as pd
import lightgbm as lgb
from .config import *
from . import physics

TARGETS = {"pm25": "pm2_5", "pm10": "pm10", "o3": "ozone", "no2": "nitrogen_dioxide"}
LAT = np.array([s[1] for s in STATIONS])
LON = np.array([s[2] for s in STATIONS])


def _bearing_dist():
    dx = (LON[None, :] - LON[:, None]) * np.cos(np.radians(LAT))[:, None] * 111.0
    dy = (LAT[None, :] - LAT[:, None]) * 111.0
    return np.degrees(np.arctan2(dx, dy)), np.hypot(dx, dy)


BEAR, DIST = _bearing_dist()


def clean(A):
    out = {}
    for k, v in A.items():
        d = pd.DataFrame(v.T).interpolate(limit=12, limit_direction="both")
        out[k] = d.to_numpy().T
    return out


def derive(A):
    D = dict(A)
    wd = np.radians(A["wind_direction_10m"])
    D["wd_s"], D["wd_c"] = np.sin(wd), np.cos(wd)
    D["inv"] = physics.inversion_strength(A["temperature_925hPa"], A["temperature_2m"])
    D["vent"] = physics.ventilation(A["boundary_layer_height"], A["wind_speed_10m"])
    p = np.nan_to_num(A["precipitation"])
    c = np.cumsum(p, axis=1)
    c6 = c.copy()
    c6[:, 6:] = c[:, 6:] - c[:, :-6]
    D["precip6"] = c6
    pm = A["pm2_5"]
    c = np.cumsum(np.nan_to_num(pm), axis=1)
    m = c / 24.0
    m[:, 24:] = (c[:, 24:] - c[:, :-24]) / 24.0
    D["pm25_24m"] = m
    # upwind regional load: stations whose bearing matches the wind-from direction
    ang = np.radians(BEAR[:, :, None] - A["wind_direction_10m"][:, None, :])
    W = np.maximum(np.cos(ang), 0) * np.exp(-DIST / 120.0)[:, :, None] * (DIST > 5)[:, :, None]
    ws = W.sum(1)
    up = (W * np.nan_to_num(pm)[None, :, :]).sum(1) / np.maximum(ws, 1e-6)
    reg = np.nanmean(pm, axis=0)[None, :]
    D["up_pm25"] = np.where(ws > 1e-3, up, reg)
    D["reg_pm25"] = np.repeat(reg, pm.shape[0], 0)
    return D


CUR = ["pm2_5", "pm10", "ozone", "nitrogen_dioxide", "aerosol_optical_depth", "pm25_24m",
       "up_pm25", "reg_pm25", "boundary_layer_height"]
TGT = ["temperature_2m", "relative_humidity_2m", "boundary_layer_height", "wind_speed_10m", "wd_s", "wd_c",
       "shortwave_radiation", "temperature_925hPa", "inv", "vent", "precipitation", "precip6",
       "wind_speed_925hPa"]
FEATS = ["h"] + [c + "_0" for c in CUR] + TGT + ["hr_s", "hr_c", "doy_s", "doy_c", "lat", "lon"]


def assemble(D, times, origins, horizons):
    S = D["pm2_5"].shape[0]
    o = np.asarray(origins)
    h = np.asarray(horizons)
    ti = o[:, None] + h[None, :]                       # (O,H)
    shp = (S, len(o), len(h))
    cols = [np.broadcast_to(h[None, None, :], shp)]
    for c in CUR:
        cols.append(np.broadcast_to(D[c][:, o][:, :, None], shp))
    for c in TGT:
        cols.append(D[c][:, ti])
    tt = pd.DatetimeIndex(times)[ti.ravel()]
    hr = tt.hour.values.reshape(ti.shape)
    doy = tt.dayofyear.values.reshape(ti.shape)
    for f in (np.sin(2 * np.pi * hr / 24), np.cos(2 * np.pi * hr / 24),
              np.sin(2 * np.pi * doy / 365.25), np.cos(2 * np.pi * doy / 365.25)):
        cols.append(np.broadcast_to(f[None], shp))
    cols.append(np.broadcast_to(LAT[:, None, None], shp))
    cols.append(np.broadcast_to(LON[:, None, None], shp))
    X = np.stack([np.ascontiguousarray(c).reshape(-1) for c in cols], axis=1).astype(np.float32)
    Y = {k: D[v][:, ti].reshape(-1) for k, v in TARGETS.items()}
    return X, Y


PARAMS = dict(n_estimators=400, learning_rate=0.05, num_leaves=63, min_child_samples=60,
              subsample=0.8, subsample_freq=1, colsample_bytree=0.8, verbose=-1, n_jobs=-1)


BASE = {"pm25": "pm2_5_0", "pm10": "pm10_0", "o3": "ozone_0", "no2": "nitrogen_dioxide_0"}
_BI = {k: FEATS.index(v) for k, v in BASE.items()}


RESIDUAL = {"pm25"}   # PM2.5 predicts the change from now (better at every lead); the others predict absolute levels


def base_log(X, k):
    """log1p of the pollutant's current value: the model predicts the CHANGE from now, which fixes short-lead skill."""
    if k not in RESIDUAL:
        return np.zeros(len(X))
    return np.log1p(np.clip(np.nan_to_num(X[:, _BI[k]], nan=0.0), 0, None))


def fit(X, Y, mask=None):
    models = {}
    for k in TARGETS:
        y = np.log1p(np.clip(Y[k], 0, None)) - base_log(X, k)
        ok = np.isfinite(y) & (np.isfinite(X).sum(1) > len(FEATS) * 0.8)
        if mask is not None:
            ok &= mask
        m = lgb.LGBMRegressor(**PARAMS)
        m.fit(X[ok], y[ok])
        models[k] = m
    return models


def nowcast_weight(X):
    """Fixed short-lead rule (not tuned): 75% / 50% / 25% weight on the current value at +1 / +2 / +3 h, 0 after."""
    return np.clip((4.0 - X[:, 0]) / 4.0, 0.0, 1.0)


def predict_flat(models, X):
    """Pollutant forecasts for every row of X (1-D arrays), including the short-lead nowcast blend."""
    w = nowcast_weight(X)
    out = {}
    for k, m in models.items():
        p = np.clip(np.expm1(m.predict(X) + base_log(X, k)), 0, None)
        cur = X[:, _BI[k]]
        out[k] = np.where(np.isfinite(cur), w * np.nan_to_num(cur) + (1 - w) * p, p)
    return out


def predict(models, X, S, H):
    return {k: v.reshape(S, H) for k, v in predict_flat(models, X).items()}


def load():
    return joblib.load(MODELS / "models.joblib"), json.loads((MODELS / "meta.json").read_text())


MET_KEYS = ["temperature_2m", "temperature_925hPa", "boundary_layer_height", "wind_speed_10m",
            "shortwave_radiation"]


def coupled_forecast(models, meta, A, times, t0, extra_pm25=None, n_iter=4):
    """Iterate chemistry <-> meteorology to a fixed point.
    Returns uncoupled preds, coupled preds, coupled met, feedback diagnostics, residual history, NWP base met."""
    H = HORIZON
    hs = np.arange(1, H + 1)
    sl = slice(t0 + 1, t0 + H + 1)
    S = A["pm2_5"].shape[0]
    extra = 0 if extra_pm25 is None else extra_pm25

    def run(Acur):
        X, _ = assemble(derive(Acur), times, [t0], hs)
        p = predict(models, X, S, H)
        p["pm25"] = p["pm25"] + extra
        return p

    base = {k: A[k][:, sl].copy() for k in MET_KEYS}
    unc = run(A)
    cur = unc
    Ac = {k: v.copy() for k, v in A.items()}
    met, hist, diag = base, [], None
    for it in range(n_iter):
        newmet, diag = physics.apply_feedback(base, cur["pm25"], meta["k_aod"])
        met = newmet if it == 0 else {k: 0.5 * met[k] + 0.5 * newmet[k] for k in newmet}
        for k, v in met.items():
            Ac[k][:, sl] = v
        nxt = run(Ac)
        # mass-conservation dilution: the same pollutant burden in a shallower / calmer mixed layer
        v0 = np.maximum(base["boundary_layer_height"] * base["wind_speed_10m"], 1.0)
        v1 = np.maximum(met["boundary_layer_height"] * met["wind_speed_10m"], 1.0)
        F = np.clip((v0 / v1) ** physics.DILUTION_BETA, 0.85, 1.8)
        for k in ("pm25", "pm10", "no2"):
            nxt[k] = nxt[k] * F
        hist.append(float(np.abs(nxt["pm25"] - cur["pm25"]).mean()))
        cur = nxt
    return unc, cur, met, diag, hist, base
