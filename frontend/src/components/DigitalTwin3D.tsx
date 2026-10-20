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

function makeLatheFuselage(): THREE.Mesh {
  const profile: [number, number][] = [
    [0.00,  5.8],[0.06,  5.3],[0.18,  4.6],[0.30,  3.8],[0.44,  2.8],
    [0.55,  1.6],[0.62,  0.4],[0.64,  0.0],[0.60, -1.0],[0.55, -2.2],
    [0.52, -3.2],[0.50, -4.2],[0.47, -5.0],
  ]
  const pts = profile.map(([r,y]) => new THREE.Vector2(r,y))
  const geo = new THREE.LatheGeometry(pts, 36)
  geo.rotateX(Math.PI / 2)
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color:0x2d3748, metalness:0.88, roughness:0.20 }))
}

function makeWing(side: 1|-1): THREE.Mesh {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0.3)
  shape.lineTo(side * 5.6, -1.6)
  shape.lineTo(side * 4.8, -3.9)
  shape.lineTo(0, -2.8)
  shape.closePath()
  const geo = new THREE.ExtrudeGeometry(shape, { depth:0.07, bevelEnabled:true, bevelSize:0.022, bevelThickness:0.022, bevelSegments:2 })
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, -0.07, 0)
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color:0x2d3748, metalness:0.82, roughness:0.26 }))
}

function makeLERX(side: 1|-1): THREE.Mesh {
  const shape = new THREE.Shape()
  shape.moveTo(0, 1.4)
  shape.lineTo(side * 1.3, 0.1)
  shape.lineTo(side * 1.1, -1.3)
  shape.lineTo(0, -1.1)
  shape.closePath()
  const geo = new THREE.ExtrudeGeometry(shape, { depth:0.04, bevelEnabled:false })
  geo.rotateX(-Math.PI / 2)
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color:0x374151, metalness:0.84, roughness:0.24 }))
}

function makeCanard(side: 1|-1): THREE.Mesh {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0.18)
  shape.lineTo(side * 2.4, -0.45)
  shape.lineTo(side * 1.9, -1.25)
  shape.lineTo(0, -0.88)
  shape.closePath()
  const geo = new THREE.ExtrudeGeometry(shape, { depth:0.04, bevelEnabled:false })
  geo.rotateX(-Math.PI / 2)
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color:0x2d3748, metalness:0.82, roughness:0.28 }))
}

function makeVerticalFin(side: 1|-1): THREE.Mesh {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.lineTo(0.28, 1.9)
  shape.lineTo(0.95, 2.1)
  shape.lineTo(1.55, 0.55)
  shape.lineTo(1.45, 0)
  shape.closePath()
  const geo = new THREE.ExtrudeGeometry(shape, { depth:0.05, bevelEnabled:false })
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color:0x374151, metalness:0.82, roughness:0.26 }))
  mesh.rotation.z = side * 0.14
  return mesh
}

function makeNacelle(): THREE.Group {
  const g = new THREE.Group()
  const torusMat = new THREE.MeshStandardMaterial({ color:0x1e293b, metalness:0.92, roughness:0.12 })
  const intake = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.065, 16, 32), torusMat)
  intake.rotation.x = Math.PI / 2
  intake.position.z = 1.9
  g.add(intake)
  const pts: [number,number][] = [[0.43,1.9],[0.45,0.8],[0.46,0],[0.44,-1.2],[0.40,-2.0],[0.36,-2.6]]
  const lp = pts.map(([r,y]) => new THREE.Vector2(r,y))
  const body = new THREE.Mesh(new THREE.LatheGeometry(lp, 26).rotateX(Math.PI/2) as THREE.BufferGeometry,
    new THREE.MeshStandardMaterial({ color:0x374151, metalness:0.90, roughness:0.18 }))
  g.add(body)
  const nozzle = new THREE.Mesh(
    Object.assign(new THREE.CylinderGeometry(0.37, 0.30, 0.5, 22, 1, true), { rotateX: (a: number) => { const geo = new THREE.CylinderGeometry(0.37, 0.30, 0.5, 22, 1, true); geo.rotateX(a); return geo } }).rotateX
      ? (() => { const geo = new THREE.CylinderGeometry(0.37, 0.30, 0.5, 22, 1, true); geo.rotateX(Math.PI/2); return geo })()
      : new THREE.CylinderGeometry(0.37, 0.30, 0.5, 22),
    new THREE.MeshStandardMaterial({ color:0x0f172a, metalness:0.95, roughness:0.08 })
  )
  nozzle.position.z = -2.75
  g.add(nozzle)
  return g
}

