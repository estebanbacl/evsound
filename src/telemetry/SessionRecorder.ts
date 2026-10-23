import type { TelemetrySample } from './types'

export interface RecordedSession {
  version: 1
  startedAt: string
  source: string | null
  raw: TelemetrySample[]
  estimate: { t: number; speedMs: number; accelMs2: number }[]
}

/** Opt-in recorder: nothing is stored unless `start()` was called, and nothing leaves the device. */
export class SessionRecorder {
  private active = false
  private startedAt = ''
  private source: string | null = null
  private raw: TelemetrySample[] = []
  private est: RecordedSession['estimate'] = []
  private lastEstT = -Infinity

  get recording() {
    return this.active
  }

  start() {
    this.active = true
    this.startedAt = new Date().toISOString()
    this.source = null
    this.raw = []
    this.est = []
    this.lastEstT = -Infinity
  }

  stop() {
    this.active = false
  }

  addRaw(s: TelemetrySample) {
    if (!this.active) return
    this.source = s.source
    this.raw.push(s)
  }

  /** Estimates are decimated to ~10 Hz. */
  addEstimate(t: number, speedMs: number, accelMs2: number) {
    if (!this.active || t - this.lastEstT < 100) return
    this.lastEstT = t
    this.est.push({ t, speedMs, accelMs2 })
  }

  toJSON(): RecordedSession {
    return {
      version: 1,
      startedAt: this.startedAt,
      source: this.source,
      raw: [...this.raw],
      estimate: [...this.est],
    }
  }

  exportJson(): string {
    return JSON.stringify(this.toJSON())
  }
}
