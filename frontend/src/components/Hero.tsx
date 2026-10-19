import { useState } from "react"
import { X, Plane, ArrowRight } from "lucide-react"

interface Props {
  onOpenApp: () => void
  onOpenWhatIf: () => void
}

export function Hero({ onOpenApp, onOpenWhatIf }: Props) {
  const [showTip, setShowTip] = useState(true)

  const handleAlwaysOpen = () => {
    try {
      localStorage.setItem("vayurakshak.skipIntro", "1")
    } catch {}
    setShowTip(false)
    onOpenApp()
  }

  return (
    <section id="top" className="relative mx-auto max-w-[1280px] px-4 pb-12 pt-16 text-center sm:pt-20 lg:pt-24">
      {/* Top-Right Notion Floating Card */}
      {showTip && (
        <div className="absolute right-4 top-6 z-20 hidden w-[280px] flex-col gap-2 rounded-xl border border-[#e9e9e7] bg-white p-4 text-left shadow-lg lg:flex">
          <div className="flex items-start justify-between gap-2 text-base text-[#37352f]">
            <span>Skip this page next time?</span>
            <button
              onClick={() => setShowTip(false)}
              className="text-slate-400 hover:text-slate-700"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={handleAlwaysOpen}
            className="flex items-center gap-1.5 text-base font-medium text-[#0075de] hover:underline text-left p-0"
          >
            Always open dashboard <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Notion Display Title */}
      <h1 className="hero-title mx-auto max-w-5xl text-[48px] sm:text-[72px] lg:text-[96px] text-[#191919] tracking-tight">
        Where air fleet and{" "}
        <span className="inline-flex items-center gap-3 rounded-full bg-[#e8f3fc] px-5 py-1.5 align-baseline text-[length:inherit] font-normal text-[#191919]">
          <span className="size-4 sm:size-5 rounded-full bg-[#0075de]" />
          Think
        </span>{" "}
        together.
      </h1>

      {/* Subtitle */}
      <p className="mx-auto mt-8 max-w-2xl text-lg text-[#37352f]/80 sm:text-xl leading-relaxed">
        Capture telemetry, predict component failures, and automate depot logistics with defense AI built for the Indian Air Force.
      </p>

      {/* Action Buttons */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <button
          onClick={onOpenApp}
          className="h-12 px-8 rounded-lg bg-[#0075de] hover:bg-[#0060b9] text-white font-medium text-base shadow-sm transition-all"
        >
          Open Fleet Command
        </button>
        <button
          onClick={onOpenWhatIf}
          className="h-12 px-8 rounded-lg bg-[#f1f1ef] hover:bg-[#e6e6e3] text-[#37352f] font-medium text-base transition-all"
        >
          Try Stress What-If
        </button>
      </div>

      {/* Hand-Drawn Notion Character Peeking Graphic */}
      <div className="relative mx-auto max-w-[1280px] mt-16 flex justify-end pr-10 sm:pr-16 -mb-4 pointer-events-none">
        <svg
          className="w-28 h-28 sm:w-32 sm:h-32 text-black"
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Notion Hand-drawn face illustration */}
          <path
            d="M20 110 C 20 60, 30 20, 70 20 C 105 20, 115 55, 115 110"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Eyebrows */}
          <path d="M42 42 C 48 38, 56 40, 58 44" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M78 40 C 82 37, 90 39, 94 43" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
          {/* Eyes */}
          <circle cx="52" cy="52" r="5" fill="currentColor" />
          <circle cx="86" cy="50" r="5" fill="currentColor" />
          {/* Nose */}
          <path d="M68 50 L 64 68 L 74 68" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Smirk Smile */}
          <path d="M60 84 C 70 90, 84 86, 90 78" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
          {/* Hand resting on the border */}
          <path d="M15 110 C 15 102, 28 102, 28 110" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* Trust Ticker / Agency Badges */}
      <div className="pt-8 border-b border-[#e9e9e7] pb-14">
        <p className="text-sm font-medium text-[#787774] uppercase tracking-wider mb-6">
          Trusted by Indian Defence & Aeronautical Formations
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-base font-semibold text-[#37352f]/70">
          <span className="flex items-center gap-2"><Plane className="w-5 h-5 text-[#0075de]" /> Indian Air Force</span>
          <span className="hidden sm:inline">·</span>
          <span>DSSC Wellington</span>
          <span className="hidden sm:inline">·</span>
          <span>11 BRD (Ojhar)</span>
          <span className="hidden sm:inline">·</span>
          <span>3 BRD (Chandigarh)</span>
          <span className="hidden sm:inline">·</span>
          <span>HAL</span>
          <span className="hidden sm:inline">·</span>
          <span>DRDO / ADA</span>
          <span className="hidden sm:inline">·</span>
          <span>Ministry of Defence</span>
        </div>
      </div>
    </section>
  )
}
