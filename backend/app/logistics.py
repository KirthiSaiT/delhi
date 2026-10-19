"""
VayuRakshak Logistics & Base Repair Depot (BRD) Integration Layer
Simulating IAF IMMOLS (Spares Inventory) & e-MMS (Maintenance Work Orders),
Lead-Time vs RUL AOG Hazard Detection, and Anti-Cannibalization Matrix
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from .config import BASE_REPAIR_DEPOTS, FLEET_REGISTRY
from .data import fleet_manager

# Spares Inventory Catalog with NATO / IAF Stock Numbers (NSN)
SPARES_CATALOG: Dict[str, Dict[str, Any]] = {
    "NSN-2840-01-AL31-HPC3": {
        "part_name": "AL-31FP High-Pressure Compressor Stage 3 Blade Kit",
        "nsn_code": "NSN-2840-01-AL31-HPC3",
        "subsystem": "Propulsion",
        "applicable_aircraft": ["SU30MKI"],
        "stock_level": 3,
        "primary_depot": "11 BRD (Ojhar / Nashik)",
        "unit_cost_inr_lakhs": 42.5,
        "lead_time_hours": 36,
        "criticality": "FLIGHT_SAFETY_CRITICAL"
    },
    "NSN-2915-01-FMU-04": {
        "part_name": "Digital Hydro-Mechanical Fuel Metering Unit (FMU)",
        "nsn_code": "NSN-2915-01-FMU-04",
        "subsystem": "Propulsion",
        "applicable_aircraft": ["SU30MKI", "MIG29UPG"],
        "stock_level": 5,
        "primary_depot": "3 BRD (Chandigarh)",
        "unit_cost_inr_lakhs": 28.0,
        "lead_time_hours": 24,
        "criticality": "MISSION_CRITICAL"
    },
    "NSN-1650-01-HYD-ACT": {
        "part_name": "Fly-By-Wire Primary Control Hydraulic Actuator",
        "nsn_code": "NSN-1650-01-HYD-ACT",
        "subsystem": "Hydraulics",
        "applicable_aircraft": ["TEJAS_MK1A", "SU30MKI"],
        "stock_level": 7,
        "primary_depot": "11 BRD (Ojhar / Nashik)",
        "unit_cost_inr_lakhs": 18.5,
        "lead_time_hours": 20,
        "criticality": "FLIGHT_SAFETY_CRITICAL"
    },
    "NSN-5998-01-1553-BC": {
        "part_name": "MIL-STD-1553B Dual-Redundant Bus Interface Unit",
        "nsn_code": "NSN-5998-01-1553-BC",
        "subsystem": "Avionics",
        "applicable_aircraft": ["SU30MKI", "TEJAS_MK1A", "MIG29UPG", "RAFALE"],
        "stock_level": 11,
        "primary_depot": "7 BRD (Tughlakabad)",
        "unit_cost_inr_lakhs": 12.0,
        "lead_time_hours": 16,
        "criticality": "MISSION_CRITICAL"
    },
    "NSN-4820-01-VALVE-EGT": {
        "part_name": "Turbine EGT Thermocouple Harness Assembly",
        "nsn_code": "NSN-4820-01-VALVE-EGT",
        "subsystem": "Propulsion",
        "applicable_aircraft": ["SU30MKI", "RAFALE", "TEJAS_MK1A"],
        "stock_level": 14,
        "primary_depot": "3 BRD (Chandigarh)",
        "unit_cost_inr_lakhs": 6.8,
        "lead_time_hours": 12,
        "criticality": "ROUTINE"
    }
}

# Initial Active Work Orders (e-MMS Work-Order Tracking)
ACTIVE_WORK_ORDERS: List[Dict[str, Any]] = [
    {
        "wo_id": "WO-2026-0891",
        "tail_number": "SB-177",
        "priority": "PRIORITY_1_AOG",
        "status": "DISPATCHED_FROM_DEPOT",
        "part_needed": "NSN-2840-01-AL31-HPC3",
        "part_name": "AL-31FP High-Pressure Compressor Stage 3 Blade Kit",
        "depot": "11 BRD (Ojhar)",
        "destination_base": "AFB_BAREILLY",
        "eta_hours": 14.5,
        "initiated_at": "2026-10-18 18:30 IST",
        "auth_officer": "Wing Commander A. Mukherjee (SEngO)"
    },
    {
        "wo_id": "WO-2026-0894",
        "tail_number": "LA-5019",
        "priority": "PRIORITY_2_PMC",
        "status": "APPROVED_PREPARING_PACK",
        "part_needed": "NSN-1650-01-HYD-ACT",
        "part_name": "Fly-By-Wire Primary Control Hydraulic Actuator",
        "depot": "11 BRD (Ojhar)",
        "destination_base": "AFB_SULUR",
        "eta_hours": 22.0,
        "initiated_at": "2026-10-19 09:15 IST",
        "auth_officer": "Squadron Leader R. Ramanathan"
    },
    {
        "wo_id": "WO-2026-0897",
        "tail_number": "KM-102",
        "priority": "PRIORITY_2_PMC",
        "status": "AWAITING_STATION_CONFIRMATION",
        "part_needed": "NSN-5998-01-1553-BC",
        "part_name": "MIL-STD-1553B Dual-Redundant Bus Interface Unit",
        "depot": "7 BRD (Tughlakabad)",
        "destination_base": "AFB_HALWARA",
        "eta_hours": 18.0,
        "initiated_at": "2026-10-19 11:45 IST",
        "auth_officer": "Flight Lieutenant N. Tiwari"
    }
]


class LogisticsEngine:
    def __init__(self):
        self.work_orders = list(ACTIVE_WORK_ORDERS)
        self.spares = {k: dict(v) for k, v in SPARES_CATALOG.items()}

    def get_spares_inventory(self) -> List[Dict[str, Any]]:
        return list(self.spares.values())

    def get_work_orders(self) -> List[Dict[str, Any]]:
        return self.work_orders

    def check_aog_hazard_alerts(self) -> List[Dict[str, Any]]:
        """
        Detects if any aircraft has a component RUL less than the depot supply lead time.
        Formula: LeadTime(part) > PredictedRUL(aircraft) => Immediate AOG Risk!
        """
        alerts = []
        fleet = fleet_manager.get_all_aircraft()
        
        for ac in fleet:
            rul = ac.get("target_rul_hours", 100.0)
            tail = ac["tail_number"]
            status = ac["status"]
            
            # Check applicable parts
            for part_key, part in self.spares.items():
                if ac["type"] in part["applicable_aircraft"]:
                    lead_h = part["lead_time_hours"]
                    # If RUL is within 1.5x of the depot lead time and not already ordered
                    if rul <= lead_h * 1.5 and status != "FMC":
                        # Check if already has an open work order
                        existing_wo = any(w["tail_number"] == tail and w["part_needed"] == part_key for w in self.work_orders)
                        
                        deficit_hours = max(0.0, lead_h - rul)
                        alerts.append({
                            "tail_number": tail,
                            "aircraft_type": ac["type"],
                            "status": status,
                            "rul_hours": rul,
                            "part_needed": part["part_name"],
                            "nsn_code": part["nsn_code"],
                            "depot": part["primary_depot"],
                            "depot_lead_time_hours": lead_h,
                            "deficit_aog_hours": round(deficit_hours, 1),
                            "existing_order": existing_wo,
                            "urgency": "CRITICAL_AOG_PREVENT" if deficit_hours > 0 else "WARNING_PREORDER"
                        })
        return alerts

    def evaluate_cannibalization(self, recipient_tail: str, part_code: str) -> Dict[str, Any]:
        """
        Evaluates the operational risk and feasibility of cannibalizing a part
        from a grounded/donor aircraft in case of wartime or high-readiness alert.
        """
        ac_recipient = fleet_manager.get_aircraft_by_tail(recipient_tail)
        part = self.spares.get(part_code)
        
        if not ac_recipient or not part:
            return {"error": "Invalid aircraft or part code"}
            
        fleet = fleet_manager.get_all_aircraft()
        candidates = []
        
        for donor in fleet:
            if donor["tail_number"] != recipient_tail and donor["type"] == ac_recipient["type"]:
                # Donor candidates are preferably already in deep maintenance or AOG
                donor_status = donor["status"]
                base_match = (donor["base"] == ac_recipient["base"])
                
                # Penalty calculations
                if donor_status == "AOG":
                    feasibility_score = 88.0 if base_match else 65.0
                    impact_assessment = "LOW_FLEET_IMPACT - Donor already grounded for unrelated defect."
                elif donor_status == "PMC":
                    feasibility_score = 55.0 if base_match else 40.0
                    impact_assessment = "MODERATE_IMPACT - Donor will degrade to AOG."
                else:  # FMC
                    feasibility_score = 15.0
                    impact_assessment = "PROHIBITED - Will ground an active Fully Mission Capable combat asset."
                    
                candidates.append({
                    "donor_tail": donor["tail_number"],
                    "donor_status": donor_status,
                    "donor_base": donor["base_name"],
                    "same_base": base_match,
                    "swap_time_hours": 4.5 if base_match else 18.0,
                    "depot_replenishment_hours": part["lead_time_hours"],
                    "feasibility_score": feasibility_score,
                    "assessment": impact_assessment,
                    "recommended": feasibility_score >= 70.0
                })
                
        # Sort candidates by highest feasibility
        candidates.sort(key=lambda x: x["feasibility_score"], reverse=True)
        
        best_candidate = candidates[0] if candidates else None
        
        return {
            "recipient_tail": recipient_tail,
            "required_part": part["part_name"],
            "nsn_code": part["nsn_code"],
            "depot_lead_time_hours": part["lead_time_hours"],
            "best_donor_option": best_candidate,
            "all_candidates": candidates,
            "tactical_guideline": (
                "Approved strictly for Quick Reaction Alert (QRA) scrambles under Defence Directive D-74. "
                "Must be logged in e-MMS with Base Engineering Officer digital signature."
            )
        }

    def create_work_order(
        self,
        tail_number: str,
        part_code: str,
        priority: str = "PRIORITY_1_AOG",
        officer: str = "Station Engineering Officer"
    ) -> Dict[str, Any]:
        """
        Creates and registers an official military work-order / IMMOLS requisition.
        """
        ac = fleet_manager.get_aircraft_by_tail(tail_number)
        part = self.spares.get(part_code)
        
        if not ac or not part:
            return {"success": False, "error": "Invalid aircraft tail or part code"}
            
        wo_count = len(self.work_orders) + 895
        wo_id = f"WO-2026-0{wo_count}"
        
        # Deduct from depot inventory if available
        if part["stock_level"] > 0:
            part["stock_level"] -= 1
            
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M IST")
        
        new_wo = {
            "wo_id": wo_id,
            "tail_number": tail_number.upper(),
            "priority": priority,
            "status": "APPROVED_DISPATCH_QUEUED",
            "part_needed": part["nsn_code"],
            "part_name": part["part_name"],
            "depot": part["primary_depot"],
            "destination_base": ac.get("base_name", "Operating Base"),
            "eta_hours": part["lead_time_hours"],
            "initiated_at": now_str,
            "auth_officer": officer
        }
        
        self.work_orders.insert(0, new_wo)
        return {"success": True, "work_order": new_wo}


# Global singleton logistics engine
logistics_engine = LogisticsEngine()
