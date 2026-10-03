import { useEffect, useRef, useState } from "react"
import * as maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import type { Forecast } from "@/lib/types"
import { CATS, aqiColor } from "@/lib/aqi"

// worker + its shared chunk are copied unhashed into /public/maplibre (Vite hashing breaks the relative import)
maplibregl.setWorkerUrl(`${location.origin}/maplibre/maplibre-gl-worker.mjs`)

export type Basemap = "light" | "osm"
export type Region = "ncr" | "belt"
export interface Layers { grid: boolean; fires: boolean; plume: boolean; source: boolean }

const VIEWS: Record<Region, { center: [number, number]; zoom: number }> = {
  ncr: { center: [77.2, 28.62], zoom: 8.9 },
  belt: { center: [76.3, 29.9], zoom: 6.2 },
}

const gridExpr: any = ["step", ["get", "aqi"], CATS[0].color,
  50.5, CATS[1].color, 100.5, CATS[2].color, 200.5, CATS[3].color, 300.5, CATS[4].color, 400.5, CATS[5].color]

function gridGeo(d: Forecast, hour: number) {
  const { lats, lons, step, aqi } = d.grid
  const h = step / 2, feats: any[] = []
  let c = 0
  for (const la of lats) for (const lo of lons) {
    feats.push({ type: "Feature", properties: { aqi: aqi[hour][c++] },
      geometry: { type: "Polygon", coordinates: [[[lo - h, la - h], [lo + h, la - h], [lo + h, la + h], [lo - h, la + h], [lo - h, la - h]]] } })
  }
  return { type: "FeatureCollection", features: feats } as any
}

