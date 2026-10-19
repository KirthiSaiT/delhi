"""
VayuRakshak Mission Dispatch & Fleet Readiness Optimizer
Pairs Mission Profiles (QRA Scramble, CAP, Deep Strike, Ferry)
with Airframe Subsystem Health & Remaining Useful Life
"""

from typing import Dict, List, Any
from .data import fleet_manager

MISSION_PROFILES: Dict[str, Dict[str, Any]] = {
    "QRA_SCRAMBLE": {
        "mission_name": "Quick Reaction Alert (QRA) Scramble",
        "description": "High-urgency airspace defense scramble. Requires immediate maximum reheat spool-up and full 9G flight envelope.",
        "min_status": "FMC",
        "min_rul_hours": 25.0,
        "max_fatigue_index": 0.85,
        "min_propulsion_health": 85.0,
        "min_hydraulics_health": 80.0,
        "min_avionics_health": 85.0,
        "required_g_envelope": 9.0,
        "urgency_level": "CRITICAL_DEFENSE"
    },
    "COMBAT_AIR_PATROL": {
        "mission_name": "Combat Air Patrol (CAP)",
        "description": "Sustained air superiority sweep along border sectors. Demands pristine radar, BVR missile bus, and sustained turbine cooling.",
        "min_status": "FMC",
        "min_rul_hours": 30.0,
        "max_fatigue_index": 0.80,
        "min_propulsion_health": 80.0,
        "min_hydraulics_health": 80.0,
        "min_avionics_health": 90.0,
        "required_g_envelope": 8.0,
        "urgency_level": "HIGH_TACTICAL"
    },
    "DEEP_STRIKE": {
        "mission_name": "Deep Penetration Precision Strike",
        "description": "Heavy ordnance low-level ingress under hostile radar. High thermal stress, zero tolerance for hydraulic or fuel anomalies.",
        "min_status": "FMC",
        "min_rul_hours": 40.0,
        "max_fatigue_index": 0.75,
        "min_propulsion_health": 88.0,
        "min_hydraulics_health": 88.0,
        "min_avionics_health": 85.0,
        "required_g_envelope": 7.5,
        "urgency_level": "STRATEGIC"
    },
    "TACTICAL_RECON_FERRY": {
        "mission_name": "Reconnaissance / Transit Ferry",
        "description": "Point-to-point transit or optical high-altitude reconnaissance. Moderate G envelope; non-combat PMC status tolerated.",
        "min_status": "PMC",
        "min_rul_hours": 15.0,
        "max_fatigue_index": 0.92,
        "min_propulsion_health": 65.0,
        "min_hydraulics_health": 65.0,
        "min_avionics_health": 70.0,
        "required_g_envelope": 4.5,
        "urgency_level": "ROUTINE"
    }
}


def recommend_aircraft_for_mission(mission_type: str, base_filter: str = "") -> Dict[str, Any]:
    """
    Ranks fleet airframes based on multi-criteria fitness for a designated mission profile.
    """
    mission = MISSION_PROFILES.get(mission_type, MISSION_PROFILES["COMBAT_AIR_PATROL"])
    fleet = fleet_manager.get_all_aircraft()
    
    if base_filter:
        fleet = [a for a in fleet if a["base"] == base_filter or a["base_code"] == base_filter]
        
    evaluated = []
    
    for ac in fleet:
        tail = ac["tail_number"]
        status = ac["status"]
        rul = ac.get("target_rul_hours", 0.0)
        fatigue = ac.get("fatigue_index", 0.5)
        prop_h = ac.get("propulsion_health", 70.0)
        hyd_h = ac.get("hydraulics_health", 70.0)
        av_h = ac.get("avionics_health", 70.0)
        overall_h = ac.get("overall_health", 70.0)
        
        # Hard constraints
        is_grounded = (status == "AOG")
        status_eligible = (status == "FMC") if mission["min_status"] == "FMC" else (status in ["FMC", "PMC"])
        rul_eligible = (rul >= mission["min_rul_hours"])
        fatigue_eligible = (fatigue <= mission["max_fatigue_index"])
        subsystems_eligible = (
            prop_h >= mission["min_propulsion_health"] and
            hyd_h >= mission["min_hydraulics_health"] and
            av_h >= mission["min_avionics_health"]
        )
        
        eligible = (not is_grounded) and status_eligible and rul_eligible and fatigue_eligible and subsystems_eligible
        
        # Scoring algorithm
        if is_grounded:
            suitability_score = 0.0
            rejection_reason = "Grounded (AOG): Critical component replacement pending."
        elif not status_eligible:
            suitability_score = 15.0
            rejection_reason = f"Status {status} does not meet required {mission['min_status']} criteria."
        elif not rul_eligible:
            suitability_score = 25.0
            rejection_reason = f"RUL ({rul}h) below safety margin ({mission['min_rul_hours']}h) for this mission."
        elif not fatigue_eligible:
            suitability_score = 35.0
            rejection_reason = f"Airframe Fatigue Index ({fatigue:.2f}) exceeds structural threshold ({mission['max_fatigue_index']})."
        elif not subsystems_eligible:
            suitability_score = 45.0
            rejection_reason = "Subsystem health below mission operational threshold."
        else:
            # Positive scoring: Reward high health, moderate RUL cushion, and low fatigue
            score = (
                0.35 * min(100.0, (rul / 150.0) * 100.0) +
                0.35 * overall_h +
                0.30 * ((1.0 - fatigue) * 100.0)
            )
            suitability_score = round(score, 1)
            rejection_reason = "Fully compliant with mission flight envelope."
            
        evaluated.append({
            "tail_number": tail,
            "model_name": ac["model_name"],
            "squadron": ac["squadron"],
            "base_name": ac["base_name"],
            "status": status,
            "rul_hours": rul,
            "fatigue_index": fatigue,
            "overall_health": overall_h,
            "propulsion_health": prop_h,
            "hydraulics_health": hyd_h,
            "avionics_health": av_h,
            "suitability_score": suitability_score,
            "is_eligible": eligible,
            "rejection_reason": rejection_reason
        })
        
    # Sort: Eligible first by score, then ineligible by score
    evaluated.sort(key=lambda x: (x["is_eligible"], x["suitability_score"]), reverse=True)
    
    # Assign ranks
    rank = 1
    for item in evaluated:
        if item["is_eligible"]:
            item["dispatch_recommendation"] = f"PRIORITY #{rank} ALLOCATION" if rank <= 2 else "RESERVE CONTINGENCY"
            rank += 1
        else:
            item["dispatch_recommendation"] = "NOT RECOMMENDED"
            
    return {
        "mission_type": mission_type,
        "mission_name": mission["mission_name"],
        "description": mission["description"],
        "urgency_level": mission["urgency_level"],
        "required_g_envelope": mission["required_g_envelope"],
        "evaluated_aircraft": evaluated
    }
