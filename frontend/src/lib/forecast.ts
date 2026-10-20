// AirCouple / Delhi AQI Forecast type definitions
// Used by MapView, Panels, Modules components

export interface StationData {
  name: string
  lat: number
  lon: number
  aqi: number[]
  aqi_unc: number[]
  pm25: number[]
  pm25_unc: number[]
  pm25_lo: number[]
  pm25_hi: number[]
  pm25_cams: number[]
  pm10: number[]
  no2: number[]
  o3: number[]
  [key: string]: string | number | number[]
}

export interface DelhiData {
  aqi: number[]
  aqi_unc: number[]
  pm25: number[]
  pm25_unc: number[]
  pm25_lo: number[]
  pm25_hi: number[]
  pm25_cams: number[]
  pm10: number[]
  no2: number[]
  o3: number[]
  pbl: number[]
  pbl_nwp: number[]
  t2m: number[]
  t2m_nwp: number[]
  inv: number[]
  vent: number[]
  stubble: number[]
  [key: string]: number[]
}

export interface Forecast {
  times: string[]
  delhi: DelhiData
  delhi_wd: number[]
  stations: StationData[]
  dominant: string
  scenario: string
  has_cams: boolean

  grid: {
    lats: number[]
    lons: number[]
    step: number
    aqi: number[][]
  }

  plume: {
    fires: [number, number, number][]   // [lon, lat, frp]
    frames: number[][]                  // per-hour flat array [lon, lat, age, ...]
    summary: {
      n_fires: number
      total_frp: number
      arrival_h: number | null
      peak_ugm3: number
      peak_h: number | null
    }
  }

  back: {
    arrivals: Array<{
      hour: number
      dir_from: string
      dist_km_24h: number
      belt_pct: number
      exposure_mw: number
      exposure_share_pct: number
      paths: number[][][]
    }>
  }

  inversion: {
    classes: number[]
    names: string[]
    hours_moderate_or_strong: number
    max_c: number
    max_hour: number
    min_pbl_m: number
  }

  feedback: {
    pm25_uplift_mean: number
    pm25_uplift_max: number
    pm25_uplift_hour: number
    day_cooling_c: number
    aod_peak: number
    pbl_reduction_pct: number
    iterations: number
    residual_ugm3: number[]
  }

  grap: {
    stage: number[]
    hours_in_stage: Record<string, number>
    first_hour: Record<string, number | null>
    max_stage: number
  }

  ozone: {
    daily: Array<{
      o3_peak: number
      o3_peak_hour: number
    }>
    hours_o3_8h_above_100: number
    no2_night_to_day: number | null
    no2_vs_trapping_corr: number
    standards: { o3_8h: number }
  }

  drivers: {
    groups: string[]
    pct: number[][]
    baseline_pm25: number
  }

  uncertainty: {
    available: boolean
    holdout_coverage?: { overall: number }
  }

  attribution: {
    background: number[]
    stubble: number[]
    feedback: number[]
    share: { background: number; stubble: number; feedback: number }
  }

  generated?: string
  params?: Record<string, number | string>
}

export interface WhatIfParams {
  fire_scale: number
  wind_scale: number
  pbl_scale: number
  start_pm25: number
}
