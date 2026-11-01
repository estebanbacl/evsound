import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Group } from 'three'
import {
  nextQuality,
  pickInitialQuality,
  qualitySettings,
  type Quality,
} from '../../vehicles/quality'
import type { VehicleProfile } from '../../vehicles/types'
import { GlbVehicle } from './GlbVehicle'
import { ProceduralVehicle, type VehiclePart } from './ProceduralVehicle'

interface Props {
  vehicle: VehicleProfile
  paused: boolean
  selected: VehiclePart | null
  onSelect: (p: VehiclePart | null) => void
  onQuality?: (q: Quality, fps: number) => void
}

function gpuRenderer(): string | null {
  try {
    const gl = document.createElement('canvas').getContext('webgl')
    const ext = gl?.getExtension('WEBGL_debug_renderer_info')
    return gl && ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : null
  } catch {
    return null
  }
}

interface Rig {
  dragX: number
  dragY: number
}

function Scene({
  vehicle,
  selected,
  onSelect,
  quality,
  rig,
  onFps,
}: Omit<Props, 'paused' | 'onQuality'> & {
  quality: Quality
  rig: React.RefObject<Rig>
  onFps: (fps: number) => void
}) {
  const group = useRef<Group>(null)
  const { camera } = useThree()
  const [glbMissing, setGlbMissing] = useState(false)
  const frames = useRef({ n: 0, t: 0 })
  const [cx, cy, cz] = vehicle.model3d.cameraPreset
  const edgeAngle = qualitySettings[quality].edgeAngle
  const onMissing = useCallback(() => setGlbMissing(true), [])

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    if (group.current) {
      // slow idle sway + user drag (clamped so the car never turns its back)
      group.current.rotation.y = 0.1 + Math.sin(t * 0.25) * 0.35 + (rig.current?.dragX ?? 0)
    }
    const tilt = rig.current?.dragY ?? 0
    camera.position.set(cx, cy + tilt * 2.2, cz)
    camera.lookAt(0, 0.7, 0)

    const f = frames.current
    f.n++
    f.t += dt
    if (f.t >= 2) {
      onFps(f.n / f.t)
      f.n = 0
      f.t = 0
    }
  })

  const s = vehicle.model3d.scale * 0.86
  return (
    <group ref={group} scale={s}>
      {vehicle.model3d.url && !glbMissing ? (
        <GlbVehicle url={vehicle.model3d.url} edgeAngle={edgeAngle} onMissing={onMissing} />
      ) : (
        <ProceduralVehicle
          body={vehicle.body}
          stations={qualitySettings[quality].stations}
          rich={quality !== 'low'}
          selected={selected}
          onSelect={onSelect}
        />
      )}
    </group>
  )
}

export default function VehicleScene({ vehicle, paused, selected, onSelect, onQuality }: Props) {
  const [initialQuality] = useState<Quality>(() => pickInitialQuality(gpuRenderer()))
  const [quality, setQuality] = useState<Quality>(initialQuality)
  const antialias = qualitySettings[initialQuality].antialias // fixed at context creation
  const rig = useRef<Rig>({ dragX: 0, dragY: 0 })
  const drag = useRef<{ x: number; y: number } | null>(null)
  const warm = useRef(0)

  const onFps = useCallback(
    (fps: number) => {
      if (warm.current++ < 1) return // ignore shader-compile warm-up
      setQuality((q) => {
        const n = nextQuality(q, fps)
        onQuality?.(n, fps)
        return n
      })
    },
    [onQuality],
  )

  const [hidden, setHidden] = useState(() => document.visibilityState === 'hidden')
  useEffect(() => {
    const h = () => setHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', h)
    return () => document.removeEventListener('visibilitychange', h)
  }, [])

  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      drag.current = { x: e.clientX, y: e.clientY }
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!drag.current) return
      rig.current.dragX = clamp(rig.current.dragX + (e.clientX - drag.current.x) * 0.006, -1.1, 1.1)
      rig.current.dragY = clamp(rig.current.dragY + (e.clientY - drag.current.y) * 0.003, -0.3, 0.5)
      drag.current = { x: e.clientX, y: e.clientY }
    },
    onPointerUp: () => (drag.current = null),
    onPointerCancel: () => (drag.current = null),
  }

  return (
    <div
      className="vehicle-canvas"
      data-vehicle={vehicle.id}
      data-quality={quality}
      data-paused={paused || hidden}
      style={{ touchAction: 'none' }}
      {...handlers}
    >
      <Canvas
        frameloop={paused || hidden ? 'never' : 'always'}
        dpr={qualitySettings[quality].dpr}
        gl={{ antialias, alpha: true, powerPreference: 'high-performance' }}
        camera={{ fov: 32, near: 0.1, far: 60, position: vehicle.model3d.cameraPreset }}
      >
        <Scene
          key={vehicle.id}
          vehicle={vehicle}
          selected={selected}
          onSelect={onSelect}
          quality={quality}
          rig={rig}
          onFps={onFps}
        />
      </Canvas>
    </div>
  )
}
