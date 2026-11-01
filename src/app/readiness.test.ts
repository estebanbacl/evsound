import { initialReadiness, overallStatus, type Readiness } from './readiness'
import { detectAudioEngine, probeGps, queryGeoPermission } from './readinessChecks'

const base = (over: Partial<Readiness> = {}): Readiness => ({
  ...initialReadiness(true),
  ...over,
})

describe('overallStatus', () => {
  it('is pending until audio is confirmed and GPS was checked', () => {
    expect(overallStatus(initialReadiness(true))).toBe('pending')
    expect(overallStatus(base({ output: 'confirmed' }))).toBe('pending') // gps not checked yet
    expect(overallStatus(base({ gps: 'ok' }))).toBe('pending') // sound not confirmed
    expect(overallStatus(base({ gps: 'ok', output: 'failed' }))).toBe('pending')
    expect(overallStatus(base({ audioEngine: false, gps: 'ok', output: 'confirmed' }))).toBe(
      'pending',
    )
  })

  it('is ready only with working audio and a real GPS fix', () => {
    expect(overallStatus(base({ gps: 'ok', output: 'confirmed' }))).toBe('ready')
  })

  it.each(['nosignal', 'denied', 'unsupported'] as const)(
    'is limited (ambient only) when audio works but GPS is %s',
    (gps) => expect(overallStatus(base({ gps, output: 'confirmed' }))).toBe('limited'),
  )

  it('never reports GPS/permission as ok by default', () => {
    const r = initialReadiness(true)
    expect(r.gps).toBe('unchecked')
    expect(r.permission).toBe('unknown')
    expect(r.output).toBe('unchecked')
  })
})

describe('readinessChecks', () => {
  it('detects the audio engine from the globals', () => {
    expect(typeof detectAudioEngine()).toBe('boolean')
    vi.stubGlobal('AudioContext', undefined)
    vi.stubGlobal('webkitAudioContext', undefined)
    expect(detectAudioEngine()).toBe(false)
    vi.stubGlobal('webkitAudioContext', function () {})
    expect(detectAudioEngine()).toBe(true)
    vi.unstubAllGlobals()
  })

  it('reads the geolocation permission without prompting, unknown when unsupported', async () => {
    expect(await queryGeoPermission(undefined)).toBe('unknown')
    expect(await queryGeoPermission({ query: async () => ({ state: 'granted' }) as never })).toBe(
      'granted',
    )
    expect(
      await queryGeoPermission({
        query: async () => {
          throw new Error('x')
        },
      }),
    ).toBe('unknown')
  })

  it('maps a position request to ok / denied / nosignal / unsupported', async () => {
    const geo = (fn: (ok: () => void, err: (e: { code: number }) => void) => void) =>
      ({
        getCurrentPosition: (ok: () => void, err: (e: { code: number }) => void) => fn(ok, err),
      }) as never
    expect(await probeGps(geo((ok) => ok()))).toBe('ok')
    expect(await probeGps(geo((_, err) => err({ code: 1 })))).toBe('denied')
    expect(await probeGps(geo((_, err) => err({ code: 3 })))).toBe('nosignal')
    expect(await probeGps(undefined)).toBe('unsupported')
  })
})
