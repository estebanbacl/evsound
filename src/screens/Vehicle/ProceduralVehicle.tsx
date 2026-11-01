import { useEffect, useMemo } from 'react'
import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  EdgesGeometry,
  LatheGeometry,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three'
import { buildBodyLoft, endAnchor } from '../../vehicles/bodyGeometry'
import { bodyShapes, type BodyShape } from '../../vehicles/bodyShapes'
import type { BodyType } from '../../vehicles/types'
import { Ground, Halo, StudioEnv } from './studio'
import { createXrayMaterial } from './xray'

export type VehiclePart = 'battery' | 'motor'

interface Props {
  body: BodyType
  stations: number
  rich?: boolean
  selected: VehiclePart | null
  onSelect: (p: VehiclePart | null) => void
}

const AMBER = '#ffa94d'
const AMBER_HOT = '#ffe0a8'
const noRaycast = () => null

function hullGeometry(body: BodyType, stations: number) {
  const loft = buildBodyLoft(body, stations)
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(loft.positions, 3))
  g.setIndex(new BufferAttribute(loft.indices, 1))
  g.addGroup(0, loft.glassStart, 0)
  g.addGroup(loft.glassStart, loft.indices.length - loft.glassStart, 1)
  g.computeVertexNormals()
  return g
}

/** Grid lines on the top/bottom of a slab, as line-segment positions. */
function slabGrid(len: number, wid: number, h: number, nx: number, nz: number) {
  const p: number[] = []
  for (const y of [0, h]) {
    for (let i = 0; i <= nx; i++) {
      const x = -len / 2 + (len * i) / nx
      p.push(x, y, -wid / 2, x, y, wid / 2)
    }
    for (let k = 0; k <= nz; k++) {
      const z = -wid / 2 + (wid * k) / nz
      p.push(-len / 2, y, z, len / 2, y, z)
    }
  }
  for (const x of [-len / 2, len / 2]) for (const z of [-wid / 2, wid / 2]) p.push(x, 0, z, x, h, z)
  return new BufferGeometry().setAttribute('position', new BufferAttribute(new Float32Array(p), 3))
}

function lines(points: number[]) {
  return new BufferGeometry().setAttribute(
    'position',
    new BufferAttribute(new Float32Array(points), 3),
  )
}

function Lines({
  geometry,
  color,
  opacity = 0.9,
}: {
  geometry: BufferGeometry
  color: string
  opacity?: number
}) {
  return (
    <lineSegments geometry={geometry} raycast={noRaycast}>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </lineSegments>
  )
}

function Edges({
  geometry,
  angle,
  color,
  opacity = 0.9,
}: {
  geometry: BufferGeometry
  angle: number
  color: string
  opacity?: number
}) {
  const edges = useMemo(() => new EdgesGeometry(geometry, angle), [geometry, angle])
  useEffect(() => () => edges.dispose(), [edges])
  return <Lines geometry={edges} color={color} opacity={opacity} />
}

/** Wheel: rubber tyre (lathe), dark alloy face with spokes, hub and a red caliper. */
function Wheel({ radius, rich, outward }: { radius: number; rich: boolean; outward: 1 | -1 }) {
  const parts = useMemo(() => {
    const hw = 0.135
    const rim = radius * 0.62
    const tyre = new LatheGeometry(
      [
        new Vector2(rim, -hw),
        new Vector2(radius - 0.05, -hw),
        new Vector2(radius - 0.012, -hw * 0.7),
        new Vector2(radius, -hw * 0.3),
        new Vector2(radius, hw * 0.3),
        new Vector2(radius - 0.012, hw * 0.7),
        new Vector2(radius - 0.05, hw),
        new Vector2(rim, hw),
      ],
      rich ? 40 : 20,
    )
    const face = new CylinderGeometry(rim, rim, 0.03, rich ? 40 : 20)
    const spoke = new BoxGeometry(rim * 0.92, 0.022, 0.045)
    const hub = new CylinderGeometry(0.055, 0.055, 0.05, 16)
    const caliper = new BoxGeometry(0.12, 0.05, 0.14)
    return { tyre, face, spoke, hub, caliper, rim }
  }, [radius, rich])
  const mats = useMemo(
    () => ({
      tyre: new MeshStandardMaterial({ color: '#17171c', roughness: 0.55, metalness: 0.1 }),
      alloy: new MeshStandardMaterial({ color: '#6a6d78', roughness: 0.32, metalness: 0.95 }),
      caliper: new MeshStandardMaterial({
        color: '#c4121a',
        roughness: 0.4,
        metalness: 0.4,
        emissive: '#400306',
      }),
    }),
    [],
  )
  useEffect(
    () => () => {
      Object.values(parts).forEach((g) => typeof g !== 'number' && g.dispose())
      Object.values(mats).forEach((m) => m.dispose())
    },
    [parts, mats],
  )
  const faceY = outward * 0.09
  return (
    <group>
      <mesh geometry={parts.tyre} material={mats.tyre} raycast={noRaycast} />
      <mesh
        geometry={parts.face}
        material={mats.alloy}
        position={[0, faceY, 0]}
        raycast={noRaycast}
      />
      {Array.from({ length: rich ? 10 : 5 }, (_, i) => (
        <mesh
          key={i}
          geometry={parts.spoke}
          material={mats.alloy}
          position={[0, faceY + outward * 0.02, 0]}
          rotation={[0, (i * Math.PI * 2) / (rich ? 10 : 5), 0]}
          raycast={noRaycast}
        />
      ))}
      <mesh
        geometry={parts.hub}
        material={mats.alloy}
        position={[0, faceY + outward * 0.03, 0]}
        raycast={noRaycast}
      />
      {rich && (
        <mesh
          geometry={parts.caliper}
          material={mats.caliper}
          position={[parts.rim * 0.55, faceY - outward * 0.04, 0]}
          raycast={noRaycast}
        />
      )}
    </group>
  )
}

