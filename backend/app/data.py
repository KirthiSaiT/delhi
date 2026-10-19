"""
VayuRakshak Data Layer
NASA C-MAPSS Turbofan Ingestion, Realistic Telemetry Pipeline,
Fleet State Registry, and e-MMS Maintenance Log Corpus
"""

import math
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional
from .config import FLEET_REGISTRY, AIRBASES, AIRCRAFT_TYPES
from .physics import simulate_flight_telemetry, compute_subsystem_health_scores

SENSOR_COLS = [f"s{i}" for i in range(1, 22)]
FEATURE_COLS = ["setting_1", "setting_2", "setting_3"] + SENSOR_COLS


def generate_cmapss_benchmark_data(num_engines: int = 100, seed: int = 42) -> pd.DataFrame:
    """
    Generates a high-fidelity synthetic NASA C-MAPSS (FD001) run-to-failure dataset.
    Follows NASA Ames turbofan wear profiles:
      - Initial healthy plateau (wear delay: ~30 to 90 cycles)
      - Exponential/Weibull wear trajectory in HPC, HPT temperature (T50),
        and bypass ratio (BPR) until operational failure at RUL = 0.
    """
    rng = np.random.default_rng(seed)
    records = []
    
    # Sensor baselines and sensitivity coefficients
    # Critical degraders: s2 (T24), s3 (T30), s4 (T50/EGT), s7 (P30), s11 (Ps30), s12 (phi), s15 (BPR)
    for engine_id in range(1, num_engines + 1):
        total_lifetime = rng.integers(135, 340)
        healthy_plateau = rng.integers(30, int(total_lifetime * 0.45))
        
        # Inherent manufacturing variance for this engine
        var_t50 = rng.normal(0, 1.5)
        var_ps30 = rng.normal(0, 0.4)
        var_bpr = rng.normal(0, 0.02)
        
        for cycle in range(1, total_lifetime + 1):
            rul = total_lifetime - cycle
            
            # Degradation fraction
            if cycle <= healthy_plateau:
                wear = 0.0
            else:
                progress = (cycle - healthy_plateau) / (total_lifetime - healthy_plateau)
                wear = math.pow(progress, 1.8)  # Accelerated degradation law
                
            # Operational settings (FD001 is single operating condition: sea level)
            s_1 = round(float(rng.normal(0.0, 0.0015)), 4)
            s_2 = round(float(rng.normal(0.0, 0.0002)), 4)
            s_3 = 100.0
            
            # Sensor channels (modeled after NASA Ames specs)
            s_vals = {
                "s1": 518.67,  # Fan inlet temp (deg R)
                "s2": 642.0 + wear * 18.0 + rng.normal(0, 0.5),  # LPC outlet temp
                "s3": 1585.0 + wear * 35.0 + rng.normal(0, 1.2),  # HPC outlet temp
                "s4": 1400.0 + var_t50 + wear * 55.0 + rng.normal(0, 1.8),  # LPT outlet temp (EGT)
                "s5": 14.62,   # Fan inlet pressure
                "s6": 21.61,   # Bypass-duct pressure
                "s7": 553.5 + var_ps30 - wear * 22.0 + rng.normal(0, 0.6),  # HPC outlet pressure
                "s8": 2388.0 + wear * 8.5 + rng.normal(0, 0.4),  # Physical fan speed
                "s9": 9050.0 + wear * 45.0 + rng.normal(0, 1.5),  # Physical core speed
                "s10": 1.30,   # Engine pressure ratio
                "s11": 47.30 - wear * 1.8 + rng.normal(0, 0.12),  # Static HPC pressure
                "s12": 521.5 - wear * 14.0 + rng.normal(0, 0.7),  # Ratio fuel/Ps30
                "s13": 2388.0 + wear * 7.0 + rng.normal(0, 0.5),  # Corrected fan speed
                "s14": 8130.0 + wear * 30.0 + rng.normal(0, 1.8),  # Corrected core speed
                "s15": 8.42 + var_bpr + wear * 0.38 + rng.normal(0, 0.015),  # Bypass Ratio
                "s16": 0.03,   # Burner fuel-air ratio
                "s17": 392.0 + wear * 8.0 + rng.normal(0, 0.6),  # Bleed enthalpy
                "s18": 2388.0, # Demanded fan speed
                "s19": 100.0,  # Demanded corrected fan speed
                "s20": 38.80 - wear * 1.2 + rng.normal(0, 0.1),  # HPT coolant bleed
                "s21": 23.30 - wear * 0.9 + rng.normal(0, 0.08)   # LPT coolant bleed
            }
            
            row = {
                "unit_nr": engine_id,
                "time_cycles": cycle,
                "setting_1": s_1,
                "setting_2": s_2,
                "setting_3": s_3,
                "RUL": rul
            }
            for k, v in s_vals.items():
                row[k] = round(float(v), 3)
                
            records.append(row)
            
    return pd.DataFrame(records)


