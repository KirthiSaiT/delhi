"""Receptor-oriented (backward) trajectories: where did the air that arrives in Delhi come from?

For several arrival hours we release particles around Delhi and run the wind BACKWARDS for 72 h.
The paths show the source region; the fire exposure counts satellite-detected fire power the air passed near."""
import numpy as np
from .config import *
from .plume import _effective_wind

DELHI = (28.62, 77.21)          # lat, lon
ARRIVALS = list(range(0, HORIZON + 1, 6))
N_PART = 10
BACK_H = 72
DT = 1800.0
K_DIFF = 400.0
FIRE_NEAR_KM = 30.0
COMPASS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"]


def _bilinear_t(field, ti, lat, lon):
    fy = np.clip((lat - WIND_LATS[0]) / 0.5, 0, len(WIND_LATS) - 1.001)
    fx = np.clip((lon - WIND_LONS[0]) / 0.5, 0, len(WIND_LONS) - 1.001)
    y0, x0 = fy.astype(int), fx.astype(int)
    wy, wx = fy - y0, fx - x0
    return (field[ti, y0, x0] * (1 - wy) * (1 - wx) + field[ti, y0 + 1, x0] * wy * (1 - wx) +
            field[ti, y0, x0 + 1] * (1 - wy) * wx + field[ti, y0 + 1, x0 + 1] * wy * wx)


def _bearing(dlat, dlon, lat0):
    return (np.degrees(np.arctan2(dlon * np.cos(np.radians(lat0)), dlat)) + 360) % 360


def run_back(wtimes, wind, now64, fires, seed=3):
    rng = np.random.default_rng(seed)
    U, V = _effective_wind(wind)
    T = U.shape[0]
    idx0 = int(np.searchsorted(wtimes, now64))
    n = len(ARRIVALS) * N_PART
    arr = np.repeat(ARRIVALS, N_PART)
    lat = DELHI[0] + rng.normal(0, 0.06, n)
    lon = DELHI[1] + rng.normal(0, 0.07, n)
    sig = np.sqrt(2 * K_DIFF * DT)
    pts = [(lat.copy(), lon.copy())]
    for j in range(BACK_H):
        for _ in range(int(3600 / DT)):
            ti = np.clip(idx0 + arr - j, 0, T - 1)
            u, v = _bilinear_t(U, ti, lat, lon), _bilinear_t(V, ti, lat, lon)
            dx = -u * DT + rng.normal(0, sig, n)
            dy = -v * DT + rng.normal(0, sig, n)
            lat = lat + dy / 111320.0
            lon = lon + dx / (111320.0 * np.cos(np.radians(lat)))
        if (j + 1) % 3 == 0:
            pts.append((lat.copy(), lon.copy()))
    P = np.stack([np.stack(p, 1) for p in pts], axis=2)              # (n, 2, Tp) -> lat/lon
    plat, plon = P[:, 0, :], P[:, 1, :]                               # (n, Tp)

    if fires is not None and len(fires):
        f = fires.sort_values("frp", ascending=False).head(400)
        fla, flo, frp = f.latitude.values, f.longitude.values, f.frp.values
        total = float(frp.sum())
    else:
        fla = flo = frp = np.empty(0); total = 0.0

    out = []
    for h in ARRIVALS:
        sel = np.where(arr == h)[0]
        la, lo = plat[sel], plon[sel]                                  # (N, Tp)
        i24 = min(8, la.shape[1] - 1)                                  # 24 h back (points every 3 h)
        dlat, dlon = la[:, i24].mean() - DELHI[0], lo[:, i24].mean() - DELHI[1]
        brg = float(_bearing(dlat, dlon, DELHI[0]))
        dist = float(np.hypot(dlat * 111.0, dlon * 111.0 * np.cos(np.radians(DELHI[0]))))
        far = np.hypot((la - DELHI[0]) * 111.0, (lo - DELHI[1]) * 111.0 * np.cos(np.radians(DELHI[0]))) > 80.0
        in_belt = ((la >= FIRE_BBOX["lat"][0]) & (la <= FIRE_BBOX["lat"][1]) &
                   (lo >= FIRE_BBOX["lon"][0]) & (lo <= FIRE_BBOX["lon"][1]) & far).any(1)
        expo = 0.0
        if len(frp):
            for k in range(len(sel)):
                d = np.hypot((la[k][:, None] - fla[None]) * 111.0,
                             (lo[k][:, None] - flo[None]) * 111.0 * np.cos(np.radians(30.0))).min(0)
                expo += float(frp[d <= FIRE_NEAR_KM].sum())
            expo /= len(sel)
        out.append(dict(hour=h, dir_from=COMPASS[int(((brg + 22.5) % 360) // 45)], dist_km_24h=round(dist),
                        belt_pct=round(100 * float(in_belt.mean())), exposure_mw=round(expo, 1),
                        exposure_share_pct=round(100 * expo / total) if total > 0 else 0,
                        paths=[[[round(float(lo[k, t]), 3), round(float(la[k, t]), 3)] for t in range(la.shape[1])]
                               for k in range(len(sel))]))
    return dict(delhi=[DELHI[1], DELHI[0]], step_h=3, arrivals=out)
