"""
VayuRakshak Comprehensive Backend Test Suite
Validates API endpoints, Physics, ML Predictions, Quantile Bounds,
Logistics, Mission Dispatch, and Raksha-Mitra Assistant
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.physics import (
    calculate_egt_margin,
    calculate_hpc_efficiency_drop,
    simulate_flight_telemetry,
    compute_subsystem_health_scores
)
from app.model import rul_predictor
from app.logistics import logistics_engine
from app.dispatch import recommend_aircraft_for_mission

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.json()
    assert data["project"] == "VayuRakshak (AeroTwin-AI)"
    assert data["status"] == "OPERATIONAL"



def test_fleet_overview():
    response = client.get("/api/fleet")
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert "aircraft" in data
    assert "aog_hazards" in data
    summary = data["summary"]
    assert summary["total_aircraft"] >= 8
    assert summary["mc_rate_pct"] > 50.0
    assert summary["fmc_count"] + summary["pmc_count"] + summary["aog_count"] == summary["total_aircraft"]


def test_aircraft_dossier():
    # Valid aircraft
    response = client.get("/api/aircraft/SB-021")
    assert response.status_code == 200
    data = response.json()
    assert data["aircraft"]["tail_number"] == "SB-021"
    assert "prediction_summary" in data
    assert "maintenance_logs" in data
    
    # Non-existent aircraft
    response_404 = client.get("/api/aircraft/INVALID-999")
    assert response_404.status_code == 404


def test_telemetry_stream():
    response = client.get("/api/telemetry/SB-021?flight_phase=COMBAT_MANEUVER&duration_steps=20")
    assert response.status_code == 200
    data = response.json()
    assert len(data["telemetry"]) == 20
    assert "health_scores" in data
    frame = data["telemetry"][0]
    assert "egt_c" in frame
    assert "egt_margin_c" in frame
    assert "vib_core_rms" in frame
    assert "hyd_press_psi" in frame
    assert "bus_error_rate" in frame
    assert frame["egt_c"] > 400.0


def test_digital_twin_subsystems():
    response = client.get("/api/digital-twin/SB-021")
    assert response.status_code == 200
    data = response.json()
    assert "subsystems" in data
    sub = data["subsystems"]
    assert "turbofan_engine_left" in sub
    assert "flight_controls_hydraulics" in sub
    assert "mission_avionics_radar" in sub
    assert "airframe_structure" in sub
    assert len(sub["turbofan_engine_left"]["position"]) == 3


def test_ml_prediction_and_quantile_order():
    response = client.get("/api/predict/SB-021")
    assert response.status_code == 200
    data = response.json()
    assert "predicted_rul_hours" in data
    assert "confidence_lower_10pct" in data
    assert "confidence_upper_90pct" in data
    
    # Mathematical sanity check on quantiles: Q10 <= Median/Pred <= Q90
    q10 = data["confidence_lower_10pct"]
    pred = data["predicted_rul_hours"]
    q90 = data["confidence_upper_90pct"]
    assert q10 <= pred
    assert pred <= q90
    assert len(data["trajectory"]) > 5
    assert len(data["shap_drivers"]) >= 3


def test_logistics_and_work_orders():
    # Spares inventory
    response = client.get("/api/logistics")
    assert response.status_code == 200
    data = response.json()
    assert len(data["spares_catalog"]) >= 4
    assert len(data["active_work_orders"]) >= 1
    
    # Create work order
    req = {
        "tail_number": "SB-142",
        "part_code": "NSN-2915-01-FMU-04",
        "priority": "PRIORITY_2_PMC",
        "officer": "Squadron Engineering Officer"
    }
    create_resp = client.post("/api/logistics/order", json=req)
    assert create_resp.status_code == 200
    create_data = create_resp.json()
    assert create_data["success"] is True
    assert create_data["work_order"]["tail_number"] == "SB-142"


def test_cannibalization_matrix():
    response = client.get("/api/logistics/cannibalization/SB-177/NSN-2840-01-AL31-HPC3")
    assert response.status_code == 200
    data = response.json()
    assert data["recipient_tail"] == "SB-177"
    assert "all_candidates" in data
    assert len(data["all_candidates"]) > 0


def test_mission_dispatch_recommendations():
    # Combat Air Patrol requires FMC and high health
    req = {"mission_type": "COMBAT_AIR_PATROL"}
    response = client.post("/api/dispatch/recommend", json=req)
    assert response.status_code == 200
    data = response.json()
    assert "evaluated_aircraft" in data
    # Grounded aircraft (SB-177) MUST NOT be recommended
    for ac in data["evaluated_aircraft"]:
        if ac["status"] == "AOG":
            assert ac["is_eligible"] is False
            assert ac["dispatch_recommendation"] == "NOT RECOMMENDED"


def test_raksha_mitra_assistant():
    # Test EGT troubleshooting query
    req = {"query": "How do I troubleshoot high EGT margin deterioration?", "tail_number": "SB-088"}
    response = client.post("/api/assistant/query", json=req)
    assert response.status_code == 200
    data = response.json()
    assert "fault_code" in data
    assert "FAULT-EGT" in data["fault_code"]
    assert len(data["structured_steps"]) >= 3
    assert data["estimated_tat_hours"] > 0


def test_whatif_combat_simulation():
    req = {
        "tail_number": "SB-021",
        "scenario_type": "COMBAT_AFTERBURNER_OVERHEAT",
        "added_flight_hours": 20.0
    }
    response = client.post("/api/whatif", json=req)
    assert response.status_code == 200
    data = response.json()
    assert data["projected_rul_hours"] < data["original_rul_hours"]
    assert data["rul_reduction_hours"] > 0


def test_csv_export():
    response = client.get("/api/export")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    content = response.text
    assert "Tail Number" in content
    assert "Predicted RUL" in content
    assert "SB-021" in content
