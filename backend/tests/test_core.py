"""Fast unit tests for the physics, plume engine and model plumbing (no network needed).
Run:  cd backend && python -m pytest -q"""
import numpy as np
import pandas as pd
import pytest

from app import forecast, model, physics, plume
from app.config import HORIZON, STATIONS, WIND_LATS, WIND_LONS


# ---------------------------------------------------------------- AQI ---------------------------------------
@pytest.mark.parametrize("pm25,expected", [(0, 0), (30, 50), (60, 100), (90, 200), (120, 300), (250, 400), (500, 500)])
def test_pm25_breakpoints(pm25, expected):
    assert physics.sub_index("pm25", pm25) == pytest.approx(expected)


def test_aqi_takes_worst_pollutant():
    aqi, dom = physics.aqi(np.array([10.0]), np.array([10.0]), np.array([10.0]), np.array([250.0]))
    assert dom[0] == 3 and aqi[0] > 300  # ozone dominates


def test_category_labels():
    assert physics.category(45)[0] == "Good"
    assert physics.category(320)[0] == "Very Poor"
    assert physics.category(999)[0] == "Severe"


# ---------------------------------------------------------------- inversion ---------------------------------
def test_inversion_and_ventilation():
    assert physics.inversion_strength(25.0, 20.0) == 5.0
    assert physics.inversion_class(np.array([-1, 1, 3, 6])).tolist() == [0, 1, 2, 3]
    assert physics.ventilation(500.0, 2.0) == 1000.0


# ---------------------------------------------------------------- feedback ----------------------------------
def _base(S=3, H=24):
    sw = np.tile(np.maximum(0, 700 * np.sin(np.linspace(0, np.pi, H)))[None], (S, 1))
    return dict(temperature_2m=np.full((S, H), 25.0), temperature_925hPa=np.full((S, H), 24.0),
                boundary_layer_height=np.full((S, H), 1000.0), wind_speed_10m=np.full((S, H), 3.0), shortwave_radiation=sw)


def test_feedback_is_neutral_for_clean_air():
    b = _base()
    met, _ = physics.apply_feedback(b, np.full((3, 24), 20.0), 0.006)
    assert np.allclose(met["temperature_2m"], b["temperature_2m"])
    assert np.allclose(met["boundary_layer_height"], b["boundary_layer_height"])


def test_feedback_cools_and_shrinks_pbl_in_haze():
    b = _base()
    met, diag = physics.apply_feedback(b, np.full((3, 24), 250.0), 0.006)
    assert met["temperature_2m"].min() < 25.0                       # surface cooled
    assert met["boundary_layer_height"].max() < 1000.0              # PBL suppressed
    assert (met["temperature_925hPa"] >= b["temperature_925hPa"]).all()  # warmer aloft
    inv0 = b["temperature_925hPa"] - b["temperature_2m"]
    inv1 = met["temperature_925hPa"] - met["temperature_2m"]
    assert (inv1 >= inv0 - 1e-9).all()                               # inversion never weaker
    assert (diag["dsw"] <= 0).all()


def test_feedback_monotonic_in_pm25():
    b = _base()
    lo, _ = physics.apply_feedback(b, np.full((3, 24), 100.0), 0.006)
    hi, _ = physics.apply_feedback(b, np.full((3, 24), 300.0), 0.006)
    assert hi["boundary_layer_height"].mean() < lo["boundary_layer_height"].mean()


# ---------------------------------------------------------------- plume -------------------------------------
def _wind(speed=5.0, direction=270.0, pbl=800.0, T=120):
    shp = (T, len(WIND_LATS), len(WIND_LONS))
    return pd.date_range("2025-11-01", periods=T, freq="h").to_numpy(), dict(
        wind_speed_10m=np.full(shp, speed), wind_direction_10m=np.full(shp, direction),
        wind_speed_925hPa=np.full(shp, speed), wind_direction_925hPa=np.full(shp, direction),
        boundary_layer_height=np.full(shp, pbl))


def test_plume_no_fires_gives_zero():
    wt, W = _wind()
    r = plume.run_plume(pd.DataFrame(dict(latitude=[], longitude=[], frp=[])), wt, W, wt[30],
                        np.array([28.6]), np.array([77.2]))
    assert r["summary"]["n_fires"] == 0 and r["contrib"].sum() == 0


def test_plume_travels_downwind_and_shallow_pbl_amplifies():
    wt, W = _wind(direction=315.0)  # north-westerly: Punjab -> Delhi
    fires = pd.DataFrame(dict(latitude=[30.0] * 30, longitude=[76.0] * 30, frp=[30.0] * 30))
    t0 = wt[36]
    lat, lon = np.array([28.6]), np.array([77.2])
    deep = plume.run_plume(fires, wt, W, t0, lat, lon)
    W2 = dict(W); W2["boundary_layer_height"] = np.full_like(W["boundary_layer_height"], 200.0)
    shallow = plume.run_plume(fires, wt, W2, t0, lat, lon)
    assert deep["contrib"][0].max() > 0                              # reaches the receptor
    assert shallow["contrib"][0].max() > 2 * deep["contrib"][0].max()  # 4x shallower PBL -> much higher conc.


def test_plume_upwind_receptor_sees_less():
    wt, W = _wind(direction=315.0)
    fires = pd.DataFrame(dict(latitude=[30.0] * 30, longitude=[76.0] * 30, frp=[30.0] * 30))
    r = plume.run_plume(fires, wt, W, wt[36], np.array([28.6, 31.5]), np.array([77.2, 74.5]))
    assert r["contrib"][0].max() > 5 * r["contrib"][1].max()          # Delhi (downwind) >> point upwind of the fires


# ---------------------------------------------------------------- model plumbing -----------------------------
def test_feature_matrix_shape_and_features():
    S, T = len(STATIONS), 300
    rng = np.random.default_rng(0)
    keys = ["temperature_2m", "relative_humidity_2m", "boundary_layer_height", "temperature_925hPa", "wind_speed_10m",
            "wind_direction_10m", "shortwave_radiation", "wind_speed_925hPa", "precipitation",
            "pm2_5", "pm10", "ozone", "nitrogen_dioxide", "aerosol_optical_depth"]
    A = {k: np.abs(rng.normal(50, 10, (S, T))) for k in keys}
    D = model.derive(A)
    times = pd.date_range("2025-11-01", periods=T, freq="h").to_numpy()
    X, Y = model.assemble(D, times, [100, 110], np.arange(1, 73, 3))
    assert X.shape == (S * 2 * 24, len(model.FEATS))
    assert set(Y) == set(model.TARGETS)


# ---------------------------------------------------------------- what-if params ------------------------------
def test_param_clamping():
    p = forecast.clean_params(dict(fire_scale=99, wind_scale=-1, pbl_scale=None, start_pm25=200))
    assert p["fire_scale"] == 2.5 and p["wind_scale"] == 0.2
    assert p["pbl_scale"] == forecast.DEFAULTS["pbl_scale"] and p["start_pm25"] == 200
    assert HORIZON == 72
