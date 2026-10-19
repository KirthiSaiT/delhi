import React, { useState } from "react"
import { CheckCircle2, ShieldAlert, X } from "lucide-react"
import { createWorkOrder } from "../lib/api"
import type { SparesItem, WorkOrder } from "../lib/types"

interface Props {
  isOpen: boolean
  onClose: () => void
  tailNumber: string
  partCode: string
  sparesList: SparesItem[]
  onOrderSuccess: (order: WorkOrder) => void
}

export const WorkOrderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  tailNumber,
  partCode,
  sparesList,
  onOrderSuccess
}) => {
  const [selectedTail, setSelectedTail] = useState(tailNumber)
  const [selectedPartCode, setSelectedPartCode] = useState(partCode)
  const [priority, setPriority] = useState("PRIORITY_1_AOG")
  const [officer, setOfficer] = useState("Wing Commander A. Sengupta (SEngO)")
  const [submitting, setSubmitting] = useState(false)
  const [createdOrder, setCreatedOrder] = useState<WorkOrder | null>(null)

  if (!isOpen) return null

  const selectedPart = sparesList.find((s) => s.nsn_code === selectedPartCode)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await createWorkOrder({
        tail_number: selectedTail || tailNumber,
        part_code: selectedPartCode || partCode,
        priority,
        officer
      })
      if (res.success) {
        setCreatedOrder(res.work_order)
        onOrderSuccess(res.work_order)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="max-w-xl w-full bg-white rounded-2xl border border-[#e9e9e7] shadow-xl p-7 text-sm text-[#191919]">
        <div className="flex items-center justify-between border-b border-[#f1f1ef] pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#e8f3fc] flex items-center justify-center text-[#0075de]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#191919]">
                e-MMS / IMMOLS Spares Requisition
              </h3>
              <p className="text-xs text-[#787774] mt-0.5">Base Repair Depot Material Dispatch Authorization</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#787774] hover:text-[#191919]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdOrder ? (
          <div className="space-y-5 text-center py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-bold text-lg text-[#191919]">
                Work Order Dispatched // {createdOrder.wo_id}
              </h4>
              <p className="text-[#787774] text-sm mt-1">
                IMMOLS requisition transmitted to {createdOrder.depot}.
              </p>
            </div>

            <div className="bg-[#fbfbfa] p-4 rounded-xl border border-[#e9e9e7] text-left space-y-2 text-sm">
              <div>
                Tail Number: <strong className="text-[#0075de]">{createdOrder.tail_number}</strong>
              </div>
              <div>
                Part Needed: <strong className="text-[#191919]">{createdOrder.part_name}</strong>
              </div>
              <div>
                Estimated Delivery: <strong className="text-emerald-700">~{createdOrder.eta_hours} Hours</strong>
              </div>
              <div>
                Authorized By: <strong className="text-[#37352f]">{createdOrder.auth_officer}</strong>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-[#f1f1ef] hover:bg-[#e6e6e3] text-[#191919] font-medium rounded-lg transition-all"
            >
              Close Window
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-[#787774] block mb-1.5 font-medium">Target Airframe Tail:</label>
              <input
                type="text"
                value={selectedTail || tailNumber}
                onChange={(e) => setSelectedTail(e.target.value)}
                className="w-full bg-[#fbfbfa] border border-[#e9e9e7] text-[#191919] font-bold p-3 rounded-lg focus:outline-none focus:border-[#0075de]"
              />
            </div>

            <div>
              <label className="text-[#787774] block mb-1.5 font-medium">Select NSN Spare Component:</label>
              <select
                value={selectedPartCode || partCode}
                onChange={(e) => setSelectedPartCode(e.target.value)}
                className="w-full bg-[#fbfbfa] border border-[#e9e9e7] text-[#191919] p-3 rounded-lg focus:outline-none focus:border-[#0075de]"
              >
                {sparesList.map((sp) => (
                  <option key={sp.nsn_code} value={sp.nsn_code}>
                    {sp.part_name} ({sp.nsn_code})
                  </option>
                ))}
              </select>
            </div>

            {selectedPart && (
              <div className="bg-[#fbfbfa] p-4 rounded-xl border border-[#e9e9e7] space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#787774]">Depot Location:</span>
                  <span className="text-[#191919] font-semibold">{selectedPart.primary_depot}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#787774]">Available Depot Stock:</span>
                  <span className="text-emerald-700 font-semibold">{selectedPart.stock_level} Units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#787774]">Transit Lead Time:</span>
                  <span className="text-amber-700 font-semibold">{selectedPart.lead_time_hours} Hours</span>
                </div>
              </div>
            )}

            <div>
              <label className="text-[#787774] block mb-1.5 font-medium">Order Priority Level:</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-[#fbfbfa] border border-[#e9e9e7] text-[#191919] p-3 rounded-lg focus:outline-none focus:border-[#0075de]"
              >
                <option value="PRIORITY_1_AOG">Priority 1 — AOG (Immediate Air Superiority Grounding)</option>
                <option value="PRIORITY_2_PMC">Priority 2 — PMC (Subsystem Degraded Triage)</option>
                <option value="PRIORITY_3_ROUTINE">Priority 3 — Routine Scheduled Overhaul</option>
              </select>
            </div>

            <div>
              <label className="text-[#787774] block mb-1.5 font-medium">Authorizing Officer (e-MMS Digital Signature):</label>
              <input
                type="text"
                value={officer}
                onChange={(e) => setOfficer(e.target.value)}
                className="w-full bg-[#fbfbfa] border border-[#e9e9e7] text-[#191919] p-3 rounded-lg focus:outline-none focus:border-[#0075de]"
              />
            </div>

            <div className="flex gap-3 pt-3 border-t border-[#f1f1ef]">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-2.5 bg-[#f1f1ef] hover:bg-[#e6e6e3] text-[#37352f] rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-2/3 py-2.5 bg-[#0075de] hover:bg-[#0060b9] text-white font-medium rounded-lg shadow-sm"
              >
                {submitting ? "Authorizing..." : "Authorize Dispatch"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
