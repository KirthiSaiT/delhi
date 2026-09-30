"""Lagrangian stubble-burning plume engine.

Fire detections (FIRMS VIIRS, or the labelled synthetic peak scenario) are aggregated to 0.1 deg sources.
Emission = FRP -> biomass burnt (0.368 kg/MJ) x PM2.5 emission factor (10 g/kg).
Particles are advected by a mixed-layer wind (10 m blended toward 925 hPa by PBL depth), with a per-particle
direction/speed perturbation and random-walk diffusion to emulate turbulent + shear spread.
Receptor concentration = kernel-weighted particle mass / PBL depth, so a shallow PBL / strong inversion
amplifies the same emission into a much larger surface spike.
"""
import numpy as np
import pandas as pd
from .config import *

PM_PER_MW = 0.368 * 10.0 * 1e6      # ug/s of PM2.5 per MW of FRP  (0.368 kg/MJ * 10 g/kg)
DUTY_SCALE = 0.6                    # detection snapshot -> mean burning fraction
DT = 1800.0
DECAY_TAU = 36 * 3600.0
KERNEL_KM = 15.0
K_DIFF = 400.0                      # m^2/s
N_REL = 2
SPINUP = 24


def _duty(hour):
    return 1.0 if 12 <= hour < 17 else 0.4 if (9 <= hour < 12 or 17 <= hour < 19) else 0.08


def _bilinear(field, lat, lon):
    fy = np.clip((lat - WIND_LATS[0]) / 0.5, 0, len(WIND_LATS) - 1.001)
    fx = np.clip((lon - WIND_LONS[0]) / 0.5, 0, len(WIND_LONS) - 1.001)
    y0, x0 = fy.astype(int), fx.astype(int)
    wy, wx = fy - y0, fx - x0
    return (field[y0, x0] * (1 - wy) * (1 - wx) + field[y0 + 1, x0] * wy * (1 - wx) +
            field[y0, x0 + 1] * (1 - wy) * wx + field[y0 + 1, x0 + 1] * wy * wx)


def _effective_wind(w):
    def uv(s, d):
        r = np.radians(d)
        return -s * np.sin(r), -s * np.cos(r)
    u10, v10 = uv(w["wind_speed_10m"], w["wind_direction_10m"])
    u9, v9 = uv(w["wind_speed_925hPa"], w["wind_direction_925hPa"])
    a = np.clip(w["boundary_layer_height"] / 800.0, 0.1, 1.0) * 0.7
    return u10 + (u9 - u10) * a, v10 + (v9 - v10) * a


