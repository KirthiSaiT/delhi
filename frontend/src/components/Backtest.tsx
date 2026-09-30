import { useEffect, useState } from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TONE } from "@/lib/aqi"
import { cn } from "@/lib/utils"

interface Origin {
  origin: string; times: string[]; actual: number[]; forecast: number[]; uncoupled: number[]; persistence: number[]
  aqi_actual: number[]; aqi_forecast: number[]
  stats: { mae: number; mae_uncoupled: number; mae_persistence: number; bias: number; peak_actual: number; peak_forecast: number; category_hit_pct: number }
}
interface Backtest { note: string; origins: Origin[]; summary: { mae_model: number; mae_persistence: number; mae_uncoupled: number; improvement_pct: number } }

const config: ChartConfig = {
  actual: { label: "What actually happened (CAMS analysis)", color: "#191919" },
  forecast: { label: "AirCouple 72 h forecast", color: "#0075de" },
  persistence: { label: "Persistence (no forecast)", color: "#b4b3af" },
}
const lbl = (t: string) => {
  const d = new Date(t)
  return `${d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" })} ${String(d.getHours()).padStart(2, "0")}h`
}

export default function BacktestSection() {
  const [bt, setBt] = useState<Backtest | null>(null)
  const [missing, setMissing] = useState(false)
  const [sel, setSel] = useState(0)
  useEffect(() => {
    fetch("/api/backtest").then((r) => (r.ok ? r.json() : Promise.reject())).then(setBt).catch(() => setMissing(true))
  }, [])
  const o = bt?.origins[sel]
  return (
    <section id="replay" className="mx-auto max-w-[1240px] px-4 pt-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="section-title text-4xl sm:text-5xl">Replay a real haze episode.</h2>
        <p className="mt-4 text-lg text-foreground/70">
          Five forecasts issued during the Oct–Nov 2025 stubble season by a model that had never seen that season, compared with what actually happened.
        </p>
      </div>
      <Card className="mx-auto mt-10 max-w-4xl gap-4 p-5">
        {missing && <p className="p-4 text-sm text-muted-foreground">Backtest not generated yet — run <code>python -m app.backtest</code>.</p>}
        {!bt && !missing && <Skeleton className="h-[360px]" />}
        {bt && o && (
          <>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 p-0">
              <CardTitle className="text-base">Delhi-mean PM2.5 · forecast issued {lbl(o.times[0])}</CardTitle>
              <Tabs value={String(sel)} onValueChange={(v) => setSel(Number(v))}>
                <TabsList className="h-8">{bt.origins.map((x, i) => <TabsTrigger key={x.origin} value={String(i)}>{new Date(x.origin).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</TabsTrigger>)}</TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="space-y-4 p-0">
              <ChartContainer config={config} className="h-[300px] w-full">
                <LineChart data={o.times.map((t, i) => ({ label: lbl(t), actual: o.actual[i], forecast: o.forecast[i], persistence: o.persistence[i] }))} margin={{ left: -10, right: 8, top: 6 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} interval={11} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} width={40} unit="" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line dataKey="persistence" stroke="var(--color-persistence)" strokeWidth={1.6} dot={false} strokeDasharray="4 3" />
                  <Line dataKey="actual" stroke="var(--color-actual)" strokeWidth={2.4} dot={false} />
                  <Line dataKey="forecast" stroke="var(--color-forecast)" strokeWidth={2.4} dot={false} />
                  <ChartLegend content={<ChartLegendContent />} />
                </LineChart>
              </ChartContainer>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge className={cn("h-6 px-2.5", o.stats.mae < o.stats.mae_persistence ? TONE.green : TONE.red)}>MAE {o.stats.mae} vs persistence {o.stats.mae_persistence} µg/m³</Badge>
                <Badge className={cn("h-6 px-2.5", TONE.blue)}>Peak {o.stats.peak_forecast} forecast vs {o.stats.peak_actual} actual</Badge>
                <Badge className={cn("h-6 px-2.5", TONE.gray)}>Bias {o.stats.bias > 0 ? "+" : ""}{o.stats.bias}</Badge>
                <Badge className={cn("h-6 px-2.5", TONE.yellow)}>AQI category right {o.stats.category_hit_pct}% of hours</Badge>
                <span className="ml-auto text-muted-foreground">All 5 episodes: MAE {bt.summary.mae_model} vs {bt.summary.mae_persistence} ({bt.summary.improvement_pct}% better)</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {bt.note} Honest note: in these replays the two-way feedback term changes average MAE from {bt.summary.mae_uncoupled} (uncoupled) to {bt.summary.mae_model} µg/m³ — it is not a measurable
                skill gain here; its value is physical consistency and response to what-if conditions. The Oct 28 forecast under-predicts a rising episode.
              </p>
            </CardContent>
          </>
        )}
      </Card>
    </section>
  )
}
