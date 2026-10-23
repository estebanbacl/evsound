import { KalmanEstimator } from './KalmanEstimator'

const rng = (seed: number) => () =>
  ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32 - 0.5) * 2

describe('KalmanEstimator', () => {
  it('initialises on the first measurement', () => {
    const k = new KalmanEstimator()
    expect(k.update(10, 0).speedMs).toBe(10)
    expect(k.estimateAt(0).speedMs).toBe(10)
  })

  it('converges on a step', () => {
    const k = new KalmanEstimator()
    for (let i = 0; i < 5; i++) k.update(0, i * 1000)
    let est = 0
    for (let i = 5; i < 20; i++) est = k.update(20, i * 1000).speedMs
    expect(est).toBeCloseTo(20, 0)
  })

  it('tracks a ramp with small error and estimates acceleration', () => {
    const k = new KalmanEstimator()
    let last = { speedMs: 0, accelMs2: 0 }
    for (let i = 0; i <= 20; i++) last = k.update(i * 2, i * 1000)
    expect(last.speedMs).toBeGreaterThan(38)
    expect(last.accelMs2).toBeCloseTo(2, 0)
  })

  it('reduces measurement noise', () => {
    const k = new KalmanEstimator()
    const r = rng(7)
    let errRaw = 0
    let errEst = 0
    let n = 0
    for (let i = 0; i < 100; i++) {
      const z = 15 + r() * 1.5
      const e = k.update(z, i * 1000).speedMs
      if (i > 10) {
        errRaw += (z - 15) ** 2
        errEst += (e - 15) ** 2
        n++
      }
    }
    expect(errEst / n).toBeLessThan(errRaw / n)
  })

  it('extrapolates over gaps with a cap and never goes negative', () => {
    const k = new KalmanEstimator()
    for (let i = 0; i <= 10; i++) k.update(i * 2, i * 1000)
    const at1 = k.estimateAt(10_000 + 1000).speedMs
    const at5 = k.estimateAt(10_000 + 5000).speedMs
    const at30 = k.estimateAt(10_000 + 30_000).speedMs
    expect(at1).toBeGreaterThan(20)
    expect(at5).toBeCloseTo(at30, 5) // settles after the 1.5 s cap
    const d = new KalmanEstimator()
    for (let i = 0; i <= 5; i++) d.update(Math.max(0, 10 - i * 4), i * 1000)
    for (let ms = 5000; ms < 12_000; ms += 16)
      expect(d.estimateAt(ms).speedMs).toBeGreaterThanOrEqual(0)
  })

  it('is continuous between measurements (no 1 Hz staircase)', () => {
    const k = new KalmanEstimator()
    for (let i = 0; i <= 10; i++) k.update(i * 1.5, i * 1000)
    let prev = k.estimateAt(10_000).speedMs
    for (let ms = 10_016; ms <= 11_000; ms += 16) {
      const v = k.estimateAt(ms).speedMs
      expect(Math.abs(v - prev)).toBeLessThan(0.1)
      prev = v
    }
  })

  it('reset clears state', () => {
    const k = new KalmanEstimator()
    k.update(30, 0)
    k.reset()
    expect(k.estimateAt(1000).speedMs).toBe(0)
    expect(k.lastUpdateT).toBeNull()
  })
})
