"""Deeper hold-out validation of the PM2.5 forecast: error by lead time, by station, AQI-category confusion matrix.
Uses the model that never saw the Oct-Nov 2025 season.   Usage: python -m app.validation"""
import json
import numpy as np
import pandas as pd
from .config import *
from . import backtest, model, physics, train

CATS = ["Good", "Satisfactory", "Moderate", "Poor", "Very poor", "Severe"]


def _cat(pm25):
    idx = physics.sub_index("pm25", pm25)
    return np.searchsorted([50, 100, 200, 300, 400], idx, side="left")


def main():
    times, A = backtest._prep()
    models = backtest._holdout_model(times, A)
    D = model.derive(A)
    hs = np.arange(1, HORIZON + 1, 3)
    origins = np.arange(24, len(times) - HORIZON - 1, 6)
    ot = pd.DatetimeIndex(times)[origins]
    ev = (ot >= train.HOLD_START) & (ot <= train.HOLD_END - pd.Timedelta(days=3))
    X, Y = model.assemble(D, times, origins[ev], hs)
    S, O, H = len(STATIONS), int(ev.sum()), len(hs)
    pred = model.predict_flat(models, X)["pm25"]
    truth = Y["pm25"]
    pers = X[:, model.FEATS.index("pm2_5_0")]
    lead = X[:, 0]
    st = np.repeat(np.arange(S), O * H)
    ok = np.isfinite(truth) & np.isfinite(pers)

    def r2(p, t):
        return float(1 - ((p - t) ** 2).sum() / max(((t - t.mean()) ** 2).sum(), 1e-9))

    curve = []
    for h in hs:
        m = ok & (lead == h)
        curve.append(dict(h=int(h), model=round(float(np.abs(pred[m] - truth[m]).mean()), 1),
                          persistence=round(float(np.abs(pers[m] - truth[m]).mean()), 1), r2=round(r2(pred[m], truth[m]), 2)))
    by_station = []
    for i, (name, _, _) in enumerate(STATIONS):
        m = ok & (st == i)
        by_station.append(dict(name=name, model=round(float(np.abs(pred[m] - truth[m]).mean()), 1),
                               persistence=round(float(np.abs(pers[m] - truth[m]).mean()), 1),
                               bias=round(float((pred[m] - truth[m]).mean()), 1)))
    ca, cp = _cat(truth[ok]), _cat(pred[ok])
    mat = np.zeros((6, 6), int)
    for a, p in zip(ca, cp):
        mat[a, p] += 1
    pct = np.round(100 * mat / np.maximum(mat.sum(1, keepdims=True), 1)).astype(int)
    out = dict(
        note="PM2.5-only category (instantaneous), forecasts every 3 h out to 72 h, 20 stations, Oct 25 - Nov 22 2025 hold-out.",
        samples=int(ok.sum()), lead_curve=curve, by_station=by_station,
        confusion=dict(labels=CATS, counts=mat.tolist(), row_pct=pct.tolist(),
                       exact_pct=round(100 * float((ca == cp).mean()), 1),
                       within_one_pct=round(100 * float((np.abs(ca - cp) <= 1).mean()), 1)))
    (CACHE / "validation.json").write_text(json.dumps(out, allow_nan=False))
    print("exact", out["confusion"]["exact_pct"], "within one", out["confusion"]["within_one_pct"], "samples", out["samples"])


if __name__ == "__main__":
    main()
