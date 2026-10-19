# SIH 5-Minute Winning Pitch & Live Demo Script
## Problem Statement 26249: Air Power — Predictive Maintenance & Fleet Availability
**Target Audience:** Ministry of Defence (MoD) / Defence Services Staff College (DSSC) Evaluation Panel

---

## Pitch Timing Breakdown (Strict 5-Minute Presentation)

```
[00:00 - 00:45] The Problem & The Defense Stake (Slide 1)
[00:45 - 01:30] The Solution & 4 Pillars (Slide 2 & 3)
[01:30 - 03:30] LIVE SYSTEM DEMONSTRATION (Working Dashboard)
[03:30 - 04:15] Benchmark Accuracy & Operational Impact (Slide 4 & 5)
[04:15 - 05:00] Sovereign Architecture & Atmanirbhar Roadmap (Slide 6 & Q&A)
```

---

## 1. Opening Pitch (00:00 – 00:45)
> *"Respected Officers and Members of the Jury: In military aviation, a fighter jet sitting grounded on the tarmac cannot scramble to defend sovereign skies.*  
> *Across frontline squadrons, fleet availability often hovers between 60 to 65%. Why? Because our maintenance today remains largely reactive. Telemetry sits locked inside flight recorders, isolated from technical logbooks and Base Repair Depot supply lines. When an unexpected snag occurs, an aircraft sits grounded for weeks awaiting spares, forcing ground crews into dangerous parts cannibalization.*  
> *Today, we present **Project VayuRakshak**: An indigenous, air-gapped Predictive Maintenance and Fleet Availability Digital Twin platform built specifically for the Indian Air Force."*

---

## 2. Solution Overview (00:45 – 01:30)
> *"VayuRakshak connects the entire maintenance loop across 4 integrated pillars:*
> 1. *Real-time Ingestion of MIL-STD-1553B telemetry and technical logs;*
> 2. *A Physics-Informed 3D Digital Twin with ML Remaining Useful Life estimation;*
> 3. *Closed-Loop Logistics integrating with IAF IMMOLS and e-MMS to eliminate AOG; and*
> 4. *A Mission-Fit Dispatcher optimizing daily combat sortie assignments.*
> *Let us walk you through the live tactical system right now."*

---

## 3. Live System Walkthrough (01:30 – 03:30)

### Action 1: Fleet Command Overview
* **Navigate to:** `http://127.0.0.1:8000` (Fleet Command tab).
* **Say:** *"Here on the Station Commander's HUD, we immediately see our real-time Mission Capable rate—currently 70% against our 85% benchmark. We track FMC, PMC, and grounded AOG assets across Ambala, Halwara, Sulur, and Bareilly.*  
*Look at this top banner: The system has flagged an active alert on Su-30MKI `SB-177` at Bareilly: AOG imminent due to HPC compressor micro-crack degradation. Let us inspect this aircraft."*

### Action 2: Interactive 3D Digital Twin
* **Click:** `3D DIGITAL TWIN` tab.
* **Demonstrate:** Orbit camera around the 3D Su-30MKI fighter jet.
* **Click:** `EXPLODED VIEW`.
* **Say:** *"Notice our interactive 3D WebGL Digital Twin. Ground engineers can rotate the airframe, inspect sensor heatmaps, and toggle Exploded View to isolate internal modular assemblies. When we select the Left AL-31FP Engine, the system displays live telemetry: shroud temperature, core shaft vibration, and internal component wear percentages."*

### Action 3: AI RUL Trajectory & SHAP Explainability
* **Click:** `AI RUL & ANALYTICS` tab.
* **Say:** *"How do we predict failures? Here is our Weibull degradation curve with 10th to 90th percentile uncertainty bounds. For `SB-177`, our model projects an RUL of just 8 flight hours.*  
*Crucially for military pilots and engineers, this is NOT a black box. Look at our Explainable AI SHAP waterfall: It highlights that 42% of the degradation risk is driven by Exhaust Gas Temperature margin loss, and 28% by HPC pressure drop, indicating physical blade erosion."*

