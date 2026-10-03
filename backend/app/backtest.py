"""Replay real stubble-season forecasts with a model that never saw that season.
Usage: python -m app.backtest    (needs the cached history from app.train)"""
import json
from datetime import date, timedelta
import joblib
import numpy as np
import pandas as pd
from .config import *
from . import insights, model, physics, train
from .forecast import _trail, N_DELHI

ORIGINS = ["2025-10-28 06:00", "2025-11-01 06:00", "2025-11-05 06:00", "2025-11-09 06:00", "2025-11-13 06:00"]


def _prep():
    end = str(date.today() - timedelta(days=2))
    times, A = train.load_history("2023-01-01", end)
    last = np.where(np.isfinite(A["pm2_5"]).sum(0) > 10)[0].max()
    times = times[: last + 1]
    A = model.clean({k: v[:, : last + 1] for k, v in A.items()})
    return times, A


def _holdout_model(times, A):
    path = MODELS / "models_holdout.joblib"
    if path.exists():
        return joblib.load(path)
    D = model.derive(A)
    hs = np.arange(1, HORIZON + 1, 3)
    origins = np.arange(24, len(times) - HORIZON - 1, 6)
    ot = pd.DatetimeIndex(times)[origins]
    X, Y = model.assemble(D, times, origins, hs)
    o_train = ~((ot > train.HOLD_START - pd.Timedelta(days=3)) & (ot < train.HOLD_END + pd.Timedelta(days=3)))
    mask = np.repeat(o_train, len(hs))[None, :].repeat(len(STATIONS), 0).reshape(-1)
    m = model.fit(X, Y, mask)
    joblib.dump(m, path)
    return m


def _delhi_aqi(pre, pm25, pm10, no2, o3):
    a, _ = physics.aqi(_trail(pre["pm2_5"], pm25, 24), _trail(pre["pm10"], pm10, 24),
                       _trail(pre["nitrogen_dioxide"], no2, 24), _trail(pre["ozone"], o3, 8))
    return a[:N_DELHI].mean(0)


def main():
    times, A = _prep()
    print("history ready", len(times), flush=True)
    models = _holdout_model(times, A)
    meta = json.loads((MODELS / "meta.json").read_text())
    out = dict(built=str(pd.Timestamp.now()), note="Model trained WITHOUT Oct 22 - Nov 28 2025. Meteorology at forecast time is the archived NWP; "
                                                   "no fire/plume input is used in the replay.", origins=[])
    qpath = MODELS / "models_q_holdout.joblib"
    qh = joblib.load(qpath) if qpath.exists() else None
    tix = pd.DatetimeIndex(times)
    errs = {"model": [], "persistence": [], "uncoupled": []}
    for o in ORIGINS:
        t0 = int(tix.get_loc(pd.Timestamp(o)))
        sl = slice(t0, t0 + HORIZON + 1)
        unc, cur, met, diag, hist, base = model.coupled_forecast(models, meta, A, times, t0)
        pre = {k: A[k][:, t0 - 23:t0] for k in ("pm2_5", "pm10", "nitrogen_dioxide", "ozone")}
        act = {k: A[k][:, sl] for k in ("pm2_5", "pm10", "nitrogen_dioxide", "ozone")}

        def ser(name, key):
            return np.concatenate([A[key][:, t0][:, None], cur[name]], axis=1)
        fpm25, fpm10, fno2, fo3 = ser("pm25", "pm2_5"), ser("pm10", "pm10"), ser("no2", "nitrogen_dioxide"), ser("o3", "ozone")
        upm25 = np.concatenate([A["pm2_5"][:, t0][:, None], unc["pm25"]], axis=1)
        pers = np.repeat(A["pm2_5"][:, t0][:, None], HORIZON + 1, axis=1)
        d = lambda x: x[:N_DELHI].mean(0)
        aqi_a = _delhi_aqi(pre, act["pm2_5"], act["pm10"], act["nitrogen_dioxide"], act["ozone"])
        aqi_f = _delhi_aqi(pre, fpm25, np.maximum(fpm10, fpm25 * 1.15), fno2, fo3)
        a, f, u, p = d(act["pm2_5"]), d(fpm25), d(upm25), d(pers)
        band = None
        if qh:
            X, _ = model.assemble(model.derive(A), times, [t0], np.arange(1, HORIZON + 1))
            lo_fc, hi_fc = insights.bands(qh, X, unc["pm25"], cur["pm25"], len(STATIONS), HORIZON)
            lo_s = np.concatenate([A["pm2_5"][:, t0][:, None], lo_fc], axis=1)
            hi_s = np.concatenate([A["pm2_5"][:, t0][:, None], hi_fc], axis=1)
            band = (d(lo_s), d(hi_s))
        mae = lambda x: float(np.abs(x[1:] - a[1:]).mean())
        errs["model"].append(mae(f)); errs["persistence"].append(mae(p)); errs["uncoupled"].append(mae(u))
        cat = lambda v: [physics.category(x)[0] for x in v]
        hit = float(np.mean([x == y for x, y in zip(cat(aqi_a[1:]), cat(aqi_f[1:]))]))
        out["origins"].append(dict(
            origin=o, times=[str(t)[:16] for t in tix[sl]],
            actual=np.round(a, 1).tolist(), forecast=np.round(f, 1).tolist(), uncoupled=np.round(u, 1).tolist(),
            persistence=np.round(p, 1).tolist(),
            lo=np.round(band[0], 1).tolist() if band else None, hi=np.round(band[1], 1).tolist() if band else None,
            aqi_actual=np.round(aqi_a).tolist(), aqi_forecast=np.round(aqi_f).tolist(),
            stats=dict(mae=round(mae(f), 1), mae_uncoupled=round(mae(u), 1), mae_persistence=round(mae(p), 1),
                       bias=round(float((f[1:] - a[1:]).mean()), 1), peak_actual=round(float(a.max()), 1),
                       peak_forecast=round(float(f.max()), 1), category_hit_pct=round(100 * hit),
                       band_coverage_pct=round(100 * float(((a[1:] >= band[0][1:]) & (a[1:] <= band[1][1:])).mean())) if band else None),
        ))
        print(o, out["origins"][-1]["stats"], flush=True)
    out["summary"] = dict(mae_model=round(float(np.mean(errs["model"])), 1), mae_persistence=round(float(np.mean(errs["persistence"])), 1),
                          mae_uncoupled=round(float(np.mean(errs["uncoupled"])), 1))
    out["summary"]["improvement_pct"] = round(100 * (1 - out["summary"]["mae_model"] / out["summary"]["mae_persistence"]))
    (CACHE / "backtest.json").write_text(json.dumps(out, allow_nan=False))
    print("saved backtest.json", out["summary"])


if __name__ == "__main__":
    main()