function Powertrain({
  s,
  selected,
  onSelect,
  rich,
}: {
  s: BodyShape
  selected: VehiclePart | null
  onSelect: (p: VehiclePart | null) => void
  rich: boolean
}) {
  const W = s.width
  const geo = useMemo(() => {
    const batLen = 2.5
    const batW = W - 0.62
    const motorLen = W - 0.9
    const wheelZ = W / 2 - 0.17
    const ys = s.wheelRadius
    const rails: number[] = []
    const arms: number[] = []
    for (const z of [-1, 1]) {
      const rz = z * (W / 2 - 0.42)
      rails.push(
        -s.length / 2 + 0.35,
        s.batteryY - 0.04,
        rz,
        s.length / 2 - 0.35,
        s.batteryY - 0.04,
        rz,
      )
      for (const x of [s.wheelbaseHalf, -s.wheelbaseHalf]) {
        const mz = z * (motorLen / 2)
        arms.push(x, ys, mz, x + 0.32, ys + 0.2, z * (wheelZ - 0.08))
        arms.push(x, ys, mz, x - 0.32, ys + 0.2, z * (wheelZ - 0.08))
        arms.push(x, ys, mz, x, ys + 0.42, z * (wheelZ - 0.1))
        arms.push(x, ys, mz, x, ys, z * wheelZ)
      }
    }
    for (const x of [s.length / 2 - 0.35, -s.length / 2 + 0.35, 0]) {
      rails.push(x, s.batteryY - 0.04, -(W / 2 - 0.42), x, s.batteryY - 0.04, W / 2 - 0.42)
    }
    const cable = (from: Vector3, to: Vector3, lift: number) =>
      new TubeGeometry(
        new CatmullRomCurve3([
          from,
          from
            .clone()
            .lerp(to, 0.35)
            .add(new Vector3(0, lift, 0)),
          from
            .clone()
            .lerp(to, 0.7)
            .add(new Vector3(0, lift * 0.6, 0)),
          to,
        ]),
        24,
        0.011,
        5,
      )
    const cables: BufferGeometry[] = []
    for (const [sx, mx] of [
      [1, s.wheelbaseHalf],
      [-1, -s.wheelbaseHalf],
    ]) {
      for (const dz of [-0.3, -0.1, 0.1, 0.3]) {
        cables.push(
          cable(
            new Vector3(sx * 1.2, s.batteryY + 0.14, dz),
            new Vector3(mx, s.wheelRadius + 0.18, dz * 0.9),
            0.14 + Math.abs(dz) * 0.2,
          ),
        )
      }
    }
    return {
      battery: new BoxGeometry(batLen, 0.14, batW),
      grid: slabGrid(batLen, batW, 0.14, 16, 7),
      motor: new CylinderGeometry(0.17, 0.17, motorLen, 24),
      coil: new TorusGeometry(0.185, 0.014, 6, 24),
      gear: new CylinderGeometry(0.24, 0.24, 0.12, 24),
      rails: lines(rails),
      arms: lines(arms),
      cables,
    }
  }, [s, W])
  useEffect(
    () => () => {
      Object.values(geo).forEach((g) =>
        Array.isArray(g) ? g.forEach((x) => x.dispose()) : g.dispose(),
      )
    },
    [geo],
  )
  const op = (part: VehiclePart) => (selected === part ? 1 : 0.9)
  const partProps = (part: VehiclePart) => ({
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation()
      onSelect(selected === part ? null : part)
    },
    onPointerOver: () => (document.body.style.cursor = 'pointer'),
    onPointerOut: () => (document.body.style.cursor = ''),
  })
  const motorLen = W - 0.9
  const coils = rich ? 7 : 3

  return (
    <group>
      <Lines geometry={geo.rails} color={AMBER} opacity={0.9} />
      <Lines geometry={geo.arms} color={AMBER} opacity={0.85} />
      {geo.cables.map((c, i) => (
        <mesh key={i} geometry={c} raycast={noRaycast}>
          <meshBasicMaterial
            color={AMBER}
            transparent
            opacity={0.9}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
      {/* battery pack */}
      <group
        position={[0, s.batteryY, 0]}
        scale={selected === 'battery' ? 1.03 : 1}
        {...partProps('battery')}
      >
        <mesh geometry={geo.battery} position={[0, 0.07, 0]}>
          <meshBasicMaterial
            color={AMBER}
            transparent
            opacity={op('battery') * 0.38}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <Lines geometry={geo.grid} color={AMBER_HOT} opacity={op('battery')} />
      </group>
      {/* e-motors on both axles */}
      {[s.wheelbaseHalf, -s.wheelbaseHalf].map((x) => (
        <group
          key={x}
          position={[x, s.wheelRadius, 0]}
          scale={selected === 'motor' ? 1.1 : 1}
          {...partProps('motor')}
        >
          <group rotation={[Math.PI / 2, 0, 0]}>
            <mesh geometry={geo.motor}>
              <meshBasicMaterial
                color={AMBER}
                transparent
                opacity={op('motor') * 0.5}
                depthWrite={false}
                blending={AdditiveBlending}
                toneMapped={false}
              />
            </mesh>
            <Edges geometry={geo.motor} angle={40} color={AMBER_HOT} opacity={op('motor')} />
            {Array.from({ length: coils }, (_, i) => (
              <group
                key={i}
                position={[0, (-motorLen / 2) * 0.8 + (motorLen * 0.8 * i) / (coils - 1), 0]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <mesh geometry={geo.coil}>
                  <meshBasicMaterial
                    color={AMBER_HOT}
                    transparent
                    opacity={op('motor') * 0.8}
                    depthWrite={false}
                    blending={AdditiveBlending}
                    toneMapped={false}
                  />
                </mesh>
              </group>
            ))}
          </group>
          <group rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <mesh geometry={geo.gear} position={[0, 0, 0]}>
              <meshBasicMaterial
                color={AMBER_HOT}
                transparent
                opacity={op('motor') * 0.45}
                depthWrite={false}
                blending={AdditiveBlending}
                toneMapped={false}
              />
            </mesh>
          </group>
        </group>
      ))}
      <pointLight
        color={AMBER}
        intensity={4}
        distance={3.2}
        decay={2}
        position={[0, s.batteryY + 0.25, 0]}
      />
    </group>
  )
}

function Lights({ body, s }: { body: BodyType; s: BodyShape }) {
  const W = s.width
  const front = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 14; i++) {
      const z = ((i / 14) * 2 - 1) * (W / 2) * 0.74
      const [x, y] = endAnchor(body, z, 1)
      pts.push(new Vector3(x + 0.012, y + 0.04, z))
    }
    return new TubeGeometry(new CatmullRomCurve3(pts), 40, 0.011, 6)
  }, [body, W])
  const rear = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 14; i++) {
      const z = ((i / 14) * 2 - 1) * (W / 2) * 0.78
      const [x, y] = endAnchor(body, z, -1)
      pts.push(new Vector3(x - 0.012, y + 0.2, z))
    }
    return new TubeGeometry(new CatmullRomCurve3(pts), 40, 0.02, 6)
  }, [body, W])
  useEffect(
    () => () => {
      front.dispose()
      rear.dispose()
    },
    [front, rear],
  )
  const [fx, fy] = endAnchor(body, 0, 1)
  const [rx, ry] = endAnchor(body, 0, -1)
  const [hx, hy] = endAnchor(body, W / 2 - 0.3, 1)
  const [tx, ty] = endAnchor(body, W / 2 - 0.25, -1)
  return (
    <group>
      <mesh geometry={front} raycast={noRaycast}>
        <meshBasicMaterial color="#e4f2ff" toneMapped={false} />
      </mesh>
      <mesh geometry={rear} raycast={noRaycast}>
        <meshBasicMaterial color="#ff3030" toneMapped={false} />
      </mesh>
      {body === 'offroad' &&
        [-1, 1].map((k) => {
          const [bx, by] = endAnchor(body, k * (W / 2 - 0.4), 1)
          return (
            <mesh key={k} position={[bx + 0.02, by + 0.12, k * (W / 2 - 0.4)]} raycast={noRaycast}>
              <boxGeometry args={[0.03, 0.14, 0.24]} />
              <meshBasicMaterial color="#e4f2ff" toneMapped={false} />
            </mesh>
          )
        })}
      <Halo
        position={[hx + 0.12, hy + 0.06, W / 2 - 0.3]}
        color="#bcdcff"
        size={0.9}
        opacity={0.7}
      />
      <Halo
        position={[hx + 0.12, hy + 0.06, -(W / 2 - 0.3)]}
        color="#bcdcff"
        size={0.9}
        opacity={0.7}
      />
      <Halo position={[fx + 0.1, fy + 0.04, 0]} color="#bcdcff" size={1.0} opacity={0.4} />
      <Halo position={[rx - 0.15, ry + 0.2, 0]} color="#ff1a1a" size={2.6} opacity={0.65} />
      <Halo
        position={[tx - 0.12, ty + 0.2, W / 2 - 0.25]}
        color="#ff2a2a"
        size={1.1}
        opacity={0.9}
      />
      <Halo
        position={[tx - 0.12, ty + 0.2, -(W / 2 - 0.25)]}
        color="#ff2a2a"
        size={1.1}
        opacity={0.9}
      />
      <pointLight
        color="#ff1a1a"
        intensity={6}
        distance={5}
        decay={2}
        position={[rx - 0.8, ry + 0.2, 0]}
      />
      <pointLight
        color="#cfe6ff"
        intensity={2.5}
        distance={4}
        decay={2}
        position={[fx + 0.8, fy + 0.2, 0]}
      />
    </group>
  )
}

