"""Atmospheric physics: Indian NAQI, inversion diagnostics and the aerosol->meteorology feedback.

The feedback is a REDUCED-ORDER parameterisation (not a full WRF-Chem radiative transfer solve):
  aerosol optical depth -> surface shortwave dimming -> 2 m cooling + shallower daytime PBL
  absorbing aerosol aloft -> warmer 925 hPa -> stronger inversion -> weaker surface wind.
Coefficients are tunable constants within the literature range for Indo-Gangetic haze.
"""
import numpy as np

# ---- Indian National AQI (CPCB) ---------------------------------------------------------------
_BP = {
    "pm25": ([0, 30, 60, 90, 120, 250, 500], [0, 50, 100, 200, 300, 400, 500]),
    "pm10": ([0, 50, 100, 250, 350, 430, 600], [0, 50, 100, 200, 300, 400, 500]),
    "no2": ([0, 40, 80, 180, 280, 400, 800], [0, 50, 100, 200, 300, 400, 500]),
    "o3": ([0, 50, 100, 168, 208, 748, 1000], [0, 50, 100, 200, 300, 400, 500]),
}
CATS = [(50, "Good", "#1a9e4b"), (100, "Satisfactory", "#7cb518"), (200, "Moderate", "#e6b400"),
        (300, "Poor", "#f08a00"), (400, "Very Poor", "#e5432d"), (10**9, "Severe", "#8c1d40")]
DOMINANT = ["PM2.5", "PM10", "NO2", "O3"]


def sub_index(name, conc):
    c, i = _BP[name]
    return np.interp(np.nan_to_num(conc, nan=0.0), c, i)


def aqi(pm25, pm10, no2, o3):
    """Returns (aqi, dominant index) with dominant in DOMINANT order."""
    subs = np.stack([sub_index("pm25", pm25), sub_index("pm10", pm10),
                     sub_index("no2", no2), sub_index("o3", o3)])
    return subs.max(0), subs.argmax(0)


def category(v):
    for lim, name, col in CATS:
        if v <= lim:
            return name, col
    return CATS[-1][1], CATS[-1][2]


# ---- inversion diagnostics ---------------------------------------------------------------------
def inversion_strength(t925, t2m):
    """Temperature excess of the 925 hPa (~750 m) layer over the surface, deg C. >0 => inversion."""
    return t925 - t2m


def inversion_class(s):
    return np.select([s < 0, s < 2, s < 4], [0, 1, 2], default=3)  # none/weak/moderate/strong


INV_NAMES = ["None", "Weak", "Moderate", "Strong"]


def ventilation(pbl, ws):
    """Ventilation coefficient m^2/s (PBL height x wind). <2000 very poor, <6000 poor dispersion."""
    return pbl * ws


# ---- two-way feedback --------------------------------------------------------------------------
K_ATTEN = 0.55      # surface SW attenuation per unit excess AOD
AOD_BASE = 0.30     # aerosol loading already assumed by the NWP model
K_T = 0.02          # K cooling per W/m^2 of lost surface shortwave
K_ABS = 0.004       # K warming of 925 hPa layer per W/m^2 absorbed
COOL_DECAY = 0.8    # per-hour persistence of the cooling anomaly
DILUTION_BETA = 0.5  # concentration ~ (ventilation ratio)^beta: mass trapped in a shallower/calmer mixed layer


def apply_feedback(base, pm25, k_aod):
    """base: dict of (S,H) NWP arrays. pm25 (S,H) ug/m3. Returns adjusted met dict + diagnostics."""
    aod = k_aod * pm25
    extra = np.maximum(aod - AOD_BASE, 0.0)
    sw0 = np.nan_to_num(base["shortwave_radiation"])
    trans = np.exp(-K_ATTEN * extra)
    dsw = sw0 * trans - sw0
    s = dsw.copy()
    n = np.ones_like(dsw)
    for k in (1, 2):                      # 3 h thermal lag
        s[:, k:] += dsw[:, :-k]
        n[:, k:] += 1
    dsw_s = s / n
    dT_inst = K_T * dsw_s
    dT = np.zeros_like(dT_inst)
    prev = np.zeros(dT.shape[0])
    for i in range(dT.shape[1]):
        prev = np.minimum(dT_inst[:, i], COOL_DECAY * prev)
        dT[:, i] = prev
    t2m = base["temperature_2m"] + dT
    t925 = base["temperature_925hPa"] + np.minimum(K_ABS * np.abs(dsw_s), 1.5)
    day = sw0 > 50
    pbl = base["boundary_layer_height"] * np.where(day, np.sqrt(trans),
                                                    1 - 0.10 * np.clip(extra, 0, 1.5) / 1.5)
    dinv = np.maximum((t925 - t2m) - (base["temperature_925hPa"] - base["temperature_2m"]), 0)
    ws = base["wind_speed_10m"] * (1 - 0.10 * np.clip(dinv / 3, 0, 1))
    met = dict(temperature_2m=t2m, temperature_925hPa=t925, boundary_layer_height=np.maximum(pbl, 30),
               wind_speed_10m=ws, shortwave_radiation=sw0 + dsw)
    return met, dict(aod=aod, dsw=dsw, dT=dT)
