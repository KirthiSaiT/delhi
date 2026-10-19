import React, { useState } from "react"
import type { AircraftSummary, FleetSummary, AOGHazardAlert } from "../lib/types"
import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, Gauge, Plane, ShieldAlert, Wrench } from "lucide-react"

interface Props {
  summary: FleetSummary | null
  aircraftList: AircraftSummary[]
  aogHazards: AOGHazardAlert[]
  onSelectAircraft: (tail: string, targetTab?: string) => void
  onOpenOrderModal: (tail: string, partCode: string) => void
}

export const FleetCommand: React.FC<Props> = ({
  summary,
  aircraftList,
  onSelectAircraft
}) => {
  const [baseFilter, setBaseFilter] = useState<string>("ALL")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")

  const bases = [
    { id: "ALL", label: "All Bases" },
    { id: "AFB_AMBALA", label: "Ambala (Rafale)" },
    { id: "AFB_HALWARA", label: "Halwara (Su-30)" },
    { id: "AFB_SULUR", label: "Sulur (Tejas)" },
    { id: "AFB_TEZPUR", label: "Tezpur (Su-30)" },
    { id: "AFB_BAREILLY", label: "Bareilly (Su-30)" },
    { id: "AFB_PUNE", label: "Pune (Su-30)" }
  ]

  const filteredAircraft = aircraftList.filter((ac) => {
    const matchBase = baseFilter === "ALL" || ac.base === baseFilter
    const matchStatus = statusFilter === "ALL" || ac.status === statusFilter
    return matchBase && matchStatus
  })

  return (
    <div className="space-y-8">
      {/* 1. Notion-Style Fleet Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* MC Rate Gauge */}
        <div className="notion-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-sm font-medium text-[#787774]">
            <span>Fleet MC Rate</span>
            <Gauge className="w-5 h-5 text-[#0075de]" />
          </div>
          <div className="my-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-3xl sm:text-4xl font-extrabold text-[#0075de]">
              {summary?.mc_rate_pct ?? 70.0}%
            </span>
            <span className="text-xs text-[#787774] whitespace-nowrap">/ 85% Target</span>
          </div>
          <div className="w-full bg-[#f1f1ef] h-3 rounded-full overflow-hidden">
            <div
              className="bg-[#0075de] h-full transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, summary?.mc_rate_pct ?? 70)}%` }}
            />
          </div>
        </div>

        {/* FMC Count */}
        <div className="notion-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-sm font-medium text-[#787774]">
            <span>FMC (Ready)</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="my-3">
            <span className="text-3xl sm:text-4xl font-extrabold text-emerald-600">
              {summary?.fmc_count ?? 0}
            </span>
            <span className="text-sm text-[#787774] ml-1.5 font-medium">Jets</span>
          </div>
          <span className="text-xs sm:text-sm text-emerald-700 font-medium bg-emerald-50 px-2.5 sm:px-3 py-1 rounded-full inline-block w-fit">
            Fully Mission Capable
          </span>
        </div>

        {/* PMC Count */}
        <div className="notion-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-sm font-medium text-[#787774]">
            <span>PMC (Degraded)</span>
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="my-3">
            <span className="text-3xl sm:text-4xl font-extrabold text-amber-600">
              {summary?.pmc_count ?? 0}
            </span>
            <span className="text-sm text-[#787774] ml-1.5 font-medium">Jets</span>
          </div>
          <span className="text-xs sm:text-sm text-amber-700 font-medium bg-amber-50 px-2.5 sm:px-3 py-1 rounded-full inline-block w-fit">
            Limited Envelope
          </span>
        </div>

        {/* AOG Grounded */}
        <div className="notion-card p-5 flex flex-col justify-between border-rose-200 bg-rose-50/30">
          <div className="flex items-center justify-between text-sm font-medium text-[#787774]">
            <span>AOG (Grounded)</span>
            <ShieldAlert className="w-5 h-5 text-rose-600" />
          </div>
          <div className="my-3">
            <span className="text-3xl sm:text-4xl font-extrabold text-rose-600">
              {summary?.aog_count ?? 0}
            </span>
            <span className="text-sm text-[#787774] ml-1.5 font-medium">Jets</span>
          </div>
          <span className="text-xs sm:text-sm text-rose-700 font-medium bg-rose-100 px-2.5 sm:px-3 py-1 rounded-full inline-block w-fit">
            Awaiting Spares
          </span>
        </div>

        {/* Average Fleet RUL */}
        <div className="notion-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-sm font-medium text-[#787774]">
            <span>Mean Fleet RUL</span>
            <Plane className="w-5 h-5 text-[#0075de]" />
          </div>
          <div className="my-3">
            <span className="text-3xl sm:text-4xl font-extrabold text-[#191919]">
              {summary?.average_rul_hours ?? 145}
            </span>
            <span className="text-sm text-[#787774] ml-1.5 font-medium">Hours</span>
          </div>
          <span className="text-sm text-[#787774]">Remaining Useful Life</span>
        </div>

        {/* Average Fatigue */}
        <div className="notion-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-sm font-medium text-[#787774]">
            <span>Fatigue Index</span>
            <Wrench className="w-5 h-5 text-purple-600" />
          </div>
          <div className="my-3">
            <span className="text-3xl sm:text-4xl font-extrabold text-purple-700">
              {summary?.average_fatigue_index ?? 0.45}
            </span>
            <span className="text-sm text-[#787774] ml-1.5 font-medium">/ 1.0</span>
          </div>
          <span className="text-sm text-[#787774]">Rainflow G-Stress</span>
        </div>
      </div>

      {/* 2. Critical Defense Alert Banners */}
      {summary?.critical_alerts && summary.critical_alerts.length > 0 && (
        <div className="space-y-3">
          {summary.critical_alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border text-sm flex flex-wrap items-center justify-between gap-4 ${
                alert.severity === "CRITICAL"
                  ? "bg-rose-50 border-rose-200 text-rose-900"
                  : "bg-amber-50 border-amber-200 text-amber-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                <div>
                  <strong className="mr-2 font-bold text-base">{alert.title}:</strong>
                  <span className="opacity-90 text-sm">{alert.reason}</span>
                </div>
              </div>
              <button
                onClick={() => onSelectAircraft(alert.tail_number, "predictive")}
                className="px-4 py-1.5 bg-white hover:bg-slate-50 rounded-lg border border-[#d0d0ce] text-sm font-semibold text-[#191919] shadow-sm transition-all flex items-center gap-2 shrink-0"
              >
                Inspect Snag <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 3. Notion Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#e9e9e7]">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <span className="text-sm font-medium text-[#787774] mr-3">Airbase:</span>
          {bases.map((b) => (
            <button
              key={b.id}
              onClick={() => setBaseFilter(b.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                baseFilter === b.id
                  ? "bg-[#191919] text-white font-semibold"
                  : "bg-[#f1f1ef] text-[#37352f] hover:bg-[#e6e6e3]"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#787774] mr-3">Status:</span>
          {["ALL", "FMC", "PMC", "AOG"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                statusFilter === st
                  ? "bg-[#0075de] text-white font-semibold"
                  : "bg-[#f1f1ef] text-[#787774] hover:text-[#191919]"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Notion Aircraft Fleet Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAircraft.map((ac) => {
          const isAOG = ac.status === "AOG"
          const isPMC = ac.status === "PMC"

          return (
            <div
              key={ac.tail_number}
              className={`notion-card p-6 flex flex-col justify-between bg-white h-full ${
                isAOG ? "border-rose-300" : isPMC ? "border-amber-300" : ""
              }`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between border-b border-[#f1f1ef] pb-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-lg text-[#191919]">
                        {ac.tail_number}
                      </span>
                      <span className="text-sm px-2.5 py-0.5 rounded-md bg-[#f1f1ef] text-[#37352f] font-medium">
                        {ac.model_name.split(" ")[0]}
                      </span>
                    </div>
                    <span className="text-sm text-[#787774] block mt-1 truncate">
                      {ac.squadron} · {ac.base_name.replace("Air Force Station ", "")}
                    </span>
                  </div>

                  <span
                    className={`text-sm px-3 py-1 rounded-full font-bold tracking-wide ${
                      isAOG
                        ? "bg-rose-100 text-rose-700"
                        : isPMC
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {ac.status}
                  </span>
                </div>

                {/* Subsystem Progress Bars */}
                <div className="space-y-3 mb-5 text-sm">
                  <div>
                    <div className="flex justify-between text-sm text-[#787774] mb-1.5">
                      <span>Turbofan Propulsion (AL-31FP / F404)</span>
                      <span className="font-bold text-[#191919]">{ac.propulsion_health}%</span>
                    </div>
                    <div className="w-full bg-[#f1f1ef] h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          ac.propulsion_health < 50
                            ? "bg-rose-500"
                            : ac.propulsion_health < 75
                            ? "bg-amber-400"
                            : "bg-[#0075de]"
                        }`}
                        style={{ width: `${ac.propulsion_health}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm text-[#787774] mb-1.5">
                      <span>Hydraulics & Flight Controls</span>
                      <span className="font-bold text-[#191919]">{ac.hydraulics_health}%</span>
                    </div>
                    <div className="w-full bg-[#f1f1ef] h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          ac.hydraulics_health < 50
                            ? "bg-rose-500"
                            : ac.hydraulics_health < 75
                            ? "bg-amber-400"
                            : "bg-[#0075de]"
                        }`}
                        style={{ width: `${ac.hydraulics_health}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm text-[#787774] mb-1.5">
                      <span>MIL-STD-1553B Mission Avionics</span>
                      <span className="font-bold text-[#191919]">{ac.avionics_health}%</span>
                    </div>
                    <div className="w-full bg-[#f1f1ef] h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${ac.avionics_health}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Flight Stats Grid */}
                <div className="grid grid-cols-3 gap-3 bg-[#fbfbfa] p-3 rounded-xl border border-[#e9e9e7] text-sm mb-5">
                  <div>
                    <span className="text-xs text-[#787774] block">Flight Time</span>
                    <span className="font-bold text-[#191919]">{ac.total_flight_hours}h</span>
                  </div>
                  <div>
                    <span className="text-xs text-[#787774] block">Sortie Cycles</span>
                    <span className="font-bold text-[#191919]">{ac.total_cycles}</span>
                  </div>
                  <div>
                    <span className="text-xs text-[#787774] block">Est. RUL</span>
                    <span
                      className={`font-bold ${
                        ac.target_rul_hours <= 15
                          ? "text-rose-600"
                          : ac.target_rul_hours <= 45
                          ? "text-amber-600"
                          : "text-[#0075de]"
                      }`}
                    >
                      {ac.target_rul_hours}h
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#f1f1ef]">
                <button
                  onClick={() => onSelectAircraft(ac.tail_number, "twin")}
                  className="py-2 px-4 bg-[#f1f1ef] hover:bg-[#e6e6e3] text-[#37352f] rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                >
                  <Plane className="w-4 h-4 text-[#0075de]" />
                  3D Twin
                </button>
                <button
                  onClick={() => onSelectAircraft(ac.tail_number, "predictive")}
                  className="py-2 px-4 bg-white hover:bg-[#fbfbfa] text-[#191919] rounded-lg border border-[#e9e9e7] font-medium transition-all flex items-center justify-center gap-1.5"
                >
                  Analytics <ChevronRight className="w-4 h-4 text-[#787774]" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
