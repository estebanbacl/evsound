import { DriveModeDetector } from './DriveModeDetector'

describe('DriveModeDetector', () => {
  it('activates only after 3 s sustained above 8 km/h', () => {
    const d = new DriveModeDetector()
    expect(d.update(20, 0)).toBe(false)
    expect(d.update(20, 2900)).toBe(false)
    expect(d.update(20, 3000)).toBe(true)
  })

  it('a dip below the threshold restarts the activation timer', () => {
    const d = new DriveModeDetector()
    d.update(20, 0)
    d.update(5, 2000)
    d.update(20, 2500)
    expect(d.update(20, 5400)).toBe(false)
    expect(d.update(20, 5500)).toBe(true)
  })

  it('deactivates only after 5 s sustained below 3 km/h', () => {
    const d = new DriveModeDetector()
    d.update(50, 0)
    d.update(50, 3000)
    expect(d.active).toBe(true)
    expect(d.update(1, 4000)).toBe(true)
    expect(d.update(1, 8900)).toBe(true)
    expect(d.update(1, 9000)).toBe(false)
  })

  it('speeds between 3 and 8 km/h neither start nor stop (hysteresis)', () => {
    const d = new DriveModeDetector()
    for (let t = 0; t <= 10_000; t += 500) d.update(5, t)
    expect(d.active).toBe(false)
    d.update(50, 11_000)
    d.update(50, 14_000)
    for (let t = 14_500; t <= 30_000; t += 500) d.update(5, t)
    expect(d.active).toBe(true)
  })

  it('reset turns it off immediately', () => {
    const d = new DriveModeDetector()
    d.update(50, 0)
    d.update(50, 3000)
    d.reset()
    expect(d.active).toBe(false)
  })
})
