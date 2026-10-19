"""
VayuRakshak Physics Engine
Aero-thermodynamics, Turbofan Degradation, Vibration Harmonics,
Hydraulic Decay, Structural Fatigue (Rainflow / Miner's Law)
"""

import math
import numpy as np
from typing import Dict, List, Any, Tuple

# Physical constants for AL-31FP / F404 / M88 turbofans
EGT_LIMIT_C = 880.0  # Max continuous redline EGT
NOMINAL_HYD_PRESSURE_PSI = 3000.0


def calculate_egt_margin(actual_egt: float) -> float:
    """
    EGT Margin = Redline Limit - Measured Takeoff EGT.
    A shrinking margin is the #1 physical indicator of turbine creep & thermal degradation.
    """
    return max(0.0, EGT_LIMIT_C - actual_egt)


def calculate_hpc_efficiency_drop(ps30: float, t30: float, p24: float, t24: float) -> float:
    """
    Calculates High-Pressure Compressor isentropic efficiency degradation.
    ps30: Static combustor inlet pressure (psia)
    t30: Total temperature at HPC outlet (deg R)
    p24: Pressure at HPC inlet (psia)
    t24: Temperature at HPC inlet (deg R)
    """
    gamma = 1.4
    if t24 <= 0 or p24 <= 0:
        return 0.0
    pr = max(1.1, ps30 / max(1.0, p24))
    tr = max(1.01, t30 / max(1.0, t24))
    ideal_tr = math.pow(pr, (gamma - 1.0) / gamma)
    eta = ideal_tr / tr
    # Baseline nominal is ~0.88; report percentage drop
    nominal_eta = 0.885
    drop_pct = max(0.0, (nominal_eta - eta) / nominal_eta * 100.0)
    return round(drop_pct, 2)


def rainflow_fatigue_increment(g_loads: List[float]) -> float:
    """
    Simplified rainflow cycle counting and Palmgren-Miner cumulative damage for G-loads.
    Damage D = sum( (G_peak - 1.0)^3.5 / N_ref )
    """
    if len(g_loads) < 2:
        return 0.0001
    damage = 0.0
    for i in range(1, len(g_loads)):
        delta_g = abs(g_loads[i] - g_loads[i - 1])
        if delta_g > 1.5:  # Significant maneuver
            # S-N curve approximation for aerospace titanium/aluminum alloys
            damage += math.pow(delta_g, 3.2) / 1.5e5
    return float(damage)


