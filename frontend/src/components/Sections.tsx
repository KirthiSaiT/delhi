import { useState } from "react"
import { Flame, Layers3, Wind } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TONE } from "@/lib/aqi"
import type { Forecast } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/Nav"

export function Sources() {
  return (
    <div className="mx-auto mt-10 max-w-[1240px] px-4 text-center">
      <p className="text-xs text-muted-foreground">Built on open data</p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm font-semibold text-foreground/60">
        {["Open-Meteo", "Copernicus CAMS", "NASA FIRMS", "OpenStreetMap", "LightGBM"].map((s) => <span key={s}>{s}</span>)}
      </div>
    </div>
  )
}

export function How({ d }: { d: Forecast | null }) {
  const f = d?.feedback, inv = d?.inversion, s = d?.plume.summary
  const items = [
    { icon: Wind, tone: "blue" as const, title: "Two-way feedback",
      body: "Dense PM2.5 dims sunlight, cools the surface and shrinks the boundary layer — which traps more PM2.5. AirCouple iterates that loop until it settles.",
      stat: f ? `+${f.pm25_uplift_mean} µg/m³ mean PM2.5 · ${f.day_cooling_c} °C daytime` : "—" },
    { icon: Layers3, tone: "yellow" as const, title: "Inversion tracking",
      body: "T(925 hPa) − T(surface), boundary-layer height and the ventilation coefficient show, hour by hour, when the atmosphere puts a lid on Delhi.",
      stat: inv ? `${inv.hours_moderate_or_strong} h moderate/strong · PBL down to ${inv.min_pbl_m} m` : "—" },
    { icon: Flame, tone: "orange" as const, title: "Stubble plume dispersion",
      body: "Satellite fire detections over Punjab and Haryana are advected by the forecast wind; a shallow mixed layer amplifies what arrives in Delhi.",
      stat: s ? `${s.n_fires} fires · ${s.arrival_h == null ? "no arrival" : s.arrival_h === 0 ? "already arriving" : `reaches Delhi +${s.arrival_h} h`}` : "—" },
  ]
  return (
    <section id="how" className="mx-auto max-w-[1240px] px-4 pt-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="section-title text-4xl sm:text-5xl">Weather and pollution, finally in one loop.</h2>
        <p className="mt-4 text-lg text-foreground/70">Standard AQI models treat meteorology and chemistry separately. In Delhi they push on each other.</p>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {items.map((it) => (
          <Card key={it.title} className="gap-3 p-6">
            <div className={cn("flex size-10 items-center justify-center rounded-lg", TONE[it.tone])}><it.icon className="size-5" /></div>
            <CardTitle className="text-xl font-bold tracking-tight">{it.title}</CardTitle>
            <CardDescription className="text-[15px] leading-relaxed text-foreground/70">{it.body}</CardDescription>
            <Separator className="my-1" />
            <p className="text-sm font-medium tabular-nums">{it.stat}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}

const NAMES: Record<string, string> = { pm25: "PM2.5", pm10: "PM10", o3: "Ozone", no2: "NO₂" }

export function Accuracy({ d }: { d: Forecast | null }) {
  const [k, setK] = useState("pm25")
  const m = d?.meta.metrics[k] ?? {}
  return (
    <section id="accuracy" className="mx-auto max-w-[1240px] px-4 pt-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="section-title text-4xl sm:text-5xl">Tested on a season it never saw.</h2>
        <p className="mt-4 text-lg text-foreground/70">
          {d ? `Hold-out: ${d.meta.holdout}.` : "Loading…"} Skill is measured against persistence — assuming today's air stays as it is.
        </p>
      </div>
      <Card className="mx-auto mt-10 max-w-3xl gap-4 p-5">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 p-0">
          <CardTitle className="text-base">Forecast skill</CardTitle>
          <Tabs value={k} onValueChange={setK}>
            <TabsList className="h-8">{Object.entries(NAMES).map(([id, l]) => <TabsTrigger key={id} value={id}>{l}</TabsTrigger>)}</TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Lead time</TableHead><TableHead>MAE (µg/m³)</TableHead><TableHead>Persistence MAE</TableHead><TableHead>Improvement</TableHead><TableHead className="text-right">R²</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(m).map(([lead, v]) => (
                <TableRow key={lead}>
                  <TableCell className="font-medium">{lead}</TableCell>
                  <TableCell className="tabular-nums">{v.mae}</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{v.persistence_mae}</TableCell>
                  <TableCell><Badge className={cn("h-6 px-2.5", v.improvement_pct > 0 ? TONE.green : TONE.red)}>{v.improvement_pct}%</Badge></TableCell>
                  <TableCell className="text-right tabular-nums">{v.r2}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  )
}

const FAQ: [string, string][] = [
  ["Is this a real WRF-Chem run?", "No. WRF-Chem needs an HPC cluster and emission inventories. AirCouple is a reduced-order coupled emulation: a machine-learned chemistry step is iterated with a parameterised aerosol–radiation–boundary-layer feedback. It runs on a laptop in about 30 seconds, and it is built to accept WRF-Chem fields (T2m, T925, PBL height, wind, radiation, AOD) as a drop-in."],
  ["Where does the data come from?", "Meteorology and CAMS composition (PM2.5, PM10, NO₂, O₃, AOD) via Open-Meteo; active fires from NASA FIRMS VIIRS; basemap from OpenStreetMap. No API keys are needed."],
  ["What is the stubble-season what-if?", "Real fires are rare outside October–November, so the what-if starts from a typical early-November haze, adds a synthetic burning day over Punjab and Haryana and applies stagnant winter conditions to today's forecast. It is clearly badged as a scenario."],
  ["What are the known limitations?", "Ground truth is CAMS analysis, not CPCB station readings. Archived meteorology is short-lead NWP, so long-lead skill in the hold-out is slightly optimistic. Feedback strengths are tunable constants within literature ranges, not fitted values. PM10 skill is weak because dust events are hard to forecast."],
]

export function Faq({ d }: { d: Forecast | null }) {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 pt-24">
      <h2 className="section-title text-center text-4xl sm:text-5xl">Method & limitations</h2>
      <Accordion className="mt-8">
        {FAQ.map(([q, a], i) => (
          <AccordionItem key={q} value={`q${i}`}>
            <AccordionTrigger className="text-base font-semibold">{q}</AccordionTrigger>
            <AccordionContent className="text-[15px] leading-relaxed text-foreground/75">{a}{i === 3 && d ? ` ${d.meta.caveat}` : ""}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="mx-auto mt-24 max-w-[1240px] px-4 pb-10">
      <Separator />
      <div className="flex flex-wrap items-center justify-between gap-3 pt-6 text-xs text-muted-foreground">
        <Logo />
        <span>SIH 2026 · PS 26082 · Ministry of Earth Sciences / NCMRWF · Data © Open-Meteo, Copernicus CAMS, NASA FIRMS, OpenStreetMap contributors</span>
      </div>
    </footer>
  )
}
