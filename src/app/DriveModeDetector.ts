export interface DriveModeOptions {
  startKmh: number
  startHoldMs: number
  stopKmh: number
  stopHoldMs: number
}

export const defaultDriveModeOptions: DriveModeOptions = {
  startKmh: 8,
  startHoldMs: 3000,
  stopKmh: 3,
  stopHoldMs: 5000,
}

/** Drive Mode on at v > 8 km/h sustained 3 s; off at v < 3 km/h sustained 5 s. Pure. */
export class DriveModeDetector {
  private opts: DriveModeOptions
  private _active = false
  private since: number | null = null

  constructor(opts: Partial<DriveModeOptions> = {}) {
    this.opts = { ...defaultDriveModeOptions, ...opts }
  }

  get active() {
    return this._active
  }

  reset() {
    this._active = false
    this.since = null
  }

  update(kmh: number, nowMs: number): boolean {
    const { startKmh, startHoldMs, stopKmh, stopHoldMs } = this.opts
    const crossing = this._active ? kmh < stopKmh : kmh > startKmh
    if (!crossing) {
      this.since = null
      return this._active
    }
    this.since ??= nowMs
    if (nowMs - this.since >= (this._active ? stopHoldMs : startHoldMs)) {
      this._active = !this._active
      this.since = null
    }
    return this._active
  }
}
