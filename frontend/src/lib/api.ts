// VayuRakshak API Client

import type {
  FleetSummary,
  AircraftSummary,
  AOGHazardAlert,
  DigitalTwinResponse,
  PredictionDossier,
  TelemetryFrame,
  SparesItem,
  WorkOrder,
  MissionDispatchResponse
} from "./types"

const BASE_URL = "" // Relative path proxies through Vite server to :8000

export async function fetchFleetOverview(): Promise<{
  summary: FleetSummary
  aog_hazards: AOGHazardAlert[]
  aircraft: AircraftSummary[]
  airbases: Record<string, any>
}> {
  const res = await fetch(`${BASE_URL}/api/fleet`)
  if (!res.ok) throw new Error("Failed to fetch fleet overview")
  return res.json()
}

export async function fetchAircraftDetails(tail: string): Promise<{
  aircraft: AircraftSummary
  prediction_summary: PredictionDossier
  maintenance_logs: any[]
  sensor_limits: any
}> {
  const res = await fetch(`${BASE_URL}/api/aircraft/${tail}`)
  if (!res.ok) throw new Error(`Failed to fetch aircraft details for ${tail}`)
  return res.json()
}

export async function fetchDigitalTwin(tail: string): Promise<DigitalTwinResponse> {
  const res = await fetch(`${BASE_URL}/api/digital-twin/${tail}`)
  if (!res.ok) throw new Error(`Failed to fetch digital twin for ${tail}`)
  return res.json()
}

export async function fetchTelemetry(
  tail: string,
  phase: string = "COMBAT_CRUISE",
  duration: number = 30
): Promise<{
  tail_number: string
  aircraft_type: string
  flight_phase: string
  health_scores: any
  telemetry: TelemetryFrame[]
}> {
  const res = await fetch(
    `${BASE_URL}/api/telemetry/${tail}?flight_phase=${encodeURIComponent(phase)}&duration_steps=${duration}`
  )
  if (!res.ok) throw new Error(`Failed to fetch telemetry for ${tail}`)
  return res.json()
}

export async function fetchPrediction(tail: string): Promise<PredictionDossier> {
  const res = await fetch(`${BASE_URL}/api/predict/${tail}`)
  if (!res.ok) throw new Error(`Failed to fetch prediction for ${tail}`)
  return res.json()
}

export async function fetchLogisticsHub(): Promise<{
  spares_catalog: SparesItem[]
  active_work_orders: WorkOrder[]
  aog_hazard_alerts: AOGHazardAlert[]
  base_repair_depots: Record<string, any>
}> {
  const res = await fetch(`${BASE_URL}/api/logistics`)
  if (!res.ok) throw new Error("Failed to fetch logistics hub")
  return res.json()
}

export async function createWorkOrder(data: {
  tail_number: string
  part_code: string
  priority: string
  officer?: string
}): Promise<{ success: boolean; work_order: WorkOrder }> {
  const res = await fetch(`${BASE_URL}/api/logistics/order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error("Failed to create work order")
  return res.json()
}

export async function fetchCannibalization(
  tail: string,
  partCode: string
): Promise<any> {
  const res = await fetch(
    `${BASE_URL}/api/logistics/cannibalization/${tail}/${encodeURIComponent(partCode)}`
  )
  if (!res.ok) throw new Error("Failed to evaluate cannibalization")
  return res.json()
}

export async function fetchMissionDispatch(
  missionType: string,
  baseFilter: string = ""
): Promise<MissionDispatchResponse> {
  const res = await fetch(`${BASE_URL}/api/dispatch/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mission_type: missionType, base_filter: baseFilter })
  })
  if (!res.ok) throw new Error("Failed to fetch mission dispatch")
  return res.json()
}

export async function queryRakshaMitra(
  query: string,
  tail: string = "SB-021"
): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/assistant/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, tail_number: tail })
  })
  if (!res.ok) throw new Error("Failed to query Raksha-Mitra")
  return res.json()
}

export async function fetchBenchmarks(): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/benchmark`)
  if (!res.ok) throw new Error("Failed to fetch benchmarks")
  return res.json()
}

export async function simulateWhatIf(data: {
  tail_number: string
  scenario_type: string
  added_flight_hours: number
  g_load_multiplier?: number
  dust_particle_ppm?: number
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/whatif`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error("Failed to simulate what-if scenario")
  return res.json()
}
