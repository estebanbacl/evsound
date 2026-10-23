import { useEffect, useMemo } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  EdgesGeometry,
  ExtrudeGeometry,
  Shape,
} from 'three'
import { buildBodyLoft, buildBodyWires } from '../../vehicles/bodyGeometry'
import { bodyShapes } from '../../vehicles/bodyShapes'
import type { BodyType } from '../../vehicles/types'
import { createXrayMaterial } from './xray'

export type VehiclePart = 'battery' | 'motor'

interface Props {
  body: BodyType
  stations: number
  selected: VehiclePart | null
  onSelect: (p: VehiclePart | null) => void
}

function extrude(points: [number, number][], depth: number) {
  const shape = new Shape()
  points.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)))
  shape.closePath()
  const g = new ExtrudeGeometry(shape, { depth, bevelEnabled: false })
  g.translate(0, 0, -depth / 2)
  return g
}

function hullGeometry(body: BodyType, stations: number) {
  const loft = buildBodyLoft(body, stations)
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(loft.positions, 3))
  g.setIndex(new BufferAttribute(loft.indices, 1))
  g.computeVertexNormals()
  return g
}

function hullWires(body: BodyType, stations: number) {
  const w = buildBodyWires(buildBodyLoft(body, stations))
  const mk = (a: Float32Array) =>
    new BufferGeometry().setAttribute('position', new BufferAttribute(a, 3))
  return { longitudinal: mk(w.longitudinal), ribs: mk(w.ribs) }
}

const AMBER = '#ff9f43'

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
  return (
    <lineSegments geometry={edges}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineSegments>
  )
}

/** Stylised wireframe/X-ray vehicle (no brand marks) with battery and motors in amber. */
export function ProceduralVehicle({ body, stations, selected, onSelect }: Props) {
  const s = bodyShapes[body]
  const geo = useMemo(
    () => ({
      hull: hullGeometry(body, stations),
      wheel: new CylinderGeometry(s.wheelRadius, s.wheelRadius, 0.2, 28),
      battery: extrude(
        [
          [-1.25, 0],
          [1.25, 0],
          [1.25, 0.14],
          [-1.25, 0.14],
        ],
        s.width - 0.6,
      ),
      motor: new CylinderGeometry(0.17, 0.17, s.width - 0.8, 20),
    }),
    [s, body, stations],
  )
  const wires = useMemo(() => hullWires(body, stations), [body, stations])
  const xray = useMemo(() => createXrayMaterial(), [])
  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose())
      wires.longitudinal.dispose()
      wires.ribs.dispose()
      xray.dispose()
    },
    [geo, wires, xray],
  )

  const wheelZ = s.width / 2 - 0.2
  const wheels: [number, number][] = [
    [s.wheelbaseHalf, wheelZ],
    [s.wheelbaseHalf, -wheelZ],
    [-s.wheelbaseHalf, wheelZ],
    [-s.wheelbaseHalf, -wheelZ],
  ]
  const partProps = (part: VehiclePart) => ({
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation()
      onSelect(selected === part ? null : part)
    },
    onPointerOver: () => (document.body.style.cursor = 'pointer'),
    onPointerOut: () => (document.body.style.cursor = ''),
  })
  const amberOpacity = (part: VehiclePart) => (selected === part ? 0.95 : 0.5)

  return (
    <group onClick={() => onSelect(null)}>
      {/* shell: translucent fresnel surface + wire mesh */}
      <mesh geometry={geo.hull} material={xray} />
      <lineSegments geometry={wires.longitudinal}>
        <lineBasicMaterial color="#ff3a3a" transparent opacity={0.85} />
      </lineSegments>
      <lineSegments geometry={wires.ribs}>
        <lineBasicMaterial color="#ff2a2a" transparent opacity={0.35} />
      </lineSegments>
      {/* wheels */}
      {wheels.map(([x, z], i) => (
        <group key={i} position={[x, s.wheelRadius, z]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh geometry={geo.wheel} material={xray} />
          <Edges geometry={geo.wheel} angle={50} color="#ff5a5a" opacity={0.8} />
        </group>
      ))}
      {/* battery pack */}
      <group
        position={[0, s.batteryY, 0]}
        scale={selected === 'battery' ? 1.03 : 1}
        {...partProps('battery')}
      >
        <mesh geometry={geo.battery}>
          <meshBasicMaterial color={AMBER} transparent opacity={amberOpacity('battery') * 0.6} />
        </mesh>
        <Edges
          geometry={geo.battery}
          angle={20}
          color="#ffd08a"
          opacity={amberOpacity('battery')}
        />
      </group>
      {/* motors on both axles */}
      {[s.wheelbaseHalf, -s.wheelbaseHalf].map((x) => (
        <group
          key={x}
          position={[x, s.wheelRadius, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={selected === 'motor' ? 1.1 : 1}
          {...partProps('motor')}
        >
          <mesh geometry={geo.motor}>
            <meshBasicMaterial color={AMBER} transparent opacity={amberOpacity('motor') * 0.6} />
          </mesh>
          <Edges geometry={geo.motor} angle={40} color="#ffd08a" opacity={amberOpacity('motor')} />
        </group>
      ))}
      {/* light bars */}
      <mesh position={[s.length / 2 - 0.12, s.lower[3][1] - 0.06, 0]}>
        <boxGeometry args={[0.04, 0.04, s.width - 0.5]} />
        <meshBasicMaterial color="#d6ecff" />
      </mesh>
      <mesh position={[-s.length / 2 + 0.02, s.lower[5][1] - 0.1, 0]}>
        <boxGeometry args={[0.04, 0.05, s.width - 0.4]} />
        <meshBasicMaterial color="#ff2a2a" />
      </mesh>
    </group>
  )
}
