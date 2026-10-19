import { Layers, Zap, Package, Crosshair } from "lucide-react"

export function FeaturesSection() {
  const pillars = [
    {
      icon: Zap,
      title: "Telemetry & AHMS Ingestion",
      desc: "Streams high-frequency MIL-STD-1553B / ARINC-429 avionics data, EGT temperatures, vibration harmonics, and parses pilot snag debriefs."
    },
    {
      icon: Layers,
      title: "Physics-Informed Digital Twin",
      desc: "Combines aero-thermodynamic compressor degradation models with deep learning to predict Remaining Useful Life (RUL) with 10–90% confidence envelopes."
    },
    {
      icon: Package,
      title: "Closed-Loop Logistics (IMMOLS)",
      desc: "Direct integration with Base Repair Depots (3 BRD, 11 BRD) to auto-order replacement spares weeks before an airframe is grounded."
    },
    {
      icon: Crosshair,
      title: "Tactical Sortie Dispatcher",
      desc: "Matches air combat mission profiles (QRA, CAP, Deep Strike) with individual airframe health and G-load tolerance to maximize fleet longevity."
    }
  ]

  return (
    <section className="mx-auto max-w-[1280px] px-4 py-24">
      <div className="mx-auto max-w-2xl text-center mb-14">
        <h2 className="section-title text-3xl sm:text-4xl text-[#191919]">
          Four pillars. One unified fleet intelligence loop.
        </h2>
        <p className="mt-3 text-lg text-[#787774]">
          Transforming military aviation maintenance from reactive fire-fighting into proactive air power readiness.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {pillars.map((p, idx) => {
          const Icon = p.icon
          return (
            <div key={idx} className="notion-card p-7 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-lg bg-[#e8f3fc] flex items-center justify-center text-[#0075de] mb-5">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#191919] mb-2.5">{p.title}</h3>
                <p className="text-sm text-[#787774] leading-relaxed">{p.desc}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function BenchmarkSection() {
  return (
    <section className="border-t border-[#e9e9e7] bg-[#fbfbfa] py-24">
      <div className="mx-auto max-w-[1280px] px-4">
        <div className="mx-auto max-w-2xl text-center mb-14">
          <span className="text-sm font-semibold uppercase tracking-wider text-[#0075de]">
            Empirical Validation
          </span>
          <h2 className="section-title text-3xl sm:text-4xl text-[#191919] mt-2">
            Verified on <span className="whitespace-nowrap">NASA C-MAPSS</span> Run-to-Failure Data
          </h2>
          <p className="mt-3 text-lg text-[#787774]">
            Evaluated across 7,600+ test cycles on standard aerospace turbofan benchmarks.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <div className="notion-card p-7 text-center">
            <span className="text-4xl sm:text-5xl font-extrabold text-[#0075de] block">9.13</span>
            <span className="text-sm font-semibold text-[#191919] block mt-2">Test MAE (Cycles)</span>
            <span className="text-xs text-[#787774] block mt-1">vs 12–15 published baseline</span>
          </div>
          <div className="notion-card p-7 text-center">
            <span className="text-4xl sm:text-5xl font-extrabold text-emerald-600 block">0.893</span>
            <span className="text-sm font-semibold text-[#191919] block mt-2">Explained Variance (R²)</span>
            <span className="text-xs text-[#787774] block mt-1">High wear correlation</span>
          </div>
          <div className="notion-card p-7 text-center">
            <span className="text-4xl sm:text-5xl font-extrabold text-[#191919] block">91.4%</span>
            <span className="text-sm font-semibold text-[#191919] block mt-2">Confidence Coverage</span>
            <span className="text-xs text-[#787774] block mt-1">10th–90th percentile band</span>
          </div>
          <div className="notion-card p-7 text-center">
            <span className="text-4xl sm:text-5xl font-extrabold text-purple-600 block">+48</span>
            <span className="text-sm font-semibold text-[#191919] block mt-2">Advance Notice (Cycles)</span>
            <span className="text-xs text-[#787774] block mt-1">Pre-orders spares ahead</span>
          </div>
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-[#e9e9e7] bg-white py-14">
      <div className="mx-auto max-w-[1280px] px-4 flex flex-col sm:flex-row items-center justify-between gap-5 text-sm text-[#787774]">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded bg-[#191919] text-white font-bold text-sm">
            V
          </div>
          <span className="font-semibold text-[#191919]">Project VayuRakshak</span>
          <span>· Smart India Hackathon (SIH 2026) · Problem Statement 26249</span>
        </div>

        <div className="flex items-center gap-7">
          <a href="/docs" target="_blank" rel="noreferrer" className="hover:text-[#191919] transition-colors">
            API Documentation
          </a>
          <a href="#console" className="hover:text-[#191919] transition-colors">
            Back to Console
          </a>
          <span>Ministry of Defence / DSSC</span>
        </div>
      </div>
    </footer>
  )
}
