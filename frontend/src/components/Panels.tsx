import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { Forecast } from "@/lib/types"
import { INV_COLORS, TONE, aqiCat, aqiColor, fmtTime } from "@/lib/aqi"
import { useState } from "react"
import { Flame, Gauge, Layers3, Wind } from "lucide-react"

const hr = (t: string) => {
  const d = new Date(t)
  return `${d.toLocaleDateString("en-IN", { weekday: "short" })} ${String(d.getHours()).padStart(2, "0")}h`
}

function Strip({ colors, hour, onPick }: { colors: string[]; hour: number; onPick: (h: number) => void }) {
  return (
    <div className="flex h-6 items-end gap-px">
      {colors.map((c, i) => (
        <button key={i} onClick={() => onPick(i)} aria-label={`+${i}h`} className="flex-1 rounded-[2px] transition-opacity"
          style={{ background: c, height: i === hour ? "100%" : "62%", opacity: i === hour ? 1 : 0.8 }} />
      ))}
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-lg bg-muted px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-base font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  )
}

export function AqiCard({ d, hour, name, onPick }: { d: Forecast; hour: number; name: string | null; onPick: (h: number) => void }) {
  const st = name ? d.stations.find((s) => s.name === name) : null
  const g = (k: "aqi" | "aqi_unc" | "pm25" | "pm10" | "no2" | "o3") => (st ? (st as any)[k][hour] : d.delhi[k][hour])
  const aqi = Math.round(g("aqi")), unc = Math.round(g("aqi_unc")), cat = aqiCat(aqi)
  const series = st ? st.aqi : d.delhi.aqi
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{name ?? "Delhi (11-station mean)"} · {fmtTime(d.times[hour])}</CardDescription>
        <div className="flex items-end gap-3">
          <CardTitle className="text-5xl font-bold tabular-nums leading-none">{aqi}</CardTitle>
          <Badge className={cn("mb-1.5 h-6 px-2.5 text-xs", TONE[cat.tone])}><span className="size-2 rounded-full" style={{ background: cat.color }} />{cat.name}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Coupled AQI {aqi} vs uncoupled {unc} ({aqi - unc >= 0 ? "+" : ""}{aqi - unc} from feedback) · dominant {d.dominant}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-4 gap-2">
          <Stat label="PM2.5" value={Math.round(g("pm25"))} sub="µg/m³" />
          <Stat label="PM10" value={Math.round(g("pm10"))} sub="µg/m³" />
          <Stat label="NO₂" value={Math.round(g("no2"))} sub="µg/m³" />
          <Stat label="O₃" value={Math.round(g("o3"))} sub="µg/m³" />
        </div>
        <div>
          <div className="mb-1 text-[11px] text-muted-foreground">72-hour AQI outlook (tap a bar)</div>
          <Strip colors={series.map((v) => aqiColor(v))} hour={hour} onPick={onPick} />
        </div>
      </CardContent>
    </Card>
  )
}

function GaugeSvg({ value }: { value: number }) {
  const min = -2, max = 8, f = (v: number) => Math.min(1, Math.max(0, (v - min) / (max - min)))
  const pt = (t: number, r: number) => { const a = Math.PI * (1 - t); return [100 + r * Math.cos(a), 100 - r * Math.sin(a)] }
  const seg = (a: number, b: number, c: string) => {
    const [x1, y1] = pt(f(a), 80), [x2, y2] = pt(f(b), 80)
    return <path key={a} d={`M${x1} ${y1} A80 80 0 0 1 ${x2} ${y2}`} stroke={c} strokeWidth={14} fill="none" />
  }
  const [nx, ny] = pt(f(value), 62)
  return (
    <svg viewBox="0 0 200 116" className="w-full max-w-[240px]">
      {seg(-2, 0, INV_COLORS[0])}{seg(0, 2, INV_COLORS[1])}{seg(2, 4, INV_COLORS[2])}{seg(4, 8, INV_COLORS[3])}
      <line x1="100" y1="100" x2={nx} y2={ny} stroke="#191919" strokeWidth="3" strokeLinecap="round" />
      <circle cx="100" cy="100" r="6" fill="#191919" />
    </svg>
  )
}

