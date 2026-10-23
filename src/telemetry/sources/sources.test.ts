import { GeolocationSource } from './GeolocationSource'
import { SimulatedSource, VehiclePhysics } from './SimulatedSource'
import { TraceReplaySource } from './TraceReplaySource'
import type { TelemetrySample } from '../types'

afterEach(() => vi.useRealTimers())

describe('VehiclePhysics', () => {
  it('reaches 100 km/h close to the spec 0-100 time', () => {
    const p = new VehiclePhysics({ zeroTo100s: 4.3, maxSpeedKmh: 217 })
    p.throttle = 1
    let t = 0
    while (p.speedMs < 100 / 3.6 && t < 30) {
      p.step(0.01)
      t += 0.01
    }
    expect(t).toBeGreaterThan(4.3 * 0.9)
    expect(t).toBeLessThan(4.3 * 1.1)
  })

  it('brakes to zero and never goes negative', () => {
    const p = new VehiclePhysics({ zeroTo100s: 6.5, maxSpeedKmh: 170 })
    p.speedMs = 20
    p.brake = 1
    for (let i = 0; i < 1000; i++) {
      p.step(0.01)
      expect(p.speedMs).toBeGreaterThanOrEqual(0)
    }
    expect(p.speedMs).toBe(0)
  })

  it('coasts down slowly with no input', () => {
    const p = new VehiclePhysics({ zeroTo100s: 6.5, maxSpeedKmh: 170 })
    p.speedMs = 20
    for (let i = 0; i < 100; i++) p.step(0.01)
    expect(p.speedMs).toBeLessThan(20)
    expect(p.speedMs).toBeGreaterThan(19)
  })
})

describe('SimulatedSource', () => {
  it('emits sim samples at the configured rate', () => {
    vi.useFakeTimers()
    const out: TelemetrySample[] = []
    const s = new SimulatedSource({ zeroTo100s: 5, maxSpeedKmh: 200 }, () => Date.now(), 10)
    s.start((x) => out.push(x))
    s.setThrottle(1)
    vi.advanceTimersByTime(1000)
    s.stop()
    expect(out).toHaveLength(10)
    expect(out.at(-1)!.speedMs).toBeGreaterThan(out[0].speedMs)
    expect(out[0].source).toBe('sim')
  })
})

describe('TraceReplaySource', () => {
  const pts = [0, 5, 10, 8].map((v, t) => ({ t, speedMs: v }))

  it('replays at x1 and finishes', () => {
    vi.useFakeTimers()
    const out: TelemetrySample[] = []
    const end = vi.fn()
    new TraceReplaySource(pts, 1, () => Date.now(), end).start((x) => out.push(x))
    vi.advanceTimersByTime(5000)
    expect(out.map((o) => o.speedMs)).toEqual([0, 5, 10, 8])
    expect(out[1].accelMs2).toBe(5)
    expect(end).toHaveBeenCalledOnce()
  })

  it('replays 4x faster', () => {
    vi.useFakeTimers()
    const out: TelemetrySample[] = []
    new TraceReplaySource(pts, 4).start((x) => out.push(x))
    vi.advanceTimersByTime(800)
    expect(out).toHaveLength(4)
  })
})

describe('GeolocationSource', () => {
  it('emits lost when geolocation is unavailable', () => {
    const out: TelemetrySample[] = []
    new GeolocationSource(undefined).start((x) => out.push(x))
    expect(out[0].quality).toBe('lost')
  })

  it('forwards positions and errors, and clears the watch', () => {
    let ok: PositionCallback = () => {}
    let bad: PositionErrorCallback = () => {}
    const clearWatch = vi.fn()
    const geo = {
      watchPosition: (a: PositionCallback, b?: PositionErrorCallback | null) => {
        ok = a
        bad = b!
        return 7
      },
      clearWatch,
    }
    const out: TelemetrySample[] = []
    const src = new GeolocationSource(geo, () => 1000)
    src.start((x) => out.push(x))
    ok({
      coords: { latitude: 4.7, longitude: -74, speed: 9, accuracy: 4 },
      timestamp: 0,
    } as GeolocationPosition)
    bad({ code: 1, message: 'x' } as GeolocationPositionError)
    expect(out.map((o) => o.quality)).toEqual(['good', 'lost'])
    src.stop()
    expect(clearWatch).toHaveBeenCalledWith(7)
  })
})