function buildNacelle(): THREE.Group {
  const g = new THREE.Group()
  // intake ring
  const iGeo = new THREE.TorusGeometry(0.43, 0.065, 16, 32)
  iGeo.rotateX(Math.PI/2)
  g.add(new THREE.Mesh(iGeo, new THREE.MeshStandardMaterial({ color:0x1e293b, metalness:0.92, roughness:0.12 })))

  // body via lathe
  const pts = [[0.43,1.85],[0.45,0.8],[0.46,0],[0.44,-1.1],[0.40,-1.9],[0.36,-2.5]].map(([r,y]) => new THREE.Vector2(r,y))
  const bodyGeo = new THREE.LatheGeometry(pts, 26)
  bodyGeo.rotateX(Math.PI/2)
  g.add(new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color:0x374151, metalness:0.90, roughness:0.18 })))

  // intake duct cap
  const ductGeo = new THREE.CircleGeometry(0.38, 22)
  ductGeo.rotateX(Math.PI/2)
  const duct = new THREE.Mesh(ductGeo, new THREE.MeshStandardMaterial({ color:0x0f172a, metalness:0.7, roughness:0.3 }))
  duct.position.z = 1.86
  g.add(duct)

  // nozzle
  const nGeo = new THREE.CylinderGeometry(0.36, 0.29, 0.5, 22, 1, true)
  nGeo.rotateX(Math.PI/2)
  const nozzle = new THREE.Mesh(nGeo, new THREE.MeshStandardMaterial({ color:0x0f172a, metalness:0.95, roughness:0.08 }))
  nozzle.position.z = -2.72
  g.add(nozzle)

  return g
}

function makeAfterburner(): THREE.Group {
  const g = new THREE.Group()
  // core white-hot center
  const cGeo = new THREE.CylinderGeometry(0.07, 0.16, 0.95, 16)
  cGeo.rotateX(Math.PI/2)
  g.add(new THREE.Mesh(cGeo, new THREE.MeshBasicMaterial({ color:0xffffff })))

  // inner blue cone
  const bGeo = new THREE.CylinderGeometry(0.16, 0.30, 0.75, 16, 1, true)
  bGeo.rotateX(Math.PI/2)
  const bMesh = new THREE.Mesh(bGeo, new THREE.MeshBasicMaterial({ color:0x93c5fd, transparent:true, opacity:0.88, side:THREE.DoubleSide }))
  bMesh.position.z = -0.15
  g.add(bMesh)

  // orange flame cone
  const fGeo = new THREE.CylinderGeometry(0.0, 0.36, 1.35, 16, 1, true)
  fGeo.rotateX(-Math.PI/2)
  const fMesh = new THREE.Mesh(fGeo, new THREE.MeshBasicMaterial({ color:0xf97316, transparent:true, opacity:0.72, side:THREE.DoubleSide }))
  fMesh.position.z = -0.88
  g.add(fMesh)

  // mach diamonds
  for (let i = 0; i < 3; i++) {
    const dGeo = new THREE.TorusGeometry(0.11 + i*0.07, 0.016, 8, 22)
    dGeo.rotateX(Math.PI/2)
    const d = new THREE.Mesh(dGeo, new THREE.MeshBasicMaterial({ color:0xe0f2fe, transparent:true, opacity:0.65 - i*0.18 }))
    d.position.z = -0.05 - i*0.34
    g.add(d)
  }
  return g
}

function makeCanopy(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(0.44, 28, 20, 0, Math.PI*2, 0, Math.PI*0.54)
  geo.scale(1.0, 0.7, 2.2)
  return new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
    color:0x7dd3fc, transparent:true, opacity:0.42,
    roughness:0.04, metalness:0.1, transmission:0.65, thickness:0.4,
  }))
}

