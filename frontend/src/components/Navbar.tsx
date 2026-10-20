import React, { useEffect, useState } from "react"
import { Bot, Crosshair, Gauge, Layers, Package, Plane, ShieldCheck, Wrench } from "lucide-react"

interface Props {
  activeTab: string
  setActiveTab: (tab: string) => void
  mcRate: number
  aogCount: number
}

export const Navbar: React.FC<Props> = ({ activeTab, setActiveTab, mcRate, aogCount }) => {
  const [timeStr, setTimeStr] = useState("")

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const utc = now.toUTCString().slice(17, 25)
      const ist = now.toLocaleTimeString("en-IN", { hour12: false })
      setTimeStr(`${ist} IST | ${utc} UTC`)
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const navItems = [
    { id: "fleet", label: "FLEET COMMAND", icon: Gauge },
    { id: "twin", label: "3D DIGITAL TWIN", icon: Plane },
    { id: "predictive", label: "AI RUL & ANALYTICS", icon: Layers },
    { id: "logistics", label: "BRD DEPOT & SPARES", icon: Package },
    { id: "dispatch", label: "MISSION DISPATCH", icon: Crosshair },
    { id: "assistant", label: "RAKSHA-MITRA (SOP)", icon: Bot },
    { id: "benchmarks", label: "VALIDATION & WHAT-IF", icon: Wrench }
  ]

  return (
    <header className="border-b border-[var(--border-tactical)] bg-[#070b13]/90 backdrop-blur-md sticky top-0 z-40">
      {/* Topmost Tactical Alert & Clock Bar */}
      <div className="px-4 py-1.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] font-tactical text-slate-400">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="tracking-wider font-bold">AFNet SECURE // AIR-GAPPED ON-PREM</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300">
            MoD / DSSC · PS 26249 · SMART INDIA HACKATHON
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">FLEET MC:</span>
            <span className="text-cyan-300 font-bold">{mcRate}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">AOG:</span>
            <span className={`font-bold ${aogCount > 0 ? "text-rose-400 animate-pulse" : "text-emerald-400"}`}>
              {aogCount} JETS
            </span>
          </div>
          <span className="text-slate-500 font-mono">{timeStr}</span>
        </div>
      </div>

      {/* Main Brand & Tab Navigation */}
      <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-4">
        {/* Emblem & Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-cyan-500/10 border border-cyan-400 flex items-center justify-center text-cyan-300 shadow-[var(--glow-cyan)]">
            <Plane className="w-5 h-5 -rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-tactical font-black text-lg text-white tracking-wider flex items-center gap-2">
                PROJECT VAYURAKSHAK
              </h1>
              <span className="text-[10px] font-tactical px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                v2.0 DEFENSE
              </span>
            </div>
            <p className="text-[11px] font-tactical text-slate-400 tracking-wide">
              AIR POWER PREDICTIVE MAINTENANCE & FLEET AVAILABILITY DIGITAL TWIN
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-1.5 rounded text-xs font-tactical font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400 shadow-[var(--glow-cyan)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
                {item.label}
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
