"""Orchestrates one full forecast run -> JSON payload for the dashboard."""
import copy
import json
import time
import numpy as np
import pandas as pd
from .config import *
from . import data, insights, model, physics, plume, trajectory, verification

N_DELHI = 11  # first 11 stations are inside Delhi
SCENARIOS = {
    "live": "Live: real forecast + real NASA FIRMS fire detections",
    "peak": "What-if: synthetic early-November stubble-burning day + stagnant winter inversion on today's forecast",
}


DEFAULTS = dict(fire_scale=1.0, wind_scale=0.5, pbl_scale=0.35, start_pm25=190.0)
LIMITS = dict(fire_scale=(0.1, 2.5), wind_scale=(0.2, 1.2), pbl_scale=(0.15, 1.0), start_pm25=(50.0, 350.0))
_INPUTS = {}      # cached upstream fetches so what-if reruns take seconds, not a minute
INPUT_TTL = 10 * 60


def clean_params(p):
    out = dict(DEFAULTS)
    for k, (lo, hi) in LIMITS.items():
        if p and p.get(k) is not None:
            out[k] = float(min(max(float(p[k]), lo), hi))
    return out


def _inputs():
    if _INPUTS.get("t", 0) + INPUT_TTL < time.time():
        times, A = data.fetch_station_series("forecast")
        wtimes, W = data.fetch_wind_grid()
        try:
            fires = data.fetch_fires()
        except Exception:
            fires = None
        _INPUTS.update(t=time.time(), v=(times, model.clean(A), wtimes, W, fires))
    times, A, wtimes, W, fires = _INPUTS["v"]
    return times, copy.deepcopy(A), wtimes, copy.deepcopy(W), fires


def _apply_stagnation(A, sl, pbl_scale=0.35, wind_scale=0.5):
    """What-if: winter stagnation -> collapsed PBL, calm winds, strong night-time inversion."""
    sw = np.nan_to_num(A["shortwave_radiation"][:, sl])
    night = sw < 5
    A["boundary_layer_height"][:, sl] = np.clip(A["boundary_layer_height"][:, sl] * pbl_scale, 60, None)
    A["wind_speed_10m"][:, sl] = A["wind_speed_10m"][:, sl] * wind_scale
    A["temperature_925hPa"][:, sl] = A["temperature_2m"][:, sl] + np.where(night, 3.5, 0.6)
    A["wind_direction_10m"][:, sl] = 315 + 0 * A["wind_direction_10m"][:, sl]  # north-westerly


def _apply_haze_start(A, t0, meta, target_pm25=190.0):
    """What-if: start from a typical early-November haze episode (Delhi mean PM2.5 ~190 ug/m3)."""
    sl = slice(t0 - 47, t0 + 1)
    f = target_pm25 / max(float(np.nanmean(A["pm2_5"][:11, t0])), 25.0)
    A["pm2_5"][:, sl] *= f
    A["pm10"][:, sl] *= f ** 0.9
    A["nitrogen_dioxide"][:, sl] = np.maximum(A["nitrogen_dioxide"][:, sl] * 2.0, 45.0)
    A["aerosol_optical_depth"][:, sl] = meta["k_aod"] * A["pm2_5"][:, sl]
    return f


def _trail(pre, ser, n):
    """Trailing n-hour mean of ser, using pre as history. pre (S,>=n-1), ser (S,H+1)."""
    full = np.concatenate([pre[:, -(n - 1):], ser], axis=1)
    c = np.cumsum(np.concatenate([np.zeros((full.shape[0], 1)), full], axis=1), axis=1)
    return (c[:, n:] - c[:, :-n]) / n


def _r(a, n=1):
    return np.round(np.nan_to_num(a), n).tolist()


def _idw_weights():
    la, lo = np.meshgrid(GRID_LATS, GRID_LONS, indexing="ij")
    cl, cn = la.ravel(), lo.ravel()
    d = np.hypot((cl[:, None] - model.LAT[None]) * 111, (cn[:, None] - model.LON[None]) * 111 * 0.876)
    w = 1 / np.maximum(d, 3.0) ** 2.2
    return w / w.sum(1, keepdims=True)


