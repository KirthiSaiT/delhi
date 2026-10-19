"""
VayuRakshak (Air Power Predictive Maintenance & Fleet Availability Platform)
Configuration: Airbases, Squadrons, Aircraft Registry, Operational Thresholds
"""

from pathlib import Path
from typing import Dict, List, Any

BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"
CACHE_DIR = BASE_DIR / "cache"

MODELS_DIR.mkdir(parents=True, exist_ok=True)
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Airbases & Forward Operating Bases (FOBs)
AIRBASES: Dict[str, Dict[str, Any]] = {
    "AFB_AMBALA": {
        "name": "Air Force Station Ambala",
        "code": "AMB",
        "command": "Western Air Command",
        "location": {"lat": 30.368, "lon": 76.817},
        "elevation_ft": 900,
        "squadrons": ["No. 17 Golden Arrows (Rafale)", "No. 5 Tuskers (Jaguar)"]
    },
    "AFB_HALWARA": {
        "name": "Air Force Station Halwara",
        "code": "HLW",
        "command": "Western Air Command",
        "location": {"lat": 30.749, "lon": 75.633},
        "elevation_ft": 790,
        "squadrons": ["No. 220 Desert Tigers (Su-30MKI)"]
    },
    "AFB_SULUR": {
        "name": "Air Force Station Sulur",
        "code": "SLR",
        "command": "Southern Air Command",
        "location": {"lat": 11.013, "lon": 77.161},
        "elevation_ft": 1250,
        "squadrons": ["No. 45 Flying Daggers (Tejas LCA)", "No. 18 Flying Bullets (Tejas LCA)"]
    },
    "AFB_TEZPUR": {
        "name": "Air Force Station Tezpur",
        "code": "TZP",
        "command": "Eastern Air Command",
        "location": {"lat": 26.709, "lon": 92.784},
        "elevation_ft": 240,
        "squadrons": ["No. 106 Roughoids (Su-30MKI)"]
    },
    "AFB_BAREILLY": {
        "name": "Air Force Station Bareilly",
        "code": "BLY",
        "command": "Central Air Command",
        "location": {"lat": 28.422, "lon": 79.450},
        "elevation_ft": 560,
        "squadrons": ["No. 24 Hunting Hawks (Su-30MKI)"]
    },
    "AFB_PUNE": {
        "name": "Air Force Station Pune (Lohegaon)",
        "code": "PNE",
        "command": "South Western Air Command",
        "location": {"lat": 18.582, "lon": 73.919},
        "elevation_ft": 1940,
        "squadrons": ["No. 20 Lightnings (Su-30MKI)", "No. 30 Rhinos (Su-30MKI)"]
    }
}

# Base Repair Depots (BRDs) - Major Overhaul & Depot Logistics
BASE_REPAIR_DEPOTS: Dict[str, Dict[str, Any]] = {
    "BRD_3": {
        "name": "3 Base Repair Depot (Chandigarh)",
        "specialization": "Helicopters, Transport & Russian Aero-Engines (AL-31FP)",
        "lead_time_days": {"routine": 14, "urgent": 3, "aog": 1}
    },
    "BRD_11": {
        "name": "11 Base Repair Depot (Ojhar / Nashik)",
        "specialization": "Fighter Aircraft Overhaul (Su-30MKI & MiG-29), Avionics & Radar",
        "lead_time_days": {"routine": 12, "urgent": 2, "aog": 1}
    },
    "BRD_7": {
        "name": "7 Base Repair Depot (Tughlakabad)",
        "specialization": "Missile Systems, Air Defense & Guided Munitions Electronics",
        "lead_time_days": {"routine": 10, "urgent": 2, "aog": 1}
    }
}

# Aircraft Models in Fleet
AIRCRAFT_TYPES = {
    "SU30MKI": {
        "model_name": "Sukhoi Su-30MKI Super Flanker",
        "role": "Air Superiority / Deep Strike Multi-Role Fighter",
        "engines": 2,
        "engine_type": "Saturn AL-31FP Afterburning Turbofan with TVC",
        "max_g": 9.0,
        "max_speed_mach": 2.0,
        "tbo_engine_hours": 1000,
        "tbo_airframe_hours": 3000
    },
    "TEJAS_MK1A": {
        "model_name": "LCA Tejas Mk1A",
        "role": "Light Multi-Role Combat Fighter (Indigenous)",
        "engines": 1,
        "engine_type": "GE F404-IN20 Afterburning Turbofan",
        "max_g": 8.0,
        "max_speed_mach": 1.6,
        "tbo_engine_hours": 1200,
        "tbo_airframe_hours": 4000
    },
    "RAFALE": {
        "model_name": "Dassault Rafale EH/DH",
        "role": "Omnirole 4.5+ Gen Combat Aircraft",
        "engines": 2,
        "engine_type": "Snecma M88-4E Afterburning Turbofan",
        "max_g": 9.0,
        "max_speed_mach": 1.8,
        "tbo_engine_hours": 1500,
        "tbo_airframe_hours": 5000
    },
    "MIG29UPG": {
        "model_name": "MiG-29UPG Fulcrum",
        "role": "Air Defense & Interception",
        "engines": 2,
        "engine_type": "Klimov RD-33 Series 3",
        "max_g": 9.0,
        "max_speed_mach": 2.25,
        "tbo_engine_hours": 800,
        "tbo_airframe_hours": 2500
    }
}

