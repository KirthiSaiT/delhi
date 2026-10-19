// VayuRakshak TypeScript Type Definitions

export interface AircraftSummary {
  tail_number: string
  type: string
  squadron: string
  base: string
  total_flight_hours: number
  total_cycles: number
  status: "FMC" | "PMC" | "AOG"
  target_rul_hours: number
  fatigue_index: number
  last_overhaul: string
  base_name: string
  base_code: string
  base_coords: { lat: number; lon: number }
  model_name: string
  engine_type: string
  role: string
  max_g: number
  propulsion_health: number
  hydraulics_health: number
  avionics_health: number
  airframe_health: number
  overall_health: number
}

export interface FleetSummary {
  total_aircraft: number
  fmc_count: number
  pmc_count: number
  aog_count: number
  mc_rate_pct: number
  fmc_rate_pct: number
  target_mc_rate_pct: number
  average_rul_hours: number
  average_fleet_health: number
  average_fatigue_index: number
  critical_alerts: Array<{
    tail_number: string
    severity: "CRITICAL" | "WARNING" | "INFO"
    title: string
    reason: string
  }>
}

export interface AOGHazardAlert {
  tail_number: string
  aircraft_type: string
  status: string
  rul_hours: number
  part_needed: string
  nsn_code: string
  depot: string
  depot_lead_time_hours: number
  deficit_aog_hours: number
  existing_order: boolean
  urgency: "CRITICAL_AOG_PREVENT" | "WARNING_PREORDER"
}

export interface TelemetryFrame {
  step: number
  time_sec: number
  flight_phase: string
  altitude_ft: number
  mach: number
  throttle_pct: number
  egt_c: number
  egt_margin_c: number
  vib_fan_rms: number
  vib_core_rms: number
  hyd_press_psi: number
  oil_press_psi: number
  oil_temp_c: number
  g_load: number
  fan_rpm_pct: number
  core_rpm_pct: number
  bus_error_rate: number
}

export interface SubsystemComponent {
  name: string
  wear_pct?: number
  efficiency_pct?: number
  bit_status?: string
  crack_inspection?: string
}

export interface Subsystem3D {
  name: string
  position: [number, number, number]
  health_pct: number
  temperature_c?: number
  vibration_rms?: number
  pressure_psi?: number
  fluid_temp_c?: number
  bus_error_rate?: number
  fatigue_index?: number
  max_g_recorded?: number
  status: "NORMAL" | "WARNING" | "CRITICAL"
  components: SubsystemComponent[]
}

export interface DigitalTwinResponse {
  tail_number: string
  model_name: string
  overall_health_pct: number
  subsystems: {
    turbofan_engine_left: Subsystem3D
    turbofan_engine_right: Subsystem3D
    flight_controls_hydraulics: Subsystem3D
    mission_avionics_radar: Subsystem3D
    airframe_structure: Subsystem3D
  }
  last_telemetry: TelemetryFrame
}

export interface TrajectoryPoint {
  cycle: number
  is_historical: boolean
  predicted_rul_hours: number
  confidence_lower: number
  confidence_upper: number
}

export interface SHAPDriver {
  feature: string
  sensor_code: string
  value: string
  impact: string
  contribution_pct: number
  explanation: string
}

export interface PredictionDossier {
  tail_number: string
  aircraft_type: string
  predicted_rul_hours: number
  confidence_lower_10pct: number
  confidence_upper_90pct: number
  risk_level: "NOMINAL" | "ELEVATED" | "HIGH_WATCH" | "CRITICAL_AOG"
  action_code: string
  action_recommendation: string
  egt_margin_c: number
  vib_core_rms: number
  trajectory: TrajectoryPoint[]
  shap_drivers: SHAPDriver[]
}

export interface SparesItem {
  part_name: string
  nsn_code: string
  subsystem: string
  applicable_aircraft: string[]
  stock_level: number
  primary_depot: string
  unit_cost_inr_lakhs: number
  lead_time_hours: number
  criticality: string
}

export interface WorkOrder {
  wo_id: string
  tail_number: string
  priority: string
  status: string
  part_needed: string
  part_name: string
  depot: string
  destination_base: string
  eta_hours: number
  initiated_at: string
  auth_officer: string
}

export interface MissionEvaluatedAircraft {
  tail_number: string
  model_name: string
  squadron: string
  base_name: string
  status: string
  rul_hours: number
  fatigue_index: number
  overall_health: number
  propulsion_health: number
  hydraulics_health: number
  avionics_health: number
  suitability_score: number
  is_eligible: boolean
  rejection_reason: string
  dispatch_recommendation: string
}

export interface MissionDispatchResponse {
  mission_type: string
  mission_name: string
  description: string
  urgency_level: string
  required_g_envelope: number
  evaluated_aircraft: MissionEvaluatedAircraft[]
}
