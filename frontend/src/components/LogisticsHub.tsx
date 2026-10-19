import React, { useState } from "react"
import type { SparesItem, WorkOrder, AOGHazardAlert, AircraftSummary } from "../lib/types"
import { AlertCircle, Package, ShieldAlert, Truck, Wrench } from "lucide-react"
import { fetchCannibalization } from "../lib/api"

interface Props {
  spares: SparesItem[]
  workOrders: WorkOrder[]
  aogHazards: AOGHazardAlert[]
  aircraftList: AircraftSummary[]
  onOpenOrderModal: (tail: string, partCode: string) => void
}

export const LogisticsHub: React.FC<Props> = ({
  spares,
  workOrders,
  aogHazards,
  aircraftList,
  onOpenOrderModal
}) => {
  const [selectedRecipient, setSelectedRecipient] = useState<string>("SB-177")
  const [selectedPart, setSelectedPart] = useState<string>("NSN-2840-01-AL31-HPC3")
  const [cannibalizationReport, setCannibalizationReport] = useState<any | null>(null)
  const [evaluating, setEvaluating] = useState(false)

  const handleEvaluateCannibalization = async () => {
    setEvaluating(true)
    try {
      const res = await fetchCannibalization(selectedRecipient, selectedPart)
      setCannibalizationReport(res)
    } catch (err) {
      console.error(err)
    } finally {
      setEvaluating(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* 1. Header Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="notion-card p-5 bg-white">
          <div className="flex items-center justify-between text-sm font-medium text-[#787774]">
            <span>Depot Spares Catalog</span>
            <Package className="w-5 h-5 text-[#0075de]" />
          </div>
          <div className="my-3">
            <span className="text-4xl font-extrabold text-[#0075de]">
              {spares.length}
            </span>
            <span className="text-sm font-medium text-[#787774] ml-2">Critical NSN Lines</span>
          </div>
          <span className="text-sm text-[#787774]">IMMOLS Online Inventory</span>
        </div>

        <div className="notion-card p-5 bg-white">
          <div className="flex items-center justify-between text-sm font-medium text-[#787774]">
            <span>Active Work Orders</span>
            <Truck className="w-5 h-5 text-amber-600" />
          </div>
          <div className="my-3">
            <span className="text-4xl font-extrabold text-amber-600">
              {workOrders.length}
            </span>
            <span className="text-sm font-medium text-[#787774] ml-2">In Transit / Prep</span>
          </div>
          <span className="text-sm text-[#787774]">e-MMS Dispatch Pipeline</span>
        </div>

        <div className="notion-card p-5 bg-white border-rose-200">
          <div className="flex items-center justify-between text-sm font-medium text-[#787774]">
            <span>AOG Hazards Detected</span>
            <ShieldAlert className="w-5 h-5 text-rose-600" />
          </div>
          <div className="my-3">
            <span className="text-4xl font-extrabold text-rose-600">
              {aogHazards.length}
            </span>
            <span className="text-sm font-medium text-[#787774] ml-2">Airframes</span>
          </div>
          <span className="text-sm text-rose-700 font-medium">Lead Time &gt; Component RUL</span>
        </div>

        <div className="notion-card p-5 bg-white">
          <div className="flex items-center justify-between text-sm font-medium text-[#787774]">
            <span>Connected Depots</span>
            <Wrench className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="my-3">
            <span className="text-4xl font-extrabold text-emerald-600">3</span>
            <span className="text-sm font-medium text-[#787774] ml-2">Major BRDs</span>
          </div>
          <span className="text-sm text-[#787774]">3 BRD · 11 BRD · 7 BRD</span>
        </div>
      </div>

      {/* 2. AOG Deficit Alerts */}
      {aogHazards.length > 0 && (
        <div className="notion-card p-5 border-rose-200 bg-rose-50/40">
          <div className="flex items-center gap-2.5 mb-4 text-sm font-bold text-rose-900">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            Critical Lead-Time Deficit Alerts (Preventing Avoidable AOG)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {aogHazards.map((hz, idx) => (
              <div
                key={idx}
                className="bg-white p-4 rounded-xl border border-rose-200 flex items-center justify-between shadow-2xs"
              >
                <div>
                  <div className="flex items-center gap-2 font-bold text-[#191919]">
                    <span className="text-[#0075de]">{hz.tail_number}</span>
                    <span className="text-[#787774]">({hz.aircraft_type})</span>
                  </div>
                  <div className="text-sm text-[#787774] mt-1">
                    Part: {hz.part_needed} · Depot Lead: {hz.depot_lead_time_hours}h vs RUL: {hz.rul_hours}h
                  </div>
                  <div className="text-sm text-rose-600 font-semibold mt-1.5">
                    Deficit: {hz.deficit_aog_hours}h AOG exposure if not pre-ordered immediately!
                  </div>
                </div>
                <button
                  onClick={() => onOpenOrderModal(hz.tail_number, hz.nsn_code)}
                  className="px-4 py-2 bg-[#0075de] hover:bg-[#0060b9] text-white rounded-lg font-medium text-sm transition-all shrink-0 ml-4 shadow-2xs"
                >
                  Pre-Order
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Spares Catalog (IMMOLS) & Active Work Orders (e-MMS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 notion-card p-6 bg-white">
          <div className="flex items-center justify-between border-b border-[#f1f1ef] pb-4 mb-5">
            <div>
              <span className="text-sm font-medium text-[#787774] uppercase tracking-wide">
                IMMOLS Inventory
              </span>
              <h3 className="font-bold text-lg text-[#191919] mt-0.5">
                Base Repair Depot Spares Catalog
              </h3>
            </div>
            <span className="text-sm text-[#787774]">Live Stock Sync</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#f1f1ef] text-[#787774] text-xs">
                  <th className="pb-2.5 whitespace-nowrap">NSN / Component</th>
                  <th className="pb-2.5 whitespace-nowrap">Depot</th>
                  <th className="pb-2.5 whitespace-nowrap">Stock</th>
                  <th className="pb-2.5 whitespace-nowrap">Lead Time</th>
                  <th className="pb-2.5 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f1ef]">
                {spares.map((item) => (
                  <tr key={item.nsn_code} className="hover:bg-[#fbfbfa]">
                    <td className="py-3.5 pr-3">
                      <div className="font-bold text-[#191919]">{item.part_name}</div>
                      <span className="text-xs text-[#0075de] font-mono">{item.nsn_code}</span>
                    </td>
                    <td className="py-3.5 pr-3 text-[#787774] text-sm">
                      {item.primary_depot.split("(")[0]}
                    </td>
                    <td className="py-3.5 pr-3">
                      <span
                        className={`font-semibold px-2.5 py-1 rounded-full text-xs whitespace-nowrap ${
                          item.stock_level <= 3
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {item.stock_level} Units
                      </span>
                    </td>
                    <td className="py-3.5 pr-3 text-[#191919] font-medium">
                      {item.lead_time_hours}h
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => onOpenOrderModal("SB-021", item.nsn_code)}
                        className="px-3 py-1.5 bg-[#f1f1ef] hover:bg-[#e6e6e3] text-[#37352f] rounded-lg text-sm font-medium transition-all"
                      >
                        Requisition
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Work Orders */}
        <div className="lg:col-span-5 notion-card p-6 bg-white">
          <div className="flex items-center justify-between border-b border-[#f1f1ef] pb-4 mb-5">
            <div>
              <span className="text-sm font-medium text-[#787774] uppercase tracking-wide">
                e-MMS Tracking
              </span>
              <h3 className="font-bold text-lg text-[#191919] mt-0.5">
                Active Maintenance Work Orders
              </h3>
            </div>
            <span className="text-sm text-amber-700 font-bold bg-amber-50 px-3 py-1 rounded-full">
              {workOrders.length} In Transit
            </span>
          </div>

          <div className="space-y-3.5">
            {workOrders.map((wo) => (
              <div
                key={wo.wo_id}
                className="bg-[#fbfbfa] p-4 rounded-xl border border-[#e9e9e7] text-sm space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#0075de]">{wo.wo_id}</span>
                    <span className="text-xs bg-[#f1f1ef] px-2 py-0.5 rounded text-[#37352f] font-semibold">
                      {wo.tail_number}
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                      wo.priority.includes("AOG")
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {wo.priority.replace("PRIORITY_", "P")}
                  </span>
                </div>

                <div className="text-[#191919] font-medium">{wo.part_name}</div>
                <div className="text-sm text-[#787774] flex justify-between">
                  <span>From: {wo.depot}</span>
                  <span className="text-emerald-700 font-bold">ETA: ~{wo.eta_hours}h</span>
                </div>
                <div className="text-xs text-[#787774] pt-2 border-t border-[#e9e9e7] flex justify-between">
                  <span>Auth: {wo.auth_officer}</span>
                  <span>{wo.initiated_at}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Anti-Cannibalization Evaluator */}
      <div className="notion-card p-6 bg-white">
        <div className="border-b border-[#f1f1ef] pb-4 mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-sm font-medium text-[#787774] uppercase tracking-wide">
              Emergency Scramble Directive
            </span>
            <h3 className="font-bold text-lg text-[#191919] mt-0.5">
              Aircraft Cannibalization Feasibility & Fleet Impact Matrix
            </h3>
          </div>
          <span className="text-sm text-[#787774]">
            Wartime / QRA Scramble Protocol
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5 text-sm">
          <div>
            <label className="text-[#787774] block mb-1.5 font-medium">Recipient Aircraft (AOG / Needy):</label>
            <select
              value={selectedRecipient}
              onChange={(e) => setSelectedRecipient(e.target.value)}
              className="w-full bg-[#fbfbfa] border border-[#e9e9e7] text-[#191919] p-3 rounded-lg focus:outline-none"
            >
              {aircraftList.map((ac) => (
                <option key={ac.tail_number} value={ac.tail_number}>
                  {ac.tail_number} · {ac.model_name.split(" ")[0]} ({ac.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[#787774] block mb-1.5 font-medium">Required Spare Component:</label>
            <select
              value={selectedPart}
              onChange={(e) => setSelectedPart(e.target.value)}
              className="w-full bg-[#fbfbfa] border border-[#e9e9e7] text-[#191919] p-3 rounded-lg focus:outline-none"
            >
              {spares.map((sp) => (
                <option key={sp.nsn_code} value={sp.nsn_code}>
                  {sp.part_name} ({sp.nsn_code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleEvaluateCannibalization}
              disabled={evaluating}
              className="w-full py-3 bg-[#0075de] hover:bg-[#0060b9] text-white font-medium rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Wrench className="w-4 h-4" />
              {evaluating ? "Evaluating..." : "Evaluate Donor Options"}
            </button>
          </div>
        </div>

        {cannibalizationReport && (
          <div className="space-y-3.5 pt-4 border-t border-[#f1f1ef]">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900 leading-relaxed">
              <strong>Directive Guidance:</strong> {cannibalizationReport.tactical_guideline}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cannibalizationReport.all_candidates?.map((cand: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border text-sm space-y-2 ${
                    cand.recommended
                      ? "bg-white border-emerald-300 shadow-2xs"
                      : "bg-[#fbfbfa] border-[#e9e9e7] opacity-75"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#191919]">Donor: {cand.donor_tail}</span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                        cand.recommended
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      Score: {cand.feasibility_score}%
                    </span>
                  </div>

                  <div className="text-[#37352f]">
                    Status: <strong>{cand.donor_status}</strong> · {cand.donor_base}
                  </div>
                  <div className="text-[#787774]">
                    Swap Time: <strong>{cand.swap_time_hours}h</strong> (vs Depot: {cand.depot_replenishment_hours}h)
                  </div>
                  <div className="text-[#787774] text-xs pt-1">
                    {cand.assessment}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
