import { lazy, Suspense } from "react"
import { Globe, Gauge, Plane, Layers, Package, Crosshair, Bot, Wrench } from "lucide-react"

// Each workspace tab pulls in heavy dependencies (three.js, recharts, maplibre),
// so they are split into their own chunks and fetched on first visit.
const FleetCommand = lazy(() => import("./FleetCommand").then((m) => ({ default: m.FleetCommand })))
const DigitalTwin3D = lazy(() => import("./DigitalTwin3D").then((m) => ({ default: m.DigitalTwin3D })))
const PredictiveAnalytics = lazy(() => import("./PredictiveAnalytics").then((m) => ({ default: m.PredictiveAnalytics })))
const LogisticsHub = lazy(() => import("./LogisticsHub").then((m) => ({ default: m.LogisticsHub })))
const MissionDispatcher = lazy(() => import("./MissionDispatcher").then((m) => ({ default: m.MissionDispatcher })))
const RakshaMitraAssistant = lazy(() => import("./RakshaMitraAssistant").then((m) => ({ default: m.RakshaMitraAssistant })))
const ValidationBenchmarks = lazy(() => import("./ValidationBenchmarks").then((m) => ({ default: m.ValidationBenchmarks })))

import type {
  FleetSummary,
  AircraftSummary,
  AOGHazardAlert,
  DigitalTwinResponse,
  PredictionDossier,
  SparesItem,
  WorkOrder
} from "../lib/types"

interface Props {
  activeTab: string
  setActiveTab: (tab: string) => void
  selectedTail: string
  setSelectedTail: (tail: string) => void
  fleetSummary: FleetSummary | null
  aircraftList: AircraftSummary[]
  aogHazards: AOGHazardAlert[]
  spares: SparesItem[]
  workOrders: WorkOrder[]
  digitalTwinData: DigitalTwinResponse | null
  predictionDossier: PredictionDossier | null
  onOpenOrderModal: (tail: string, partCode: string) => void
}

function WorkspaceFallback() {
  return (
    <div className="flex min-h-[640px] flex-col items-center justify-center gap-3 text-sm text-[#787774]">
      <span className="size-2.5 rounded-full bg-[#0075de] animate-pulse" />
      <span>Loading module…</span>
    </div>
  )
}

export function AppWindow({
  activeTab,
  setActiveTab,
  selectedTail,
  setSelectedTail,
  fleetSummary,
  aircraftList,
  aogHazards,
  spares,
  workOrders,
  digitalTwinData,
  predictionDossier,
  onOpenOrderModal
}: Props) {
  const tabs = [
    { id: "fleet", label: "Fleet Command", icon: Gauge },
    { id: "twin", label: "3D Digital Twin", icon: Plane },
    { id: "predictive", label: "Predictive AI (RUL)", icon: Layers },
    { id: "logistics", label: "Depot & Spares", icon: Package },
    { id: "dispatch", label: "Mission Dispatch", icon: Crosshair },
    { id: "assistant", label: "Raksha-Mitra", icon: Bot },
    { id: "benchmarks", label: "Validation & What-If", icon: Wrench }
  ]

  const handleSelectAircraft = (tail: string, targetTab?: string) => {
    setSelectedTail(tail)
    if (targetTab) {
      setActiveTab(targetTab)
    }
  }

  return (
    <div id="console" className="window-shadow mx-auto max-w-[1280px] overflow-hidden rounded-2xl border border-[#e9e9e7] bg-white text-[#191919]">
      {/* 1. macOS Window Chrome */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e9e9e7] bg-[#fbfbfa] px-6 py-4">
        {/* Window control dots */}
        <div className="flex items-center gap-2.5">
          <span className="size-3.5 rounded-full bg-[#ff5f56] inline-block border border-[#e0443e]" />
          <span className="size-3.5 rounded-full bg-[#ffbd2e] inline-block border border-[#dea123]" />
          <span className="size-3.5 rounded-full bg-[#27c93f] inline-block border border-[#1aab29]" />
          <span className="text-sm font-medium text-[#787774] ml-3">VayuRakshak Air Power Console</span>
        </div>

        {/* Center Mock URL Pill */}
        <div className="hidden sm:flex items-center gap-2 rounded-lg border border-[#e9e9e7] bg-white px-4 py-1.5 text-sm text-[#787774] shadow-xs">
          <Globe className="size-4 text-[#0075de]" />
          <span className="font-mono text-[#37352f]">defense.iaf.gov.in/console/{activeTab}</span>
        </div>

        {/* Right Status Badge */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 font-medium text-[#37352f]">
            <span className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>MC Rate: <strong className="text-[#0075de]">{fleetSummary?.mc_rate_pct ?? 70}%</strong></span>
          </div>
          <span className="text-[#e9e9e7]">|</span>
          <span className="text-sm font-semibold text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
            {fleetSummary?.aog_count ?? 0} AOG Grounded
          </span>
        </div>
      </div>

      {/* 2. Inner Tab Navigation Strip */}
      <div className="flex items-center gap-1.5 border-b border-[#e9e9e7] bg-white px-6 py-2.5 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                isActive
                  ? "bg-[#0075de] text-white shadow-xs font-semibold"
                  : "text-[#787774] hover:text-[#191919] hover:bg-[#f1f1ef]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* 3. Window Content Workspace */}
      <div className="p-6 sm:p-8 bg-[#fbfbfa] min-h-[700px]">
        <Suspense fallback={<WorkspaceFallback />}>
          {activeTab === "fleet" && (
            <FleetCommand
              summary={fleetSummary}
              aircraftList={aircraftList}
              aogHazards={aogHazards}
              onSelectAircraft={handleSelectAircraft}
              onOpenOrderModal={onOpenOrderModal}
            />
          )}

          {activeTab === "twin" && (
            <DigitalTwin3D
              data={digitalTwinData}
              tailNumber={selectedTail}
              onOpenOrderModal={onOpenOrderModal}
            />
          )}

          {activeTab === "predictive" && (
            <PredictiveAnalytics
              dossier={predictionDossier}
              aircraftList={aircraftList}
              selectedTail={selectedTail}
              onSelectTail={setSelectedTail}
              onOpenOrderModal={onOpenOrderModal}
            />
          )}

          {activeTab === "logistics" && (
            <LogisticsHub
              spares={spares}
              workOrders={workOrders}
              aogHazards={aogHazards}
              aircraftList={aircraftList}
              onOpenOrderModal={onOpenOrderModal}
            />
          )}

          {activeTab === "dispatch" && (
            <MissionDispatcher onSelectAircraft={handleSelectAircraft} />
          )}

          {activeTab === "assistant" && <RakshaMitraAssistant />}

          {activeTab === "benchmarks" && (
            <ValidationBenchmarks aircraftList={aircraftList} />
          )}
        </Suspense>
      </div>
    </div>
  )
}
