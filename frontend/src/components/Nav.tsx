import { ShieldCheck, ExternalLink } from "lucide-react"

interface Props {
  onOpenApp: () => void
  onSelectTab: (tab: string) => void
}

export function Nav({ onOpenApp, onSelectTab }: Props) {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#e9e9e7]">
      <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6">
        {/* Left: Notion-style Logo */}
        <div className="flex items-center gap-4 cursor-pointer shrink-0" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <div className="flex size-10 items-center justify-center rounded-lg bg-[#191919] text-white font-bold text-lg shadow-sm">
            V
          </div>
          <span className="text-[20px] font-bold tracking-tight text-[#191919]">
            VayuRakshak
          </span>
        </div>

        {/* Middle: Clean Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm xl:text-[15px] font-medium text-[#37352f]/80">
          <button onClick={() => onSelectTab("fleet")} className="px-2.5 xl:px-2 py-2 rounded-lg hover:bg-[#f1f1ef] hover:text-[#191919] transition-all whitespace-nowrap">
            Fleet Command
          </button>
          <button onClick={() => onSelectTab("twin")} className="px-2.5 xl:px-2 py-2 rounded-lg hover:bg-[#f1f1ef] hover:text-[#191919] transition-all whitespace-nowrap">
            3D Digital Twin
          </button>
          <button onClick={() => onSelectTab("predictive")} className="hidden lg:block px-2.5 xl:px-2 py-2 rounded-lg hover:bg-[#f1f1ef] hover:text-[#191919] transition-all whitespace-nowrap">
            Predictive AI
          </button>
          <button onClick={() => onSelectTab("logistics")} className="hidden xl:block px-2.5 xl:px-2 py-2 rounded-lg hover:bg-[#f1f1ef] hover:text-[#191919] transition-all whitespace-nowrap">
            Depot Spares
          </button>
          <button onClick={() => onSelectTab("dispatch")} className="hidden xl:block px-2.5 xl:px-2 py-2 rounded-lg hover:bg-[#f1f1ef] hover:text-[#191919] transition-all whitespace-nowrap">
            Mission Dispatch
          </button>
          <button onClick={() => onSelectTab("assistant")} className="hidden xl:block px-2.5 xl:px-2 py-2 rounded-lg hover:bg-[#f1f1ef] hover:text-[#191919] transition-all whitespace-nowrap">
            Raksha-Mitra
          </button>
          <a href="/docs" target="_blank" rel="noreferrer" className="hidden xl:flex items-center gap-1.5 px-2.5 xl:px-2 py-2 rounded-lg hover:bg-[#f1f1ef] hover:text-[#191919] transition-all whitespace-nowrap">
            API Docs <ExternalLink className="w-4 h-4 text-[#787774]" />
          </a>
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden lg:flex xl:hidden items-center gap-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>AFNet Air-Gapped</span>
          </div>

          <button
            onClick={onOpenApp}
            className="h-11 px-5 rounded-lg bg-[#0075de] hover:bg-[#0060b9] text-white text-base font-medium shadow-sm transition-all whitespace-nowrap"
          >
            Open Console
          </button>
        </div>
      </div>
    </header>
  )
}
