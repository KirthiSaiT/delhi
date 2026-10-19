"""
VayuRakshak Air-Gapped Maintenance Assistant ("Raksha-Mitra")
Interactive Electronic Technical Manual (IETM), Fault-Isolation Manual (FIM),
and Standard Operating Procedures (SOP) Knowledge Engine
"""

import re
from typing import Dict, List, Any

# Knowledge Base: Standard Operating Procedures (SOPs) & Military Fault Codes
IETM_KNOWLEDGE_BASE: Dict[str, Dict[str, Any]] = {
    "EGT_OVERHEAT": {
        "fault_code": "FAULT-EGT-THERMAL-EXCEED",
        "title": "Exhaust Gas Temperature (EGT) Overheat / Margin Deterioration",
        "subsystem": "AL-31FP / GE-F404 Turbofan Propulsion",
        "severity": "CRITICAL_AIRWORTHINESS",
        "symptoms": ["EGT > 810°C during full reheat", "EGT margin < 15°C", "Spool-up latency > 0.4s"],
        "troubleshooting_steps": [
            "Step 1: Check thermocouple harness (NSN-4820-01-VALVE-EGT) calibration and probe resistance (nominal: 12.4 ± 0.5 ohms).",
            "Step 2: Perform optical borescope inspection of High-Pressure Turbine (HPT) Stage 1 nozzle guide vanes for thermal cracking or spalling.",
            "Step 3: Verify Fuel Metering Unit (FMU) stepper motor response and fuel nozzle spray pattern uniformity.",
            "Step 4: If blade coating erosion exceeds 0.8 mm, declare AOG and schedule hot-section replacement via Base Repair Depot."
        ],
        "required_tools": ["Borescope Kit (BS-401)", "Digital Multimeter (Fluke 87V)", "Turbine Torque Calibrator"],
        "estimated_rectification_hours": 3.5
    },
    "VIBRATION_SPIKE": {
        "fault_code": "FAULT-VIB-CORE-HARMONIC",
        "title": "High Core Shaft Vibration Anomaly (1X / 2X Harmonics)",
        "subsystem": "Engine Mechanical & Rotor Bearings",
        "severity": "HIGH_WATCH",
        "symptoms": ["Core vibration > 3.2 mm/s RMS", "Unusual acoustic rumble at 85% RPM", "Oil debris chip sensor warning"],
        "troubleshooting_steps": [
            "Step 1: Inspect magnetic chip detector in the engine oil scavenging return line for ferrous debris.",
            "Step 2: Conduct spectrum harmonic analysis to verify if peak aligns with N2 core rotational frequency (bearing wear) or blade passing frequency.",
            "Step 3: Check compressor forward frame mount bolts torque (nominal: 145 Nm).",
            "Step 4: Perform dynamic ground trim balancing if unbalance is pure 1X."
        ],
        "required_tools": ["Aviation Vibration Analyzer (VibX-200)", "Magnetic Debris Inspection Kit", "Torque Wrench (100-200 Nm)"],
        "estimated_rectification_hours": 2.5
    },
    "HYDRAULIC_LEAK": {
        "fault_code": "FAULT-HYD-PRESSURE-DECAY",
        "title": "Hydraulic System Pressure Decay / Actuator Response Delay",
        "subsystem": "Primary Flight Control Hydraulics",
        "severity": "FLIGHT_SAFETY_CRITICAL",
        "symptoms": ["Hydraulic pressure < 2600 PSI", "Elevon / Rudder actuator slew lag", "Reservoir fluid level low"],
        "troubleshooting_steps": [
            "Step 1: Inspect main landing gear bay and flaperon actuator housings for fluid staining (MIL-PRF-83282 red hydraulic fluid).",
            "Step 2: Check hydraulic return check-valves and engine-driven pump output pressure under full flight control deflection.",
            "Step 3: Bleed air from hydraulic accumulator circuit A & B.",
            "Step 4: If actuator servo-valve leakage exceeds 15 drops/min, replace actuator assembly (NSN-1650-01-HYD-ACT)."
        ],
        "required_tools": ["Hydraulic Ground Test Rig (3000 PSI)", "Fluid Particle Contamination Test Kit", "Seal Installation Toolset"],
        "estimated_rectification_hours": 4.0
    },
    "BUS_ERROR_1553": {
        "fault_code": "FAULT-1553-BUS-PARITY",
        "title": "MIL-STD-1553B Dual-Redundant Bus Parity / Timeout Error",
        "subsystem": "Mission Avionics & Weapon Management System",
        "severity": "MISSION_CRITICAL",
        "symptoms": ["Bus parity error rate > 0.015 err/sec", "Mission computer timeout alert", "Radar data packet drop"],
        "troubleshooting_steps": [
            "Step 1: Verify bus termination resistance across stub couplers (nominal: 70–85 ohms, matched impedance).",
            "Step 2: Inspect shielded twisted-pair cabling harness for shield grounding degradation or physical chafing near avionics bay 2.",
            "Step 3: Run built-in test (BIT) on Mission Computer Bus Controller and Remote Terminals (RT-01 to RT-08).",
            "Step 4: Swap Bus Interface Unit (NSN-5998-01-1553-BC) if error persists on Bus Channel B."
        ],
        "required_tools": ["MIL-STD-1553 Bus Analyzer (TestMaster 1553)", "TDR Cable Fault Locator", "Oscilloscope"],
        "estimated_rectification_hours": 1.8
    }
}