# Fleet Inventory (Initial active registry representing squadrons)
FLEET_REGISTRY: List[Dict[str, Any]] = [
    {
        "tail_number": "SB-021",
        "type": "SU30MKI",
        "squadron": "No. 220 Desert Tigers",
        "base": "AFB_HALWARA",
        "total_flight_hours": 1420.5,
        "total_cycles": 890,
        "status": "FMC",  # Fully Mission Capable
        "target_rul_hours": 142.0,
        "fatigue_index": 0.42,
        "last_overhaul": "2025-06-15"
    },
    {
        "tail_number": "SB-088",
        "type": "SU30MKI",
        "squadron": "No. 220 Desert Tigers",
        "base": "AFB_HALWARA",
        "total_flight_hours": 2180.0,
        "total_cycles": 1410,
        "status": "PMC",  # Partially Mission Capable (Engine #2 high vibration warning)
        "target_rul_hours": 34.0,
        "fatigue_index": 0.74,
        "last_overhaul": "2024-11-20"
    },
    {
        "tail_number": "SB-142",
        "type": "SU30MKI",
        "squadron": "No. 106 Roughoids",
        "base": "AFB_TEZPUR",
        "total_flight_hours": 940.0,
        "total_cycles": 610,
        "status": "FMC",
        "target_rul_hours": 210.0,
        "fatigue_index": 0.28,
        "last_overhaul": "2026-01-10"
    },
    {
        "tail_number": "SB-177",
        "type": "SU30MKI",
        "squadron": "No. 24 Hunting Hawks",
        "base": "AFB_BAREILLY",
        "total_flight_hours": 2750.0,
        "total_cycles": 1780,
        "status": "AOG",  # Aircraft On Ground (HPC Stage 3 blade micro-crack risk)
        "target_rul_hours": 8.0,
        "fatigue_index": 0.89,
        "last_overhaul": "2024-03-05"
    },
    {
        "tail_number": "LA-5002",
        "type": "TEJAS_MK1A",
        "squadron": "No. 45 Flying Daggers",
        "base": "AFB_SULUR",
        "total_flight_hours": 420.0,
        "total_cycles": 310,
        "status": "FMC",
        "target_rul_hours": 320.0,
        "fatigue_index": 0.15,
        "last_overhaul": "2026-04-12"
    },
    {
        "tail_number": "LA-5011",
        "type": "TEJAS_MK1A",
        "squadron": "No. 45 Flying Daggers",
        "base": "AFB_SULUR",
        "total_flight_hours": 1150.0,
        "total_cycles": 820,
        "status": "FMC",
        "target_rul_hours": 118.0,
        "fatigue_index": 0.39,
        "last_overhaul": "2025-08-19"
    },
    {
        "tail_number": "LA-5019",
        "type": "TEJAS_MK1A",
        "squadron": "No. 18 Flying Bullets",
        "base": "AFB_SULUR",
        "total_flight_hours": 1680.0,
        "total_cycles": 1120,
        "status": "PMC",  # Hydraulic actuator pressure drop
        "target_rul_hours": 48.0,
        "fatigue_index": 0.58,
        "last_overhaul": "2025-02-14"
    },
    {
        "tail_number": "RB-003",
        "type": "RAFALE",
        "squadron": "No. 17 Golden Arrows",
        "base": "AFB_AMBALA",
        "total_flight_hours": 620.0,
        "total_cycles": 410,
        "status": "FMC",
        "target_rul_hours": 280.0,
        "fatigue_index": 0.20,
        "last_overhaul": "2026-02-01"
    },
    {
        "tail_number": "RB-008",
        "type": "RAFALE",
        "squadron": "No. 17 Golden Arrows",
        "base": "AFB_AMBALA",
        "total_flight_hours": 1890.0,
        "total_cycles": 1280,
        "status": "FMC",
        "target_rul_hours": 165.0,
        "fatigue_index": 0.49,
        "last_overhaul": "2025-05-10"
    },
    {
        "tail_number": "KM-102",
        "type": "MIG29UPG",
        "squadron": "No. 220 Desert Tigers",
        "base": "AFB_HALWARA",
        "total_flight_hours": 1920.0,
        "total_cycles": 1390,
        "status": "PMC",  # MIL-STD-1553 bus parity error rate spike
        "target_rul_hours": 24.0,
        "fatigue_index": 0.81,
        "last_overhaul": "2024-09-12"
    }
]

# Physical sensor thresholds (Nominal, Warning, Critical)
SENSOR_LIMITS = {
    "egt_c": {"nominal_max": 750.0, "warning": 810.0, "critical": 870.0, "unit": "°C"},
    "egt_margin_c": {"nominal_min": 45.0, "warning": 20.0, "critical": 10.0, "unit": "°C"},
    "vib_fan_rms": {"nominal_max": 1.5, "warning": 2.8, "critical": 4.5, "unit": "mm/s"},
    "vib_core_rms": {"nominal_max": 2.0, "warning": 3.5, "critical": 5.5, "unit": "mm/s"},
    "oil_press_psi": {"nominal_min": 40.0, "nominal_max": 65.0, "warning_low": 35.0, "critical_low": 28.0, "unit": "PSI"},
    "oil_temp_c": {"nominal_max": 120.0, "warning": 140.0, "critical": 160.0, "unit": "°C"},
    "hyd_press_psi": {"nominal_min": 2800.0, "nominal_max": 3100.0, "warning": 2600.0, "critical": 2300.0, "unit": "PSI"},
    "bus_error_rate": {"nominal_max": 0.001, "warning": 0.015, "critical": 0.05, "unit": "err/sec"},
    "fatigue_g_max": {"nominal_max": 7.0, "warning": 8.2, "critical": 9.5, "unit": "G"}
}
