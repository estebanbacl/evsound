import { bodyShapes } from './bodyShapes'
import type { BodyType } from './types'

type Pt = [number, number]

/** Highest y of a closed polygon at abscissa x, or null if x is outside it. */
export function topAt(poly: Pt[], x: number): number | null {
  let best: number | null = null
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i]
    const [x2, y2] = poly[(i + 1) % poly.length]
    if (x1 === x2) continue
    const lo = Math.min(x1, x2)
    const hi = Math.max(x1, x2)
    if (x < lo || x > hi) continue
    const y = y1 + ((y2 - y1) * (x - x1)) / (x2 - x1)
    if (best === null || y > best) best = y
  }
  return best
}

const END_R = 0.6
const END_P = 2.4
const RAKE = 0.12
const CONTROL_RING = 10

/** 1 along the body, falling to ~0 at the tips (superellipse rounding of plan and profile). */
export function endFactor(x: number, half: number) {
  const t = (Math.abs(x) - (half - END_R)) / END_R
  if (t <= 0) return 1
  return Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, t), END_P)), 1 / END_P)
}

/** Point on the nose (sign +1) or tail (-1) surface at lateral offset z, mid-bumper height. */
export function endAnchor(body: BodyType, z: number, sign: 1 | -1): [number, number] {
  const s = bodyShapes[body]
  const half = s.length / 2
  const f = Math.min(0.999, Math.abs(z) / (s.width / 2))
  const x = half - END_R + END_R * Math.pow(1 - Math.pow(f, END_P), 1 / END_P)
  const floor = Math.min(...s.lower.map((p) => p[1]))
  const belt = topAt(s.lower, Math.min(half - 0.02, x)) ?? floor + 0.3
  const vs = 0.55 + 0.45 * f
  return [sign * x, floor + RAKE * (1 - f) + (belt - floor) * 0.62 * vs]
}

export interface Loft {
  /** xyz triples, stations × ringSize vertices. */
  positions: Float32Array
  indices: Uint32Array
  /** Index offset where the glass (greenhouse) triangles start. */
  glassStart: number
  stations: number
  ringSize: number
}

export const RING_SIZE = CONTROL_RING * 4

function chaikin(ring: Pt[]): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < ring.length; i++) {
    const [ax, ay] = ring[i]
    const [bx, by] = ring[(i + 1) % ring.length]
    out.push([0.75 * ax + 0.25 * bx, 0.75 * ay + 0.25 * by])
    out.push([0.25 * ax + 0.75 * bx, 0.25 * ay + 0.75 * by])
  }
  return out
}

function blur(a: number[], passes = 2) {
  let cur = a
  for (let p = 0; p < passes; p++) {
    cur = cur.map((v, i) =>
      i === 0 || i === cur.length - 1 ? v : 0.25 * cur[i - 1] + 0.5 * v + 0.25 * cur[i + 1],
    )
  }
  return cur
}

/** Circular wheel-arch cut: how far the underbody rises at x. */
function archRaise(body: BodyType, x: number, belt: number, floorBase: number) {
  const s = bodyShapes[body]
  const reach = s.wheelRadius * 1.3
  let k = 0
  for (const x0 of [s.wheelbaseHalf, -s.wheelbaseHalf]) {
    const d = Math.abs(x - x0)
    if (d < reach) k = Math.max(k, Math.sqrt(1 - (d / reach) ** 2))
  }
  const ceiling = Math.min(2 * s.wheelRadius + 0.06, belt - 0.14)
  return Math.max(0, ceiling - floorBase) * k
}

/**
 * Lofts a smooth car body from the side-profile polygons: one rounded cross-section per
 * station along the length, with wheel arches, rounded nose/tail and a separate glass band.
 */