def run_plume(fires, wtimes, wind, t0, station_lat, station_lon, hours=HORIZON, seed=1):
    rng = np.random.default_rng(seed)
    U, V = _effective_wind(wind)
    PBL = np.nan_to_num(wind["boundary_layer_height"], nan=300.0)
    idx0 = int(np.searchsorted(wtimes, np.datetime64(t0)))
    if fires is None or len(fires) == 0:
        return dict(contrib=np.zeros((len(station_lat), hours + 1)), frames=[[] for _ in range(hours + 1)],
                    fires=[], summary=dict(n_fires=0, total_frp=0, arrival_h=None, peak_h=None, peak_ugm3=0))
    f = fires.copy()
    f["clat"] = (f.latitude / 0.1).round() * 0.1
    f["clon"] = (f.longitude / 0.1).round() * 0.1
    src = f.groupby(["clat", "clon"], as_index=False).frp.sum().sort_values("frp", ascending=False).head(320)
    s_lat, s_lon, s_rate = src.clat.values, src.clon.values, src.frp.values * PM_PER_MW * DUTY_SCALE
    ns = len(src)
    PLAT = np.empty(0); PLON = np.empty(0); PM = np.empty(0); PAGE = np.empty(0)
    PROT = np.empty(0); PSPD = np.empty(0)
    slat, slon = np.asarray(station_lat), np.asarray(station_lon)
    contrib = np.zeros((len(slat), hours + 1))
    frames = [[] for _ in range(hours + 1)]
    t0h = pd.Timestamp(t0).hour

    def snapshot(h, ti):
        if len(PLAT):
            take = np.arange(len(PLAT))
            if len(take) > 900:
                take = rng.choice(take, 900, replace=False)
            fl = np.stack([np.round(PLON[take], 3), np.round(PLAT[take], 3), np.minimum(PAGE[take] / 3600, 99).round(1)], 1)
            frames[h] = fl.ravel().tolist()
            cl = np.cos(np.radians(slat))
            for j in range(len(slat)):
                d2 = ((PLAT - slat[j]) * 111.0) ** 2 + ((PLON - slon[j]) * 111.0 * cl[j]) ** 2
                g = np.exp(-d2 / (2 * KERNEL_KM ** 2)) / (2 * np.pi * (KERNEL_KM * 1e3) ** 2)
                pbl = max(float(_bilinear(PBL[ti], np.array([slat[j]]), np.array([slon[j]]))[0]), 150.0)
                contrib[j, h] = float((PM * g).sum() / pbl)

    for k in range(-SPINUP, hours):
        ti = idx0 + k
        if ti < 0 or ti + 1 >= len(wtimes):
            continue
        hour = (t0h + k) % 24
        rate = s_rate * _duty(hour) * 3600.0
        n = ns * N_REL
        PLAT = np.concatenate([PLAT, np.repeat(s_lat, N_REL) + rng.normal(0, 0.03, n)])
        PLON = np.concatenate([PLON, np.repeat(s_lon, N_REL) + rng.normal(0, 0.03, n)])
        PM = np.concatenate([PM, np.repeat(rate / N_REL, N_REL)])
        PAGE = np.concatenate([PAGE, np.zeros(n)])
        PROT = np.concatenate([PROT, rng.normal(0, np.radians(14), n)])
        PSPD = np.concatenate([PSPD, np.clip(rng.normal(1.0, 0.18, n), 0.4, 1.8)])
        for _ in range(int(3600 / DT)):
            u, v = _bilinear(U[ti], PLAT, PLON), _bilinear(V[ti], PLAT, PLON)
            c, s = np.cos(PROT), np.sin(PROT)
            u, v = (u * c - v * s) * PSPD, (u * s + v * c) * PSPD
            sig = np.sqrt(2 * K_DIFF * DT)
            dx = u * DT + rng.normal(0, sig, len(u))
            dy = v * DT + rng.normal(0, sig, len(u))
            PLAT = PLAT + dy / 111320.0
            PLON = PLON + dx / (111320.0 * np.cos(np.radians(PLAT)))
            PM = PM * np.exp(-DT / DECAY_TAU)
            PAGE = PAGE + DT
        keep = (PLAT > 24) & (PLAT < 35) & (PLON > 70) & (PLON < 82) & (PM > 1e3)
        PLAT, PLON, PM, PAGE, PROT, PSPD = PLAT[keep], PLON[keep], PM[keep], PAGE[keep], PROT[keep], PSPD[keep]
        if k == -1:
            snapshot(0, idx0)
        if k >= 0:
            snapshot(k + 1, ti + 1)

    delhi = contrib[:11].mean(0)
    arrival = next((h for h in range(hours + 1) if delhi[h] > 5.0), None)
    ph = int(delhi.argmax())
    top = f.sort_values("frp", ascending=False).head(400)
    return dict(contrib=contrib, frames=frames,
                fires=[[round(float(a), 3), round(float(b), 3), round(float(c), 1)] for a, b, c in
                       zip(top.longitude, top.latitude, top.frp)],
                summary=dict(n_fires=int(len(f)), total_frp=round(float(f.frp.sum()), 1), arrival_h=arrival,
                             peak_h=ph, peak_ugm3=round(float(delhi[ph]), 1)))
