import { useEffect, useState } from "react"
import { Nav } from "./components/Nav"
import { Hero } from "./components/Hero"
import { AppWindow } from "./components/AppWindow"
import { FeaturesSection, BenchmarkSection, Footer } from "./components/Sections"
import { WorkOrderModal } from "./components/WorkOrderModal"

import {
  fetchFleetOverview,
  fetchDigitalTwin,
  fetchPrediction,
  fetchLogisticsHub
} from "./lib/api"
import type {
  FleetSummary,
  AircraftSummary,
  AOGHazardAlert,
  DigitalTwinResponse,
  PredictionDossier,
  SparesItem,
  WorkOrder
} from "./lib/types"

export function App() {
  const [activeTab, setActiveTab] = useState<string>("fleet")
  const [selectedTail, setSelectedTail] = useState<string>("SB-021")

  // Fleet & Logistics State
  const [fleetSummary, setFleetSummary] = useState<FleetSummary | null>(null)
  const [aircraftList, setAircraftList] = useState<AircraftSummary[]>([])
  const [aogHazards, setAogHazards] = useState<AOGHazardAlert[]>([])
  const [spares, setSpares] = useState<SparesItem[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])

  // Detailed Aircraft Inspection State
  const [digitalTwinData, setDigitalTwinData] = useState<DigitalTwinResponse | null>(null)
  const [predictionDossier, setPredictionDossier] = useState<PredictionDossier | null>(null)

  // Work Order Requisition Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTail, setModalTail] = useState("SB-021")
  const [modalPart, setModalPart] = useState("NSN-2840-01-AL31-HPC3")

  // Initial Data Fetch
  useEffect(() => {
    loadFleetData()
    loadLogisticsData()
  }, [])

  // Refetch aircraft twin and prediction whenever selectedTail changes
  useEffect(() => {
    if (!selectedTail) return
    fetchDigitalTwin(selectedTail).then(setDigitalTwinData).catch(console.error)
    fetchPrediction(selectedTail).then(setPredictionDossier).catch(console.error)
  }, [selectedTail])

  const loadFleetData = async () => {
    try {
      const data = await fetchFleetOverview()
      setFleetSummary(data.summary)
      setAircraftList(data.aircraft)
      setAogHazards(data.aog_hazards)
      if (data.aircraft.length > 0 && !selectedTail) {
        setSelectedTail(data.aircraft[0].tail_number)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const loadLogisticsData = async () => {
    try {
      const data = await fetchLogisticsHub()
      setSpares(data.spares_catalog)
      setWorkOrders(data.active_work_orders)
    } catch (err) {
      console.error(err)
    }
  }

  const scrollToConsole = () => {
    const el = document.getElementById("console")
    if (el) {
      el.scrollIntoView({ behavior: "smooth" })
    }
  }

  const handleSelectNavTab = (tab: string) => {
    setActiveTab(tab)
    scrollToConsole()
  }

  const handleOpenOrderModal = (tail: string, partCode: string) => {
    setModalTail(tail)
    setModalPart(partCode)
    setModalOpen(true)
  }

  const handleOrderSuccess = (newOrder: WorkOrder) => {
    setWorkOrders((prev) => [newOrder, ...prev])
    loadFleetData()
  }

  return (
    <div className="min-h-screen bg-white text-[#191919] font-sans antialiased selection:bg-[#cce3f9]">
      {/* 1. Notion-style Top Header */}
      <Nav onOpenApp={scrollToConsole} onSelectTab={handleSelectNavTab} />

      {/* 2. Notion-style Hero Banner */}
      <Hero
        onOpenApp={scrollToConsole}
        onOpenWhatIf={() => {
          setActiveTab("benchmarks")
          scrollToConsole()
        }}
      />

      {/* 3. The Interactive Desktop App Window */}
      <div className="px-4 sm:px-6 pb-24">
        <AppWindow
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedTail={selectedTail}
          setSelectedTail={setSelectedTail}
          fleetSummary={fleetSummary}
          aircraftList={aircraftList}
          aogHazards={aogHazards}
          spares={spares}
          workOrders={workOrders}
          digitalTwinData={digitalTwinData}
          predictionDossier={predictionDossier}
          onOpenOrderModal={handleOpenOrderModal}
        />
      </div>

      {/* 4. Notion-style Features & Benchmark Sections */}
      <FeaturesSection />
      <BenchmarkSection />

      {/* 5. Footer */}
      <Footer />

      {/* Work Order Modal */}
      <WorkOrderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        tailNumber={modalTail}
        partCode={modalPart}
        sparesList={spares}
        onOrderSuccess={handleOrderSuccess}
      />
    </div>
  )
}

export default App
