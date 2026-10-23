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

const smooth = (t: number) => t * t * (3 - 2 * t)

export interface Loft {
  /** xyz triples, stations × ringSize vertices. */
  positions: Float32Array
  indices: Uint32Array
  stations: number
  ringSize: number
}

export const RING_SIZE = 10

/**
 * Lofts a smooth car body from the side-profile polygons: one rounded cross-section per
 * station along the length. Section: floor, shoulder at belt line, tapered greenhouse, roof.
 */
export function buildBodyLoft(body: BodyType, stations = 48): Loft {
  const s = bodyShapes[body]
  const half = s.length / 2
  const floorY = Math.min(...s.lower.map((p) => p[1]))
  const positions = new Float32Array(stations * RING_SIZE * 3)
  const eps = 1e-3

  for (let i = 0; i < stations; i++) {
    const x = -half + eps + ((s.length - 2 * eps) * i) / (stations - 1)
    const belt = topAt(s.lower, x) ?? floorY + 0.3
    const roofTop = topAt(s.cabin, x)
    const top = Math.max(belt, roofTop ?? belt)
    const hasCabin = roofTop !== null && roofTop > belt + 0.02
    // nose/tail taper and rounding of the ends
    const e = smooth(Math.min(1, Math.abs(x) / half))
    const w = (s.width / 2) * (1 - 0.16 * e ** 3)
    const wFloor = w * 0.88
    const wRoof = hasCabin ? ((s.width - s.cabinInset) / 2) * 0.78 : w * 0.8
    const wGlass = hasCabin ? (s.width - s.cabinInset) / 2 : w * 0.92
    const lift = floorY + (belt - floorY) * 0.18
    const glassY = belt + (top - belt) * 0.4
    const ring: Pt[] = [
      [-wFloor, floorY],
      [wFloor, floorY],
      [w, lift],
      [w, belt],
      [wGlass, glassY],
      [wRoof, top],
      [-wRoof, top],
      [-wGlass, glassY],
      [-w, belt],
      [-w, lift],
    ]
    ring.forEach(([z, y], k) => {
      const o = (i * RING_SIZE + k) * 3
      positions[o] = x
      positions[o + 1] = y
      positions[o + 2] = z
    })
  }

  const quads = (stations - 1) * RING_SIZE
  const capTris = (RING_SIZE - 2) * 2
  const indices = new Uint32Array(quads * 6 + capTris * 3)
  let n = 0
  for (let i = 0; i < stations - 1; i++) {
    for (let k = 0; k < RING_SIZE; k++) {
      const a = i * RING_SIZE + k
      const b = i * RING_SIZE + ((k + 1) % RING_SIZE)
      const c = (i + 1) * RING_SIZE + k
      const d = (i + 1) * RING_SIZE + ((k + 1) % RING_SIZE)
      indices.set([a, c, b, b, c, d], n)
      n += 6
    }
  }
  for (let k = 1; k < RING_SIZE - 1; k++) {
    indices.set([0, k + 1, k], n)
    n += 3
    const base = (stations - 1) * RING_SIZE
    indices.set([base, base + k, base + k + 1], n)
    n += 3
  }
  return { positions, indices, stations, ringSize: RING_SIZE }
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
