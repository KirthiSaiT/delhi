# AirCouple — Air Pollution–Weather Coupled Forecasting System (Delhi NCR)

**SIH 2026 · PS 26082 · Ministry of Earth Sciences / NCMRWF · Theme: Clean & Green Technology**

## The problem
Standard AQI forecasts treat weather and pollution separately. In Delhi they are coupled: winter inversions trap particulates
near the ground, and dense PM2.5 in turn blocks sunlight, cooling the surface, shrinking the boundary layer (PBL) and trapping
even more pollution. Stubble-burning plumes from Punjab/Haryana arrive into exactly this stagnant, shallow atmosphere.

## What we built
A web system that produces a **72-hour AQI forecast for Delhi NCR** with an explicit **two-way meteorology ↔ chemistry
feedback loop**, **inversion tracking** and **stubble-plume dispersion**, in a real-time dashboard with twelve decision-support modules.

| Requirement in the statement | How AirCouple addresses it |
|---|---|
| 72-hour high-resolution AQI for Delhi NCR | 20 receptor stations + a 0.025° AQI surface, hourly, CPCB averaging rules (PM/NO₂ 24 h, O₃ 8 h), with a 10–90 % likely range |
| PM2.5 and ground-level ozone (and PM10, NOx) | Separate models for PM2.5, PM10, O₃, NO₂; a dedicated Ozone and NOx module |
| Two-way feedback: temperature, wind, PBL ↔ chemistry | Iterated to a fixed point (4 passes): PM2.5 → AOD → surface-SW dimming → cooler surface, shallower PBL, warmer 925 hPa, weaker wind → PM2.5 again |
| Impact of inversion on spikes | Inversion strength T(925 hPa) − T(surface), PBL height, ventilation coefficient, trapping factor, hourly |
| Stubble-burning plume dispersion | NASA FIRMS fires → emission from FRP → Lagrangian particles on the forecast wind; concentration ∝ 1 / PBL. **Source-region view** runs the wind backwards from Delhi |
| User-friendly real-time dashboard | Map + 72 h timeline, station drill-down, tabs (Air / Weather / Smoke / Why), Hindi + English, phone layout, installable |
| Actionable insight | GRAP stage forecast, health advisory with best/worst hours, attribution, scenario sliders |

## Modules
Forecast + likely range · two-way feedback · inversion tracker · stubble plume · source region (back-trajectories) · ozone and NOx ·
GRAP stage forecast · attribution + model drivers (SHAP) · health advisory · scenario controls · real-episode replay + validation
(by lead time, station, AQI category, live scoring against CAMS) · plain-language briefing and Ask box (optional LLM) · open data (CSV, API docs).

## Method (honest scope)
* **Not a full WRF-Chem run** (needs an HPC cluster and emission inventories). It is a *reduced-order coupled emulation*:
  a LightGBM chemistry emulator + parameterised aerosol–radiation–PBL feedback + mass-conservation dilution term.
  Runs on a laptop in ~30 s. Designed to accept WRF-Chem fields as a drop-in input.
* **PM2.5 predicts the change from now** (found necessary by our own validation page, which showed "no change" beating the first
  model in the first hours); a fixed nowcast blend (75/50/25 % on the current value at +1/+2/+3 h) covers the very short range.
* **Data (all open, no keys):** Open-Meteo NWP incl. PBL height and T925; Copernicus CAMS composition (PM2.5, PM10, NO₂, O₃, AOD);
  NASA FIRMS VIIRS active fires; OpenStreetMap.
* **Training:** 3.8 years of hourly data (2023–2026), 20 stations, 2.6 M samples.
* **Uncertainty:** conditional 10th/90th-percentile models of the change from now, applied as ratios to the coupled forecast.
* **Source region:** 10 particles per arrival time run backwards on the forecast wind for 72 h; fires within 30 km of any path are counted.

## Results
**Held-out stubble season (Oct 22 – Nov 28 2025, never used in training)**

| PM2.5 lead | MAE (µg/m³) | "no change" MAE | gain | R² |
|---|---|---|---|---|
| 0–24 h | 15.8 | 29.7 | 47 % | 0.76 |
| 25–48 h | 21.3 | 35.1 | 40 % | 0.66 |
| 49–72 h | 23.1 | 38.6 | 40 % | 0.63 |

O₃ R² ≈ 0.86–0.89, NO₂ ≈ 0.76–0.80, PM10 ≈ 0.2–0.4 (weak). PM2.5 AQI category exactly right 53 %, within one category 94.5 %.
By lead time the model ties "no change" at +1 h (6.0 vs 5.7) and is better from about +4 h.

**Likely range:** the 10–90 % band covered 76 % of real PM2.5 values on the hold-out (80 % target; 81 % in the first 24 h, 72 % at 49–72 h) — slightly too narrow.

**Replay of five real forecasts (Oct 28 – Nov 13 2025):** average MAE 17.6 vs 31.3 µg/m³ for "no change" (44 % better); all five beat
"no change". Peaks are still under-predicted on Oct 28 and Nov 9. The band covered 71–93 % of hours per episode.

**What-if physics (synthetic stubble-season scenario):** feedback adds ≈ +6 µg/m³ mean PM2.5 (max ≈ +18), ≈ −2 °C daytime cooling,
≈ −8 % daytime PBL; stubble plume ≈ 25 % of 72 h PM2.5, feedback ≈ 4 %.

**Tests:** 31 automated tests (AQI, inversion, feedback, plume, GRAP, ozone/NOx, drivers, bands, back-trajectories, live verification, CSV).

## Limitations we state openly
1. Ground truth is CAMS analysis, not CPCB station readings (no key). Retraining on CPCB is the first next step.
2. In the replays the two-way feedback term does **not** measurably reduce error (17.6 coupled vs 17.5 uncoupled). Its value is
   physical consistency and response to what-if conditions — not a demonstrated skill gain.
3. Feedback strengths are literature-range constants, not fitted values.
4. Off-season there are almost no real fires, so plume behaviour is demonstrated with a clearly-labelled synthetic scenario.
5. Archived meteorology is short-lead NWP, so long-lead hold-out skill is slightly optimistic.
6. GRAP stages are indicative (forecast Delhi-mean AQI vs commonly published thresholds), not an official decision.
7. The source-region view shows transport, not source apportionment.
8. The briefing/Ask box uses an LLM only if a key is configured (OpenAI-compatible, e.g. GLM); it may only rephrase forecast facts, every number is checked, and a template answer is the fallback. The live LLM call is not yet tested with a real key.
9. The Hindi interface is a beta (headings, controls, advice); long method text stays English. Docker files are untested here.

## Roadmap
CPCB/SAFAR station ground truth · fit feedback constants to observed haze episodes · WRF-Chem/WRF-only met-field ingestion ·
emission inventory (EDGAR/SAFAR) for the local background · push alerts · public hosted link · district-level advisories.