export function InversionCard({ d, hour, onPick }: { d: Forecast; hour: number; onPick: (h: number) => void }) {
  const inv = d.delhi.inv[hour], cls = d.inversion.classes[hour], pbl = d.delhi.pbl[hour], vent = d.delhi.vent[hour]
  const ventLabel = vent < 2000 ? "very poor" : vent < 6000 ? "poor" : "adequate"
  const trap = Math.min(10, 1000 / Math.max(pbl, 60))
  const tone = (["gray", "yellow", "orange", "red"] as const)[cls]
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm"><Layers3 className="size-4 text-primary" />Atmospheric inversion</CardTitle>
        <CardDescription>T(925 hPa) − T(surface). Positive = warm air lid trapping pollutants.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="w-[46%] shrink-0"><GaugeSvg value={inv} />
            <div className="-mt-1 text-center text-xl font-bold tabular-nums">{inv > 0 ? "+" : ""}{inv.toFixed(1)}°C</div></div>
          <div className="space-y-1.5">
            <Badge className={cn("h-6 px-2.5", TONE[tone])}>{d.inversion.names[cls]} inversion</Badge>
            <div className="text-xs text-muted-foreground">PBL height <b className="text-foreground">{Math.round(pbl)} m</b></div>
            <div className="text-xs text-muted-foreground">Ventilation <b className="text-foreground">{Math.round(vent)} m²/s</b> ({ventLabel})</div>
            <div className="text-xs text-muted-foreground">Trapping factor <b className="text-foreground">×{trap.toFixed(1)}</b></div>
          </div>
        </div>
        <Strip colors={d.inversion.classes.map((c) => INV_COLORS[c])} hour={hour} onPick={onPick} />
        <p className="text-xs text-muted-foreground">
          {d.inversion.hours_moderate_or_strong} h of moderate/strong inversion in the next 72 h · peak +{d.inversion.max_c}°C at +{d.inversion.max_hour}h · lowest PBL {d.inversion.min_pbl_m} m
        </p>
      </CardContent>
    </Card>
  )
}

const rows = (d: Forecast, a: string, b: string, c?: string) => d.times.map((t, i) => ({
  i, label: hr(t), a: d.delhi[a][i], b: d.delhi[b][i], ...(c ? { c: d.delhi[c][i] } : {}) }))

