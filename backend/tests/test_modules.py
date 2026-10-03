"""Tests for the decision-support modules: GRAP, ozone/NOx, drivers, bands, back-trajectories, verification, export."""
import numpy as np
import pandas as pd
import pytest

from app import insights, model, trajectory, verification
from app.config import HORIZON, STATIONS, WIND_LATS, WIND_LONS


# ---------------------------------------------------------------- GRAP ---------------------------------------------
def test_grap_stage_edges():
    aqi = [150, 201, 300, 301, 400, 401, 450, 451]
    g = insights.grap(aqi)
    assert g["stage"] == [0, 1, 1, 2, 2, 3, 3, 4]
    assert g["max_stage"] == 4 and g["first_hour"]["2"] == 3 and g["first_hour"]["4"] == 7


def test_grap_quiet_period():
    g = insights.grap([100] * 10)
    assert g["max_stage"] == 0 and all(v is None for v in g["first_hour"].values())


# ---------------------------------------------------------------- ozone / NOx --------------------------------------
def test_ozone_nox_summary():
    times = [str(t)[:16] for t in pd.date_range("2025-11-01 00:00", periods=HORIZON + 1, freq="h")]
    hr = np.arange(HORIZON + 1) % 24
    o3 = 20 + 120 * np.exp(-((hr - 13) ** 2) / 12.0)           # afternoon peak
    no2 = 30 + 60 * ((hr >= 20) | (hr <= 5))                     # night build-up
    pbl = np.where((hr >= 20) | (hr <= 5), 80.0, 900.0)          # shallow lid at night
    o = insights.ozone_nox(times, o3, no2, pbl, np.full(24, 30.0), np.full(24, 40.0))
    assert o["daily"][0]["o3_peak_hour"] in (12, 13, 14)
    assert o["no2_night_to_day"] > 1.5
    assert o["no2_vs_trapping_corr"] > 0.8
    assert len(o["o3_8h"]) == HORIZON + 1


# ---------------------------------------------------------------- drivers ------------------------------------------
def test_driver_groups_cover_every_feature_exactly_once():
    flat = [f for _, fs in insights.GROUPS for f in fs]
    assert sorted(flat) == sorted(model.FEATS)


# ---------------------------------------------------------------- uncertainty bands --------------------------------
class _Stub:
    def __init__(self, ratio):
        self.ratio = ratio

    def predict(self, X):
        return np.log1p(np.full(len(X), 50.0 * self.ratio))


def test_bands_bracket_the_forecast():
    S, H = 3, 4
    X = np.zeros((S * H, 2)); X[:, 0] = 10      # lead 10 h: no nowcast blending
    mean_pred = np.full((S, H), 50.0)
    coupled = np.full((S, H), 80.0)
    lo, hi = insights.bands({0.1: _Stub(0.6), 0.9: _Stub(1.8)}, X, mean_pred, coupled, S, H)
    assert (lo < coupled).all() and (hi > coupled).all()
    assert np.allclose(lo, 80 * 0.6) and np.allclose(hi, 80 * 1.8)


def test_bands_never_cross_the_forecast_when_quantiles_are_odd():
    S, H = 1, 3
    X = np.zeros((S * H, 2)); X[:, 0] = 10
    lo, hi = insights.bands({0.1: _Stub(1.4), 0.9: _Stub(0.7)}, X, np.full((S, H), 50.0), np.full((S, H), 80.0), S, H)
    assert (lo <= 80).all() and (hi >= 80).all()


def test_bands_tighten_at_short_lead():
    S, H = 1, 3
    far = np.zeros((S * H, 2)); far[:, 0] = 10
    near = np.zeros((S * H, 2)); near[:, 0] = 1
    args = dict(mean_pred=np.full((S, H), 50.0), coupled=np.full((S, H), 80.0), S=S, H=H)
    q = {0.1: _Stub(0.6), 0.9: _Stub(1.8)}
    lo_f, hi_f = insights.bands(q, X=far, **args)
    lo_n, hi_n = insights.bands(q, X=near, **args)
    assert (hi_n - lo_n < hi_f - lo_f).all()


def test_nowcast_weight_rule():
    X = np.zeros((6, 2)); X[:, 0] = [1, 2, 3, 4, 10, 72]
    assert model.nowcast_weight(X).tolist() == [0.75, 0.5, 0.25, 0.0, 0.0, 0.0]


