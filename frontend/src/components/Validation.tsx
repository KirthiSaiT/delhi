import { useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Card, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CATS, TONE } from "@/lib/aqi"
import { useT } from "@/lib/i18n"
import { cn } from "@/lib/utils"

interface Validation {
  note: string; samples: number
  lead_curve: { h: number; model: number; persistence: number; r2: number }[]
  by_station: { name: string; model: number; persistence: number; bias: number }[]
  confusion: { labels: string[]; counts: number[][]; row_pct: number[][]; exact_pct: number; within_one_pct: number }
}
interface Verif {
  logged: number; runs: number; points: number; message: string | null
  buckets: { lead: string; n: number; ours: number; cams: number; persistence: number; band_coverage: number | null }[]
}

const useJson = <T,>(url: string) => {
  const [v, setV] = useState<T | null>(null)
  const [bad, setBad] = useState(false)
  useEffect(() => { fetch(url).then((r) => (r.ok ? r.json() : Promise.reject())).then(setV).catch(() => setBad(true)) }, [url])
  return { v, bad }
}

export default function ValidationSection() {
  const { t } = useT()
  const val = useJson<Validation>("/api/validation")
  const ver = useJson<Verif>("/api/verification")
  const lead: ChartConfig = { model: { label: t("AirCouple"), color: "#0075de" }, persistence: { label: t("No change (persistence)"), color: "#b4b3af" } }
  const v = val.v
  return (
    <section id="validate" className="mx-auto max-w-[1240px] px-4 pt-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="section-title text-4xl sm:text-5xl">{t("Check our work.")}</h2>
        <p className="mt-4 text-lg text-foreground/70">{t("Error by lead time, by place, by AQI category, and a live check that grows the longer the server runs.")}</p>
      </div>
      <Card className="mx-auto mt-10 max-w-4xl gap-4 p-5">
        {val.bad && <p className="p-4 text-sm text-muted-foreground">{t("Validation not generated yet")} — <code>python -m app.validation</code></p>}
        {!v && !val.bad && <Skeleton className="h-[320px]" />}
        {v && (
          <Tabs defaultValue="lead">
            <TabsList className="h-9 flex-wrap">
              <TabsTrigger value="lead">{t("By lead time")}</TabsTrigger>
              <TabsTrigger value="station">{t("By station")}</TabsTrigger>
              <TabsTrigger value="cat">{t("AQI categories")}</TabsTrigger>
              <TabsTrigger value="live">{t("Live check")}</TabsTrigger>
            </TabsList>

            <TabsContent value="lead" className="mt-4 space-y-3">
              <ChartContainer config={lead} className="h-[280px] w-full">
                <LineChart data={v.lead_curve} margin={{ left: -6, right: 8, top: 6 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="h" tickLine={false} axisLine={false} fontSize={11} unit="h" />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} width={36} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line dataKey="persistence" stroke="var(--color-persistence)" strokeWidth={1.8} dot={false} strokeDasharray="4 3" />
                  <Line dataKey="model" stroke="var(--color-model)" strokeWidth={2.4} dot={false} />
                  <ChartLegend content={<ChartLegendContent />} />
                </LineChart>
              </ChartContainer>
              <p className="text-xs text-muted-foreground">{t("Mean absolute error of PM2.5 (µg/m³) at each forecast lead time, on the held-out stubble season. Lower is better.")}</p>
            </TabsContent>

            <TabsContent value="station" className="mt-4 space-y-3">
              <ChartContainer config={lead} className="h-[420px] w-full">
                <BarChart data={v.by_station} layout="vertical" margin={{ left: 6, right: 10, top: 4 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={11} width={92} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="persistence" fill="var(--color-persistence)" radius={2} />
                  <Bar dataKey="model" fill="var(--color-model)" radius={2} />
                  <ChartLegend content={<ChartLegendContent />} />
                </BarChart>
              </ChartContainer>
              <p className="text-xs text-muted-foreground">{t("PM2.5 error per place (µg/m³). Stations in the same area behave alike because they share the same source data.")}</p>
            </TabsContent>

            <TabsContent value="cat" className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge className={cn("h-6 px-2.5", TONE.blue)}>{t("Exactly right")} {v.confusion.exact_pct}%</Badge>
                <Badge className={cn("h-6 px-2.5", TONE.green)}>{t("Within one category")} {v.confusion.within_one_pct}%</Badge>
              </div>
              <div className="overflow-x-auto">
                <Table className="min-w-[520px] text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">{t("Actual ↓ / Forecast →")}</TableHead>
                      {v.confusion.labels.map((l, i) => <TableHead key={l} className="text-center"><span className="mr-1 inline-block size-2 rounded-full" style={{ background: CATS[i].color }} />{t(l)}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {v.confusion.labels.map((l, i) => (
                      <TableRow key={l}>
                        <TableCell className="font-medium">{t(l)}</TableCell>
                        {v.confusion.row_pct[i].map((pct, j) => (
                          <TableCell key={j} className="text-center tabular-nums"
                            style={{ background: pct > 0 ? `rgba(0,117,222,${Math.min(0.08 + pct / 130, 0.75)})` : undefined, color: pct > 55 ? "#fff" : undefined }}>
                            {v.confusion.counts[i].reduce((a, b) => a + b, 0) ? `${pct}%` : "—"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">{t("Each row is what actually happened; the percentages show how often the forecast put it in each category.")} {v.note}</p>
            </TabsContent>

            <TabsContent value="live" className="mt-4 space-y-3">
              {ver.bad && <p className="text-sm text-muted-foreground">{t("Could not load the live check.")}</p>}
              {ver.v && ver.v.buckets.length > 0 ? (
                <>
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow><TableHead>{t("Lead")}</TableHead><TableHead>{t("Hours scored")}</TableHead><TableHead>AirCouple</TableHead><TableHead>CAMS {t("forecast")}</TableHead><TableHead>{t("No change")}</TableHead><TableHead>{t("Range covered")}</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {ver.v.buckets.map((b) => (
                        <TableRow key={b.lead}>
                          <TableCell className="font-medium">{b.lead}</TableCell><TableCell className="tabular-nums">{b.n}</TableCell>
                          <TableCell className="tabular-nums">{b.ours}</TableCell><TableCell className="tabular-nums">{b.cams}</TableCell>
                          <TableCell className="tabular-nums text-muted-foreground">{b.persistence}</TableCell>
                          <TableCell className="tabular-nums">{b.band_coverage == null ? "—" : `${b.band_coverage}%`}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <p className="text-xs text-muted-foreground">{ver.v.runs} {t("live forecasts scored against what CAMS later reported for the same Delhi stations (error in µg/m³; lower is better).")}</p>
                </>
              ) : (
                ver.v && <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">{ver.v.message ?? t("No data yet.")} {ver.v.logged > 0 && `(${ver.v.logged} ${t("forecasts logged")})`}</p>
              )}
              <CardDescription className="text-[11px]">{t("Every live forecast is saved. Once its hours have passed it is scored against what CAMS reported afterwards, next to the CAMS forecast issued at the same moment: a genuine out-of-sample test.")}</CardDescription>
            </TabsContent>
          </Tabs>
        )}
      </Card>
    </section>
  )
}
