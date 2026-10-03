import { Download, Globe, Home, MapPin, Pause, Play, RefreshCw, WifiOff } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import MapView, { type Basemap, type Layers, type Region } from "@/components/MapView"
import BriefingCard from "@/components/Briefing"
import { AdvisoryCard, AttributionCard, WhatIfCard } from "@/components/Extras"
import { DriversCard, GrapCard, OzoneCard, SourceCard } from "@/components/Modules"
import { AqiCard, FeedbackCard, ForecastChart, InversionCard, PlumeCard } from "@/components/Panels"
import { CATS, TONE, aqiColor, fmtTime } from "@/lib/aqi"
import { useT } from "@/lib/i18n"
import type { Forecast, WhatIfParams } from "@/lib/types"
import { cn } from "@/lib/utils"

const SEL = "aria-pressed:bg-primary aria-pressed:text-primary-foreground data-pressed:bg-primary data-pressed:text-primary-foreground"

export interface WindowProps {
  scenario: "live" | "peak"; setScenario: (s: "live" | "peak") => void
  data: Forecast | null; err: string | null; loading: boolean; refresh: () => void
  hour: number; setHour: (h: number) => void; playing: boolean; setPlaying: (f: (p: boolean) => boolean) => void
  basemap: Basemap; setBasemap: (b: Basemap) => void; region: Region; setRegion: (r: Region) => void
  layers: Layers; setLayers: (f: (l: Layers) => Layers) => void
  selected: string | null; pick: (n: string | null) => void
  params: WhatIfParams; setParams: (p: WhatIfParams) => void; runParams: () => void; resetParams: () => void; running: boolean
}

function Sidebar({ d, hour, selected, pick }: { d: Forecast; hour: number; selected: string | null; pick: (n: string | null) => void }) {
  const { t } = useT()
  const Row = ({ name, aqi, active, onClick }: { name: string; aqi: number; active: boolean; onClick: () => void }) => (
    <Button variant="ghost" onClick={onClick} className={cn("h-8 w-full justify-start gap-2 px-2 font-normal", active && "bg-secondary font-medium")}>
      <span className="size-2 shrink-0 rounded-full" style={{ background: aqiColor(aqi) }} />
      <span className="truncate">{name}</span>
      <span className="ml-auto text-xs tabular-nums text-muted-foreground">{Math.round(aqi)}</span>
    </Button>
  )
  const group = (title: string, list: typeof d.stations) => (
    <div className="space-y-0.5">
      <div className="px-2 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t(title)}</div>
      {list.map((s) => <Row key={s.name} name={s.name} aqi={s.aqi[hour]} active={selected === s.name} onClick={() => pick(s.name)} />)}
    </div>
  )
  return (
    <aside className="hidden w-[210px] shrink-0 flex-col border-r bg-sidebar xl:flex">
      <div className="space-y-0.5 p-2 pt-3">
        <Button variant="ghost" onClick={() => pick(null)} className={cn("h-8 w-full justify-start gap-2 px-2", selected === null && "bg-secondary font-medium")}>
          <Home className="size-4 text-muted-foreground" />{t("Delhi NCR")}
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">{Math.round(d.delhi.aqi[hour])}</span>
        </Button>
      </div>
      <Separator />
      <ScrollArea className="h-[640px] px-2 pb-3">
        {group("Delhi", d.stations.filter((s) => s.delhi))}
        {group("NCR", d.stations.filter((s) => !s.delhi))}
      </ScrollArea>
    </aside>
  )
}