def simulate_flight_telemetry(
    aircraft_type: str,
    base_rul: float,
    flight_phase: str = "COMBAT_CRUISE",
    duration_steps: int = 50,
    seed: int = 42
) -> List[Dict[str, Any]]:
    """
    Generates realistic, physically-consistent MIL-STD-1553 high-frequency sensor telemetry.
    Takes into account operational degradation corresponding to the remaining useful life (base_rul).
    """
    rng = np.random.default_rng(seed)
    
    # Degradation scaling: As RUL decreases, mean anomalies and variance increase
    deg_factor = max(0.0, min(1.0, (150.0 - base_rul) / 150.0))
    
    # Phase profiles
    phase_profiles = {
        "TAKEOFF": {"alt": 1500, "mach": 0.45, "throttle": 98.0, "g_mean": 2.2, "g_std": 0.4},
        "COMBAT_MANEUVER": {"alt": 18000, "mach": 1.45, "throttle": 95.0, "g_mean": 5.8, "g_std": 1.6},
        "COMBAT_CRUISE": {"alt": 28000, "mach": 0.88, "throttle": 78.0, "g_mean": 1.2, "g_std": 0.2},
        "DESCENT_APPROACH": {"alt": 4500, "mach": 0.52, "throttle": 55.0, "g_mean": 1.1, "g_std": 0.3}
    }
    profile = phase_profiles.get(flight_phase, phase_profiles["COMBAT_CRUISE"])
    
    telemetry_series = []
    
    # Base baseline parameters
    base_egt = 690.0 + deg_factor * 95.0 + (profile["throttle"] - 75.0) * 2.5
    base_vib_core = 1.2 + deg_factor * 2.4
    base_vib_fan = 0.9 + deg_factor * 1.5
    base_hyd = NOMINAL_HYD_PRESSURE_PSI - deg_factor * 320.0
    
    for t in range(duration_steps):
        # Time-based noise & harmonics
        t_sec = t * 2.0
        egt_noise = rng.normal(0, 3.2)
        egt = float(np.clip(base_egt + egt_noise + 5.0 * math.sin(t_sec / 10.0), 500.0, 920.0))
        egt_margin = calculate_egt_margin(egt)
        
        # Vibration with rotor 1X and 2X harmonics
        vib_fan = float(np.clip(base_vib_fan + rng.normal(0, 0.12) + 0.15 * math.sin(t_sec * 1.5), 0.2, 6.0))
        vib_core = float(np.clip(base_vib_core + rng.normal(0, 0.18) + 0.25 * math.cos(t_sec * 2.2), 0.3, 7.5))
        
        # Hydraulic system pressure fluctuations
        hyd_press = float(np.clip(base_hyd + rng.normal(0, 25.0) - (15.0 if profile["g_mean"] > 4.0 else 0.0), 2100.0, 3150.0))
        
        # Oil pressure & temp
        oil_press = float(np.clip(54.0 - deg_factor * 12.0 + rng.normal(0, 1.2), 25.0, 70.0))
        oil_temp = float(np.clip(95.0 + deg_factor * 35.0 + rng.normal(0, 2.0), 60.0, 165.0))
        
        # G-load during maneuver
        g_load = float(np.clip(rng.normal(profile["g_mean"], profile["g_std"]), 0.8, 9.2))
        
        # MIL-STD-1553 bus health
        bus_err = float(max(0.0, rng.poisson(lam=0.002 + deg_factor * 0.035) / 10.0))
        
        # Compressor & Fan RPM percentages
        fan_rpm_pct = float(np.clip(profile["throttle"] * 1.02 + rng.normal(0, 0.4), 40.0, 105.0))
        core_rpm_pct = float(np.clip(profile["throttle"] * 0.98 + rng.normal(0, 0.3), 50.0, 104.0))
        
        telemetry_series.append({
            "step": t,
            "time_sec": t_sec,
            "flight_phase": flight_phase,
            "altitude_ft": int(profile["alt"] + rng.normal(0, 50.0)),
            "mach": round(float(profile["mach"] + rng.normal(0, 0.02)), 3),
            "throttle_pct": round(float(profile["throttle"] + rng.normal(0, 0.5)), 1),
            "egt_c": round(egt, 1),
            "egt_margin_c": round(egt_margin, 1),
            "vib_fan_rms": round(vib_fan, 2),
            "vib_core_rms": round(vib_core, 2),
            "hyd_press_psi": round(hyd_press, 1),
            "oil_press_psi": round(oil_press, 1),
            "oil_temp_c": round(oil_temp, 1),
            "g_load": round(g_load, 2),
            "fan_rpm_pct": round(fan_rpm_pct, 1),
            "core_rpm_pct": round(core_rpm_pct, 1),
            "bus_error_rate": round(bus_err, 4)
        })
        
    return telemetry_series


def compute_subsystem_health_scores(telemetry: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes normalized health index (0 to 100%) for core aircraft subsystems
    from a telemetry trace.
    """
    if not telemetry:
        return {
            "propulsion_health": 85.0,
            "hydraulics_health": 90.0,
            "avionics_health": 95.0,
            "airframe_health": 88.0,
            "overall_health": 89.5
        }
        
    mean_egt_margin = np.mean([f["egt_margin_c"] for f in telemetry])
    mean_vib_core = np.mean([f["vib_core_rms"] for f in telemetry])
    mean_hyd_press = np.mean([f["hyd_press_psi"] for f in telemetry])
    mean_bus_err = np.mean([f["bus_error_rate"] for f in telemetry])
    max_g = np.max([f["g_load"] for f in telemetry])
    
    # 1. Propulsion: dependent on EGT margin (>45C is 100%, 0C is 0%) and vibration
    egt_score = min(100.0, max(0.0, (mean_egt_margin / 45.0) * 100.0))
    vib_score = min(100.0, max(0.0, (1.0 - (mean_vib_core - 1.0) / 4.0) * 100.0))
    propulsion_health = round(0.6 * egt_score + 0.4 * vib_score, 1)
    
    # 2. Hydraulics: nominal 3000 PSI, warning 2600, critical 2300
    hyd_score = min(100.0, max(0.0, ((mean_hyd_press - 2300.0) / 700.0) * 100.0))
    hydraulics_health = round(hyd_score, 1)
    
    # 3. Avionics: bus error rate
    bus_score = min(100.0, max(0.0, (1.0 - (mean_bus_err / 0.05)) * 100.0))
    avionics_health = round(bus_score, 1)
    
    # 4. Airframe Structural: high G-strain
    g_penalty = max(0.0, (max_g - 7.0) * 8.0)
    airframe_health = round(max(20.0, 100.0 - g_penalty), 1)
    
    # Overall weighted health index
    overall = round(
        0.40 * propulsion_health +
        0.25 * hydraulics_health +
        0.20 * avionics_health +
        0.15 * airframe_health,
        1
    )
    
    return {
        "propulsion_health": propulsion_health,
        "hydraulics_health": hydraulics_health,
        "avionics_health": avionics_health,
        "airframe_health": airframe_health,
        "overall_health": overall
    }
