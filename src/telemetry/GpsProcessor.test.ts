import { GpsProcessor, type GpsFix } from './GpsProcessor'

const fix = (t: number, p: Partial<GpsFix> = {}): GpsFix => ({
  t,
  lat: 4.7,
  lon: -74,
  speed: 10,
  accuracy: 5,
  ...p,
})

describe('GpsProcessor', () => {
  it('prefers coords.speed', () => {
    const s = new GpsProcessor().process(fix(0, { speed: 12 }))
    expect(s).toMatchObject({ speedMs: 12, source: 'gps', quality: 'good' })
  })

  it('falls back to haversine when speed is null', () => {
    const p = new GpsProcessor()
    expect(p.process(fix(0, { speed: null }))).toBeNull() // nothing to derive from yet
    const dLat = 10 / 111_195 // 10 m north in 1 s
    const s = p.process(fix(1000, { speed: null, lat: 4.7 + dLat }))
    expect(s?.source).toBe('derived')
    expect(s?.speedMs).toBeCloseTo(10, 0)
  })

  it('rejects poor accuracy and speed jumps', () => {
    const p = new GpsProcessor()
    expect(p.process(fix(0, { accuracy: 80 }))).toBeNull()
    expect(p.process(fix(0, { speed: 5, lat: 1 }))).not.toBeNull()
    expect(p.process(fix(1000, { speed: 30, lat: 2 }))).toBeNull() // +25 m/s in 1 s
    expect(p.rejected).toBe(2)
  })

  it('ignores a repeated position while reporting motion', () => {
    const p = new GpsProcessor()
    p.process(fix(0, { speed: 10 }))
    expect(p.process(fix(1000, { speed: 10 }))).toBeNull()
  })

  it('reports stale after 3 s without updates while moving', () => {
    const p = new GpsProcessor()
    p.process(fix(0, { speed: 10 }))
    expect(p.tick(2500)).toBeNull()
    expect(p.tick(3500)).toMatchObject({ quality: 'stale', speedMs: 10 })
  })

  it('does not report stale when stopped', () => {
    const p = new GpsProcessor()
    p.process(fix(0, { speed: 0.5 }))
    expect(p.tick(10_000)).toBeNull()
  })

  it('lost sample keeps last speed', () => {
    const p = new GpsProcessor()
    p.process(fix(0, { speed: 7 }))
    expect(p.lost(1000)).toMatchObject({ quality: 'lost', speedMs: 7 })
  })
})