export default function AppWindow(p: WindowProps) {
  const { t } = useT()
  const { data, hour } = p
  return (
    <div className="window-shadow overflow-hidden rounded-2xl border bg-background">
      {/* window chrome */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-muted/70 px-3 py-2">
        <div className="hidden gap-1.5 sm:flex"><span className="size-3 rounded-full bg-[#d8d6d2]" /><span className="size-3 rounded-full bg-[#d8d6d2]" /><span className="size-3 rounded-full bg-[#d8d6d2]" /></div>
        <div className="flex items-center gap-1.5 rounded-md bg-background px-2.5 py-1 text-xs font-medium shadow-sm">
          <Globe className="size-3.5 text-muted-foreground" />{t("Delhi NCR HQ")}
        </div>
        <Tabs value={p.scenario} onValueChange={(v) => p.setScenario(v as "live" | "peak")}>
          <TabsList className="h-8">
            <TabsTrigger value="live">{t("Live")}</TabsTrigger>
            <TabsTrigger value="peak">{t("Stubble-season what-if")}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="ml-auto flex items-center gap-2">
          {data && (
            <Badge className={cn("hidden h-6 px-2.5 sm:inline-flex", data.scenario === "peak" ? TONE.orange : TONE.green)}>
              {data.scenario === "peak" ? t("Scenario · synthetic fires") : t("Live data")}
            </Badge>
          )}
          {data?.offline && <Badge className={cn("h-6 px-2.5", TONE.yellow)}><WifiOff />{t("offline cache")}</Badge>}
          <Button variant="outline" size="sm" nativeButton={false} render={<a href={`/api/export.csv?scenario=${p.scenario}`} download />}>
            <Download />{t("CSV")}
          </Button>
          <Button variant="outline" size="sm" disabled={p.loading} onClick={p.refresh}>
            <RefreshCw className={cn(p.loading && "animate-spin")} />{t("Refresh")}
          </Button>
        </div>
      </div>

      {p.err && <div className="border-b bg-destructive/10 px-4 py-2 text-sm text-destructive">{t("Could not load forecast")}: {p.err}. {t("Is the backend running on :8000?")}</div>}
      {data && (
        <div className="border-b bg-background px-4 py-1.5 text-[11px] text-muted-foreground">
          {t(data.scenario_label)}
          <span className="float-right">{t("Updated")} {fmtTime(data.generated, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })} IST</span>
        </div>
      )}

      <div className="flex">
        {data && <Sidebar d={data} hour={hour} selected={p.selected} pick={p.pick} />}
        <div className="min-w-0 flex-1 bg-muted/40 p-3 sm:p-4">
          {!data ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_370px]"><Skeleton className="h-[640px]" /><Skeleton className="h-[640px]" /></div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_370px]">
              <div className="min-w-0 space-y-4">
                <Card className="relative h-[52vh] min-h-[380px] overflow-hidden p-0 lg:h-[540px]">
                  <MapView data={data} hour={hour} basemap={p.basemap} region={p.region} layers={p.layers} selected={p.selected} onSelect={p.pick} />
                  <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-wrap items-start justify-between gap-2">
                    <div className="pointer-events-auto flex flex-wrap gap-2">
                      <ToggleGroup variant="outline" size="sm" spacing={0} value={[p.region]} className="bg-background shadow-sm"
                        onValueChange={(v) => v[0] && p.setRegion(v[0] as Region)}>
                        <ToggleGroupItem value="ncr" className={SEL}>{t("Delhi NCR")}</ToggleGroupItem>
                        <ToggleGroupItem value="belt" className={SEL}>{t("Stubble belt")}</ToggleGroupItem>
                      </ToggleGroup>
                      <ToggleGroup variant="outline" size="sm" spacing={0} value={[p.basemap]} className="bg-background shadow-sm"
                        onValueChange={(v) => v[0] && p.setBasemap(v[0] as Basemap)}>
                        <ToggleGroupItem value="light" className={SEL}>{t("Light")}</ToggleGroupItem>
                        <ToggleGroupItem value="osm" className={SEL}>OpenStreetMap</ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                    <Card className="pointer-events-auto flex-row flex-wrap items-center gap-3 rounded-lg px-2.5 py-1.5 text-xs shadow-sm">
                      {(["grid", "fires", "plume", "source"] as const).map((k) => (
                        <label key={k} className="flex cursor-pointer items-center gap-1.5">
                          <Switch size="sm" checked={p.layers[k]} onCheckedChange={(v) => p.setLayers((l) => ({ ...l, [k]: v }))} />
                          {t(k === "grid" ? "AQI" : k === "fires" ? "Fires" : k === "plume" ? "Plume" : "Source")}
                        </label>
                      ))}
                    </Card>
                  </div>
                  <Card className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg px-2 py-1.5 shadow-sm">
                    <div className="flex gap-1">
                      {CATS.map((c) => (
                        <div key={c.name} className="flex flex-col items-center gap-0.5">
                          <span className="h-2 w-9 rounded-sm" style={{ background: c.color }} />
                          <span className="text-[9px] text-muted-foreground">{t(c.name)}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </Card>

                <Card className="p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <Button size="icon" onClick={() => p.setPlaying((x) => !x)} aria-label="play">{p.playing ? <Pause /> : <Play />}</Button>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{fmtTime(data.times[hour])} IST</div>
                      <div className="text-xs text-muted-foreground">{hour === 0 ? t("Now (analysis)") : `+${hour} h ${t("forecast")}`}</div>
                    </div>
                    {p.selected && (
                      <Button variant="secondary" size="sm" className={cn("ml-auto", TONE.blue)} onClick={() => p.pick(null)}>
                        <MapPin />{p.selected} ✕
                      </Button>
                    )}
                  </div>
                  <Slider value={[hour]} min={0} max={72} step={1} onValueChange={(v) => p.setHour(Array.isArray(v) ? v[0] : v)} />
                  <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                    {[0, 24, 48, 72].map((h) => <span key={h}>+{h}h</span>)}
                  </div>
                </Card>
                <ForecastChart d={data} hour={hour} name={p.selected} />
              </div>

              <div className="space-y-4">
                {p.scenario === "peak" && <WhatIfCard params={p.params} setParams={p.setParams} run={p.runParams} reset={p.resetParams} running={p.running} />}
                <Tabs defaultValue="air">
                  <TabsList className="grid h-9 w-full grid-cols-4">
                    <TabsTrigger value="air">{t("Air")}</TabsTrigger>
                    <TabsTrigger value="weather">{t("Weather")}</TabsTrigger>
                    <TabsTrigger value="smoke">{t("Smoke")}</TabsTrigger>
                    <TabsTrigger value="why">{t("Why")}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="air" className="mt-4 space-y-4">
                    <AqiCard d={data} hour={hour} name={p.selected} onPick={p.setHour} />
                    <BriefingCard d={data} />
                    <GrapCard d={data} hour={hour} />
                    <AdvisoryCard d={data} hour={hour} />
                  </TabsContent>
                  <TabsContent value="weather" className="mt-4 space-y-4">
                    <InversionCard d={data} hour={hour} onPick={p.setHour} />
                    <FeedbackCard d={data} hour={hour} />
                    <OzoneCard d={data} hour={hour} />
                  </TabsContent>
                  <TabsContent value="smoke" className="mt-4 space-y-4">
                    <PlumeCard d={data} />
                    <SourceCard d={data} hour={hour} shown={p.layers.source} onShow={() => p.setLayers((l) => ({ ...l, source: true }))} />
                  </TabsContent>
                  <TabsContent value="why" className="mt-4 space-y-4">
                    <AttributionCard d={data} />
                    <DriversCard d={data} hour={hour} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
