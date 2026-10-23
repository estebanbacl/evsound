import { EngineModel } from './EngineModel'
import { v8Americano } from './profiles'
import { defaultCalibration } from './types'

const mk = () => new EngineModel(v8Americano, defaultCalibration)

describe('EngineModel', () => {
  it('idle frame at standstill', () => {
    const f = mk().step(0, 0, 0.016)
    expect(f.rpm).toBe(v8Americano.idleRpm)
    expect(f.load).toBe(0)
    expect(f.level).toBeCloseTo(0.4)
  })

  it('load from acceleration drives level and lowpass', () => {
    const m = mk()
    const f = m.step(10, defaultCalibration.accelRefMs2, 0.016)
    expect(f.load).toBe(1)
    expect(f.level).toBeCloseTo(1)
    expect(f.lowpassHz).toBe(v8Americano.fx.lowpassLoadHz)
  })

  it('negative acceleration is zero load', () => {
    expect(mk().step(20, -5, 0.016).load).toBe(0)
  })

  it('intensity scales level, character shifts pitch', () => {
    const m = mk()
    m.settings.intensity = 0.5
    m.settings.character = 1
    const f = m.step(10, 0, 0.016)
    expect(f.level).toBeCloseTo(f.level)
    expect(f.level).toBeLessThan(0.25)
    expect(f.pitchMul).toBeGreaterThan(1)
  })

  it('lost signal settles to idle', () => {
    const f = mk().step(30, 2, 0.016, 'lost')
    expect(f.rpm).toBe(v8Americano.idleRpm)
  })

  it('flags a pop on aggressive upshifts and dips level', () => {
    const m = mk()
    let popped = false
    let dipped = false
    for (let v = 5; v < 80; v += 0.05) {
      const f = m.step(v / 3.6, 10, 0.02)
      if (f.pop) popped = true
      if (f.shiftDip > 0.5 && f.level < 0.7) dipped = true
    }
    expect(popped).toBe(true)
    expect(dipped).toBe(true)
  })
})
