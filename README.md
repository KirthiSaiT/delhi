# AirCouple — Air Pollution–Weather Coupled Forecasting for Delhi NCR

SIH 2026 · Problem Statement 26082 · MoES / NCMRWF

A 72-hour AQI forecast for Delhi NCR in which **meteorology and chemistry are coupled in both directions**,
with explicit **atmospheric-inversion tracking** and **stubble-burning plume dispersion**, served through a real-time dashboard.

> **Honest scope:** this is a *reduced-order coupled emulation*, not a full WRF-Chem run. A machine-learned chemistry step
> (LightGBM) is iterated with a physically-parameterised aerosol–radiation–PBL feedback. WRF-Chem needs an HPC cluster and
> emission inventories; this system runs on a laptop in ~30 s per forecast and is designed to be swapped for WRF-Chem output
> (the model consumes the same fields: T2m, T925, PBL height, wind, SW radiation, AOD).

## How the coupling works
```
NWP met (T2m, T925, PBL, wind, SW)  ──►  chemistry emulator ──► PM2.5 / PM10 / NO2 / O3
        ▲                                           │
        │      AOD = k·PM2.5  → surface SW dimming   │
        └──  cooler surface, shallower PBL, warmer   ◄┘
             925 hPa (stronger inversion), weaker wind
```
Iterated 4× to a fixed point; the dashboard shows coupled vs uncoupled PM2.5/PBL/T2m and the convergence residual.

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
| 0–24 h | 18.2 | 29.7 | 39 % | 0.70 |
| 25–48 h | 22.0 | 35.1 | 37 % | 0.63 |
| 49–72 h | 23.5 | 38.6 | 39 % | 0.61 |

O3 R² ≈ 0.87, NO2 R² ≈ 0.76 at 72 h. PM10 is weaker (R² ≈ 0.2) — CAMS dust events are hard to forecast from these features.
In the stubble what-if the feedback loop adds ≈ +5 µg/m³ mean (up to +18) PM2.5, ≈ −2.3 °C daytime cooling and ≈ −8 % daytime PBL, converging in 4 iterations.

## Dashboard features
Live + stubble-season what-if modes · 72 h timeline with play · 20-station sidebar and AQI surface · inversion gauge (strength, PBL,
ventilation, trapping factor) · two-way feedback panel (coupled vs uncoupled PM2.5 / PBL / T2m) · **attribution** (background vs stubble
vs feedback) · **CPCB health advisory** with best/worst hours · **scenario sliders** (fire load, wind, PBL, starting haze) that re-run the
whole system via `/api/whatif` · **backtest replay** of five real Oct–Nov 2025 forecasts (`python -m app.backtest`).

Backtest (model trained without the season): avg MAE 18.8 vs 31.3 µg/m³ persistence (40 % better); one origin (Oct 28) is worse than
persistence, and the feedback term does not measurably lower replay error (18.8 coupled vs 18.4 uncoupled) — both are shown in the UI.

## Run
One command on Windows: `start.bat` (trains / builds on first run, then serves everything at http://127.0.0.1:8000).
Tests: `cd backend && python -m pytest` (18 tests: AQI, inversion, feedback, plume physics, feature matrix, what-if clamping).
Docs: `docs/SIH_WRITEUP.md`, `docs/DEMO_SCRIPT.md`.

```bash
# backend
cd backend && pip install -r requirements.txt
python -m app.train                      # ~25 min first time (downloads + caches 2023→today history), writes models/
uvicorn app.main:app --port 8000

# frontend (dev)
cd frontend && npm install && npm run dev   # http://localhost:5173  (proxies /api to :8000)
# or production: npm run build  → served by FastAPI at http://localhost:8000
```
The forecast is cached in `backend/cache/`; if the network is down the last forecast is served (offline demo).

## Layout
```
backend/app/  config.py data.py physics.py model.py train.py backtest.py plume.py forecast.py main.py   backend/tests/
frontend/src/ App.tsx components/{MapView,Panels}.tsx lib/  (React + shadcn/ui + MapLibre + Recharts)
```