def query_raksha_mitra(user_query: str, aircraft_tail: str = "SB-021") -> Dict[str, Any]:
    """
    Air-gapped IETM retrieval engine.
    Matches natural language engineer queries or fault codes to verified military SOPs.
    """
    q = user_query.lower()
    
    # Keyword / Fault code matching
    matched_topic = None
    if any(k in q for k in ["egt", "temperature", "overheat", "margin", "t50", "turbine"]):
        matched_topic = IETM_KNOWLEDGE_BASE["EGT_OVERHEAT"]
    elif any(k in q for k in ["vibrat", "vibe", "rms", "bearing", "harmonic", "rumble"]):
        matched_topic = IETM_KNOWLEDGE_BASE["VIBRATION_SPIKE"]
    elif any(k in q for k in ["hydraul", "pressure", "psi", "actuator", "leak", "fluid"]):
        matched_topic = IETM_KNOWLEDGE_BASE["HYDRAULIC_LEAK"]
    elif any(k in q for k in ["1553", "bus", "avionics", "parity", "packet", "radar", "coupler"]):
        matched_topic = IETM_KNOWLEDGE_BASE["BUS_ERROR_1553"]
    else:
        # Default to EGT overview if no direct keyword match
        matched_topic = IETM_KNOWLEDGE_BASE["EGT_OVERHEAT"]
        
    response_text = (
        f"**[Raksha-Mitra IETM SOP Dispatch]**\n\n"
        f"**Target System:** {matched_topic['subsystem']} ({aircraft_tail})\n"
        f"**Fault Reference:** `{matched_topic['fault_code']}` | **Severity:** {matched_topic['severity']}\n"
        f"**Summary:** {matched_topic['title']}\n\n"
        f"### Standard Operating Procedure (SOP):\n"
    )
    for step in matched_topic["troubleshooting_steps"]:
        response_text += f"- {step}\n"
        
    response_text += (
        f"\n**Required Tooling:** {', '.join(matched_topic['required_tools'])}\n"
        f"**Estimated Turnaround Time (TAT):** {matched_topic['estimated_rectification_hours']} Hours\n"
        f"**Compliance Requirement:** Sign-off mandatory in IAF e-MMS logbook under Section 4B."
    )
    
    return {
        "query": user_query,
        "aircraft_tail": aircraft_tail,
        "fault_code": matched_topic["fault_code"],
        "subsystem": matched_topic["subsystem"],
        "severity": matched_topic["severity"],
        "estimated_tat_hours": matched_topic["estimated_rectification_hours"],
        "structured_steps": matched_topic["troubleshooting_steps"],
        "required_tools": matched_topic["required_tools"],
        "response_markdown": response_text
    }
