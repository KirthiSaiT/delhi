import { useCallback, useEffect, useState } from "react"
import AppWindow from "@/components/AppWindow"
import Hero from "@/components/Hero"
import Nav from "@/components/Nav"
import { Accuracy, Faq, Footer, How, Modules, Sources } from "@/components/Sections"
import ValidationSection from "@/components/Validation"
import type { Basemap, Layers, Region } from "@/components/MapView"
import { DEFAULT_PARAMS, getForecast, getWhatIf } from "@/lib/api"
import BacktestSection from "@/components/Backtest"
import type { Forecast, WhatIfParams } from "@/lib/types"

export default function App() {
  const [scenario, setScenario] = useState<"live" | "peak">("live")
  const [data, setData] = useState<Forecast | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [hour, setHour] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [basemap, setBasemap] = useState<Basemap>("light")
  const [region, setRegion] = useState<Region>("ncr")
  const [layers, setLayers] = useState<Layers>({ grid: true, fires: true, plume: true, source: false })
  const [selected, setSelected] = useState<string | null>(null)
  const [params, setParams] = useState<WhatIfParams>(DEFAULT_PARAMS)
  const [running, setRunning] = useState(false)

  const load = useCallback(async (sc: string, refresh = false) => {
    setLoading(true); setErr(null)
    try { const d = await getForecast(sc, refresh); setData(d); setHour(0) }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "failed") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(scenario) }, [scenario, load])
  useEffect(() => { setRegion(scenario === "peak" ? "belt" : "ncr"); setHour(0); setParams(DEFAULT_PARAMS) }, [scenario])
  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => setHour((h) => (h >= 72 ? 0 : h + 1)), 450)
    return () => clearInterval(t)
  }, [playing])

  const runParams = useCallback(async (p: WhatIfParams) => {
    setRunning(true); setErr(null)
    try { setData(await getWhatIf(p)); setHour(0) }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "what-if failed") }
    finally { setRunning(false) }
  }, [])
  const resetParams = useCallback(() => { setParams(DEFAULT_PARAMS); runParams(DEFAULT_PARAMS) }, [runParams])

  const pick = useCallback((n: string | null) => setSelected((s) => (s === n ? null : n)), [])
  const go = useCallback((sc: "live" | "peak") => {
    setScenario(sc)
    document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Nav onOpen={() => go(scenario)} />
      <Hero onLive={() => go("live")} onWhatIf={() => go("peak")} />
      <section id="dashboard" className="mx-auto max-w-[1440px] px-2 sm:px-4">
        <AppWindow scenario={scenario} setScenario={setScenario} data={data} err={err} loading={loading}
          refresh={() => load(scenario, true)} hour={hour} setHour={setHour} playing={playing} setPlaying={setPlaying}
          basemap={basemap} setBasemap={setBasemap} region={region} setRegion={setRegion}
          layers={layers} setLayers={setLayers} selected={selected} pick={pick}
          params={params} setParams={setParams} runParams={() => runParams(params)} resetParams={resetParams} running={running} />
      </section>
      <Sources />
      <How d={data} />
      <Modules />
      <Accuracy d={data} />
      <BacktestSection />
      <ValidationSection />
      <Faq d={data} />
      <Footer />
    </div>
  )
}
