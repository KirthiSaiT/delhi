# AirCouple — Air Pollution–Weather Coupled Forecasting for Delhi NCR

SIH 2026 · Problem Statement 26082 · MoES / NCMRWF

A 72-hour AQI forecast for Delhi NCR in which **meteorology and chemistry are coupled in both directions**,
with explicit **atmospheric-inversion tracking** and **stubble-burning plume dispersion**, served through a real-time dashboard.

> **Honest scope:** this is a *reduced-order coupled emulation*, not a full WRF-Chem run. A machine-learned chemistry step
> (LightGBM) is iterated with a physically-parameterised aerosol–radiation–PBL feedback. WRF-Chem needs an HPC cluster and
> emission inventories; this system runs on a laptop in ~30 s per forecast and is designed to be swapped for WRF-Chem output
> (the model consumes the same fields: T2m, T925, PBL height, wind, SW radiation, AOD).

## Modules
| Module | What it answers |
|---|---|
| 72-hour forecast + AQI surface | PM2.5, PM10, NO₂, O₃ and CPCB-averaged AQI for 20 NCR stations and a 0.025° grid |
| Likely range | 10th–90th percentile band around PM2.5 (quantile models); covered 76 % of real values on the held-out season (target 80 %) |
| Two-way feedback | Smoke → sunlight → surface cooling, shallower PBL, stronger inversion → more smoke; iterated to a fixed point |
| Inversion tracker | T(925 hPa) − T(surface), PBL height, ventilation coefficient, trapping factor, hourly |
| Stubble plume | NASA FIRMS fires carried by the forecast wind; concentration ∝ 1 / mixing depth |
| Source region | Back-trajectories from Delhi: where the air came from, share of paths crossing the stubble belt, fire power passed near |
| Ozone and NOx | Afternoon ozone peaks, night-time NO₂ build-up under the lid, standard exceedance hours |
| GRAP stage forecast | Which GRAP stage (I–IV) the forecast AQI would trigger, with typical actions (indicative only) |
| Attribution + drivers | Background vs stubble vs feedback (adds up exactly); which conditions push the forecast up or down (SHAP) |
| Health advisory | CPCB-style guidance, best and worst hours |
| Scenario controls | Fire load, wind, mixing depth, starting haze → re-runs the whole system (`/api/whatif`) |
| Replay + validation | Five real Nov 2025 forecasts vs reality; error by lead time, station and AQI category; live scoring against CAMS |
| Plain-language briefing + Ask box | A 5–6 sentence outlook and a question box (English/Hindi). Works without any key (template); with an OpenAI-compatible LLM key (e.g. GLM) it rephrases the forecast. The LLM never produces numbers: every number in its reply is checked against the forecast, otherwise the template is shown |
| Open data | CSV download (`/api/export.csv`), interactive API docs (`/docs`) |
| Hindi / English, installable | Language switch (Hindi is a beta: headings, controls, advice), PWA with offline last-forecast |

## How the coupling works
```
NWP met (T2m, T925, PBL, wind, SW)  ──►  chemistry emulator ──► PM2.5 / PM10 / NO2 / O3
        ▲                                           │
        │      AOD = k·PM2.5  → surface SW dimming   │
        └──  cooler surface, shallower PBL, warmer   ◄┘
             925 hPa (stronger inversion), weaker wind
```
Iterated 4× to a fixed point; the dashboard shows coupled vs uncoupled PM2.5/PBL/T2m and the convergence residual.

The PM2.5 model predicts the **change from the current value** (this fixed a short-lead weakness found by the validation page);
a fixed nowcast blend (75/50/25 % weight on the current value at +1/+2/+3 h) is applied to all four pollutants.

* **Inversion tracking** — strength = T(925 hPa) − T(2 m), class (none/weak/moderate/strong), PBL height, ventilation
  coefficient (PBL × wind), trapping factor.
* **Stubble plume** — NASA FIRMS VIIRS fires (Punjab/Haryana) → emission from FRP → Lagrangian particles advected by the
  mixed-layer wind with turbulent spread; concentration at receptors = mass / PBL depth, so a shallow inversion amplifies the same
  emission. Reports arrival time and peak contribution at Delhi.
