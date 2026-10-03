import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from "recharts"
import { Compass, Landmark, ListChecks, Sun } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { TONE, type Tone } from "@/lib/aqi"
import { useT } from "@/lib/i18n"
import type { Forecast } from "@/lib/types"
import { cn } from "@/lib/utils"

const hr = (t: string) => {
  const d = new Date(t)
  return `${d.toLocaleDateString("en-IN", { weekday: "short" })} ${String(d.getHours()).padStart(2, "0")}h`
}

/* ---------------------------------------------------------------- GRAP */
const STAGES: { name: string; tone: Tone; actions: string[] }[] = [
  { name: "Below Stage I", tone: "green", actions: ["No GRAP stage is triggered at this AQI."] },
  { name: "Stage I · Poor (AQI 201–300)", tone: "yellow", actions: [
    "Strict dust control: water sprinkling and mechanised road sweeping",
    "No open burning of waste or biomass",
    "Check vehicle pollution certificates and industrial emission norms",
    "Encourage public transport"] },
  { name: "Stage II · Very Poor (AQI 301–400)", tone: "orange", actions: [
    "Restrict diesel generator sets except essential services",
    "Higher parking fees to discourage private cars",
    "Run more metro and bus trips",
    "No coal or firewood in eateries"] },
  { name: "Stage III · Severe (AQI 401–450)", tone: "red", actions: [
    "Pause non-essential construction and demolition",
    "Restrict older petrol and diesel vehicles",
    "Limit entry of polluting trucks",
    "Consider hybrid classes for younger school children"] },
  { name: "Stage IV · Severe+ (AQI above 450)", tone: "red", actions: [
    "Stop entry of non-essential trucks",
    "Pause public construction projects",
    "Consider odd-even rules for private cars",
    "Consider school closures and work from home for offices"] },
]

export function GrapCard({ d, hour }: { d: Forecast; hour: number }) {
  const { t } = useT()
  const g = d.grap
  const now = g.stage[hour]
  const st = STAGES[now]
  const first = Object.entries(g.first_hour).filter(([, v]) => v != null)
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm"><Landmark className="size-4 text-primary" />{t("GRAP stage forecast")}</CardTitle>
        <CardDescription>{t("Which stage of Delhi's Graded Response Action Plan the forecast AQI would trigger.")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn("h-6 px-2.5", TONE[st.tone])}>{t(st.name)}</Badge>
          <span className="text-xs text-muted-foreground">{t("at the chosen hour")}</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="rounded-lg bg-muted px-1 py-2">
              <div className="text-[11px] text-muted-foreground">{t("Stage")} {["I", "II", "III", "IV"][s - 1]}</div>
              <div className="text-sm font-semibold tabular-nums">{g.hours_in_stage[String(s)]} h</div>
              <div className="text-[10px] text-muted-foreground">{g.first_hour[String(s)] == null ? "—" : `+${g.first_hour[String(s)]} h`}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {first.length === 0 ? t("No GRAP stage is expected in the next 72 hours.") :
            `${t("Highest expected in 72 h")}: ${t("Stage")} ${["I", "II", "III", "IV"][g.max_stage - 1]}.`}
        </p>
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium"><ListChecks className="size-3.5" />{t("Typical actions at this stage (plus all earlier stages)")}</div>
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-foreground/80">{st.actions.map((a) => <li key={a}>{t(a)}</li>)}</ul>
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{t("Indicative only: based on forecast Delhi-mean AQI. The real GRAP decision is made by CAQM; check thresholds and actions against the current order.")}</p>
      </CardContent>
    </Card>
  )
}

