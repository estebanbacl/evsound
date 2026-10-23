import { useTelemetryStore } from '../state/telemetryStore'
import { audioEngine, type AudioEngine } from './AudioEngine'
import { EngineModel, type EngineSettings } from './EngineModel'
import { EngineVoice, loadManifest } from './EngineVoice'
import { SynthVoice } from './SynthVoice'
import {
  defaultCalibration,
  type EngineFrame,
  type SoundProfile,
  type Voice,
  type VehicleCalibration,
} from './types'

export async function createVoice(ctx: AudioContext, profile: SoundProfile): Promise<Voice> {
  if (profile.kind === 'sampled') {
    const manifest = await loadManifest(profile.id)
    if (manifest) {
      try {
        return await EngineVoice.create(ctx, profile, manifest)
      } catch {
        /* fall through to synth */
      }
    }
  }
  return new SynthVoice(ctx, profile)
}

export interface LatencyStats {
  lastMs: number
  avgMs: number
  maxMs: number
  frames: number
}

/** Wires telemetryStore → EngineModel → Voice params (setTargetAtTime). */
export class EngineDriver {
  private model: EngineModel | null = null
  private voice: Voice | null = null
  private unsub: (() => void) | null = null
  private lastT = 0
  private settings: Partial<EngineSettings> = {}
  frame: EngineFrame | null = null
  latency: LatencyStats = { lastMs: 0, avgMs: 0, maxMs: 0, frames: 0 }
  private logAt = 0

  private engine: AudioEngine
  private now: () => number
  private log: (msg: string) => void

  constructor(
    engine: AudioEngine,
    now: () => number = () => performance.now(),
    log: (msg: string) => void = (m) => console.info(m),
  ) {
    this.engine = engine
    this.now = now
    this.log = log
  }

  get running() {
    return this.voice !== null
  }

  async start(profile: SoundProfile, cal: VehicleCalibration = defaultCalibration) {
    this.stop()
    const ctx = this.engine.context
    if (!ctx || !this.engine.input) throw new Error('AudioEngine not unlocked')
    const voice = await createVoice(ctx, profile)
    voice.connect(this.engine.input)
    this.voice = voice
    this.model = new EngineModel(profile, cal)
    Object.assign(this.model.settings, this.settings)
    this.lastT = this.now()
    this.latency = { lastMs: 0, avgMs: 0, maxMs: 0, frames: 0 }
    this.unsub = useTelemetryStore.subscribe((s, prev) => {
      if (
        s.speedMs !== prev.speedMs ||
        s.accelMs2 !== prev.accelMs2 ||
        s.quality !== prev.quality
      ) {
        this.apply(s.speedMs, s.accelMs2, s.quality, s.updatedAt)
      }
    })
  }

  setSettings(s: Partial<EngineSettings>) {
    this.settings = { ...this.settings, ...s }
    if (this.model) Object.assign(this.model.settings, s)
  }

  stop() {
    this.unsub?.()
    this.unsub = null
    this.voice?.stop()
    this.voice = null
    this.model = null
    this.frame = null
  }

  private apply(
    speedMs: number,
    accelMs2: number,
    quality: 'good' | 'stale' | 'lost',
    updatedAt: number,
  ) {
    if (!this.model || !this.voice) return
    const t = this.now()
    const dt = Math.min(0.25, Math.max(0, (t - this.lastT) / 1000))
    this.lastT = t
    this.frame = this.model.step(speedMs, accelMs2, dt, quality)
    this.voice.setFrame(this.frame)
    this.recordLatency(this.now() - updatedAt, t)
  }

  private recordLatency(ms: number, t: number) {
    const l = this.latency
    l.frames++
    l.lastMs = ms
    l.avgMs += (ms - l.avgMs) / l.frames
    l.maxMs = Math.max(l.maxMs, ms)
    if (t - this.logAt > 5000) {
      this.logAt = t
      this.log(
        `[audio] telemetry→AudioParam latency avg ${l.avgMs.toFixed(2)} ms, max ${l.maxMs.toFixed(2)} ms (${l.frames} frames)`,
      )
    }
  }
}

export const engineDriver = new EngineDriver(audioEngine)
