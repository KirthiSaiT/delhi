import React, { useState } from "react"
import { Bot, Send, Terminal } from "lucide-react"
import { queryRakshaMitra } from "../lib/api"

export const RakshaMitraAssistant: React.FC = () => {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<Array<{ q: string; a: any }>>([
    {
      q: "AL-31FP Engine 1 EGT margin check flagged 12°C margin remaining at takeoff reheat. Request SOP.",
      a: {
        fault_code: "FAULT-EGT-THERMAL-EXCEED",
        subsystem: "AL-31FP / GE-F404 Turbofan Propulsion",
        severity: "CRITICAL AIRWORTHINESS",
        estimated_tat_hours: 3.5,
        required_tools: ["Borescope Kit (BS-401)", "Digital Multimeter (Fluke 87V)", "Turbine Torque Calibrator"],
        structured_steps: [
          "Step 1: Check thermocouple harness (NSN-4820-01-VALVE-EGT) calibration and probe resistance (nominal: 12.4 ± 0.5 ohms).",
          "Step 2: Perform optical borescope inspection of High-Pressure Turbine (HPT) Stage 1 nozzle guide vanes for thermal cracking or spalling.",
          "Step 3: Verify Fuel Metering Unit (FMU) stepper motor response and fuel nozzle spray pattern uniformity.",
          "Step 4: If blade coating erosion exceeds 0.8 mm, declare AOG and schedule hot-section replacement via Base Repair Depot."
        ]
      }
    }
  ])

  const handleSend = async (customQuery?: string) => {
    const textToSend = customQuery || query
    if (!textToSend.trim()) return

    setLoading(true)
    try {
      const res = await queryRakshaMitra(textToSend)
      setHistory((prev) => [...prev, { q: textToSend, a: res }])
      if (!customQuery) setQuery("")
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const quickPrompts = [
    "EGT Margin Drop & Thermal Coating Degradation",
    "High Core Vibration RMS & Bearing Harmonics",
    "Hydraulic Pressure Decay & Elevon Slew Lag",
    "MIL-STD-1553B Bus Parity & Radar Dropped Packets"
  ]

  return (
    <div className="space-y-8">
      {/* 1. Header Banner */}
      <div className="notion-card p-5 bg-white flex flex-wrap items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-[#e8f3fc] flex items-center justify-center text-[#0075de]">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[#0075de] font-bold uppercase tracking-wide block">
              Raksha-Mitra — Air-Gapped Maintenance Assistant
            </span>
            <span className="text-[#37352f] font-medium">
              Interactive Electronic Technical Manuals (IETM) & SOP Knowledge Engine
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-semibold">
            AFNet Air-Gapped Local Inference
          </span>
        </div>
      </div>

      {/* 2. Chat / Query History Console */}
      <div className="notion-card p-6 bg-white min-h-[540px] flex flex-col justify-between">
        <div className="space-y-5 mb-5 overflow-y-auto max-h-[560px] pr-2">
          {history.map((item, idx) => (
            <div key={idx} className="space-y-2.5 text-sm">
              {/* User Query Bubble */}
              <div className="flex justify-end">
                <div className="bg-[#f1f1ef] text-[#191919] px-5 py-3 rounded-xl max-w-xl">
                  <div className="text-xs text-[#787774] font-semibold mb-1 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-[#0075de]" /> Flight-Line Engineer
                  </div>
                  {item.q}
                </div>
              </div>

              {/* Raksha-Mitra Response Card */}
              <div className="flex justify-start">
                <div className="bg-white border border-[#e9e9e7] text-[#191919] p-5 rounded-xl max-w-2xl space-y-3.5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-[#f1f1ef] pb-2.5">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-[#0075de]" />
                      <span className="font-bold text-[#191919]">IETM SOP Dispatch</span>
                      <span className="text-xs bg-[#f1f1ef] px-2 py-0.5 rounded text-[#37352f] font-mono">
                        {item.a.fault_code}
                      </span>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                        item.a.severity?.includes("CRITICAL")
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {item.a.severity}
                    </span>
                  </div>

                  {/* SOP Steps */}
                  <div>
                    <span className="text-xs text-[#787774] block font-bold mb-2 uppercase">
                      Standard Operating Procedure (SOP) Workflow:
                    </span>
                    <ul className="space-y-2">
                      {item.a.structured_steps?.map((step: string, sIdx: number) => (
                        <li key={sIdx} className="text-sm text-[#37352f] leading-relaxed pl-2.5 border-l-2 border-[#0075de]">
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Tooling & TAT */}
                  <div className="pt-3 border-t border-[#f1f1ef] grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-[#787774] block uppercase font-medium">Required Tooling:</span>
                      <span className="text-[#37352f] font-medium">{item.a.required_tools?.join(", ")}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-[#787774] block uppercase font-medium">Estimated Turnaround (TAT):</span>
                      <span className="text-emerald-700 font-bold">{item.a.estimated_tat_hours} Hours</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="text-sm text-[#0075de] animate-pulse flex items-center gap-2 font-medium">
              <Bot className="w-4 h-4" /> Retrieving military IETM technical manuals...
            </div>
          )}
        </div>

        {/* Input Controls */}
        <div className="pt-4 border-t border-[#f1f1ef] space-y-4">
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-xs text-[#787774] mr-1 font-medium">Quick IETM Lookup:</span>
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p)}
                className="px-3 py-1.5 bg-[#f1f1ef] hover:bg-[#e6e6e3] text-[#37352f] rounded-lg text-sm transition-all"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Prompt Input Form */}
          <div className="flex gap-2.5">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Enter flight snag, error code (e.g. FAULT-EGT-01), or maintenance query..."
              className="flex-1 bg-[#fbfbfa] border border-[#e9e9e7] text-[#191919] text-sm px-4 py-3 rounded-lg focus:outline-none focus:border-[#0075de]"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !query.trim()}
              className="px-5 py-3 bg-[#0075de] hover:bg-[#0060b9] text-white text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              Ask
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
