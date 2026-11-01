import { buildBodyLoft, buildBodyWires, RING_SIZE, topAt } from './bodyGeometry'
import { bodyShapes } from './bodyShapes'

describe('topAt', () => {
  const sq: [number, number][] = [
    [0, 0],
    [2, 0],
    [2, 1],
    [0, 1],
  ]
  it('returns the upper edge inside and null outside', () => {
    expect(topAt(sq, 1)).toBe(1)
    expect(topAt(sq, 3)).toBeNull()
  })
  it('interpolates slanted edges', () => {
    expect(
      topAt(
        [
          [0, 0],
          [2, 0],
          [0, 2],
        ],
        1,
      ),
    ).toBeCloseTo(1)
  })
})

describe.each(['suv', 'sedan', 'offroad'] as const)('buildBodyLoft(%s)', (body) => {
  const loft = buildBodyLoft(body, 32)
  const s = bodyShapes[body]

  it('has consistent sizes and valid indices', () => {
    expect(loft.positions.length).toBe(32 * RING_SIZE * 3)
    expect(Math.max(...loft.indices)).toBe(32 * RING_SIZE - 1)
    expect(loft.indices.length % 3).toBe(0)
  })

  it('stays inside the vehicle bounding box and is left/right symmetric', () => {
    let maxZ = 0
    let maxY = 0
    let minY = Infinity
    for (let i = 0; i < loft.positions.length; i += 3) {
      expect(Math.abs(loft.positions[i])).toBeLessThanOrEqual(s.length / 2)
      maxZ = Math.max(maxZ, Math.abs(loft.positions[i + 2]))
      maxY = Math.max(maxY, loft.positions[i + 1])
      minY = Math.min(minY, loft.positions[i + 1])
    }
    expect(maxZ).toBeLessThanOrEqual(s.width / 2 + 1e-6)
    expect(maxY).toBeCloseTo(Math.max(...s.cabin.map((p) => p[1])), 1)
    expect(minY).toBeCloseTo(Math.min(...s.lower.map((p) => p[1])), 5)
    let sumZ = 0
    for (let i = 2; i < loft.positions.length; i += 3) sumZ += loft.positions[i]
    expect(Math.abs(sumZ)).toBeLessThan(1e-3)
    expect(loft.glassStart).toBeGreaterThan(0)
    expect(loft.glassStart).toBeLessThan(loft.indices.length)
  })

  it('produces wire segments in pairs of vertices', () => {
    const w = buildBodyWires(loft)
    expect(w.longitudinal.length % 6).toBe(0)
    expect(w.ribs.length % 6).toBe(0)
    expect(w.longitudinal.length / 6).toBe(RING_SIZE * 31)
  })
})
