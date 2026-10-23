import { distortionCurve, firingFreq, layerMix, loadMix } from './mix'

const layers = [1000, 2500, 4500, 6500]

describe('layerMix', () => {
  it('equal-power crossfade keeps constant power', () => {
    for (const rpm of [1200, 1800, 3000, 4000, 5500]) {
      const power = layerMix(rpm, layers).reduce((s, m) => s + m.gain ** 2, 0)
      expect(power).toBeCloseTo(1, 5)
    }
  })

  it('uses only the two nearest layers', () => {
    const m = layerMix(3000, layers)
    expect(m.filter((x) => x.gain > 0).map((x) => x.index)).toEqual([1, 2])
  })

  it('is exactly one layer on its own rpm and at the extremes', () => {
    expect(layerMix(2500, layers)[1].gain).toBeCloseTo(1)
    expect(layerMix(500, layers)[0].gain).toBe(1)
    expect(layerMix(9000, layers)[3].gain).toBe(1)
  })

  it('playbackRate = rpm/layerRpm clamped to [0.5, 2]', () => {
    const m = layerMix(3000, layers)
    expect(m[1].rate).toBeCloseTo(1.2)
    expect(layerMix(300, layers)[3].rate).toBe(0.5)
    expect(layerMix(9000, layers)[0].rate).toBe(2)
  })

  it('works with a single layer', () => {
    expect(layerMix(3000, [2000])).toEqual([{ index: 0, gain: 1, rate: 1.5 }])
  })
})

describe('loadMix / firingFreq / distortion', () => {
  const fx = { lowpassBaseHz: 700, lowpassLoadHz: 3200 }
  it('volume 0.4+0.6·load and lowpass interpolation', () => {
    expect(loadMix(0, fx)).toEqual({ volume: 0.4, lowpassHz: 700 })
    expect(loadMix(1, fx)).toEqual({ volume: 1, lowpassHz: 3200 })
    expect(loadMix(5, fx).volume).toBe(1)
  })
  it('V8 firing frequency at 1200 rpm is 80 Hz', () => expect(firingFreq(1200, 8)).toBe(80))
  it('distortion curve is identity at 0 and bounded otherwise', () => {
    const id = distortionCurve(0, 5)
    expect(Array.from(id)).toEqual([-1, -0.5, 0, 0.5, 1])
    const c = distortionCurve(0.5, 5)
    expect(Math.max(...c)).toBeLessThanOrEqual(1)
    expect(c[3]).toBeGreaterThan(0.5)
  })
})
