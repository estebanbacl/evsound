import { AudioEngine } from './AudioEngine'
import { EngineDriver } from './EngineDriver'
import { v8Americano } from './profiles'
import { useTelemetryStore } from '../state/telemetryStore'

function fakeCtx() {
  const param = () => ({
    value: 0,
    setTargetAtTime: vi.fn(),
    setValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  })
  const node = (): Record<string, unknown> => {
    const n: Record<string, unknown> = {
      gain: param(),
      frequency: param(),
      detune: param(),
      Q: param(),
      threshold: param(),
      knee: param(),
      ratio: param(),
      attack: param(),
      release: param(),
      playbackRate: param(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
    }
    n.connect = vi.fn(() => n)
    return n
  }
  return {
    state: 'running',
    currentTime: 0,
    sampleRate: 48000,
    destination: node(),
    addEventListener: vi.fn(),
    resume: vi.fn(async () => {}),
    createGain: node,
    createOscillator: node,
    createBiquadFilter: node,
    createWaveShaper: node,
    createBufferSource: node,
    createDynamicsCompressor: node,
    createAnalyser: node,
    createBuffer: () => ({ getChannelData: () => new Float32Array(10) }),
  }
}

describe('EngineDriver', () => {
  beforeEach(() => useTelemetryStore.getState().reset())

  it('requires an unlocked engine', async () => {
    const d = new EngineDriver(
      new AudioEngine(() => fakeCtx() as unknown as AudioContext, undefined),
    )
    await expect(d.start(v8Americano)).rejects.toThrow()
  })

  it('applies telemetry updates to the voice and records latency', async () => {
    const engine = new AudioEngine(() => fakeCtx() as unknown as AudioContext, undefined)
    await engine.unlock()
    const logs: string[] = []
    let now = 0
    const d = new EngineDriver(
      engine,
      () => now,
      (m) => logs.push(m),
    )
    await d.start(v8Americano)
    now = 10_000
    useTelemetryStore.getState().setEstimate(15, 3)
    expect(d.running).toBe(true)
    expect(d.frame?.rpm).toBeGreaterThan(v8Americano.idleRpm)
    expect(d.latency.frames).toBe(1)
    expect(logs[0]).toMatch(/latency/)
    d.setSettings({ intensity: 0.2 })
    now = 10_016
    useTelemetryStore.getState().setEstimate(16, 3)
    expect(d.frame!.level).toBeLessThan(0.25)
    d.stop()
    expect(d.running).toBe(false)
    useTelemetryStore.getState().setEstimate(20, 3)
    expect(d.latency.frames).toBe(2) // no more updates after stop
  })

  it('re-calibrates live when the vehicle changes', async () => {
    const engine = new AudioEngine(() => fakeCtx() as unknown as AudioContext, undefined)
    await engine.unlock()
    let now = 0
    const d = new EngineDriver(
      engine,
      () => now,
      () => {},
    )
    await d.start(v8Americano, { maxSpeedKmh: 217, accelRefMs2: 6 })
    now = 100
    useTelemetryStore.getState().setEstimate(15, 3)
    const loadBefore = d.frame!.load
    d.setCalibration({ maxSpeedKmh: 150, accelRefMs2: 3 })
    now = 200
    useTelemetryStore.getState().setEstimate(15.1, 3)
    expect(d.frame!.load).toBeGreaterThan(loadBefore) // same accel, smaller reference => more load
  })
})
