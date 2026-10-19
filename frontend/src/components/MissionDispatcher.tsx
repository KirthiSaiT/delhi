import React, { useEffect, useState } from "react"
import type { MissionDispatchResponse } from "../lib/types"
import { AlertCircle, CheckCircle2, ChevronRight, Crosshair, Flame, Plane, Zap } from "lucide-react"
import { fetchMissionDispatch } from "../lib/api"

interface Props {
  onSelectAircraft: (tail: string, tab?: string) => void
}

export const MissionDispatcher: React.FC<Props> = ({ onSelectAircraft }) => {
  const [selectedMission, setSelectedMission] = useState<string>("QRA_SCRAMBLE")
  const [dispatchData, setDispatchData] = useState<MissionDispatchResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const missions = [
    {
      id: "QRA_SCRAMBLE",
      title: "Quick Reaction Alert (QRA)",
      icon: Zap,
      urgency: "Airspace Defense",
      gEnvelope: "9.0 G",
      statusReq: "FMC Required"
    },
    {
      id: "COMBAT_AIR_PATROL",
      title: "Combat Air Patrol (CAP)",
      icon: Crosshair,
      urgency: "Air Superiority",
      gEnvelope: "8.0 G",
      statusReq: "FMC Required"
    },
    {
      id: "DEEP_STRIKE",
      title: "Deep Penetration Strike",
      icon: Flame,
      urgency: "Strategic Strike",
      gEnvelope: "7.5 G",
      statusReq: "FMC Required"
    },
    {
      id: "TACTICAL_RECON_FERRY",
      title: "Tactical Recon / Ferry",
      icon: Plane,
      urgency: "Transit Ferry",
      gEnvelope: "4.5 G",
      statusReq: "PMC Allowed"
    }
  ]

  const loadDispatch = async (mId: string) => {
    setLoading(true)
    try {
      const data = await fetchMissionDispatch(mId)
      setDispatchData(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDispatch(selectedMission)
  }, [selectedMission])

  return (
    <div className="space-y-8">
      {/* 1. Mission Profile Selector Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {missions.map((m) => {
          const Icon = m.icon
          const isSelected = selectedMission === m.id
          return (
            <button
              key={m.id}
              onClick={() => setSelectedMission(m.id)}
              className={`notion-card p-5 text-left transition-all ${
                isSelected
                  ? "border-[#0075de] ring-2 ring-[#0075de]/20 bg-white"
                  : "bg-white hover:border-[#d0d0ce]"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <Icon className={`w-6 h-6 ${isSelected ? "text-[#0075de]" : "text-[#787774]"}`} />
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#f1f1ef] text-[#37352f]">
                  {m.gEnvelope}
                </span>
              </div>
              <h4 className="font-bold text-base text-[#191919] mb-1.5">
                {m.title}
              </h4>
              <div className="flex items-center justify-between text-sm text-[#787774]">
                <span>{m.urgency}</span>
                <span className="font-medium text-[#0075de]">{m.statusReq}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* 2. Mission Requirements Banner */}
      {dispatchData && (
        <div className="notion-card p-5 bg-white flex flex-wrap items-center justify-between gap-4 text-sm">
          <div className="max-w-2xl">
            <span className="text-xs font-bold text-[#0075de] uppercase tracking-wide block">
              Mission Dispatch Criteria: {dispatchData.mission_name}
            </span>
            <p className="text-[#37352f] text-sm mt-1.5 leading-relaxed">
              {dispatchData.description}
            </p>
          </div>
          <div className="flex items-center gap-6 text-right">
            <div>
              <span className="text-xs text-[#787774] block uppercase font-medium">Flight Envelope</span>
              <span className="text-base font-bold text-amber-600">
                {dispatchData.required_g_envelope} G
              </span>
            </div>
            <div>
              <span className="text-xs text-[#787774] block uppercase font-medium">Priority</span>
              <span className="text-base font-bold text-rose-600">
                {dispatchData.urgency_level}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Ranked Airframe Allocation Grid */}
      <div className="notion-card p-6 bg-white">
        <div className="border-b border-[#f1f1ef] pb-4 mb-5 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-[#787774] uppercase tracking-wide">
              Algorithmic Allocation
            </span>
            <h3 className="font-bold text-lg text-[#191919] mt-0.5">
              Ranked Fleet Allocation for {dispatchData?.mission_name ?? "Selected Mission"}
            </h3>
          </div>
          <span className="text-sm text-[#787774] font-medium">
            {dispatchData?.evaluated_aircraft.filter((a) => a.is_eligible).length} Eligible Airframes
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[#787774] text-sm">
            Optimizing sortie allocation envelope...
          </div>
        ) : (
          <div className="space-y-3.5">
            {dispatchData?.evaluated_aircraft.map((ac) => {
              const isEligible = ac.is_eligible

              return (
                <div
                  key={ac.tail_number}
                  className={`p-5 rounded-xl border text-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                    isEligible
                      ? "bg-white border-[#e9e9e7] hover:border-[#0075de]/40"
                      : "bg-[#fbfbfa] border-[#f1f1ef] opacity-70"
                  }`}
                >
                  {/* Left: Aircraft Ident & Squadron */}
                  <div className="flex items-center gap-3.5 min-w-[260px]">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                        isEligible
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          : "bg-slate-100 text-slate-400 border border-slate-200"
                      }`}
                    >
                      {isEligible ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-rose-500" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-[#191919] text-base">
                          {ac.tail_number}
                        </span>
                        <span className="text-xs bg-[#f1f1ef] px-2 py-0.5 rounded text-[#37352f] font-medium">
                          {ac.model_name.split(" ")[0]}
                        </span>
                      </div>
                      <span className="text-sm text-[#787774] block truncate">
                        {ac.squadron} · {ac.base_name.replace("Air Force Station ", "")}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Scores & Health */}
                  <div className="grid grid-cols-4 gap-4 min-w-[320px]">
                    <div>
                      <span className="text-xs text-[#787774] block">Suitability</span>
                      <span
                        className={`font-bold ${
                          ac.suitability_score > 80
                            ? "text-emerald-600"
                            : ac.suitability_score > 50
                            ? "text-amber-600"
                            : "text-[#787774]"
                        }`}
                      >
                        {ac.suitability_score}%
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-[#787774] block">RUL</span>
                      <span className="font-bold text-[#191919]">{ac.rul_hours}h</span>
                    </div>

                    <div>
                      <span className="text-xs text-[#787774] block">Fatigue</span>
                      <span className="font-bold text-purple-700">
                        {ac.fatigue_index.toFixed(2)}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-[#787774] block">Status</span>
                      <span
                        className={`font-bold ${
                          ac.status === "FMC"
                            ? "text-emerald-700"
                            : ac.status === "PMC"
                            ? "text-amber-700"
                            : "text-rose-700"
                        }`}
                      >
                        {ac.status}
                      </span>
                    </div>
                  </div>

                  {/* Right: Recommendation & Action */}
                  <div className="flex items-center justify-between md:justify-end gap-4 min-w-[260px]">
                    <div className="text-right">
                      <span
                        className={`font-bold text-sm block ${
                          ac.dispatch_recommendation.includes("PRIORITY")
                            ? "text-[#0075de]"
                            : ac.dispatch_recommendation.includes("RESERVE")
                            ? "text-amber-700"
                            : "text-rose-600"
                        }`}
                      >
                        {ac.dispatch_recommendation}
                      </span>
                      <span className="text-xs text-[#787774] block truncate max-w-[220px]">
                        {ac.rejection_reason}
                      </span>
                    </div>

                    <button
                      onClick={() => onSelectAircraft(ac.tail_number, "twin")}
                      className="p-2 rounded-lg bg-[#f1f1ef] hover:bg-[#e6e6e3] text-[#37352f] transition-all"
                      title="Inspect in 3D Twin"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
