import type { Forecast, WhatIfParams } from "./types"
export async function getForecast(scenario: string, refresh = false): Promise<Forecast> {
  const r = await fetch(`/api/forecast?scenario=${scenario}${refresh ? "&refresh=true" : ""}`)
  if (!r.ok) throw new Error(`API ${r.status}`)
  return r.json()
}

export const DEFAULT_PARAMS: WhatIfParams = { fire_scale: 1, wind_scale: 0.5, pbl_scale: 0.35, start_pm25: 190 }

export async function getWhatIf(p: WhatIfParams): Promise<Forecast> {
  const q = new URLSearchParams(Object.entries(p).map(([k, v]) => [k, String(v)]))
  const r = await fetch(`/api/whatif?${q}`)
  if (!r.ok) throw new Error(`API ${r.status}`)
  return r.json()
}