* **Two modes** — *Live* (real forecast + real fires) and *Stubble-season what-if* (synthetic Nov-type fires + stagnant winter
  inversion applied to today's forecast; clearly labelled synthetic) so the physics is demonstrable off-season.

## Data
| Source | Use | Key needed |
|---|---|---|
| Open-Meteo forecast / historical-forecast | met incl. PBL height, T925 | no |
| Open-Meteo air-quality (CAMS) | PM2.5, PM10, O3, NO2, AOD (state + training truth + baseline) | no |
| NASA FIRMS VIIRS 24 h CSV | active fires | no |
| OpenStreetMap tiles (MapLibre) | basemap | no |

Limitations: ground truth is CAMS analysis (no CPCB station key); archived meteorology is short-lead NWP so long-lead skill in
the hold-out is slightly optimistic. Hold-out = Oct–Nov 2025 stubble season, excluded from training.

## Results (held-out Oct–Nov 2025 stubble season, never seen in training)
| PM2.5 lead | MAE µg/m³ | persistence MAE | gain | R² |
|---|---|---|---|---|
| 0–24 h | 15.8 | 29.7 | 47 % | 0.76 |
| 25–48 h | 21.3 | 35.1 | 40 % | 0.66 |
| 49–72 h | 23.1 | 38.6 | 40 % | 0.63 |

O3 R² ≈ 0.86–0.89, NO2 R² ≈ 0.76–0.80. PM10 is weaker (R² ≈ 0.2–0.4) — CAMS dust events are hard to forecast from these features.
By lead time, "no change" is tied with the model at +1 h (6.0 vs 5.7 µg/m³) and the model is better from about +4 h.
PM2.5 AQI category is exactly right 53 % of the time and within one category 94.5 %.

**Replay of five real forecasts (Oct 28 – Nov 13 2025):** average MAE 17.6 vs 31.3 µg/m³ for persistence (44 % better); every
episode beats persistence, but peaks are still under-predicted on Oct 28 and Nov 9. The 10–90 % band covered 71–93 % of hours per episode.
**The two-way feedback term does not measurably lower replay error (17.6 coupled vs 17.5 uncoupled)** — its value is physical
consistency and response to what-if conditions. In the stubble what-if the feedback adds ≈ +6 µg/m³ mean PM2.5, ≈ −2 °C daytime
cooling and ≈ −8 % daytime PBL, converging in 4 iterations.

## Run
One command on Windows: `start.bat` (trains / builds on first run, then serves everything at http://127.0.0.1:8000).
Tests: `cd backend && python -m pytest` (45 tests: AQI, inversion, feedback, plume, GRAP, ozone/NOx, drivers, bands, back-trajectories, live verification, CSV, what-if clamping, LLM fallback and number guard).
Docs: `docs/SIH_WRITEUP.md`, `docs/DEMO_SCRIPT.md`. Docker: `docker compose up --build` (files provided; **not build-tested** on the author's machine).

```bash
# backend
cd backend && pip install -r requirements.txt
python -m app.train                      # ~25 min first time (downloads + caches 2023→today history), writes models/
python -m app.uncertainty                # likely-range models (~15 min)
python -m app.validation && python -m app.backtest
uvicorn app.main:app --port 8000         # API docs at /docs

# frontend (dev)
cd frontend && npm install && npm run dev   # http://localhost:5173  (proxies /api to :8000)
# or production: npm run build  → served by FastAPI at http://localhost:8000
```
The forecast is cached in `backend/cache/`; if the network is down the last forecast is served (offline demo).
Every live forecast is also logged to `backend/cache/verification/` and scored against what CAMS later reports (Check our work → Live check).

## Optional LLM (briefing and Ask box)
Copy `backend/.env.example` to `backend/.env` and fill `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` (any OpenAI-compatible chat API, e.g. GLM).
Without a key the card shows a deterministic template summary. The live LLM call has only been tested with a mocked API so far.

## Layout
```
backend/app/  config.py data.py physics.py model.py train.py evaluate.py backtest.py validation.py uncertainty.py
              plume.py trajectory.py insights.py verification.py llm.py forecast.py main.py      backend/tests/
frontend/src/ App.tsx components/{Nav,Hero,AppWindow,MapView,Panels,Extras,Modules,Backtest,Validation,Sections}.tsx lib/{i18n,hi,aqi,api,types}
              (React + shadcn/ui + MapLibre + Recharts; public/ has the PWA manifest + service worker)
```