# ---------------------------------------------------------------- back-trajectories --------------------------------
def _wind(speed=5.0, direction=315.0, T=240):
    shp = (T, len(WIND_LATS), len(WIND_LONS))
    times = pd.date_range("2025-11-01", periods=T, freq="h").to_numpy()
    return times, dict(wind_speed_10m=np.full(shp, speed), wind_direction_10m=np.full(shp, direction),
                       wind_speed_925hPa=np.full(shp, speed), wind_direction_925hPa=np.full(shp, direction),
                       boundary_layer_height=np.full(shp, 800.0))


def test_back_trajectories_point_upwind():
    wt, W = _wind(direction=315.0)                       # wind FROM the north-west
    out = trajectory.run_back(wt, W, wt[100], None)
    a = out["arrivals"][0]
    assert a["dir_from"] == "north-west"
    assert a["dist_km_24h"] > 150                         # ~5 m/s * 24 h = ~430 km on a straight path, minus the effective-wind blend
    assert len(a["paths"]) == trajectory.N_PART
    lon0, lat0 = a["paths"][0][0]
    lon1, lat1 = a["paths"][0][-1]
    assert lat1 > lat0 and lon1 < lon0                    # ends up north and west of Delhi


def test_back_trajectory_fire_exposure():
    wt, W = _wind(direction=315.0)
    fires = pd.DataFrame(dict(latitude=[30.5] * 20, longitude=[75.0] * 20, frp=[40.0] * 20))
    near = trajectory.run_back(wt, W, wt[100], fires)["arrivals"][0]
    none = trajectory.run_back(wt, W, wt[100], pd.DataFrame(dict(latitude=[10.0], longitude=[90.0], frp=[40.0])))["arrivals"][0]
    assert near["exposure_mw"] > 0 and none["exposure_mw"] == 0
    assert near["belt_pct"] > 0


# ---------------------------------------------------------------- live verification ------------------------------
def test_verification_scores_a_logged_run(tmp_path, monkeypatch):
    monkeypatch.setattr(verification, "VDIR", tmp_path)
    t0 = pd.Timestamp.now(tz="Asia/Kolkata").tz_localize(None).floor("h") - pd.Timedelta(hours=40)
    times = [str(t0 + pd.Timedelta(hours=i))[:16].replace(" ", "T") for i in range(HORIZON + 1)]
    payload = dict(scenario="live", times=times, delhi=dict(
        pm25=[100.0] * (HORIZON + 1), pm25_cams=[80.0] * (HORIZON + 1), pm25_lo=[70.0] * (HORIZON + 1), pm25_hi=[130.0] * (HORIZON + 1)))
    verification.log_run(payload)
    idx = pd.date_range(t0, periods=HORIZON + 1, freq="h")
    monkeypatch.setattr(verification, "_truth", lambda: pd.Series(110.0, index=idx))
    r = verification.evaluate()
    assert r["runs"] == 1 and r["points"] > 0
    first = r["buckets"][0]
    assert first["ours"] == pytest.approx(10.0) and first["cams"] == pytest.approx(30.0)
    assert first["band_coverage"] == 100.0


def test_verification_ignores_scenario_runs(tmp_path, monkeypatch):
    monkeypatch.setattr(verification, "VDIR", tmp_path)
    verification.log_run(dict(scenario="peak", times=["2025-11-01T00:00"], delhi={}))
    assert list(tmp_path.glob("*.json")) == []


# ---------------------------------------------------------------- CSV export ---------------------------------------
def test_csv_export(monkeypatch):
    from fastapi.testclient import TestClient
    from app import main
    n = 2
    st = dict(name="Test", lat=28.6, lon=77.2, **{k: [1.0] * n for k in
              ["aqi", "pm25", "pm25_lo", "pm25_hi", "pm10", "no2", "o3", "pbl", "t2m", "ws", "inv", "stubble"]})
    monkeypatch.setattr(main, "get_forecast", lambda scenario="live", refresh=False: dict(times=["2025-11-01T00:00", "2025-11-01T01:00"], stations=[st]))
    r = TestClient(main.app).get("/api/export.csv?scenario=live")
    lines = r.text.strip().splitlines()
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/csv")
    assert lines[0].startswith("time_ist,station") and len(lines) == 3
    assert "attachment" in r.headers["content-disposition"]