export default function MapView({ data, hour, basemap, region, layers, selected, onSelect }: {
  data: Forecast; hour: number; basemap: Basemap; region: Region; layers: Layers
  selected: string | null; onSelect: (n: string | null) => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef<Record<string, { holder: HTMLDivElement; dot: HTMLDivElement }>>({})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const m = new maplibregl.Map({
      container: box.current!, center: VIEWS.ncr.center, zoom: VIEWS.ncr.zoom, attributionControl: { compact: true },
      style: {
        version: 8,
        sources: {
          osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, maxzoom: 19,
            attribution: "© OpenStreetMap contributors" },
        },
        layers: [{ id: "osm", type: "raster", source: "osm", paint: { "raster-saturation": -0.85, "raster-brightness-min": 0.35, "raster-contrast": -0.15 } }],
      },
    })
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right")
    m.on("load", () => {
      m.addSource("grid", { type: "geojson", data: { type: "FeatureCollection", features: [] } })
      m.addLayer({ id: "grid", type: "fill", source: "grid", paint: { "fill-color": gridExpr, "fill-opacity": 0.5, "fill-antialias": false } })
      m.addSource("fires", { type: "geojson", data: { type: "FeatureCollection", features: [] } })
      m.addLayer({ id: "fires", type: "circle", source: "fires", paint: {
        "circle-color": "#ff5a1f", "circle-opacity": 0.85, "circle-stroke-color": "#fff", "circle-stroke-width": 0.6,
        "circle-radius": ["interpolate", ["linear"], ["get", "frp"], 0, 2.5, 50, 6, 200, 10] } })
      m.addSource("plume", { type: "geojson", data: { type: "FeatureCollection", features: [] } })
      m.addLayer({ id: "plume", type: "circle", source: "plume", paint: {
        "circle-color": ["interpolate", ["linear"], ["get", "age"], 0, "#e5432d", 24, "#8c1d40", 60, "#5b3a8c"],
        "circle-radius": 3.2, "circle-opacity": 0.55, "circle-blur": 0.4 } })
      m.addSource("back", { type: "geojson", data: { type: "FeatureCollection", features: [] } })
      m.addLayer({ id: "back", type: "line", source: "back", layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#534ab7", "line-width": 1.8, "line-opacity": 0.5 } })
      m.addLayer({ id: "back-end", type: "circle", source: "back", filter: ["==", ["get", "kind"], "end"],
        paint: { "circle-color": "#534ab7", "circle-radius": 2.6, "circle-opacity": 0.8 } })
      setReady(true)
    })
    map.current = m
    return () => { m.remove(); map.current = null }
  }, [])

  // basemap + layer visibility
  useEffect(() => {
    const m = map.current; if (!m || !ready) return
    const light = basemap === "light"   // both are OpenStreetMap data; "light" is a muted rendering
    m.setPaintProperty("osm", "raster-saturation", light ? -0.85 : 0)
    m.setPaintProperty("osm", "raster-brightness-min", light ? 0.35 : 0)
    m.setPaintProperty("osm", "raster-contrast", light ? -0.15 : 0)
    m.setLayoutProperty("grid", "visibility", layers.grid ? "visible" : "none")
    m.setLayoutProperty("fires", "visibility", layers.fires ? "visible" : "none")
    m.setLayoutProperty("plume", "visibility", layers.plume ? "visible" : "none")
    m.setLayoutProperty("back", "visibility", layers.source ? "visible" : "none")
    m.setLayoutProperty("back-end", "visibility", layers.source ? "visible" : "none")
  }, [basemap, layers, ready])

  useEffect(() => { map.current?.flyTo({ ...VIEWS[region], duration: 900 }) }, [region])

  // static: fires
  useEffect(() => {
    const m = map.current; if (!m || !ready) return
    ;(m.getSource("fires") as maplibregl.GeoJSONSource).setData({ type: "FeatureCollection",
      features: data.plume.fires.map(([lo, la, frp]) => ({ type: "Feature", properties: { frp }, geometry: { type: "Point", coordinates: [lo, la] } })) } as any)
  }, [data, ready])

  // per-hour: grid + plume
  useEffect(() => {
    const m = map.current; if (!m || !ready) return
    ;(m.getSource("grid") as maplibregl.GeoJSONSource).setData(gridGeo(data, hour))
    const fr = data.plume.frames[hour] ?? []
    const feats = []
    for (let i = 0; i + 2 < fr.length; i += 3)
      feats.push({ type: "Feature", properties: { age: fr[i + 2] }, geometry: { type: "Point", coordinates: [fr[i], fr[i + 1]] } })
    ;(m.getSource("plume") as maplibregl.GeoJSONSource).setData({ type: "FeatureCollection", features: feats } as any)
  }, [data, hour, ready])

  // source region: back-trajectories for the arrival bucket nearest the chosen hour
  useEffect(() => {
    const m = map.current; if (!m || !ready || !data.back) return
    const a = data.back.arrivals[Math.min(Math.round(hour / 6), data.back.arrivals.length - 1)]
    const feats: any[] = []
    for (const path of a.paths) {
      feats.push({ type: "Feature", properties: { kind: "path" }, geometry: { type: "LineString", coordinates: path } })
      feats.push({ type: "Feature", properties: { kind: "end" }, geometry: { type: "Point", coordinates: path[path.length - 1] } })
    }
    ;(m.getSource("back") as maplibregl.GeoJSONSource).setData({ type: "FeatureCollection", features: feats } as any)
  }, [data, hour, ready])

  // station markers
  useEffect(() => {
    const m = map.current; if (!m || !ready) return
    for (const s of data.stations) {
      let mk = markers.current[s.name]
      if (!mk) {
        // MapLibre positions the outer element with its own `transform`, so never touch that one:
        // all styling (including the selected-state scale) goes on an inner dot.
        const holder = document.createElement("div")
        holder.style.cssText = "width:30px;height:30px;cursor:pointer"
        const dot = document.createElement("div")
        dot.style.cssText = "width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font:600 11px Inter,sans-serif;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);box-sizing:border-box;transition:transform .15s"
        holder.title = s.name
        holder.onclick = (e) => { e.stopPropagation(); onSelect(s.name) }
        holder.appendChild(dot)
        new maplibregl.Marker({ element: holder }).setLngLat([s.lon, s.lat]).addTo(m)
        mk = markers.current[s.name] = { holder, dot }
      }
      const v = Math.round(s.aqi[hour])
      const on = selected === s.name
      mk.holder.style.display = region === "belt" ? "none" : "block"
      mk.holder.style.zIndex = on ? "5" : "1"
      mk.dot.textContent = String(v)
      mk.dot.style.background = aqiColor(v)
      mk.dot.style.transform = on ? "scale(1.3)" : "scale(1)"
    }
  }, [data, hour, selected, ready, onSelect, region])

  return <div ref={box} className="h-full w-full" />
}