function makeStarfield(): THREE.Points {
  const n = 900, pos = new Float32Array(n*3)
  for (let i=0;i<n;i++){
    pos[i*3]=(Math.random()-0.5)*220
    pos[i*3+1]=(Math.random()-0.5)*220
    pos[i*3+2]=(Math.random()-0.5)*220
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.BufferAttribute(pos,3))
  return new THREE.Points(geo, new THREE.PointsMaterial({ color:0xffffff, size:0.16, transparent:true, opacity:0.68 }))
}

export const DigitalTwin3D: React.FC<Props> = ({ data, tailNumber, onOpenOrderModal }) => {
  const mountRef = useRef<HTMLDivElement>(null)
  const [explodedView, setExplodedView] = useState(false)
  const [heatmapMode, setHeatmapMode] = useState(false)
  const [selectedKey, setSelectedKey] = useState<string>("turbofan_engine_left")
  const [isRotating, setIsRotating] = useState(true)

  const jetRef = useRef<THREE.Group | null>(null)
  const nLRef  = useRef<THREE.Group | null>(null)
  const nRRef  = useRef<THREE.Group | null>(null)
  const abLRef = useRef<THREE.Group | null>(null)
  const abRRef = useRef<THREE.Group | null>(null)
  const cLRef  = useRef<THREE.Mesh | null>(null)
  const cRRef  = useRef<THREE.Mesh | null>(null)
  const lLRef  = useRef<THREE.PointLight | null>(null)
  const lRRef  = useRef<THREE.PointLight | null>(null)

  useEffect(() => {
    if (!mountRef.current) return
    const W = mountRef.current.clientWidth
    const H = mountRef.current.clientHeight || 460

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x050b17)
    scene.fog = new THREE.Fog(0x050b17, 50, 130)

    const camera = new THREE.PerspectiveCamera(42, W/H, 0.1, 500)
    camera.position.set(0, 3.2, 13)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias:true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    mountRef.current.replaceChildren(renderer.domElement)

    scene.add(makeStarfield())

    // Lighting
    scene.add(new THREE.AmbientLight(0x1e3a5f, 1.3))
    const key = new THREE.DirectionalLight(0xdbeafe, 3.0)
    key.position.set(6, 9, 7); key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    scene.add(key)
    scene.add(Object.assign(new THREE.DirectionalLight(0x93c5fd, 1.1), { position: new THREE.Vector3(-8,-2,-5) }))
    scene.add(Object.assign(new THREE.DirectionalLight(0x60a5fa, 1.5), { position: new THREE.Vector3(0,-5,-12) }))

    const ll = new THREE.PointLight(0x60a5fa, 9, 7)
    ll.position.set(-0.95, -0.22, -3.6); scene.add(ll); lLRef.current = ll
    const lr = new THREE.PointLight(0x60a5fa, 9, 7)
    lr.position.set( 0.95, -0.22, -3.6); scene.add(lr); lRRef.current = lr
    scene.add(Object.assign(new THREE.PointLight(0x22d3ee, 2.8, 3.5), { position: new THREE.Vector3(0, 0.6, 1.4) }))

    // Ground
    const grid = new THREE.GridHelper(30, 30, 0x1d4ed8, 0x1e3a5f)
    grid.position.y = -2.85
    ;(grid.material as THREE.MeshBasicMaterial).transparent = true
    ;(grid.material as THREE.MeshBasicMaterial).opacity = 0.32
    scene.add(grid)

    const rGeo = new THREE.PlaneGeometry(30, 30)
    const rMat = new THREE.MeshStandardMaterial({ color:0x0f172a, metalness:0.9, roughness:0.28, transparent:true, opacity:0.52 })
    const rPlane = new THREE.Mesh(rGeo, rMat)
    rPlane.rotation.x = -Math.PI/2; rPlane.position.y = -2.87; rPlane.receiveShadow = true
    scene.add(rPlane)

    // Build jet
    const jet = new THREE.Group()
    jetRef.current = jet
    jet.rotation.y = Math.PI

    const fuselage = makeLatheFuselage(); fuselage.castShadow = true; jet.add(fuselage)
    const canopy = makeCanopy(); canopy.position.set(0, 0.54, -0.45); jet.add(canopy)

    const wL = makeWing(-1); wL.position.set(0, -0.09, -1.3); wL.castShadow = true; jet.add(wL)
    const wR = makeWing( 1); wR.position.set(0, -0.09, -1.3); wR.castShadow = true; jet.add(wR)

    const lerxL = makeLERX(-1); lerxL.position.set(0, -0.06, 0.7); jet.add(lerxL)
    const lerxR = makeLERX( 1); lerxR.position.set(0, -0.06, 0.7); jet.add(lerxR)

    const cL = makeCanard(-1); cL.position.set(0, 0.24, 1.75); cLRef.current = cL; jet.add(cL)
    const cR = makeCanard( 1); cR.position.set(0, 0.24, 1.75); cRRef.current = cR; jet.add(cR)

    const finL = makeVerticalFin(-1); finL.position.set(-0.58, 0.1, -3.3); jet.add(finL)
    const finR = makeVerticalFin( 1); finR.position.set( 0.58, 0.1, -3.3); jet.add(finR)

    const nL = buildNacelle(); nL.position.set(-0.95, -0.22, -1.0); nLRef.current = nL; jet.add(nL)
    const nR = buildNacelle(); nR.position.set( 0.95, -0.22, -1.0); nRRef.current = nR; jet.add(nR)

    const abL = makeAfterburner(); abL.position.set(-0.95, -0.22, -2.75); abLRef.current = abL; jet.add(abL)
    const abR = makeAfterburner(); abR.position.set( 0.95, -0.22, -2.75); abRRef.current = abR; jet.add(abR)

    scene.add(jet)

    // Mouse drag
    let drag = false, px = 0, py = 0
    const onDown = (e: MouseEvent) => { drag=true; px=e.clientX; py=e.clientY }
    const onMove = (e: MouseEvent) => {
      if (!drag) return
      jet.rotation.y += (e.clientX-px)*0.008
      jet.rotation.x += (e.clientY-py)*0.005
      px=e.clientX; py=e.clientY
    }
    const onUp = () => (drag=false)
    renderer.domElement.addEventListener("mousedown", onDown)
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)

    let animId: number, t = 0
    const animate = () => {
      animId = requestAnimationFrame(animate); t += 0.04
      if (isRotating && !drag) jet.rotation.y += 0.003
      const flk = 8 + Math.sin(t*4.1)*1.8 + Math.sin(t*7.8)*0.7
      if (lLRef.current) lLRef.current.intensity = flk
      if (lRRef.current) lRRef.current.intensity = flk
      if (cLRef.current) cLRef.current.rotation.z = Math.sin(t*1.3)*0.022
      if (cRRef.current) cRRef.current.rotation.z = Math.sin(t*1.3)*0.022
      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      if (!mountRef.current) return
      const w=mountRef.current.clientWidth, h=mountRef.current.clientHeight||460
      camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h)
    }
    window.addEventListener("resize", onResize)

    return () => {
      cancelAnimationFrame(animId)
      renderer.domElement.removeEventListener("mousedown", onDown)
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
      window.removeEventListener("resize", onResize)
      renderer.dispose()
    }
  }, [isRotating])

  // Exploded view
  useEffect(() => {
    const iv = setInterval(() => {
      const lTX = explodedView ? -2.1 : -0.95
      const rTX = explodedView ? 2.1 : 0.95
      const tz  = explodedView ? -2.0 : -1.0
      const abTz = explodedView ? -3.6 : -2.75
      ;[nLRef.current].forEach(o => { if(o){o.position.x+=(lTX-o.position.x)*0.1; o.position.z+=(tz-o.position.z)*0.1} })
      ;[nRRef.current].forEach(o => { if(o){o.position.x+=(rTX-o.position.x)*0.1; o.position.z+=(tz-o.position.z)*0.1} })
      ;[abLRef.current].forEach(o => { if(o){o.position.x+=(lTX-o.position.x)*0.1; o.position.z+=(abTz-o.position.z)*0.1} })
      ;[abRRef.current].forEach(o => { if(o){o.position.x+=(rTX-o.position.x)*0.1; o.position.z+=(abTz-o.position.z)*0.1} })
    }, 16)
    return () => clearInterval(iv)
  }, [explodedView])

  // Heatmap
  useEffect(() => {
    const hex = heatmapMode ? 0xe11d48 : 0x374151
    ;[nLRef.current, nRRef.current].forEach(g => {
      if (!g) return
      g.traverse(c => {
        const m = c as THREE.Mesh
        if (m.isMesh && (m.material as THREE.MeshStandardMaterial)?.color)
          (m.material as THREE.MeshStandardMaterial).color.setHex(hex)
      })
    })
  }, [heatmapMode])

  const subsystems = data?.subsystems
  const currentSub: Subsystem3D | undefined = subsystems ? (subsystems as any)[selectedKey] : undefined

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 p-5 flex flex-col justify-between min-h-[650px] bg-[#050b17] rounded-2xl border border-[#1e3a5f] shadow-[0_0_40px_rgba(30,58,95,0.4)]">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1a3050] pb-3">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse shadow-[0_0_10px_3px_rgba(96,165,250,0.7)]" />
            <span className="text-sm font-bold text-blue-100 tracking-wide">Su-30MKI Digital Twin — {tailNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setExplodedView(!explodedView)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 ${
                explodedView ? "bg-blue-900/70 border-blue-400 text-blue-200 shadow-[0_0_8px_rgba(96,165,250,0.3)]"
                             : "bg-slate-800/60 border-slate-600 text-slate-300 hover:border-blue-500 hover:text-blue-300"}`}>
              <Layers className="w-3.5 h-3.5" />
              {explodedView ? "Collapse" : "Exploded View"}
            </button>
            <button onClick={() => setHeatmapMode(!heatmapMode)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 ${
                heatmapMode ? "bg-rose-900/70 border-rose-400 text-rose-200 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                            : "bg-slate-800/60 border-slate-600 text-slate-300 hover:border-rose-500 hover:text-rose-300"}`}>
              <Flame className="w-3.5 h-3.5" />
              {heatmapMode ? "Thermal ON" : "Heatmap"}
            </button>
            <button onClick={() => setIsRotating(!isRotating)}
              className="p-1.5 rounded-lg border border-slate-600 bg-slate-800/60 text-slate-400 hover:text-blue-300 transition-colors"
              title="Toggle rotation">
              <RefreshCw className={`w-3.5 h-3.5 ${isRotating ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="relative w-full flex-1 my-3 rounded-xl overflow-hidden">
          <div ref={mountRef} className="w-full h-[530px] cursor-grab active:cursor-grabbing" />

          {/* HUD */}
          <div className="absolute top-4 left-4 text-xs text-blue-200 bg-slate-900/85 backdrop-blur-sm px-3.5 py-2.5 rounded-xl border border-blue-900/50 shadow-lg pointer-events-none font-mono space-y-1">
            <div className="text-[10px] text-blue-400 font-semibold tracking-[0.15em] mb-1.5">◈ LIVE SENSOR</div>
            <div>EGT <span className="text-white font-bold ml-1">{data?.last_telemetry.egt_c ?? 712}°C</span></div>
            <div>VIB <span className="text-white font-bold ml-1">{data?.last_telemetry.vib_core_rms ?? 1.8} mm/s</span></div>
            <div>HYD <span className="text-white font-bold ml-1">{data?.last_telemetry.hyd_press_psi ?? 2950} PSI</span></div>
          </div>

          <div className="absolute top-4 right-4 flex gap-1.5">
            <div className="px-2 py-1 rounded bg-blue-500/15 border border-blue-500/35 text-[10px] text-blue-300 font-mono tracking-wide">AB-L ✦</div>
            <div className="px-2 py-1 rounded bg-blue-500/15 border border-blue-500/35 text-[10px] text-blue-300 font-mono tracking-wide">AB-R ✦</div>
          </div>

          <div className="absolute bottom-4 right-4 text-[10px] text-slate-500 bg-slate-900/60 px-2.5 py-1 rounded border border-slate-700/50 pointer-events-none">
            Drag · Rotate
          </div>
        </div>

        {/* Subsystem tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-4 border-t border-[#1a3050]">
          {[
            { id:"turbofan_engine_left",      label:"Port Engine",  icon:Zap },
            { id:"turbofan_engine_right",      label:"Stbd Engine",  icon:Zap },
            { id:"flight_controls_hydraulics", label:"Hydraulics",   icon:Gauge },
            { id:"mission_avionics_radar",     label:"BARS Radar",   icon:Layers },
            { id:"airframe_structure",         label:"Airframe",     icon:Info },
          ].map(tab => {
            const Icon = tab.icon; const sel = selectedKey === tab.id
            return (
              <button key={tab.id} onClick={() => setSelectedKey(tab.id)}
                className={`text-left px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                  sel ? "bg-blue-600/80 border-blue-400 text-white shadow-[0_0_14px_rgba(59,130,246,0.45)]"
                      : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-blue-600 hover:text-blue-300"}`}>
                <div className="flex items-center gap-1.5 truncate">
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Inspector panel */}
      <div className="lg:col-span-4 notion-card p-6 flex flex-col justify-between bg-white">
        <div>
          <div className="flex items-center justify-between border-b border-[#f1f1ef] pb-3 mb-4">
            <div>
              <span className="text-xs font-medium text-[#787774] uppercase tracking-wide">Subsystem Diagnostic</span>
              <h3 className="font-bold text-lg text-[#191919] mt-0.5">{currentSub?.name ?? "Selected Component"}</h3>
            </div>
            <span className={`text-sm px-3 py-1 rounded-full font-bold ${
              currentSub?.status === "CRITICAL" ? "bg-rose-100 text-rose-700"
            : currentSub?.status === "WARNING"  ? "bg-amber-100 text-amber-800"
            : "bg-emerald-100 text-emerald-800"}`}>
              {currentSub?.status ?? "NOMINAL"}
            </span>
          </div>

          <div className="mb-6 bg-[#fbfbfa] p-4 rounded-xl border border-[#e9e9e7]">
            <div className="flex justify-between items-center mb-2 text-sm">
              <span className="text-[#787774] font-medium">Subsystem Integrity</span>
              <span className="text-[#0075de] font-bold">{currentSub?.health_pct ?? 85}%</span>
            </div>
            <div className="w-full bg-[#f1f1ef] h-3 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${
                (currentSub?.health_pct ?? 85) < 50 ? "bg-rose-500"
              : (currentSub?.health_pct ?? 85) < 75 ? "bg-amber-400" : "bg-[#0075de]"}`}
                style={{ width:`${currentSub?.health_pct ?? 85}%` }} />
            </div>
          </div>

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

          <div className="space-y-3 mb-5">
            <span className="text-xs font-medium text-[#787774] block uppercase tracking-wide">Modular Assemblies</span>
            {currentSub?.components.map((comp, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm bg-[#fbfbfa] px-3.5 py-2.5 rounded-lg border border-[#e9e9e7]">
                <span className="text-[#191919] font-medium truncate">{comp.name}</span>
                {comp.wear_pct !== undefined
                  ? <span className={`font-semibold shrink-0 ml-2 ${comp.wear_pct > 25 ? "text-rose-600" : "text-[#787774]"}`}>Wear: {comp.wear_pct}%</span>
                  : <span className="text-emerald-600 font-semibold shrink-0 ml-2">Nominal</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-[#f1f1ef] pt-5 mt-3">
          {currentSub?.status === "CRITICAL" ? (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg mb-3 text-sm text-rose-800 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div><strong>AOG Grounding Notice:</strong> Component wear exceeds safety margin. Mandatory depot replacement.</div>
            </div>
          ) : (
            <div className="p-3.5 bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg mb-3 text-sm text-[#787774] flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>Airworthiness envelope cleared for current flight profile.</div>
            </div>
          )}
          <button onClick={() => onOpenOrderModal && onOpenOrderModal(tailNumber, "NSN-2840-01-AL31-HPC3")}
            className="w-full py-3 px-4 bg-[#0075de] hover:bg-[#0060b9] text-white text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Requisition Spares at Depot (BRD)
          </button>
        </div>
      </div>
    </div>
  )
}
