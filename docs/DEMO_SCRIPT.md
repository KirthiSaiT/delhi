# AirCouple — 3-minute demo script

**Before you start:** `start.bat` (or `python -m uvicorn app.main:app --port 8000` in `backend`), open http://127.0.0.1:8000,
full-screen the browser. Run once with Wi-Fi off beforehand — it falls back to the cached forecast and shows an "offline cache" badge.

| Time | Do | Say |
|---|---|---|
| 0:00 | Hero page | "Delhi's air isn't just pollution *or* weather — they feed on each other. AirCouple forecasts them coupled, 72 hours ahead." |
| 0:20 | Click **Open live dashboard** | "This is today, live: real weather, real satellite fire detections over Punjab and Haryana, CAMS composition. Every dot is a station; the surface is the AQI." |
| 0:40 | Press **Play** on the timeline | "72 hours, hourly. Notice AQI worsens at night — that's the inversion." Point at the **inversion gauge** and the PBL height. |
| 1:00 | Click **Try the stubble-season what-if** | "It's September, so there are few fires. To show the physics, this scenario starts from a typical November haze, adds a burning day, and applies stagnant winter conditions. It is badged as synthetic." |
| 1:15 | Switch **Stubble belt** view, press Play | "Orange dots are fires. Maroon particles are the plume, carried by the forecast wind toward Delhi." Switch to **Delhi NCR**. |
| 1:35 | Show **Two-way feedback** card | "Here's the coupling: haze dims sunlight, surface cools about 2 °C, the boundary layer shrinks, and PM2.5 rises further. It's iterated until it settles — residual drops from 5 to 0.1." |
| 1:55 | Show **Why is PM2.5 high?** card | "Attribution: how much is background, how much stubble, how much is the feedback amplifying it." |
| 2:10 | Move **Fire load** and **PBL** sliders → **Run scenario** | "Judges can stress-test it: double the fires, collapse the mixing depth, re-run the whole system in a few seconds." |
| 2:30 | Scroll to **Replay a real haze episode** | "And this is honesty: forecasts issued in Nov 2025 by a model that never saw that season, against what actually happened — 40 % lower error than persistence. One case, Oct 28, under-predicts the evening peak, and we show that." |
| 2:50 | Scroll to **Method & limitations** | "It's a reduced-order emulation, not WRF-Chem; ground truth is CAMS; the feedback isn't yet a measurable accuracy gain. Next: CPCB data and WRF-Chem input." |

## Likely questions
* **"Is this WRF-Chem?"** No — a laptop-scale coupled emulation; built to take WRF-Chem fields as input.
* **"Why does coupling not improve MAE?"** In the replays with real NWP the uncoupled and coupled errors are within 0.4 µg/m³. The coupling matters for stagnant, haze-dominated regimes and what-if response; we report the number as measured.
* **"Where's the ground truth?"** CAMS analysis via Open-Meteo. CPCB station data is the first roadmap item.
* **"How are fires converted to PM2.5?"** FRP → biomass burnt (0.368 kg/MJ) × 10 g/kg PM2.5 emission factor, diurnal duty cycle, decay 36 h, divided by mixing depth at the receptor.