export function FeedbackCard({ d, hour }: { d: Forecast; hour: number }) {
  const [tab, setTab] = useState("pm25")
  const cfg: Record<string, [string, string, string, string]> = {
    pm25: ["pm25", "pm25_unc", "PM2.5 µg/m³", "Coupled"],
    pbl: ["pbl", "pbl_nwp", "PBL height m", "Coupled"],
    t2m: ["t2m", "t2m_nwp", "2 m temperature °C", "Coupled"],
  }
  const [a, b, unit] = cfg[tab]
  const config: ChartConfig = { a: { label: "Coupled (with feedback)", color: "#e03e3e" }, b: { label: tab === "pm25" ? "Uncoupled (one-way)" : "NWP (no aerosol feedback)", color: "#9b9a97" } }
  const f = d.feedback
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm"><Wind className="size-4 text-primary" />Two-way weather ↔ chemistry feedback</CardTitle>
        <CardDescription>Aerosols dim sunlight → cooler surface, shallower PBL → more trapped PM2.5. Iterated to convergence.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Tabs value={tab} onValueChange={setTab}><TabsList className="h-8"><TabsTrigger value="pm25">PM2.5</TabsTrigger><TabsTrigger value="pbl">PBL</TabsTrigger><TabsTrigger value="t2m">Temp</TabsTrigger></TabsList></Tabs>
        <ChartContainer config={config} className="h-[170px] w-full">
          <LineChart data={rows(d, a, b)} margin={{ left: -14, right: 6, top: 6 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval={11} fontSize={10} />
            <YAxis tickLine={false} axisLine={false} fontSize={10} width={44} domain={["auto", "auto"]} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ReferenceLine x={d.times[hour] && hr(d.times[hour])} stroke="#0075de" strokeDasharray="4 3" />
            <Line dataKey="b" stroke="var(--color-b)" strokeWidth={2} dot={false} strokeDasharray="4 3" />
            <Line dataKey="a" stroke="var(--color-a)" strokeWidth={2.2} dot={false} />
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
        <div className="text-[11px] text-muted-foreground">{unit} · Delhi mean</div>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="PM2.5 uplift" value={`+${f.pm25_uplift_mean} µg/m³`} sub={`max +${f.pm25_uplift_max} at +${f.pm25_uplift_hour}h`} />
          <Stat label="Daytime cooling" value={`${f.day_cooling_c}°C`} sub={`AOD peak ${f.aod_peak}`} />
          <Stat label="Daytime PBL" value={`−${f.pbl_reduction_pct}%`} sub="vs NWP" />
          <Stat label="Coupling loop" value={`${f.iterations} iterations`} sub={`residual ${f.residual_ugm3[0]} → ${f.residual_ugm3.at(-1)} µg/m³`} />
        </div>
      </CardContent>
    </Card>
  )
}

export function PlumeCard({ d }: { d: Forecast }) {
  const s = d.plume.summary
  const config: ChartConfig = { a: { label: "Stubble PM2.5 at Delhi", color: "#d9730d" } }
  const data = d.times.map((t, i) => ({ label: hr(t), a: d.delhi.stubble[i] }))
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm"><Flame className="size-4 text-orange-600" />Stubble-burning plume</CardTitle>
        <CardDescription>{d.scenario === "peak" ? "Synthetic peak-season fires (scenario)" : "Real NASA FIRMS VIIRS detections, last 24 h"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {s.n_fires === 0 ? (
          <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">No active fire detections over Punjab/Haryana in the last 24 h (off-season). Switch to the stubble-season what-if to see plume dispersion.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Fire detections" value={s.n_fires} sub={`${Math.round(s.total_frp)} MW total FRP`} />
              <Stat label="Reaches Delhi" value={s.arrival_h == null ? "—" : s.arrival_h === 0 ? "Already" : `+${s.arrival_h} h`} sub="mean >5 µg/m³" />
              <Stat label="Peak contribution" value={`${s.peak_ugm3} µg/m³`} sub={s.peak_h != null ? `at +${s.peak_h} h` : ""} />
              <Stat label="Transport" value={`${Math.round(d.delhi_wd[0])}°`} sub="wind from (Delhi)" />
            </div>
            <ChartContainer config={config} className="h-[110px] w-full">
              <AreaChart data={data} margin={{ left: -20, right: 6 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval={11} fontSize={10} />
                <YAxis tickLine={false} axisLine={false} fontSize={10} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area dataKey="a" stroke="var(--color-a)" fill="var(--color-a)" fillOpacity={0.25} strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function ForecastChart({ d, hour, name }: { d: Forecast; hour: number; name: string | null }) {
  const st = name ? d.stations.find((s) => s.name === name) : null
  const src = (k: string): number[] => (st ? (st as any)[k] : d.delhi[k])
  const data = d.times.map((t, i) => ({ label: hr(t), coupled: src("pm25")[i], uncoupled: src("pm25_unc")[i], cams: src("pm25_cams")[i] }))
  const config: ChartConfig = {
    coupled: { label: "AirCouple (coupled)", color: "#0075de" },
    uncoupled: { label: "Uncoupled", color: "#9b9a97" },
    cams: { label: "CAMS baseline (global model)", color: "#0f9d58" },
  }
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm"><Gauge className="size-4 text-primary" />PM2.5 forecast — {name ?? "Delhi mean"}</CardTitle>
        <CardDescription>Click a station on the map to switch. Live mode is compared against the CAMS global-model baseline.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[220px] w-full">
          <LineChart data={data} margin={{ left: -14, right: 8, top: 6 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval={11} fontSize={10} />
            <YAxis tickLine={false} axisLine={false} fontSize={10} width={40} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ReferenceLine x={hr(d.times[hour])} stroke="#0075de" strokeDasharray="4 3" />
            {d.has_cams && <Line dataKey="cams" stroke="var(--color-cams)" strokeWidth={1.6} dot={false} />}
            <Line dataKey="uncoupled" stroke="var(--color-uncoupled)" strokeWidth={1.6} dot={false} strokeDasharray="4 3" />
            <Line dataKey="coupled" stroke="var(--color-coupled)" strokeWidth={2.4} dot={false} />
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
