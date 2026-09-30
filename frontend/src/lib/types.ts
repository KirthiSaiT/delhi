export interface Station {
  name: string; lat: number; lon: number; delhi: boolean
  pm25: number[]; pm25_unc: number[]; pm25_cams: number[]; pm10: number[]; no2: number[]; o3: number[]
  pbl: number[]; pbl_nwp: number[]; t2m: number[]; t2m_nwp: number[]; inv: number[]; ws: number[]
  vent: number[]; stubble: number[]; aqi: number[]; aqi_unc: number[]; dom: number[]; wd: number[]
}
export type Series = number[]
export interface WhatIfParams { fire_scale: number; wind_scale: number; pbl_scale: number; start_pm25: number }
export interface Attribution { background: number[]; stubble: number[]; feedback: number[]; share: { background: number; stubble: number; feedback: number } }
export interface Metric { mae: number; persistence_mae: number; improvement_pct: number; r2: number }
export interface Forecast {
  scenario: "live" | "peak"; has_cams: boolean; scenario_label: string; generated: string; offline: boolean; refreshing?: boolean
  t0: string; times: string[]
  delhi: Record<string, Series>; delhi_wd: Series
  inversion: { classes: number[]; names: string[]; hours_moderate_or_strong: number; max_c: number; max_hour: number; min_pbl_m: number; min_vent: number }
  dominant: string
  attribution: Attribution; params: WhatIfParams | null
  feedback: { iterations: number; residual_ugm3: number[]; pm25_uplift_mean: number; pm25_uplift_max: number; pm25_uplift_hour: number
    day_cooling_c: number; pbl_reduction_pct: number; inversion_delta_c: number; aod_peak: number; k_aod: number }
  plume: { frames: number[][]; fires: number[][]; summary: { n_fires: number; total_frp: number; arrival_h: number | null; peak_h: number | null; peak_ugm3: number } }
  stations: Station[]
  grid: { lats: number[]; lons: number[]; step: number; aqi: number[][] }
  meta: { k_aod: number; metrics: Record<string, Record<string, Metric>>; trained_on: string; holdout: string; caveat: string }
}
