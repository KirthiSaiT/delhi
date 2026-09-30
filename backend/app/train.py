"""Train the emulator.  Usage:  python -m app.train [--start 2025-01-01]"""
import argparse
import json
import pickle
import time
from datetime import date, timedelta
import numpy as np
import pandas as pd
import joblib
from .config import *
from . import data, model

HOLD_START, HOLD_END = pd.Timestamp("2025-10-25"), pd.Timestamp("2025-11-25")


def load_history(start, end):
    parts = []
    # segment boundaries are fixed so cached chunks are reused
    for a, b in [("2023-01-01", "2024-12-31"), ("2025-01-01", end)]:
        if date.fromisoformat(b) >= date.fromisoformat(start) and date.fromisoformat(a) <= date.fromisoformat(end):
            parts += _segment(max(a, start), b)
    return _merge(parts)


def _segment(start, end):
    parts, cur = [], date.fromisoformat(start)
    stop = date.fromisoformat(end)
    while cur <= stop:
        nxt = min(cur + timedelta(days=89), stop)
        f = CACHE / f"hist_{cur}_{nxt}.pkl"
        if f.exists():
            parts.append(pickle.loads(f.read_bytes()))
        else:
            print("fetching", cur, nxt, flush=True)
            t, a = data.fetch_station_series("history", str(cur), str(nxt))
            f.write_bytes(pickle.dumps((t, a)))
            parts.append((t, a))
            time.sleep(3)
        cur = nxt + timedelta(days=1)
    return parts


def _merge(parts):
    times = np.array(sorted(set(np.concatenate([p[0] for p in parts]))))
    A = {}
    for k in parts[0][1]:
        arr = np.full((len(STATIONS), len(times)), np.nan)
        for t, a in parts:
            idx = np.searchsorted(times, t)
            arr[:, idx] = a[k]
        A[k] = arr
    return times, A


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", default="2023-01-01")
    ap.add_argument("--end", default=str(date.today() - timedelta(days=2)))
    args = ap.parse_args()

    times, A = load_history(args.start, args.end)
    # drop trailing hours where CAMS has no analysis yet
    last = np.where(np.isfinite(A["pm2_5"]).sum(0) > 10)[0].max()
    times = times[: last + 1]
    A = {k: v[:, : last + 1] for k, v in A.items()}
    A = model.clean(A)
    print("history", times[0], "->", times[-1], "hours", len(times), flush=True)

    ok = np.isfinite(A["aerosol_optical_depth"]) & np.isfinite(A["pm2_5"])
    k_aod = float((A["aerosol_optical_depth"][ok] * A["pm2_5"][ok]).sum() / (A["pm2_5"][ok] ** 2).sum())
    print("AOD/PM2.5 ratio", round(k_aod, 5))

    D = model.derive(A)
    hs = np.arange(1, HORIZON + 1, 3)
    origins = np.arange(24, len(times) - HORIZON - 1, 6)
    ot = pd.DatetimeIndex(times)[origins]
    X, Y = model.assemble(D, times, origins, hs)
    S = len(STATIONS)
    o_train = ~((ot > HOLD_START - pd.Timedelta(days=3)) & (ot < HOLD_END + pd.Timedelta(days=3)))
    o_eval = (ot >= HOLD_START) & (ot <= HOLD_END - pd.Timedelta(days=3))
    mk = lambda m: np.repeat(m, len(hs))[None, :].repeat(S, 0).reshape(-1)
    train_mask, eval_mask = mk(o_train), mk(o_eval)
    print("rows", len(X), "train", int(train_mask.sum()), "eval", int(eval_mask.sum()), flush=True)

    models = model.fit(X, Y, train_mask)
    pred = {k: np.clip(np.expm1(m.predict(X[eval_mask])), 0, None) for k, m in models.items()}
    hcol = X[eval_mask][:, 0]
    persist_col = {"pm25": "pm2_5_0", "pm10": "pm10_0", "o3": "ozone_0", "no2": "nitrogen_dioxide_0"}
    metrics = {}
    for k in model.TARGETS:
        y = Y[k][eval_mask]
        p0 = X[eval_mask][:, model.FEATS.index(persist_col[k])]
        ok = np.isfinite(y) & np.isfinite(p0)
        metrics[k] = {}
        for name, lo, hi in [("0-24h", 1, 24), ("25-48h", 25, 48), ("49-72h", 49, 72)]:
            m = ok & (hcol >= lo) & (hcol <= hi)
            mae = float(np.abs(pred[k][m] - y[m]).mean())
            mae_p = float(np.abs(p0[m] - y[m]).mean())
            ss = ((y[m] - y[m].mean()) ** 2).sum()
            metrics[k][name] = dict(mae=round(mae, 2), persistence_mae=round(mae_p, 2),
                                    improvement_pct=round(100 * (1 - mae / mae_p), 1),
                                    r2=round(float(1 - ((pred[k][m] - y[m]) ** 2).sum() / ss), 3))
        print(k, json.dumps(metrics[k]), flush=True)

    print("refitting on all data ...", flush=True)
    final = model.fit(X, Y)
    joblib.dump(final, MODELS / "models.joblib")
    meta = dict(trained_on=f"{times[0]} to {times[-1]}", n_rows=int(len(X)), k_aod=k_aod,
                holdout=f"{HOLD_START.date()} to {HOLD_END.date()} (Oct-Nov 2025 stubble season, excluded from training)",
                metrics=metrics, features=model.FEATS,
                caveat="Ground truth = CAMS analysis via Open-Meteo (no CPCB station key); meteorology at target time "
                       "comes from archived short-lead NWP, so long-lead skill is slightly optimistic.",
                built=str(pd.Timestamp.now()))
    (MODELS / "meta.json").write_text(json.dumps(meta, indent=1))
    print("saved")


if __name__ == "__main__":
    main()
