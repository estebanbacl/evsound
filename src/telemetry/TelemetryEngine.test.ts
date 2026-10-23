import { readFileSync } from 'node:fs'
import { TelemetryEngine } from './TelemetryEngine'
import { SessionRecorder } from './SessionRecorder'
import type { SampleCallback, SpeedSource, TelemetrySample } from './types'
import { useTelemetryStore } from '../state/telemetryStore'

class FakeSource implements SpeedSource {
  id = 'fake'
  cb: SampleCallback = () => {}
  start(cb: SampleCallback) {
    this.cb = cb
  }
  stop() {}
}

const sample = (
  t: number,
  speedMs: number,
  quality: TelemetrySample['quality'] = 'good',
): TelemetrySample => ({
  t,
  speedMs,
  accelMs2: 0,
  source: 'sim',
  quality,
})

describe('TelemetryEngine', () => {
  const mk = () => {
    let now = 0
    const e = new TelemetryEngine({ now: () => now, raf: () => 1, caf: () => {} })
    return { e, setNow: (n: number) => (now = n) }
  }

  it('publishes raw and estimated speed to the store', () => {
    const { e } = mk()
    const src = new FakeSource()
    e.start(src)
    src.cb(sample(0, 10))
    e.tick(0)
    expect(useTelemetryStore.getState()).toMatchObject({
      speedMs: 10,
      rawSpeedMs: 10,
      running: true,
    })
    e.stop()
    expect(useTelemetryStore.getState().running).toBe(false)
  })

  it('does not feed stale samples to the filter but exposes quality', () => {
    const { e } = mk()
    const src = new FakeSource()
    e.start(src)
    src.cb(sample(0, 10))
    src.cb(sample(4000, 10, 'stale'))
    expect(useTelemetryStore.getState().quality).toBe('stale')
    expect(e.estimator.lastUpdateT).toBe(0)
  })

  it('urban trace: continuous, non-negative, reaches 0 at stops', () => {
    const trace = JSON.parse(readFileSync('public/traces/urban.json', 'utf8')) as {
      t: number
      speedMs: number
    }[]
    const { e } = mk()
    const src = new FakeSource()
    e.start(src)
    let prev = 0
    let maxStep = 0
    let zeros = 0
    for (const p of trace) {
      src.cb(sample(p.t * 1000, p.speedMs))
      for (let f = 0; f < 60; f++) {
        const t = p.t * 1000 + f * (1000 / 60)
        e.tick(t)
        const v = useTelemetryStore.getState().speedMs
        expect(v).toBeGreaterThanOrEqual(0)
        if (p.t > 0 || f > 0) maxStep = Math.max(maxStep, Math.abs(v - prev))
        prev = v
        if (v === 0) zeros++
      }
    }
    expect(maxStep).toBeLessThan(0.25) // m/s per frame, no 1 Hz staircase
    expect(zeros).toBeGreaterThan(60 * 20) // spends time at exactly 0 during stops
  })
})

describe('SessionRecorder', () => {
  it('records nothing until started, then exports JSON', () => {
    const r = new SessionRecorder()
    r.addRaw(sample(0, 1))
    expect(r.toJSON().raw).toHaveLength(0)
    r.start()
    r.addRaw(sample(0, 1))
    r.addEstimate(0, 1, 0)
    r.addEstimate(50, 1, 0) // decimated
    r.addEstimate(120, 2, 0)
    r.stop()
    r.addRaw(sample(1, 1))
    const j = JSON.parse(r.exportJson())
    expect(j.raw).toHaveLength(1)
    expect(j.estimate).toHaveLength(2)
    expect(j.version).toBe(1)
  })
})