/* ---------------------------------------------------------------- ozone and NOx */
export function OzoneCard({ d, hour }: { d: Forecast; hour: number }) {
  const { t } = useT()
  const o = d.ozone
  const config: ChartConfig = {
    o3: { label: t("Ozone (µg/m³)"), color: "#d9730d" },
    no2: { label: t("NO₂ (µg/m³)"), color: "#534ab7" },
  }
  const data = d.times.map((tm, i) => ({ label: hr(tm), o3: d.delhi.o3[i], no2: d.delhi.no2[i] }))
  const peak = o.daily[0]
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm"><Sun className="size-4 text-primary" />{t("Ozone and NOx")}</CardTitle>
        <CardDescription>{t("Ozone is made by sunlight, so it peaks in the afternoon. NO₂ builds up at night when a shallow mixing layer traps traffic emissions.")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ChartContainer config={config} className="h-[160px] w-full">
          <ComposedChart data={data} margin={{ left: -18, right: 6, top: 6 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval={11} fontSize={10} />
            <YAxis tickLine={false} axisLine={false} fontSize={10} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ReferenceLine x={hr(d.times[hour])} stroke="#0075de" strokeDasharray="4 3" />
            <Line dataKey="o3" stroke="var(--color-o3)" strokeWidth={2} dot={false} />
            <Line dataKey="no2" stroke="var(--color-no2)" strokeWidth={2} dot={false} />
            <ChartLegend content={<ChartLegendContent />} />
          </ComposedChart>
        </ChartContainer>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted px-3 py-2">
            <div className="text-[11px] text-muted-foreground">{t("Ozone peak (first day)")}</div>
            <div className="text-base font-semibold tabular-nums">{peak ? `${peak.o3_peak} µg/m³` : "—"}</div>
            <div className="text-[11px] text-muted-foreground">{peak ? `${t("around")} ${peak.o3_peak_hour}:00` : ""}</div>
          </div>
          <div className="rounded-lg bg-muted px-3 py-2">
            <div className="text-[11px] text-muted-foreground">{t("Hours above the 8-h ozone standard")}</div>
            <div className="text-base font-semibold tabular-nums">{o.hours_o3_8h_above_100} h</div>
            <div className="text-[11px] text-muted-foreground">{t("limit")} {o.standards.o3_8h} µg/m³</div>
          </div>
          <div className="rounded-lg bg-muted px-3 py-2">
            <div className="text-[11px] text-muted-foreground">{t("NO₂ night vs daytime")}</div>
            <div className="text-base font-semibold tabular-nums">{o.no2_night_to_day == null ? "—" : `×${o.no2_night_to_day}`}</div>
            <div className="text-[11px] text-muted-foreground">{t("higher at night")}</div>
          </div>
          <div className="rounded-lg bg-muted px-3 py-2">
            <div className="text-[11px] text-muted-foreground">{t("NO₂ tracks the trapping lid")}</div>
            <div className="text-base font-semibold tabular-nums">r = {o.no2_vs_trapping_corr}</div>
            <div className="text-[11px] text-muted-foreground">{t("vs 1 / PBL height")}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ---------------------------------------------------------------- drivers */
export function DriversCard({ d, hour }: { d: Forecast; hour: number }) {
  const { t } = useT()
  const dr = d.drivers
  const rows = dr.groups.map((g, i) => ({ name: t(g), v: dr.pct[hour][i] }))
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 6)
  const config: ChartConfig = { v: { label: t("Effect on PM2.5 (%)"), color: "#e03e3e" } }
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm"><ListChecks className="size-4 text-primary" />{t("Why this forecast?")}</CardTitle>
        <CardDescription>{t("What pushes the model's PM2.5 forecast up or down at the chosen hour, compared with an average case.")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <ChartContainer config={config} className="h-[210px] w-full">
          <BarChart data={rows} layout="vertical" margin={{ left: 4, right: 18, top: 4 }}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" tickLine={false} axisLine={false} fontSize={10} unit="%" />
            <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={11} width={132} />
            <ReferenceLine x={0} stroke="#9b9a97" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="v" radius={3}>
              {rows.map((r) => <Cell key={r.name} fill={r.v >= 0 ? "#e03e3e" : "#0075de"} />)}
            </Bar>
          </BarChart>
        </ChartContainer>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-medium text-[#e03e3e]">{t("Red raises")}</span> · <span className="font-medium text-[#0075de]">{t("blue lowers")}</span> PM2.5 {t("versus an average case of about")} {Math.round(dr.baseline_pm25)} µg/m³. {t("Explains the machine-learned step, before the feedback loop and the stubble plume.")}
        </p>
      </CardContent>
    </Card>
  )
}

/* ---------------------------------------------------------------- source region */
export function SourceCard({ d, hour, onShow, shown }: { d: Forecast; hour: number; onShow: () => void; shown: boolean }) {
  const { t } = useT()
  const a = d.back.arrivals[Math.min(Math.round(hour / 6), d.back.arrivals.length - 1)]
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm"><Compass className="size-4 text-primary" />{t("Where did Delhi's air come from?")}</CardTitle>
        <CardDescription>{t("Wind run backwards for 72 hours from Delhi, for air arriving at the chosen hour.")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">
          {t("Air arriving around")} <b>{hr(d.times[a.hour])}</b> {t("came mostly from the")} <b>{t(a.dir_from)}</b>, {t("about")} <b>{a.dist_km_24h} km</b> {t("away 24 hours earlier.")}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted px-3 py-2">
            <div className="text-[11px] text-muted-foreground">{t("Paths crossing the stubble belt")}</div>
            <div className="text-base font-semibold tabular-nums">{a.belt_pct}%</div>
          </div>
          <div className="rounded-lg bg-muted px-3 py-2">
            <div className="text-[11px] text-muted-foreground">{t("Fire power passed near")}</div>
            <div className="text-base font-semibold tabular-nums">{Math.round(a.exposure_mw)} MW</div>
            <div className="text-[11px] text-muted-foreground">{a.exposure_share_pct}% {t("of the region's total")}</div>
          </div>
        </div>
        <Button variant={shown ? "secondary" : "outline"} size="sm" onClick={onShow}>{shown ? t("Paths shown on the map") : t("Show paths on the map")}</Button>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{t("Ten paths per arrival time, spread around Delhi; fires counted within 30 km of any path. A transport pattern, not a source-apportionment study.")}</p>
      </CardContent>
    </Card>
  )
}