### Action 4: Closed-Loop Spares & Cannibalization Matrix
* **Click:** `BRD DEPOT & SPARES` tab.
* **Say:** *"Now observe how we solve the logistics bottleneck. Under our IMMOLS integration, the system calculates that the required compressor blade kit has a 36-hour lead time from 11 BRD Ojhar. Because the aircraft has only 8 hours of RUL, the system automatically flagged an AOG deficit alert and triggered an e-MMS work order.*  
*If a wartime scramble is ordered immediately, our Anti-Cannibalization Matrix identifies donor candidates from aircraft already grounded for unrelated avionics snags, estimating a 4.5-hour swap time vs. 36 hours from the depot, while enforcing Defence Directive D-74 compliance."*

### Action 5: Mission-Fit Dispatch & Raksha-Mitra
* **Click:** `MISSION DISPATCH` tab.
* **Say:** *"When scheduling a Quick Reaction Alert (QRA) scramble requiring a 9G flight envelope, our algorithm ranks only pristine FMC airframes like `LA-5002` (Tejas) and `RB-003` (Rafale), while rejecting degraded jets to prevent catastrophic in-flight failure.*  
*And on the flight line, ground technicians consult **Raksha-Mitra**—our air-gapped AI assistant—for instant IETM standard operating procedures, required aerospace tools, and turnaround time estimates."*

---

## 4. Benchmark Validation & Defense Impact (03:30 – 04:15)
* **Navigate to:** `VALIDATION & WHAT-IF` tab.
* **Say:** *"Our predictive engine was validated against the NASA C-MAPSS turbofan dataset across 7,600+ test cycles:
  - We achieved a **Test MAE of 9.13 cycles**, beating published academic benchmarks of 12 to 15 cycles.
  - Our explained variance $R^2$ is **0.893**.
  - Most importantly, near the point of failure (0–25 cycles), our error drops to just **4.12 cycles**, giving air commanders absolute precision when life safety is at stake.*
*The operational impact: Increasing squadron MC rates from 65% to >85% provides the equivalent combat power of inducting an additional fighter squadron without spending thousands of crores on new airframes."*

---

## 5. Defense Feasibility & Conclusion (04:15 – 05:00)
> *"VayuRakshak is built for sovereign on-premise deployment on AFNet hardware with zero cloud vulnerability. It integrates directly with existing IAF e-MMS and IMMOLS infrastructure.*  
> *Project VayuRakshak transforms defense fleet management from reactive fire-fighting into proactive, predictive air power dominance. Thank you, and we welcome your questions."*

---

## Anticipated Jury Questions & Winning Rebuttals

* **Q: "Our military bases operate on isolated, air-gapped AFNet networks. How does your system operate without internet access?"**  
  * **Answer:** *"Sir, VayuRakshak is 100% self-contained. The FastAPI backend, the LightGBM models, the Three.js 3D engine, and the Raksha-Mitra IETM knowledge base run entirely on local station servers. There are zero outbound API calls, ensuring complete compliance with Armed Forces cybersecurity protocols."*

* **Q: "How do you handle older aircraft that lack high-frequency digital sensors?"**  
  * **Answer:** *"For legacy platforms, our ingestion engine parses post-flight pilot snag debriefs, oil spectrometry analysis logs, and routine 25-hour inspection measurements using NLP and survival analysis degradation curves."*

* **Q: "Why should an Engineering Officer trust an AI recommendation over flight experience?"**  
  * **Answer:** *"We use Physics-Informed ML and Explainable AI (SHAP). The system never gives an arbitrary risk score; it points to the exact physical sensor (e.g. 14°C EGT margin deterioration and 2X rotor vibration harmonic) and cross-references standard military technical fault manuals."*