def build(scenario="live", params=None, save=True):
    models, meta = model.load()
    P = clean_params(params)
    times, A, wtimes, W, live_fires = _inputs()
    now = pd.Timestamp.now(tz=TZ).tz_localize(None).floor("h")
    t0 = int(np.searchsorted(times, np.datetime64(now)))
    sl = slice(t0 + 1, t0 + HORIZON + 1)
    S, H = len(STATIONS), HORIZON
    cams_pm25 = A["pm2_5"][:, sl].copy()

    if scenario == "live":
        fires = live_fires if live_fires is not None else pd.DataFrame(dict(latitude=[], longitude=[], frp=[]))
    else:
        fires = data.synthetic_peak_fires(n=max(int(650 * P["fire_scale"]), 5))
    if scenario == "peak":
        _apply_haze_start(A, t0, meta, P["start_pm25"])
        _apply_stagnation(A, sl, P["pbl_scale"], P["wind_scale"])
        wsl = slice(max(int(np.searchsorted(wtimes, np.datetime64(now))) - max(plume.SPINUP, 72), 0), None)
        W["boundary_layer_height"][wsl] *= P["pbl_scale"]
        W["wind_speed_10m"][wsl] *= P["wind_scale"]
        W["wind_direction_10m"][wsl] = 315.0
        W["wind_direction_925hPa"][wsl] = 305.0

    pl = plume.run_plume(fires, wtimes, W, now.to_datetime64(), model.LAT, model.LON)
    extra = pl["contrib"][:, 1:]
    unc, cur, met, diag, hist, base = model.coupled_forecast(models, meta, A, times, t0, extra_pm25=extra)

    hs_all = np.arange(1, H + 1)
    X_unc, _ = model.assemble(model.derive(A), times, [t0], hs_all)
    drv = insights.drivers(models, X_unc, N_DELHI)
    qm = insights.load_quantile_models()
    if qm:
        lo_fc, hi_fc = insights.bands(qm, X_unc, unc["pm25"] - extra, cur["pm25"], S, H)
    else:
        lo_fc, hi_fc = cur["pm25"], cur["pm25"]
    back = trajectory.run_back(wtimes, W, now.to_datetime64(), fires)

    def series(now_v, fc):  # prepend h=0 state
        return np.concatenate([now_v[:, None], fc], axis=1)

    t_idx = times[t0: t0 + H + 1]
    st = {}
    st["pm25"] = series(A["pm2_5"][:, t0], cur["pm25"])
    st["pm25_unc"] = series(A["pm2_5"][:, t0], unc["pm25"])
    st["pm25_cams"] = series(A["pm2_5"][:, t0], cams_pm25)
    st["pm25_lo"] = series(A["pm2_5"][:, t0], lo_fc)
    st["pm25_hi"] = series(A["pm2_5"][:, t0], hi_fc)
    st["pm10"] = np.maximum(series(A["pm10"][:, t0], cur["pm10"]), st["pm25"] * 1.15)
    st["no2"] = series(A["nitrogen_dioxide"][:, t0], cur["no2"])
    st["o3"] = series(A["ozone"][:, t0], cur["o3"])
    st["pm10_unc"] = np.maximum(series(A["pm10"][:, t0], unc["pm10"]), st["pm25_unc"] * 1.15)
    st["no2_unc"] = series(A["nitrogen_dioxide"][:, t0], unc["no2"])
    st["o3_unc"] = series(A["ozone"][:, t0], unc["o3"])
    pre = {k: A[k][:, t0 - 23:t0] for k in ("pm2_5", "pm10", "nitrogen_dioxide", "ozone")}

    def naqi(pm25, pm10, no2, o3):  # CPCB averaging: PM & NO2 24 h, O3 8 h
        return physics.aqi(_trail(pre["pm2_5"], pm25, 24), _trail(pre["pm10"], pm10, 24),
                           _trail(pre["nitrogen_dioxide"], no2, 24), _trail(pre["ozone"], o3, 8))
    st["aqi"], st["dom"] = naqi(st["pm25"], st["pm10"], st["no2"], st["o3"])
    st["aqi_unc"], _ = naqi(st["pm25_unc"], st["pm10_unc"], st["no2_unc"], st["o3_unc"])
    st["pbl"] = series(A["boundary_layer_height"][:, t0], met["boundary_layer_height"])
    st["pbl_nwp"] = series(A["boundary_layer_height"][:, t0], base["boundary_layer_height"])
    st["t2m"] = series(A["temperature_2m"][:, t0], met["temperature_2m"])
    st["t2m_nwp"] = series(A["temperature_2m"][:, t0], base["temperature_2m"])
    st["t925"] = series(A["temperature_925hPa"][:, t0], met["temperature_925hPa"])
    st["t925_nwp"] = series(A["temperature_925hPa"][:, t0], base["temperature_925hPa"])
    st["ws"] = series(A["wind_speed_10m"][:, t0], met["wind_speed_10m"])
    st["wd"] = series(A["wind_direction_10m"][:, t0], A["wind_direction_10m"][:, sl])
    st["inv"] = physics.inversion_strength(st["t925"], st["t2m"])
    st["inv_nwp"] = physics.inversion_strength(st["t925_nwp"], st["t2m_nwp"])
    st["vent"] = physics.ventilation(st["pbl"], st["ws"])
    st["stubble"] = pl["contrib"]

    dl = lambda k: st[k][:N_DELHI].mean(0)
    delhi = {k: dl(k) for k in ["aqi", "aqi_unc", "pm25", "pm25_unc", "pm25_cams", "pm25_lo", "pm25_hi", "pm10", "no2", "o3", "pbl", "pbl_nwp",
                                "t2m", "t2m_nwp", "inv", "inv_nwp", "vent", "ws", "stubble"]}
    dom = np.bincount(st["dom"][:N_DELHI, 1:].ravel().astype(int), minlength=4).argmax()
    inv_cls = physics.inversion_class(delhi["inv"])
    strong_h = int((inv_cls >= 2).sum())
    d_pm = delhi["pm25"] - delhi["pm25_unc"]
    day = np.array([pd.Timestamp(t).hour for t in t_idx])
    dayt = (day >= 10) & (day <= 16)
    feedback = dict(
        iterations=len(hist), residual_ugm3=[round(x, 3) for x in hist],
        pm25_uplift_mean=round(float(d_pm[1:].mean()), 2), pm25_uplift_max=round(float(d_pm.max()), 2),
        pm25_uplift_hour=int(d_pm.argmax()),
        day_cooling_c=round(float((delhi["t2m"] - delhi["t2m_nwp"])[dayt].mean()), 2),
        pbl_reduction_pct=round(float(100 * (1 - delhi["pbl"][dayt].mean() / max(delhi["pbl_nwp"][dayt].mean(), 1))), 1),
        inversion_delta_c=round(float((delhi["inv"] - delhi["inv_nwp"]).max()), 2),
        aod_peak=round(float(diag["aod"][:N_DELHI].max()), 2),
        k_aod=round(meta["k_aod"], 5))

    # attribution of Delhi-mean PM2.5:  coupled = background + stubble plume + feedback amplification (exact identity)
    stub = st["stubble"][:N_DELHI].mean(0)
    fb = np.concatenate([[0.0], (delhi["pm25"] - delhi["pm25_unc"])[1:]])
    stub_c = np.concatenate([[0.0], stub[1:]])
    bg = delhi["pm25"] - fb - stub_c
    tot = max(float(delhi["pm25"][1:].sum()), 1e-6)
    attribution = dict(background=_r(bg), stubble=_r(stub_c), feedback=_r(fb),
                       share=dict(background=round(float(bg[1:].sum() / tot * 100)), stubble=round(float(stub_c[1:].sum() / tot * 100)),
                                  feedback=round(float(fb[1:].sum() / tot * 100))))

    # display grid: IDW of each pollutant, then AQI per cell per hour
    Wg = _idw_weights()
    gaqi = Wg @ st["aqi"]   # AQI is smooth across stations; interpolate the index itself
    grid = dict(lats=GRID_LATS, lons=GRID_LONS, step=0.025, aqi=np.round(gaqi.T).astype(int).tolist())

    stations = []
    for i, (name, la, lo) in enumerate(STATIONS):
        stations.append(dict(
            name=name, lat=la, lon=lo, delhi=i < N_DELHI,
            **{k: _r(st[k][i], 1) for k in ["pm25", "pm25_unc", "pm25_cams", "pm25_lo", "pm25_hi", "pm10", "no2", "o3", "pbl", "pbl_nwp",
                                              "t2m", "t2m_nwp", "inv", "ws", "vent", "stubble"]},
            aqi=_r(st["aqi"][i], 0), aqi_unc=_r(st["aqi_unc"][i], 0), dom=st["dom"][i].astype(int).tolist(),
            wd=_r(st["wd"][i], 0)))

    t_str = [str(t)[:16] for t in t_idx]
    ozone = insights.ozone_nox(t_str, delhi["o3"], delhi["no2"], delhi["pbl"],
                               A["ozone"][:N_DELHI, t0 - 23:t0].mean(0), A["nitrogen_dioxide"][:N_DELHI, t0 - 23:t0].mean(0))
    qmeta = insights.quantile_meta()

    payload = dict(
        scenario=scenario, has_cams=scenario == "live", scenario_label=SCENARIOS[scenario], generated=str(pd.Timestamp.now().round("s")),
        offline=False, t0=str(t_idx[0]), times=[str(t)[:16] for t in t_idx],
        delhi={k: _r(v, 1) for k, v in delhi.items()},
        delhi_wd=_r(st["wd"][:N_DELHI].mean(0), 0),
        inversion=dict(classes=inv_cls.astype(int).tolist(), names=physics.INV_NAMES, hours_moderate_or_strong=strong_h,
                       max_c=round(float(delhi["inv"].max()), 1), max_hour=int(delhi["inv"].argmax()),
                       min_pbl_m=round(float(delhi["pbl"].min())), min_vent=round(float(delhi["vent"].min()))),
        dominant=physics.DOMINANT[int(dom)],
        grap=insights.grap(delhi["aqi"]), ozone=ozone, drivers=drv, back=back,
        uncertainty=dict(available=bool(qm), band="10th to 90th percentile", target_coverage=80,
                         holdout_coverage=(qmeta or {}).get("holdout_coverage"),
                         note="Per-station bands averaged over Delhi; a true city-mean band would be somewhat narrower."),
        feedback=feedback, attribution=attribution, params=P if scenario == "peak" else None,
        plume=dict(frames=pl["frames"], fires=pl["fires"], summary=pl["summary"]),
        stations=stations, grid=grid, meta=dict(k_aod=meta["k_aod"], metrics=meta["metrics"], trained_on=meta["trained_on"],
                                                holdout=meta["holdout"], caveat=meta["caveat"]))
    if save and P == DEFAULTS:
        (CACHE / f"forecast_{scenario}.json").write_text(json.dumps(payload, allow_nan=False))
        try:
            verification.log_run(payload)
        except Exception as e:                      # logging must never break a forecast
            print("verification log failed:", repr(e))
    return payload