class FleetDataManager:
    """
    Manages in-memory live state of IAF air fleet, telemetry cache,
    and historical e-MMS maintenance logs.
    """
    def __init__(self):
        # Deep copy registry for dynamic updates
        self.fleet = [dict(ac) for ac in FLEET_REGISTRY]
        self._init_logs()
        
    def _init_logs(self):
        self.logs = {
            "SB-021": [
                {"date": "2026-10-14", "type": "Scheduled", "action": "50-hr routine flight inspection. Oil filter checked clean. Avionics bus B test nominal.", "station": "AFB_HALWARA", "technician": "MWO R. Sharma"},
                {"date": "2026-09-28", "type": "Debrief", "action": "Post-sorte check: EGT peak 725°C at Mach 1.6 combat turn. No snag.", "station": "AFB_HALWARA", "technician": "WO K. Verma"}
            ],
            "SB-088": [
                {"date": "2026-10-18", "type": "Warning", "action": "Engine #2 core vibration telemetry flagged at 3.2 mm/s RMS during supersonic climb. Borescope inspection scheduled.", "station": "AFB_HALWARA", "technician": "MWO R. Sharma"},
                {"date": "2026-10-02", "type": "Component", "action": "Hydraulic return valve actuator calibrated. Pressure steady at 2950 PSI.", "station": "AFB_HALWARA", "technician": "Sgt M. Khan"}
            ],
            "SB-177": [
                {"date": "2026-10-19", "type": "AOG Grounding", "action": "AOG initiated. HPC Stage 3 micro-crack acoustic emission alert. Requisition forwarded to 11 BRD Ojhar for replacement module.", "station": "AFB_BAREILLY", "technician": "JWO S. Patel"},
                {"date": "2026-10-10", "type": "Defect", "action": "EGT margin drop to 8°C during afterburner ground run. Throttle spool-up lag 0.4s.", "station": "AFB_BAREILLY", "technician": "JWO S. Patel"}
            ],
            "LA-5019": [
                {"date": "2026-10-17", "type": "PMC Advisory", "action": "Main landing gear hydraulic line seal micro-seepage noted. Hydraulic pressure resting at 2620 PSI. Sorties restricted to non-combat ferry until seal kit arrives.", "station": "AFB_SULUR", "technician": "MWO A. Nambiar"}
            ],
            "KM-102": [
                {"date": "2026-10-18", "type": "Avionics Alert", "action": "MIL-STD-1553B bus parity error count exceeded 0.02 err/s during radar sweep. Coupler impedance check in progress.", "station": "AFB_HALWARA", "technician": "Sgt D. Joshi"}
            ]
        }
        
    def get_all_aircraft(self) -> List[Dict[str, Any]]:
        # Augment with base and type details
        enriched = []
        for ac in self.fleet:
            item = dict(ac)
            base_info = AIRBASES.get(item["base"], {})
            type_info = AIRCRAFT_TYPES.get(item["type"], {})
            item["base_name"] = base_info.get("name", item["base"])
            item["base_code"] = base_info.get("code", "")
            item["base_coords"] = base_info.get("location", {"lat": 28.6, "lon": 77.2})
            item["model_name"] = type_info.get("model_name", item["type"])
            item["engine_type"] = type_info.get("engine_type", "Military Turbofan")
            item["role"] = type_info.get("role", "Combat Aircraft")
            item["max_g"] = type_info.get("max_g", 9.0)
            
            # Simulate real-time telemetry slice for health scores
            telemetry = simulate_flight_telemetry(item["type"], item["target_rul_hours"], duration_steps=10)
            health = compute_subsystem_health_scores(telemetry)
            item.update(health)
            
            enriched.append(item)
        return enriched

    def get_aircraft_by_tail(self, tail_number: str) -> Optional[Dict[str, Any]]:
        for ac in self.get_all_aircraft():
            if ac["tail_number"].upper() == tail_number.upper():
                return ac
        return None

    def get_maintenance_logs(self, tail_number: str) -> List[Dict[str, Any]]:
        return self.logs.get(tail_number.upper(), [
            {"date": "2026-10-15", "type": "Routine", "action": "Daily pre-flight inspection certified airworthy.", "station": "Command Base", "technician": "Engineering Duty Officer"}
        ])

    def get_fleet_summary_metrics(self) -> Dict[str, Any]:
        aircraft_list = self.get_all_aircraft()
        total = len(aircraft_list)
        fmc = sum(1 for a in aircraft_list if a["status"] == "FMC")
        pmc = sum(1 for a in aircraft_list if a["status"] == "PMC")
        aog = sum(1 for a in aircraft_list if a["status"] == "AOG")
        
        mc_rate = round(((fmc + pmc) / total * 100.0) if total > 0 else 0.0, 1)
        fmc_rate = round((fmc / total * 100.0) if total > 0 else 0.0, 1)
        avg_rul = round(float(np.mean([a["target_rul_hours"] for a in aircraft_list])), 1)
        avg_health = round(float(np.mean([a["overall_health"] for a in aircraft_list])), 1)
        avg_fatigue = round(float(np.mean([a["fatigue_index"] for a in aircraft_list])), 2)
        
        # Critical alerts list
        critical_alerts = []
        for a in aircraft_list:
            if a["status"] == "AOG":
                critical_alerts.append({
                    "tail_number": a["tail_number"],
                    "severity": "CRITICAL",
                    "title": f"AOG: {a['tail_number']} ({a['model_name']})",
                    "reason": f"Immediate maintenance grounding. RUL critically low at {a['target_rul_hours']}h."
                })
            elif a["status"] == "PMC":
                critical_alerts.append({
                    "tail_number": a["tail_number"],
                    "severity": "WARNING",
                    "title": f"PMC Warning: {a['tail_number']}",
                    "reason": f"Subsystem degradation observed. RUL: {a['target_rul_hours']}h."
                })
                
        return {
            "total_aircraft": total,
            "fmc_count": fmc,
            "pmc_count": pmc,
            "aog_count": aog,
            "mc_rate_pct": mc_rate,
            "fmc_rate_pct": fmc_rate,
            "target_mc_rate_pct": 85.0,  # MoD benchmark target
            "average_rul_hours": avg_rul,
            "average_fleet_health": avg_health,
            "average_fatigue_index": avg_fatigue,
            "critical_alerts": critical_alerts
        }


# Global singleton instance
fleet_manager = FleetDataManager()
