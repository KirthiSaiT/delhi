import React, { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import type { DigitalTwinResponse, Subsystem3D } from "../lib/types"
import { AlertTriangle, CheckCircle2, Flame, Gauge, Info, Layers, RefreshCw, ShieldAlert, Zap } from "lucide-react"

interface Props {
  data: DigitalTwinResponse | null
  tailNumber: string
  onSelectSubsystem?: (name: string) => void
  onOpenOrderModal?: (tail: string, partCode: string) => void
}

export const DigitalTwin3D: React.FC<Props> = ({ data, tailNumber, onOpenOrderModal }) => {
  const mountRef = useRef<HTMLDivElement>(null)
  const [explodedView, setExplodedView] = useState(false)
  const [heatmapMode, setHeatmapMode] = useState(false)
  const [selectedKey, setSelectedKey] = useState<string>("turbofan_engine_left")
  const [isRotating, setIsRotating] = useState(true)

  // Three.js object references
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const jetGroupRef = useRef<THREE.Group | null>(null)
  const engineLeftRef = useRef<THREE.Group | null>(null)
  const engineRightRef = useRef<THREE.Group | null>(null)
  const radomeRef = useRef<THREE.Mesh | null>(null)
  const hydraulicsRef = useRef<THREE.Group | null>(null)

  useEffect(() => {
    if (!mountRef.current) return

    const width = mountRef.current.clientWidth
    const height = mountRef.current.clientHeight || 450

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene()
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(0, 4, 11)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    rendererRef.current = renderer
    mountRef.current.replaceChildren(renderer.domElement)

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9)
    scene.add(ambientLight)

    const dirLight1 = new THREE.DirectionalLight(0x0075de, 1.2)
    dirLight1.position.set(5, 10, 5)
    scene.add(dirLight1)

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight2.position.set(-5, -3, -5)
    scene.add(dirLight2)

    // 3. Clean Coordinate Grid
    const grid = new THREE.GridHelper(16, 16, 0x0075de, 0xe2e8f0)
    grid.position.y = -2.2
    scene.add(grid)

    // 4. Construct Fighter Jet
    const jetGroup = new THREE.Group()
    jetGroupRef.current = jetGroup
    scene.add(jetGroup)

    const fuselageMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.8,
      roughness: 0.25
    })

    const canopyMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.5,
      roughness: 0.1,
      metalness: 0.9,
      transmission: 0.8
    })

    const engineMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.85,
      roughness: 0.3
    })

    const exhaustGlowMat = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9
    })

    // Fuselage
    const bodyGeo = new THREE.ConeGeometry(0.9, 6.5, 8)
    bodyGeo.rotateX(Math.PI / 2)
    const body = new THREE.Mesh(bodyGeo, fuselageMat)
    body.position.z = 0.5
    jetGroup.add(body)

    // Radome
    const radomeGeo = new THREE.ConeGeometry(0.45, 2.0, 12)
    radomeGeo.rotateX(Math.PI / 2)
    const radome = new THREE.Mesh(radomeGeo, fuselageMat)
    radome.position.z = 4.2
    radomeRef.current = radome
    jetGroup.add(radome)

    // Canopy
    const canopyGeo = new THREE.SphereGeometry(0.45, 16, 16)
    canopyGeo.scale(0.8, 0.9, 2.2)
    const canopy = new THREE.Mesh(canopyGeo, canopyMat)
    canopy.position.set(0, 0.5, 1.4)
    jetGroup.add(canopy)

    // Wings
    const wingShape = new THREE.Shape()
    wingShape.moveTo(0, 1.5)
    wingShape.lineTo(4.2, -1.8)
    wingShape.lineTo(0.5, -2.4)
    wingShape.lineTo(0, -2.2)
    wingShape.closePath()

    const extrudeSettings = { depth: 0.08, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.03, bevelThickness: 0.03 }
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings)
    wingGeo.rotateX(Math.PI / 2)

    const leftWing = new THREE.Mesh(wingGeo, fuselageMat)
    leftWing.position.set(0.3, 0.0, 0)
    jetGroup.add(leftWing)

    const rightWingGeo = wingGeo.clone()
    rightWingGeo.scale(-1, 1, 1)
    const rightWing = new THREE.Mesh(rightWingGeo, fuselageMat)
    rightWing.position.set(-0.3, 0.0, 0)
    jetGroup.add(rightWing)

    // Vertical Fins
    const finShape = new THREE.Shape()
    finShape.moveTo(0, 0)
    finShape.lineTo(0.4, 1.6)
    finShape.lineTo(1.2, 1.6)
    finShape.lineTo(1.5, 0)
    finShape.closePath()
    const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.05, bevelEnabled: false })

    const leftFin = new THREE.Mesh(finGeo, fuselageMat)
    leftFin.position.set(0.9, 0.2, -2.5)
    leftFin.rotation.z = -0.15
    jetGroup.add(leftFin)

    const rightFin = new THREE.Mesh(finGeo, fuselageMat)
    rightFin.position.set(-0.9, 0.2, -2.5)
    rightFin.rotation.z = 0.15
    jetGroup.add(rightFin)

    // Engines
    const engineLeftGroup = new THREE.Group()
    const nacelleGeo = new THREE.CylinderGeometry(0.45, 0.48, 3.8, 16)
    nacelleGeo.rotateX(Math.PI / 2)
    const nacelleLeft = new THREE.Mesh(nacelleGeo, engineMat)
    engineLeftGroup.add(nacelleLeft)

    const nozzleGeo = new THREE.CylinderGeometry(0.38, 0.44, 0.6, 16, 1, true)
    nozzleGeo.rotateX(Math.PI / 2)
    const nozzleLeft = new THREE.Mesh(nozzleGeo, exhaustGlowMat)
    nozzleLeft.position.z = -2.1
    engineLeftGroup.add(nozzleLeft)

    engineLeftGroup.position.set(-0.95, -0.2, -1.2)
    engineLeftRef.current = engineLeftGroup
    jetGroup.add(engineLeftGroup)

    const engineRightGroup = new THREE.Group()
    const nacelleRight = new THREE.Mesh(nacelleGeo, engineMat)
    engineRightGroup.add(nacelleRight)

    const nozzleRight = new THREE.Mesh(nozzleGeo, exhaustGlowMat)
    nozzleRight.position.z = -2.1
    engineRightGroup.add(nozzleRight)

    engineRightGroup.position.set(0.95, -0.2, -1.2)
    engineRightRef.current = engineRightGroup
    jetGroup.add(engineRightGroup)

    // Hydraulics
    const hydGroup = new THREE.Group()
    const hydGeo = new THREE.BoxGeometry(0.7, 0.35, 1.8)
    const hydMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.7, roughness: 0.3 })
    const hydBox = new THREE.Mesh(hydGeo, hydMat)
    hydGroup.add(hydBox)
    hydGroup.position.set(0, -0.4, -0.2)
    hydraulicsRef.current = hydGroup
    jetGroup.add(hydGroup)

    // Drag Rotation
    let isDragging = false
    let prevMousePos = { x: 0, y: 0 }

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true
      prevMousePos = { x: e.clientX, y: e.clientY }
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const deltaX = e.clientX - prevMousePos.x
      const deltaY = e.clientY - prevMousePos.y
      jetGroup.rotation.y += deltaX * 0.008
      jetGroup.rotation.x += deltaY * 0.008
      prevMousePos = { x: e.clientX, y: e.clientY }
    }
    const onMouseUp = () => (isDragging = false)

    const dom = renderer.domElement
    dom.addEventListener("mousedown", onMouseDown)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)

    // Loop
    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      if (isRotating && !isDragging) {
        jetGroup.rotation.y += 0.004
      }

      const targetEngZ = explodedView ? -2.8 : -1.2
      const targetEngXLeft = explodedView ? -1.8 : -0.95
      const targetEngXRight = explodedView ? 1.8 : 0.95
      const targetRadZ = explodedView ? 5.6 : 4.2
      const targetHydY = explodedView ? -1.4 : -0.4

      if (engineLeftRef.current) {
        engineLeftRef.current.position.z += (targetEngZ - engineLeftRef.current.position.z) * 0.1
        engineLeftRef.current.position.x += (targetEngXLeft - engineLeftRef.current.position.x) * 0.1
      }
      if (engineRightRef.current) {
        engineRightRef.current.position.z += (targetEngZ - engineRightRef.current.position.z) * 0.1
        engineRightRef.current.position.x += (targetEngXRight - engineRightRef.current.position.x) * 0.1
      }
      if (radomeRef.current) {
        radomeRef.current.position.z += (targetRadZ - radomeRef.current.position.z) * 0.1
      }
      if (hydraulicsRef.current) {
        hydraulicsRef.current.position.y += (targetHydY - hydraulicsRef.current.position.y) * 0.1
      }

      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      if (!mountRef.current) return
      const w = mountRef.current.clientWidth
      const h = mountRef.current.clientHeight || 450
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener("resize", handleResize)

    return () => {
      cancelAnimationFrame(animId)
      dom.removeEventListener("mousedown", onMouseDown)
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
      window.removeEventListener("resize", handleResize)
      renderer.dispose()
    }
  }, [isRotating])

  // Heatmap mode toggle
  useEffect(() => {
    if (!engineLeftRef.current || !engineRightRef.current) return
    const leftMeshes = engineLeftRef.current.children as THREE.Mesh[]
    const rightMeshes = engineRightRef.current.children as THREE.Mesh[]

    if (heatmapMode) {
      leftMeshes.forEach((m) => {
        if (m.material) {
          ;(m.material as THREE.MeshStandardMaterial).color.setHex(0xe11d48)
        }
      })
      rightMeshes.forEach((m) => {
        if (m.material) {
          ;(m.material as THREE.MeshStandardMaterial).color.setHex(0xd97706)
        }
      })
    } else {
      leftMeshes.forEach((m) => {
        if (m.material) {
          ;(m.material as THREE.MeshStandardMaterial).color.setHex(0x475569)
        }
      })
      rightMeshes.forEach((m) => {
        if (m.material) {
          ;(m.material as THREE.MeshStandardMaterial).color.setHex(0x475569)
        }
      })
    }
  }, [heatmapMode])

  const subsystems = data?.subsystems
  const currentSub: Subsystem3D | undefined = subsystems ? (subsystems as any)[selectedKey] : undefined

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 3D Canvas Box */}
      <div className="lg:col-span-8 notion-card p-5 flex flex-col justify-between min-h-[650px]">
        {/* Canvas Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f1f1ef] pb-3">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#0075de] animate-pulse"></span>
            <span className="text-sm font-bold text-[#191919]">
              3D Digital Twin — Su-30MKI Super Flanker ({tailNumber})
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => setExplodedView(!explodedView)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all flex items-center gap-1.5 ${
                explodedView
                  ? "bg-[#e8f3fc] border-[#0075de] text-[#0075de] font-semibold"
                  : "bg-white border-[#e9e9e7] text-[#37352f] hover:bg-[#f1f1ef]"
              }`}
            >
              <Layers className="w-4 h-4" />
              {explodedView ? "Collapse Airframe" : "Exploded Subsystems"}
            </button>

            <button
              onClick={() => setHeatmapMode(!heatmapMode)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all flex items-center gap-1.5 ${
                heatmapMode
                  ? "bg-rose-50 border-rose-300 text-rose-700 font-semibold"
                  : "bg-white border-[#e9e9e7] text-[#37352f] hover:bg-[#f1f1ef]"
              }`}
            >
              <Flame className="w-4 h-4" />
              {heatmapMode ? "Thermal Heatmap On" : "Heatmap View"}
            </button>

            <button
              onClick={() => setIsRotating(!isRotating)}
              className="p-2 rounded-lg border border-[#e9e9e7] bg-white text-[#787774] hover:text-[#191919]"
              title="Toggle Auto Rotation"
            >
              <RefreshCw className={`w-4 h-4 ${isRotating ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* 3D WebGL Canvas */}
        <div className="relative w-full flex-1 my-3 bg-gradient-to-b from-[#fbfbfa] to-white rounded-xl overflow-hidden border border-[#f1f1ef]">
          <div ref={mountRef} className="w-full h-[550px] cursor-grab active:cursor-grabbing" />

          {/* Floating Pill Readouts */}
          <div className="absolute top-4 left-4 space-y-1.5 text-sm text-[#37352f] bg-white/95 px-3.5 py-2.5 rounded-xl border border-[#e9e9e7] shadow-sm pointer-events-none">
            <div>EGT Shroud: <strong>{data?.last_telemetry.egt_c ?? 712}°C</strong></div>
            <div>Core Vibration: <strong>{data?.last_telemetry.vib_core_rms ?? 1.8} mm/s</strong></div>
            <div>Hyd Pressure: <strong>{data?.last_telemetry.hyd_press_psi ?? 2950} PSI</strong></div>
          </div>

          <div className="absolute bottom-4 right-4 text-xs text-[#787774] bg-white/90 px-3 py-1.5 rounded-md border border-[#e9e9e7] pointer-events-none">
            Drag to Rotate · Scroll to Zoom
          </div>
        </div>

        {/* Subsystem Selector Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-4 border-t border-[#f1f1ef]">
          {[
            { id: "turbofan_engine_left", label: "Port Engine", icon: Zap },
            { id: "turbofan_engine_right", label: "Stbd Engine", icon: Zap },
            { id: "flight_controls_hydraulics", label: "Hydraulics", icon: Gauge },
            { id: "mission_avionics_radar", label: "Bars Radar", icon: Layers },
            { id: "airframe_structure", label: "Airframe", icon: Info }
          ].map((tab) => {
            const Icon = tab.icon
            const isSelected = selectedKey === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedKey(tab.id)}
                className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                  isSelected
                    ? "bg-[#0075de] border-[#0075de] text-white font-semibold shadow-xs"
                    : "bg-[#f1f1ef] border-transparent text-[#37352f] hover:bg-[#e6e6e3]"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right Side: Subsystem Inspector */}
      <div className="lg:col-span-4 notion-card p-6 flex flex-col justify-between bg-white">
        <div>
          <div className="flex items-center justify-between border-b border-[#f1f1ef] pb-3 mb-4">
            <div>
              <span className="text-sm font-medium text-[#787774] uppercase tracking-wide">
                Subsystem Diagnostic
              </span>
              <h3 className="font-bold text-lg text-[#191919] mt-0.5">
                {currentSub?.name ?? "Selected Component"}
              </h3>
            </div>
            <span
              className={`text-sm px-3 py-1 rounded-full font-bold ${
                currentSub?.status === "CRITICAL"
                  ? "bg-rose-100 text-rose-700"
                  : currentSub?.status === "WARNING"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {currentSub?.status ?? "NOMINAL"}
            </span>
          </div>

          {/* Health Gauge */}
          <div className="mb-6 bg-[#fbfbfa] p-4 rounded-xl border border-[#e9e9e7]">
            <div className="flex justify-between items-center mb-2 text-sm">
              <span className="text-[#787774] font-medium">Subsystem Integrity</span>
              <span className="text-[#0075de] font-bold">{currentSub?.health_pct ?? 85}%</span>
            </div>
            <div className="w-full bg-[#f1f1ef] h-3 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (currentSub?.health_pct ?? 85) < 50
                    ? "bg-rose-500"
                    : (currentSub?.health_pct ?? 85) < 75
                    ? "bg-amber-400"
                    : "bg-[#0075de]"
                }`}
                style={{ width: `${currentSub?.health_pct ?? 85}%` }}
              />
            </div>
          </div>

          {/* Telemetry Pills */}
          <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
            {currentSub?.temperature_c !== undefined && (
              <div className="bg-[#fbfbfa] p-3 rounded-lg border border-[#e9e9e7]">
                <span className="text-xs text-[#787774] block">Exhaust EGT</span>
                <span className="text-base font-bold text-[#191919]">{currentSub.temperature_c}°C</span>
              </div>
            )}
            {currentSub?.vibration_rms !== undefined && (
              <div className="bg-[#fbfbfa] p-3 rounded-lg border border-[#e9e9e7]">
                <span className="text-xs text-[#787774] block">Core Vibration</span>
                <span className="text-base font-bold text-[#0075de]">{currentSub.vibration_rms} mm/s</span>
              </div>
            )}
            {currentSub?.pressure_psi !== undefined && (
              <div className="bg-[#fbfbfa] p-3 rounded-lg border border-[#e9e9e7]">
                <span className="text-xs text-[#787774] block">Hyd Pressure</span>
                <span className="text-base font-bold text-sky-600">{currentSub.pressure_psi} PSI</span>
              </div>
            )}
            {currentSub?.bus_error_rate !== undefined && (
              <div className="bg-[#fbfbfa] p-3 rounded-lg border border-[#e9e9e7]">
                <span className="text-xs text-[#787774] block">1553 Bus Errors</span>
                <span className="text-base font-bold text-emerald-600">{currentSub.bus_error_rate} /s</span>
              </div>
            )}
          </div>

          {/* Internal Components Breakdown */}
          <div className="space-y-3 mb-5">
            <span className="text-sm font-medium text-[#787774] block uppercase tracking-wide">
              Internal Modular Assemblies
            </span>
            {currentSub?.components.map((comp, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-sm bg-[#fbfbfa] px-3.5 py-2.5 rounded-lg border border-[#e9e9e7]"
              >
                <span className="text-[#191919] font-medium truncate">{comp.name}</span>
                {comp.wear_pct !== undefined ? (
                  <span
                    className={`font-semibold shrink-0 ml-2 ${
                      comp.wear_pct > 25 ? "text-rose-600" : "text-[#787774]"
                    }`}
                  >
                    Wear: {comp.wear_pct}%
                  </span>
                ) : (
                  <span className="text-emerald-600 font-semibold shrink-0 ml-2">Nominal</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="border-t border-[#f1f1ef] pt-5 mt-3">
          {currentSub?.status === "CRITICAL" ? (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg mb-3 text-sm text-rose-800 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong>AOG Grounding Notice:</strong> Component wear exceeds safety margin. Mandatory depot replacement.
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg mb-3 text-sm text-[#787774] flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                Airworthiness envelope cleared for current flight profile.
              </div>
            </div>
          )}

          <button
            onClick={() => onOpenOrderModal && onOpenOrderModal(tailNumber, "NSN-2840-01-AL31-HPC3")}
            className="w-full py-3 px-4 bg-[#0075de] hover:bg-[#0060b9] text-white text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            Requisition Spares at Depot (BRD)
          </button>
        </div>
      </div>
    </div>
  )
}
