# AirCouple — 3-minute demo script

**Before you start:** `start.bat` (or `python -m uvicorn app.main:app --port 8000` in `backend`), open http://127.0.0.1:8000,
full-screen the browser. Run once with Wi-Fi off beforehand — it falls back to the cached forecast and shows an "offline cache" badge.
Optional: switch the language to हिं (top right) for a minute to show the Hindi interface.

| Time | Do | Say |
|---|---|---|
| 0:00 | Hero page | "Delhi's air isn't pollution *or* weather — they feed on each other. AirCouple forecasts them coupled, 72 hours ahead." |
| 0:20 | Click **Open live dashboard** | "Today, live: real weather, real satellite fire detections over Punjab and Haryana, CAMS composition. Each dot is a station; the surface is the AQI." |
| 0:35 | Press **Play**; open the **Air** tab → **Today's briefing** (click a suggested question) → **GRAP stage forecast** | "AQI worsens at night. This card translates the forecast into Delhi's GRAP stages — which stage we'd hit and when, with the usual actions. It's indicative; CAQM makes the real call." |
| 0:55 | **Weather** tab → inversion gauge, then feedback card | "The inversion lid and mixing-layer depth, hour by hour. And the coupling: smoke dims sunlight, the surface cools, the lid sinks, PM2.5 rises — iterated until it settles." |
| 1:15 | Same tab → **Ozone and NOx** | "The statement names ozone and NOx: ozone peaks in the afternoon, NO₂ piles up at night under the lid." |
| 1:30 | **Smoke** tab → plume card → **Where did Delhi's air come from?** → *Show paths on the map*, switch to *Stubble belt* | "Run the wind backwards from Delhi: the air came from the north-west, through the stubble belt, passing near this much fire power." |
| 1:50 | Click **Stubble-season what-if**; **Why** tab | "Off-season there are few fires, so this labelled scenario starts from a typical November haze. Attribution splits PM2.5 into background, stubble and feedback; the drivers chart shows what pushes the forecast up or down." |
| 2:10 | Move **Fire load** and **Mixing depth** sliders → **Run scenario** | "Judges can stress-test it: double the fires, collapse the mixing depth, re-run the whole coupled system in seconds." |
| 2:25 | Scroll to **Replay a real haze episode** | "Forecasts from Nov 2025 by a model that never saw that season, with the likely-range band. One case, Oct 28, under-predicts the evening peak — we show it." |
| 2:45 | Scroll to **Check our work** → *By lead time* → *Live check* | "Error by lead time, by place and by AQI category — including where we're *not* better than 'no change'. And every live forecast is saved and scored against what CAMS reports later." |
| 2:55 | **Method & limitations** | "Reduced-order emulation, not WRF-Chem; ground truth is CAMS; the feedback isn't yet a measurable accuracy gain. Next: CPCB data and WRF-Chem input." |

## Likely questions
* **"Is an LLM making the forecast?"** No. LightGBM and physics make every number. An optional LLM only rephrases the forecast in plain language (English/Hindi); every number it writes is checked against the forecast, and a template answer is used if it fails or invents anything.
* **"Is this WRF-Chem?"** No — a laptop-scale coupled emulation; built to take WRF-Chem fields as input.
* **"Why does coupling not improve MAE?"** In the replays with real NWP the uncoupled and coupled errors are within 0.4 µg/m³. The coupling matters for stagnant, haze-dominated regimes and what-if response; we report the number as measured.
* **"Where's the ground truth?"** CAMS analysis via Open-Meteo. CPCB station data is the first roadmap item.
* **"How are fires converted to PM2.5?"** FRP → biomass burnt (0.368 kg/MJ) × 10 g/kg PM2.5 emission factor, diurnal duty cycle, decay 36 h, divided by mixing depth at the receptor.
* **"Is the GRAP stage official?"** No — indicative, from forecast Delhi-mean AQI against commonly published thresholds; CAQM decides.
* **"Is the likely range calibrated?"** It's a 10–90th-percentile band from quantile models. On the held-out season it covered about 70% of real values (target 80%), so it is slightly too narrow — the dashboard says so.
* **"How does the source-region view work?"** Ten particles per arrival time are run backwards on the forecast wind for 72 h; fires within 30 km of any path are counted. It shows transport, it is not a source-apportionment study.
