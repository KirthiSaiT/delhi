import React from "react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from "recharts"
import type { PredictionDossier, AircraftSummary } from "../lib/types"
import { Clock, ShieldAlert, Sparkles, TrendingDown, Zap } from "lucide-react"

interface Props {
  dossier: PredictionDossier | null
  aircraftList: AircraftSummary[]
  selectedTail: string
  onSelectTail: (tail: string) => void
  onOpenOrderModal: (tail: string, partCode: string) => void
}

export const PredictiveAnalytics: React.FC<Props> = ({
  dossier,
  aircraftList,
  selectedTail,
  onSelectTail,
  onOpenOrderModal
}) => {
  const currentAircraft = aircraftList.find((a) => a.tail_number === selectedTail)

  if (!dossier) {
    return (
      <div className="notion-card p-8 text-center text-[#787774] text-sm">
        Select an aircraft to view predictive degradation dossier...
      </div>
    )
  }

  const isCritical = dossier.risk_level === "CRITICAL_AOG"
  const isHighWatch = dossier.risk_level === "HIGH_WATCH"

  return (
    <div className="space-y-6">
      {/* 1. Aircraft Selector & Status Header */}
      <div className="notion-card p-5 flex flex-wrap items-center justify-between gap-4 bg-white">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-[#787774] uppercase tracking-wide">
            Select Airframe:
          </span>
          <select
            value={selectedTail}
            onChange={(e) => onSelectTail(e.target.value)}
            className="bg-[#fbfbfa] border border-[#e9e9e7] text-[#191919] font-bold text-base px-4 py-2 rounded-lg focus:outline-none focus:border-[#0075de]"
          >
            {aircraftList.map((ac) => (
              <option key={ac.tail_number} value={ac.tail_number}>
                {ac.tail_number} · {ac.model_name.split(" ")[0]} ({ac.status})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4 text-sm font-medium text-[#787774]">
          <span>
            Base: <strong className="text-[#191919]">{currentAircraft?.base_name.replace("Air Force Station ", "")}</strong>
          </span>
          <span>
            Total Time: <strong className="text-[#191919]">{currentAircraft?.total_flight_hours}h</strong>
          </span>
          <span
            className={`px-4 py-1.5 rounded-full font-bold text-sm ${
              isCritical
                ? "bg-rose-100 text-rose-700"
                : isHighWatch
                ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {dossier.risk_level}
          </span>
        </div>
      </div>

      {/* 2. Key Prediction Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="notion-card p-5 flex flex-col justify-between bg-white">
          <div className="flex items-center justify-between text-sm font-medium text-[#787774]">
            <span>Predicted RUL (Point)</span>
            <Clock className="w-5 h-5 text-[#0075de]" />
          </div>
          <div className="my-3">
            <span
              className={`text-4xl font-extrabold ${
                isCritical ? "text-rose-600" : isHighWatch ? "text-amber-600" : "text-[#0075de]"
              }`}
            >
              {dossier.predicted_rul_hours}
            </span>
            <span className="text-sm font-medium text-[#787774] ml-2">Hours</span>
          </div>
          <span className="text-sm text-[#787774]">
            Approx. {Math.round(dossier.predicted_rul_hours / 1.4)} Flight Cycles
          </span>
        </div>

        <div className="notion-card p-5 flex flex-col justify-between bg-white">
          <div className="flex items-center justify-between text-sm font-medium text-[#787774]">
            <span>10th Percentile (Floor)</span>
            <TrendingDown className="w-5 h-5 text-amber-600" />
          </div>
          <div className="my-3">
            <span className="text-4xl font-extrabold text-amber-600">
              {dossier.confidence_lower_10pct}
            </span>
            <span className="text-sm font-medium text-[#787774] ml-2">Hours</span>
          </div>
          <span className="text-sm text-amber-700 font-medium">Pessimistic Safety Margin</span>
        </div>

        <div className="notion-card p-5 flex flex-col justify-between bg-white">
          <div className="flex items-center justify-between text-sm font-medium text-[#787774]">
            <span>90th Percentile (Ceiling)</span>
            <Sparkles className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="my-3">
            <span className="text-4xl font-extrabold text-emerald-600">
              {dossier.confidence_upper_90pct}
            </span>
            <span className="text-sm font-medium text-[#787774] ml-2">Hours</span>
          </div>
          <span className="text-sm text-emerald-700 font-medium">Optimistic Upper Bound</span>
        </div>

        <div className="notion-card p-5 flex flex-col justify-between bg-white">
          <div className="flex items-center justify-between text-sm font-medium text-[#787774]">
            <span>Early Warning Horizon</span>
            <Zap className="w-5 h-5 text-purple-600" />
          </div>
          <div className="my-3">
            <span className="text-4xl font-extrabold text-purple-700">+48</span>
            <span className="text-sm font-medium text-[#787774] ml-2">Cycles</span>
          </div>
          <span className="text-sm text-purple-700 font-medium">Advance Notice Before Failure</span>
        </div>
      </div>

      {/* 3. Degradation Trajectory Chart */}
      <div className="notion-card p-6 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#f1f1ef] pb-4 mb-5">
          <div>
            <span className="text-sm font-medium text-[#787774] uppercase tracking-wide">
              Weibull Degradation Trajectory
            </span>
            <h3 className="font-bold text-lg text-[#191919] mt-0.5">
              Flight Cycles vs. Projected Remaining Useful Life Envelope
            </h3>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-[#787774]">
            <span className="flex items-center gap-2 text-[#0075de]">
              <span className="w-4 h-1 bg-[#0075de] inline-block"></span> Predicted RUL
            </span>
            <span className="flex items-center gap-2">
              <span className="w-4 h-2.5 bg-[#e8f3fc] inline-block rounded"></span> 10–90% Confidence Band
            </span>
          </div>
        </div>

        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dossier.trajectory} margin={{ top: 10, right: 20, left: 0, bottom: 24 }}>
              <defs>
                <linearGradient id="rulEnvelopeLight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0075de" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0075de" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f1ef" />
              <XAxis
                dataKey="cycle"
                stroke="#787774"
                tick={{ fill: "#787774", fontSize: 12 }}
                label={{ value: "Accumulated Flight Cycles", position: "insideBottom", offset: -16, fill: "#787774", fontSize: 12 }}
              />
              <YAxis
                stroke="#787774"
                tick={{ fill: "#787774", fontSize: 12 }}
                label={{ value: "RUL (Hours)", angle: -90, position: "insideLeft", fill: "#787774", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderColor: "#e9e9e7",
                  borderRadius: "8px",
                  fontSize: "14px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
                }}
              />
              <ReferenceLine y={15} stroke="#e11d48" strokeDasharray="4 4" label={{ value: "AOG Redline (15h)", fill: "#e11d48", fontSize: 11 }} />
              <Area
                type="monotone"
                dataKey="confidence_upper"
                stroke="transparent"
                fill="url(#rulEnvelopeLight)"
                name="Optimistic (90th %)"
              />
              <Line
                type="monotone"
                dataKey="predicted_rul_hours"
                stroke="#0075de"
                strokeWidth={3}
                dot={false}
                name="Projected RUL"
              />
              <Line
                type="monotone"
                dataKey="confidence_lower"
                stroke="#d97706"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
                name="Pessimistic (10th %)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Explainable AI (SHAP) Waterfall */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 notion-card p-6 bg-white">
          <div className="border-b border-[#f1f1ef] pb-3 mb-5">
            <span className="text-sm font-medium text-[#787774] uppercase tracking-wide">
              Explainable AI (XAI)
            </span>
            <h3 className="font-bold text-lg text-[#191919] mt-0.5">
              Why was this flagged? Root Cause Sensor Attribution (SHAP)
            </h3>
          </div>

          <div className="space-y-4">
            {dossier.shap_drivers.map((driver, idx) => (
              <div
                key={idx}
                className="bg-[#fbfbfa] p-4 rounded-xl border border-[#e9e9e7] text-sm"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[#191919] font-bold text-base">{driver.feature}</span>
                    <span className="text-[#787774] text-sm bg-[#f1f1ef] px-2 py-0.5 rounded">
                      Channel: {driver.sensor_code}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[#191919] font-bold text-base">{driver.value}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded text-sm font-bold ${
                        driver.impact === "INCREASES_RISK"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      +{driver.contribution_pct}% Impact
                    </span>
                  </div>
                </div>

                <div className="w-full bg-[#f1f1ef] h-2 rounded-full overflow-hidden mb-2.5">
                  <div
                    className="bg-[#0075de] h-full rounded-full"
                    style={{ width: `${driver.contribution_pct * 2}%` }}
                  />
                </div>

                <p className="text-[#787774] text-sm leading-relaxed">
                  {driver.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Action Directive */}
        <div className="lg:col-span-4 notion-card p-6 flex flex-col justify-between bg-white">
          <div>
            <div className="border-b border-[#f1f1ef] pb-3 mb-5">
              <span className="text-sm font-medium text-[#787774] uppercase tracking-wide">
                Engineering Directive
              </span>
              <h3 className="font-bold text-lg text-[#191919] mt-0.5">
                Action Recommendation
              </h3>
            </div>

            <div className="bg-[#fbfbfa] p-4 rounded-xl border border-[#e9e9e7] mb-5 text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#787774]">Directive Code:</span>
                <span className="text-[#0075de] font-bold">{dossier.action_code}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#787774]">EGT Margin Remaining:</span>
                <span className="text-amber-600 font-bold">{dossier.egt_margin_c}°C</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#787774]">Core Vibration:</span>
                <span className="text-[#191919] font-bold">{dossier.vib_core_rms} mm/s</span>
              </div>
            </div>

            <div className="p-4 bg-[#fbfbfa] border border-[#e9e9e7] rounded-xl text-sm text-[#37352f] leading-relaxed mb-5">
              <p>
                <strong>Operational Guidance:</strong> {dossier.action_recommendation}
              </p>
            </div>
          </div>

          <div className="border-t border-[#f1f1ef] pt-5">
            <button
              onClick={() => onOpenOrderModal(selectedTail, "NSN-2840-01-AL31-HPC3")}
              className="w-full py-3 px-4 bg-[#0075de] hover:bg-[#0060b9] text-white text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <ShieldAlert className="w-4 h-4" />
              Trigger Preventive Work Order
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
