# AirCouple — Air Pollution–Weather Coupled Forecasting System (Delhi NCR)

**SIH 2026 · PS 26082 · Ministry of Earth Sciences / NCMRWF · Theme: Clean & Green Technology**

## The problem
Standard AQI forecasts treat weather and pollution separately. In Delhi they are coupled: winter inversions trap particulates
near the ground, and dense PM2.5 in turn blocks sunlight, cooling the surface, shrinking the boundary layer (PBL) and trapping
even more pollution. Stubble-burning plumes from Punjab/Haryana arrive into exactly this stagnant, shallow atmosphere.

## What we built
A web system that produces a **72-hour AQI forecast for Delhi NCR** with an explicit **two-way meteorology ↔ chemistry
feedback loop**, **inversion tracking** and **stubble-plume dispersion**, in a real-time dashboard.

| Requirement in the statement | How AirCouple addresses it |
|---|---|
| 72-hour high-resolution AQI for Delhi NCR | 20 receptor stations + a 0.025° AQI surface, hourly, CPCB averaging rules (PM/NO₂ 24 h, O₃ 8 h) |
| PM2.5 and ground-level ozone (and PM10, NOx) | Separate models for PM2.5, PM10, O₃, NO₂; AQI uses the dominant pollutant |
| Two-way feedback: temperature, wind, PBL ↔ chemistry | Iterated to a fixed point (4 passes): PM2.5 → AOD → surface-SW dimming → cooler surface, shallower PBL, warmer 925 hPa, weaker wind → PM2.5 again |
| Impact of inversion on spikes | Inversion strength T(925 hPa) − T(surface), PBL height, ventilation coefficient, trapping factor, hourly |
| Stubble-burning plume dispersion | NASA FIRMS fire detections → emission from FRP → Lagrangian particles advected by the forecast wind; concentration ∝ 1/PBL |
| User-friendly real-time dashboard | Map + 72 h timeline, station drill-down, health advisory, attribution, scenario sliders, backtest replay |

## Method (honest scope)
* **Not a full WRF-Chem run** (needs an HPC cluster and emission inventories). It is a *reduced-order coupled emulation*:
  a LightGBM chemistry emulator + parameterised aerosol–radiation–PBL feedback + mass-conservation dilution term.
  Runs on a laptop in ~30 s. Designed to accept WRF-Chem fields as a drop-in input.
* **Data (all open, no keys):** Open-Meteo NWP incl. PBL height and T925; Copernicus CAMS composition (PM2.5, PM10, NO₂, O₃, AOD);
  NASA FIRMS VIIRS active fires; OpenStreetMap.
* **Training:** 3.8 years of hourly data (2023–2026), 20 stations, 2.6 M samples.

## Results
**Held-out stubble season (Oct 22 – Nov 28 2025, never used in training)**

| PM2.5 lead | R² | MAE gain vs persistence |
|---|---|---|
| 0–24 h | 0.70 | 39 % |
| 25–48 h | 0.63 | 37 % |
| 49–72 h | 0.61 | 39 % |

O₃ R² ≈ 0.87, NO₂ R² ≈ 0.76 (72 h). PM10 is weak (R² ≈ 0.2).

**Replay of five real forecasts (Oct 28 – Nov 13 2025):** average MAE 18.8 vs 31.3 µg/m³ for persistence (40 % better).
Category accuracy 40–65 % of hours. One forecast (Oct 28) was *worse* than persistence — it under-predicted a rising evening peak.

**What-if physics (synthetic stubble-season scenario):** feedback adds ≈ +5 µg/m³ mean PM2.5 (max +18), ≈ −2.3 °C daytime cooling,
≈ −8 % daytime PBL; stubble plume ≈ 25 % of 72 h PM2.5, feedback ≈ 4 %.

## Limitations we state openly
1. Ground truth is CAMS analysis, not CPCB station readings (no key). Retraining on CPCB is the first next step.
2. In the replays the two-way feedback term does **not** measurably reduce error (MAE 18.8 coupled vs 18.4 uncoupled). Its value is
   physical consistency and response to what-if conditions — not a demonstrated skill gain.
3. Feedback strengths are literature-range constants, not fitted values.
4. Off-season there are almost no real fires, so plume behaviour is demonstrated with a clearly-labelled synthetic scenario.
5. Archived meteorology is short-lead NWP, so long-lead hold-out skill is slightly optimistic.

## Roadmap
CPCB/SAFAR station ground truth · fit feedback constants to observed haze episodes · WRF-Chem/WRF-only met-field ingestion ·
emission inventory (EDGAR/SAFAR) for the local background · citizen alerts (PWA push) · district-level advisories.