export function buildBodyLoft(body: BodyType, stations = 48): Loft {
  const s = bodyShapes[body]
  const half = s.length / 2
  const floorBase = Math.min(...s.lower.map((p) => p[1]))
  const eps = 1e-3

  // stations are clustered toward both ends, where the shape changes fastest
  const xs = Array.from({ length: stations }, (_, i) => {
    const u = i / (stations - 1)
    const x = 0.55 * (2 * u - 1) + 0.45 * -Math.cos(Math.PI * u)
    return Math.max(-half + eps, Math.min(half - eps, x * half))
  })
  const rawBelt = xs.map((x) => topAt(s.lower, x) ?? floorBase + 0.3)
  const rawTop = xs.map((x, i) => Math.max(rawBelt[i], topAt(s.cabin, x) ?? rawBelt[i]))
  const rawFloor = xs.map((x, i) => floorBase + archRaise(body, x, rawBelt[i], floorBase))
  const belts = blur(rawBelt)
  const tops = blur(rawTop)
  const floors = blur(rawFloor)

  const positions = new Float32Array(stations * RING_SIZE * 3)
  const beltY: number[] = []
  for (let i = 0; i < stations; i++) {
    const x = xs[i]
    const f = endFactor(x, half)
    const vs = 0.55 + 0.45 * f
    const fl = floors[i] + RAKE * (1 - f)
    const Y = (y: number) => fl + (y - fl) * vs
    const belt = belts[i]
    const top = tops[i]
    const hasCabin = top > belt + 0.02
    const w = (s.width / 2) * f
    const wFloor = w * 0.86
    const wRoof = hasCabin ? ((s.width - s.cabinInset) / 2) * 0.74 * f : w * 0.8
    const wGlass = hasCabin ? ((s.width - s.cabinInset) / 2) * f : w * 0.92
    const lift = fl + (belt - fl) * 0.2
    const glassY = belt + (top - belt) * 0.42
    beltY.push(Y(belt))
    const control: Pt[] = [
      [-wFloor, fl],
      [wFloor, fl],
      [w, Y(lift)],
      [w, Y(belt)],
      [wGlass, Y(glassY)],
      [wRoof, Y(top)],
      [-wRoof, Y(top)],
      [-wGlass, Y(glassY)],
      [-w, Y(belt)],
      [-w, Y(lift)],
    ]
    chaikin(chaikin(control)).forEach(([z, y], k) => {
      const o = (i * RING_SIZE + k) * 3
      positions[o] = x
      positions[o + 1] = y
      positions[o + 2] = z
    })
  }

  const bodyIdx: number[] = []
  const glassIdx: number[] = []
  for (let i = 0; i < stations - 1; i++) {
    for (let k = 0; k < RING_SIZE; k++) {
      const a = i * RING_SIZE + k
      const b = i * RING_SIZE + ((k + 1) % RING_SIZE)
      const c = (i + 1) * RING_SIZE + k
      const d = (i + 1) * RING_SIZE + ((k + 1) % RING_SIZE)
      const y = (positions[a * 3 + 1] + positions[d * 3 + 1]) / 2
      const glass = y > (beltY[i] + beltY[i + 1]) / 2 + 0.03
      ;(glass ? glassIdx : bodyIdx).push(a, c, b, b, c, d)
    }
  }
  const base = (stations - 1) * RING_SIZE
  for (let k = 1; k < RING_SIZE - 1; k++) {
    bodyIdx.push(0, k + 1, k)
    bodyIdx.push(base, base + k, base + k + 1)
  }
  return {
    positions,
    indices: Uint32Array.from([...bodyIdx, ...glassIdx]),
    glassStart: bodyIdx.length,
    stations,
    ringSize: RING_SIZE,
  }
}

/** Line segments for the wire look: bright longitudinals + dim transversal ribs. */
export function buildBodyWires(loft: Loft, ribEvery = 4) {
  const { positions: p, stations, ringSize } = loft
  const longitudinal: number[] = []
  const ribs: number[] = []
  const v = (i: number, k: number) => {
    const o = (i * ringSize + k) * 3
    return [p[o], p[o + 1], p[o + 2]]
  }
  for (let k = 0; k < ringSize; k++) {
    for (let i = 0; i < stations - 1; i++) longitudinal.push(...v(i, k), ...v(i + 1, k))
  }
  for (let i = 0; i < stations; i += ribEvery) {
    for (let k = 0; k < ringSize; k++) ribs.push(...v(i, k), ...v(i, (k + 1) % ringSize))
  }
  return { longitudinal: new Float32Array(longitudinal), ribs: new Float32Array(ribs) }
}
