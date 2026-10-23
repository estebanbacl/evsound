import { readFileSync } from 'node:fs'
import { EngineModel } from './EngineModel'
import { soundProfiles } from './profiles'
import { defaultCalibration } from './types'
import { KalmanEstimator } from '../telemetry/KalmanEstimator'
import { OutputSmoother } from '../telemetry/OutputSmoother'

/**
 * Logic-level soak (RNF-2 proxy): 10 simulated minutes at 60 Hz through the same
 * Kalman → EngineModel pipeline as the app. It cannot hear glitches, but it proves the
 * parameters sent to the audio graph are finite, bounded and free of rapid gear hunting.
 */
describe.each(soundProfiles)('10-minute highway soak: $name', (profile) => {
  const trace = JSON.parse(readFileSync('public/traces/highway.json', 'utf8')) as {
    t: number
    speedMs: number
  }[]
  const k = new KalmanEstimator()
  const smoother = new OutputSmoother() // same stage the app applies before the audio engine
  const model = new EngineModel(profile, defaultCalibration)
  let frames = 0
  let shifts = 0
  let lastGear = 1
  let lastShiftT = -Infinity
  let minGap = Infinity
  let bad = 0
  let maxRpmStepOutsideShift = 0
  let prevRpm = profile.idleRpm
  let prevShiftFrame = -99

  for (const p of trace) {
    k.update(p.speedMs, p.t * 1000)
    for (let f = 0; f < 60; f++) {
      const t = p.t * 1000 + (f * 1000) / 60
      const e = k.estimateAt(t)
      const fr = model.step(smoother.step(e.speedMs, t), e.accelMs2, 1 / 60)
      frames++
      if (
        ![fr.rpm, fr.level, fr.load, fr.lowpassHz, fr.pitchMul, fr.shiftDip].every(Number.isFinite)
      )
        bad++
      if (
        fr.rpm < profile.idleRpm - 1 ||
        fr.rpm > profile.redlineRpm + 1 ||
        fr.level < 0 ||
        fr.level > 1.0001
      )
        bad++
      if (fr.gear !== lastGear) {
        shifts++
        minGap = Math.min(minGap, t - lastShiftT)
        lastShiftT = t
        lastGear = fr.gear
        prevShiftFrame = frames
      } else if (frames - prevShiftFrame > 2) {
        maxRpmStepOutsideShift = Math.max(maxRpmStepOutsideShift, Math.abs(fr.rpm - prevRpm))
      }
      prevRpm = fr.rpm
    }
  }

  it('covers ten minutes of frames', () => expect(frames).toBeGreaterThanOrEqual(590 * 60))
  it('never emits non-finite or out-of-range parameters', () => expect(bad).toBe(0))
  it('has no gear hunting (≥ 0.5 s between shifts)', () => {
    if (shifts > 0) expect(minGap).toBeGreaterThanOrEqual(499)
  })
  it('shifts a believable number of times (< 25 over the trace)', () =>
    expect(shifts).toBeLessThan(25))
  it('rpm moves smoothly between shifts (≤ 400 rpm per 60 Hz frame)', () =>
    expect(maxRpmStepOutsideShift).toBeLessThan(400))
})
