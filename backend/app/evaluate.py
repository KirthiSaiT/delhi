"""Re-score the saved hold-out models on the Oct-Nov 2025 stubble season and refresh the metrics in models/meta.json.
Fast (no training).  Usage: python -m app.evaluate"""
import json
import numpy as np
import pandas as pd
from .config import *
from . import backtest, model, train

PERSIST = {"pm25": "pm2_5_0", "pm10": "pm10_0", "o3": "ozone_0", "no2": "nitrogen_dioxide_0"}


def main():
    times, A = backtest._prep()
    models = backtest._holdout_model(times, A)
    D = model.derive(A)
    hs = np.arange(1, HORIZON + 1, 3)
    origins = np.arange(24, len(times) - HORIZON - 1, 6)
    ot = pd.DatetimeIndex(times)[origins]
    ev = (ot >= train.HOLD_START) & (ot <= train.HOLD_END - pd.Timedelta(days=3))
    X, Y = model.assemble(D, times, origins[ev], hs)
    pred = model.predict_flat(models, X)
    lead = X[:, 0]
    metrics = {}
    for k in model.TARGETS:
        y, p0 = Y[k], X[:, model.FEATS.index(PERSIST[k])]
        ok = np.isfinite(y) & np.isfinite(p0)
        metrics[k] = {}
        for name, lo, hi in [("0-24h", 1, 24), ("25-48h", 25, 48), ("49-72h", 49, 72)]:
            m = ok & (lead >= lo) & (lead <= hi)
            mae, mae_p = float(np.abs(pred[k][m] - y[m]).mean()), float(np.abs(p0[m] - y[m]).mean())
            ss = ((y[m] - y[m].mean()) ** 2).sum()
            metrics[k][name] = dict(mae=round(mae, 2), persistence_mae=round(mae_p, 2),
                                    improvement_pct=round(100 * (1 - mae / mae_p), 1),
                                    r2=round(float(1 - ((pred[k][m] - y[m]) ** 2).sum() / ss), 3))
        print(k, json.dumps(metrics[k]), flush=True)
    meta = json.loads((MODELS / "meta.json").read_text())
    meta["metrics"] = metrics
    meta["model_note"] = ("PM2.5 predicts the change from the current value; PM10, O3 and NO2 predict absolute levels. "
                          "A fixed nowcast blend (75/50/25% weight on the current value at +1/+2/+3 h) is applied to all four.")
    (MODELS / "meta.json").write_text(json.dumps(meta, indent=1))
    print("meta.json updated")


if __name__ == "__main__":
    main()
