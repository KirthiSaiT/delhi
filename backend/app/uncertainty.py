"""Forecast uncertainty: conditional 10th / 90th percentile models for PM2.5.

Two sets are trained:
  models_q_holdout.joblib  - without the Oct-Nov 2025 season (used to MEASURE coverage honestly, and for replay bands)
  models_q.joblib          - on all data (used for the live bands)
At inference the band is   forecast x (q_alpha / mean_prediction)   so it follows the coupled forecast.
Usage: python -m app.uncertainty"""
import json
import joblib
import numpy as np
import pandas as pd
import lightgbm as lgb
from .config import *
from . import backtest, model, train

ALPHAS = (0.1, 0.9)
QPARAMS = dict(model.PARAMS, objective="quantile", n_estimators=250, learning_rate=0.06)


def _fit(X, y, mask, alpha):
    ok = np.isfinite(y) & (np.isfinite(X).sum(1) > len(model.FEATS) * 0.8) & mask
    m = lgb.LGBMRegressor(**{**QPARAMS, "alpha": alpha})
    m.fit(X[ok], y[ok])
    return m


def main():
    times, A = backtest._prep()
    D = model.derive(A)
    hs = np.arange(1, HORIZON + 1, 3)
    origins = np.arange(24, len(times) - HORIZON - 1, 6)
    ot = pd.DatetimeIndex(times)[origins]
    X, Y = model.assemble(D, times, origins, hs)
    S = len(STATIONS)
    o_train = ~((ot > train.HOLD_START - pd.Timedelta(days=3)) & (ot < train.HOLD_END + pd.Timedelta(days=3)))
    o_eval = (ot >= train.HOLD_START) & (ot <= train.HOLD_END - pd.Timedelta(days=3))
    expand = lambda m: np.repeat(m, len(hs))[None, :].repeat(S, 0).reshape(-1)
    tr, ev = expand(o_train), expand(o_eval)
    y = np.log1p(np.clip(Y["pm25"], 0, None)) - model.base_log(X, "pm25")     # quantiles of the CHANGE from now
    allm = np.ones(len(y), bool)

    print("fitting hold-out quantile models ...", flush=True)
    hold = {a: _fit(X, y, tr, a) for a in ALPHAS}
    joblib.dump(hold, MODELS / "models_q_holdout.joblib")

    truth = Y["pm25"][ev]
    Xe = X[ev]; b = model.base_log(Xe, "pm25")
    lo = np.expm1(b + hold[0.1].predict(Xe)); hi = np.expm1(b + hold[0.9].predict(Xe))
    lead = X[ev][:, 0]
    ok = np.isfinite(truth)
    inside = (truth >= lo) & (truth <= hi)
    cov = {"overall": round(float(inside[ok].mean()) * 100, 1), "mean_width": round(float((hi - lo)[ok].mean()), 1)}
    for name, a, b in [("0-24h", 1, 24), ("25-48h", 25, 48), ("49-72h", 49, 72)]:
        m = ok & (lead >= a) & (lead <= b)
        cov[name] = round(float(inside[m].mean()) * 100, 1)
    print("hold-out coverage of the 10-90 band (target 80):", cov, flush=True)

    print("refitting on all data ...", flush=True)
    full = {a: _fit(X, y, allm, a) for a in ALPHAS}
    joblib.dump(full, MODELS / "models_q.joblib")
    (MODELS / "meta_q.json").write_text(json.dumps(dict(
        band="10th-90th percentile of PM2.5", target_coverage=80, holdout_coverage=cov,
        note="Coverage measured on the Oct-Nov 2025 hold-out with models that never saw it.")))
    print("saved")


if __name__ == "__main__":
    main()
