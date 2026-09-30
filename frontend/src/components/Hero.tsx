import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function Hero({ onLive, onWhatIf }: { onLive: () => void; onWhatIf: () => void }) {
  const [tip, setTip] = useState(true)
  useEffect(() => {
    try { if (localStorage.getItem("aircouple.skipIntro")) onLive() } catch { /* storage unavailable */ }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps
  const always = () => {
    try { localStorage.setItem("aircouple.skipIntro", "1") } catch { /* storage unavailable */ }
    setTip(false)
    onLive()
  }
  return (
    <section id="top" className="relative mx-auto max-w-[1200px] px-4 pb-14 pt-14 text-center sm:pt-20 lg:pt-24">
      {tip && (
        <Card className="absolute right-4 top-2 z-10 hidden w-[250px] gap-1.5 rounded-xl p-3 text-left shadow-lg lg:flex">
          <div className="flex items-start justify-between gap-2 text-sm">
            <span>Skip this page next time?</span>
            <Button variant="ghost" size="icon-xs" aria-label="Dismiss" onClick={() => setTip(false)}><X /></Button>
          </div>
          <Button variant="link" className="h-auto justify-start p-0 text-sm" onClick={always}>Always open dashboard →</Button>
        </Card>
      )}
      <h1 className="hero-title text-[44px] sm:text-[72px] lg:text-[96px]">
        Where air and weather
        <br />
        <Badge className="h-auto gap-[0.28em] rounded-full bg-[#d3f0dc] px-[0.32em] py-[0.02em] align-[0.04em] text-[length:inherit] font-normal tracking-[-0.03em] text-foreground">
          <span className="size-[0.3em] rounded-full bg-[#1aae39]" />Couple
        </Badge>{" "}together.
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-base text-foreground/80 sm:text-lg">
        A 72-hour forecast for Delhi NCR that lets aerosols and meteorology feed back on each other — track inversions, trace stubble plumes, and see the haze coming.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button className="h-11 px-5 text-[15px]" onClick={onLive}>Open live dashboard</Button>
        <Button variant="secondary" className="h-11 bg-accent px-5 text-[15px] text-accent-foreground hover:bg-accent/70" onClick={onWhatIf}>
          Try the stubble-season what-if
        </Button>
      </div>
    </section>
  )
}