/** Dark glossy hull with glass, wheels and an amber X-ray powertrain (no brand marks). */
export function ProceduralVehicle({ body, stations, rich = true, selected, onSelect }: Props) {
  const s = bodyShapes[body]
  const hull = useMemo(() => hullGeometry(body, stations), [body, stations])
  const mats = useMemo(() => {
    const Phys = rich ? MeshPhysicalMaterial : MeshStandardMaterial
    const paint = new Phys({
      color: '#040406',
      metalness: 0.9,
      roughness: 0.26,
      envMapIntensity: 2.4,
      transparent: true,
      opacity: 0.5,
      ...(rich ? { clearcoat: 1, clearcoatRoughness: 0.06 } : {}),
    })
    const glass = new Phys({
      color: '#0a1018',
      metalness: 0.2,
      roughness: 0.04,
      envMapIntensity: 2.6,
      transparent: true,
      opacity: 0.3,
    })
    const back = new MeshStandardMaterial({
      color: '#000000',
      side: BackSide,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    })
    return { paint, glass, back, rim: createXrayMaterial('#ff2a2a', 0, 0.22) }
  }, [rich])
  useEffect(
    () => () => {
      hull.dispose()
      Object.values(mats).forEach((m) => m.dispose())
    },
    [hull, mats],
  )

  const wheelZ = s.width / 2 - 0.17
  const wheels: [number, number][] = [
    [s.wheelbaseHalf, wheelZ],
    [s.wheelbaseHalf, -wheelZ],
    [-s.wheelbaseHalf, wheelZ],
    [-s.wheelbaseHalf, -wheelZ],
  ]

  return (
    <group onClick={() => onSelect(null)}>
      <StudioEnv />
      <ambientLight intensity={0.15} />
      <directionalLight position={[3, 6, 4]} intensity={0.7} color="#ffe9e0" />
      <Ground length={s.length} width={s.width} />

      <mesh geometry={hull} material={[mats.back, mats.back]} renderOrder={0} raycast={noRaycast} />
      {wheels.map(([x, z], i) => (
        <group
          key={i}
          position={[x, s.wheelRadius, z]}
          rotation={[Math.PI / 2, 0, 0]}
          renderOrder={1}
        >
          <Wheel radius={s.wheelRadius} rich={rich} outward={z > 0 ? 1 : -1} />
        </group>
      ))}
      <group renderOrder={1}>
        <Powertrain s={s} selected={selected} onSelect={onSelect} rich={rich} />
      </group>
      <mesh
        geometry={hull}
        material={[mats.paint, mats.glass]}
        renderOrder={2}
        raycast={noRaycast}
      />
      <mesh geometry={hull} material={mats.rim} renderOrder={3} raycast={noRaycast} />
      <group renderOrder={4}>
        <Lights body={body} s={s} />
      </group>
    </group>
  )
}
