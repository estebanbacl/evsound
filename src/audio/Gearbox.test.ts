import { Gearbox } from './Gearbox'
import { v8Americano, naveEspacial } from './profiles'

const mk = (p = v8Americano) => new Gearbox({ ...p, maxSpeedKmh: 217 })
const kmh = (v: number) => v / 3.6

describe('Gearbox', () => {
  it('idles in first gear below 3 km/h', () => {
    const g = mk()
    const s = g.update(kmh(2), 0, 0.016)
    expect(s).toMatchObject({ gear: 1, rpm: v8Americano.idleRpm, idle: true })
  })

  it('rpm rises linearly with speed within a gear and reaches redline in top gear at max speed', () => {
    const g = mk()
    expect(g.rpmIn(5, kmh(217))).toBeCloseTo(v8Americano.redlineRpm, 0)
    expect(g.rpmIn(0, kmh(20))).toBeGreaterThan(g.rpmIn(0, kmh(10)))
  })

  it('upshifts past shiftUpRpm and drops rpm', () => {
    const g = mk()
    let prevRpm = 0
    let shifted = false
    for (let v = 5; v < 80 && !shifted; v += 0.5) {
      const s = g.update(kmh(v), 0, 0.6)
      if (s.shifted === 'up') {
        shifted = true
        expect(s.rpm).toBeLessThan(prevRpm)
        expect(s.gear).toBe(2)
      }
      prevRpm = s.rpm
    }
    expect(shifted).toBe(true)
  })

  it('high load delays the upshift to higher rpm', () => {
    const shiftRpm = (load: number) => {
      const g = mk()
      for (let v = 5; v < 100; v += 0.2) {
        const before = g.rpmIn(0, kmh(v))
        const s = g.update(kmh(v), load, 0.6)
        if (s.shifted === 'up') return before
      }
      return 0
    }
    expect(shiftRpm(1)).toBeGreaterThan(shiftRpm(0) + 500)
  })

  it('downshifts when slowing (hysteresis: no hunting)', () => {
    const g = mk()
    for (let v = 5; v < 150; v += 1) g.update(kmh(v), 0, 0.6)
    expect(g.gear).toBeGreaterThan(3)
    const shifts: number[] = []
    let last = g.gear
    for (let v = 150; v > 4; v -= 0.5) {
      const s = g.update(kmh(v), 0, 0.6)
      if (s.gear !== last) shifts.push(s.gear)
      last = s.gear
    }
    expect(shifts.every((x, i) => i === 0 || x < shifts[i - 1])).toBe(true) // monotonic down
    expect(g.gear).toBe(1)
  })

  it('respects the minimum interval between shifts', () => {
    const g = mk()
    let n = 0
    for (let i = 0; i < 100; i++) if (g.update(kmh(60 + i), 0, 0.01).shifted) n++
    expect(n).toBeLessThanOrEqual(3) // 1 s total / 0.5 s interval
  })

  it('shift dip rises and falls', () => {
    const g = mk()
    let max = 0
    let dipAfter = 1
    let shiftedAt = -1
    for (let i = 0; i < 200; i++) {
      const s = g.update(kmh(5 + i * 0.4), 0, 0.016)
      if (s.shifted && shiftedAt < 0) shiftedAt = i
      if (shiftedAt >= 0) max = Math.max(max, s.shiftDip)
      if (shiftedAt >= 0 && i > shiftedAt + 30) dipAfter = Math.min(dipAfter, s.shiftDip)
    }
    expect(max).toBeGreaterThan(0.9)
    expect(dipAfter).toBe(0)
  })

  it('single-gear profiles never shift', () => {
    const g = mk(naveEspacial)
    for (let v = 0; v < 217; v += 1) expect(g.update(kmh(v), 1, 0.1).shifted).toBeNull()
  })

  it('reset returns to first gear', () => {
    const g = mk()
    for (let v = 5; v < 100; v++) g.update(kmh(v), 0, 0.6)
    g.reset()
    expect(g.gear).toBe(1)
  })
})
