import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { HeartPulse, Loader2, RotateCcw, SlidersHorizontal, Split } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Slider } from "@/components/ui/slider"
import { TONE, aqiCat, fmtTime } from "@/lib/aqi"
import type { Forecast, WhatIfParams } from "@/lib/types"
import { cn } from "@/lib/utils"

const hr = (t: string) => {
  const d = new Date(t)
  return `${d.toLocaleDateString("en-IN", { weekday: "short" })} ${String(d.getHours()).padStart(2, "0")}h`
}

/* ---------------------------------------------------------------- attribution */
export function AttributionCard({ d }: { d: Forecast }) {
  const a = d.attribution
  const config: ChartConfig = {
    background: { label: "Background (regional + local)", color: "#9b9a97" },
    stubble: { label: "Stubble plume", color: "#d9730d" },
    feedback: { label: "Feedback amplification", color: "#e03e3e" },
  }
  const data = d.times.map((t, i) => ({ label: hr(t), background: a.background[i], stubble: a.stubble[i], feedback: a.feedback[i] }))
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm"><Split className="size-4 text-primary" />Why is PM2.5 high?</CardTitle>
        <CardDescription>Delhi-mean PM2.5 split into its causes, adding up exactly to the coupled forecast.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ChartContainer config={config} className="h-[150px] w-full">
          <AreaChart data={data} margin={{ left: -20, right: 6 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval={11} fontSize={10} />
            <YAxis tickLine={false} axisLine={false} fontSize={10} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area dataKey="background" stackId="a" stroke="var(--color-background)" fill="var(--color-background)" fillOpacity={0.35} />
            <Area dataKey="stubble" stackId="a" stroke="var(--color-stubble)" fill="var(--color-stubble)" fillOpacity={0.55} />
            <Area dataKey="feedback" stackId="a" stroke="var(--color-feedback)" fill="var(--color-feedback)" fillOpacity={0.7} />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
        <div className="flex flex-wrap gap-1.5 text-xs">
          <Badge className={cn("h-6 px-2.5", TONE.gray)}>Background {a.share.background}%</Badge>
          <Badge className={cn("h-6 px-2.5", TONE.orange)}>Stubble {a.share.stubble}%</Badge>
          <Badge className={cn("h-6 px-2.5", TONE.red)}>Feedback {a.share.feedback}%</Badge>
          <span className="self-center text-muted-foreground">share of 72 h PM2.5</span>
        </div>
      </CardContent>
    </Card>
  )
}

/* ---------------------------------------------------------------- advisory */
const ADVICE: Record<string, { summary: string; do: string[] }> = {
  Good: { summary: "Air quality is satisfactory. Minimal health impact.", do: ["Normal outdoor activity is fine."] },
  Satisfactory: { summary: "Minor breathing discomfort possible for very sensitive people.", do: ["Sensitive groups may limit long outdoor exertion."] },
  Moderate: { summary: "Breathing discomfort for people with lung or heart disease, children and older adults.",
    do: ["Sensitive groups should reduce prolonged outdoor exertion.", "Keep reliever medication handy."] },
  Poor: { summary: "Breathing discomfort for most people on prolonged exposure.",
    do: ["Avoid long outdoor exercise.", "Sensitive groups stay indoors where possible.", "Consider an N95 mask outdoors."] },
  "Very Poor": { summary: "Respiratory illness on prolonged exposure; serious for people with existing disease.",
    do: ["Avoid outdoor physical activity.", "Keep windows closed; use an air purifier if available.", "Wear an N95 mask if you must go out."] },
  Severe: { summary: "Affects healthy people and seriously affects those with existing disease.",
    do: ["Stay indoors; avoid all outdoor exertion.", "Keep windows closed and run an air purifier.", "Schools and outdoor events should consider closure."] },
}

export function AdvisoryCard({ d, hour }: { d: Forecast; hour: number }) {
  const aqi = d.delhi.aqi
  const cat = aqiCat(aqi[hour])
  const adv = ADVICE[cat.name]
  const next24 = aqi.slice(0, 25)
  const best = next24.indexOf(Math.min(...next24.slice(1)))
  const worst = aqi.indexOf(Math.max(...aqi))
  const badHours = aqi.slice(1).filter((v) => v > 300).length
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm"><HeartPulse className="size-4 text-primary" />Health advisory</CardTitle>
        <CardDescription>CPCB guidance for {fmtTime(d.times[hour], { weekday: "short", hour: "2-digit", hour12: false })} · <b>{cat.name}</b></CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">{adv.summary}</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/80">{adv.do.map((t) => <li key={t}>{t}</li>)}</ul>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-muted px-2 py-2"><div className="text-[11px] text-muted-foreground">Best next 24 h</div><div className="text-sm font-semibold">+{best} h</div><div className="text-[11px] text-muted-foreground">AQI {Math.round(aqi[best])}</div></div>
          <div className="rounded-lg bg-muted px-2 py-2"><div className="text-[11px] text-muted-foreground">Worst in 72 h</div><div className="text-sm font-semibold">+{worst} h</div><div className="text-[11px] text-muted-foreground">AQI {Math.round(aqi[worst])}</div></div>
          <div className="rounded-lg bg-muted px-2 py-2"><div className="text-[11px] text-muted-foreground">Hours &gt; 300</div><div className="text-sm font-semibold">{badHours} h</div><div className="text-[11px] text-muted-foreground">Very Poor+</div></div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ---------------------------------------------------------------- what-if controls */
const SLIDERS: { key: keyof WhatIfParams; label: string; min: number; max: number; step: number; fmt: (v: number) => string }[] = [
  { key: "fire_scale", label: "Stubble fire load", min: 0.1, max: 2.5, step: 0.1, fmt: (v) => `×${v.toFixed(1)} (${Math.round(650 * v)} fires)` },
  { key: "wind_scale", label: "Wind speed", min: 0.2, max: 1.2, step: 0.05, fmt: (v) => `×${v.toFixed(2)} forecast` },
  { key: "pbl_scale", label: "Mixing depth (PBL)", min: 0.15, max: 1, step: 0.05, fmt: (v) => `${Math.round(v * 100)}% of forecast` },
  { key: "start_pm25", label: "Starting haze (PM2.5)", min: 50, max: 350, step: 10, fmt: (v) => `${Math.round(v)} µg/m³` },
]

export function WhatIfCard({ params, setParams, run, reset, running }: {
  params: WhatIfParams; setParams: (p: WhatIfParams) => void; run: () => void; reset: () => void; running: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm"><SlidersHorizontal className="size-4 text-primary" />Scenario controls</CardTitle>
        <CardDescription>Change the conditions and re-run the whole coupled system.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {SLIDERS.map((s) => (
          <div key={s.key} className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{s.label}</span><span className="tabular-nums text-muted-foreground">{s.fmt(params[s.key])}</span>
            </div>
            <Slider value={[params[s.key]]} min={s.min} max={s.max} step={s.step}
              onValueChange={(v) => setParams({ ...params, [s.key]: Array.isArray(v) ? v[0] : v })} />
          </div>
        ))}
        <div className="flex gap-2">
          <Button className="flex-1" disabled={running} onClick={run}>{running ? <Loader2 className="animate-spin" /> : null}{running ? "Running…" : "Run scenario"}</Button>
          <Button variant="outline" size="icon" aria-label="Reset" disabled={running} onClick={reset}><RotateCcw /></Button>
        </div>
      </CardContent>
    </Card>
  )
}
