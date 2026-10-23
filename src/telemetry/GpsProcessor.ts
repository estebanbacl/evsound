import { haversine } from './haversine'
import type { TelemetrySample } from './types'

export interface GpsFix {
  t: number
  lat: number
  lon: number
  speed: number | null
  accuracy: number
}

export interface GpsOptions {
  maxAccuracyM: number
  maxAccelMs2: number
  staleAfterMs: number
  staleMinSpeedMs: number
}

export const defaultGpsOptions: GpsOptions = {
  maxAccuracyM: 50,
  maxAccelMs2: 8,
  staleAfterMs: 3000,
  staleMinSpeedMs: 2,
}

/** Pure logic behind GeolocationSource: speed selection, outlier rejection, stale detection. */
export class GpsProcessor {
  private opts: GpsOptions
  private prev: GpsFix | null = null
  private lastSpeed = 0
  private lastChangeT: number | null = null
  rejected = 0

  constructor(opts: Partial<GpsOptions> = {}) {
    this.opts = { ...defaultGpsOptions, ...opts }
  }

  /** Returns a sample, or null if the fix was rejected / carries no new information. */
  process(fix: GpsFix): TelemetrySample | null {
    const { maxAccuracyM, maxAccelMs2, staleMinSpeedMs } = this.opts
    if (fix.accuracy > maxAccuracyM) return this.reject()

    const prev = this.prev
    const dt = prev ? (fix.t - prev.t) / 1000 : 0
    let speedMs: number
    let source: TelemetrySample['source']
    if (fix.speed !== null && Number.isFinite(fix.speed) && fix.speed >= 0) {
      speedMs = fix.speed
      source = 'gps'
    } else if (prev && dt > 0) {
      speedMs = haversine(prev.lat, prev.lon, fix.lat, fix.lon) / dt
      source = 'derived'
    } else {
      this.prev = fix
      return null
    }

    // Frozen position while reporting motion: same coordinates twice is not new information.
    if (prev && prev.lat === fix.lat && prev.lon === fix.lon && speedMs > staleMinSpeedMs) {
      return null
    }
    if (
      this.lastChangeT !== null &&
      dt > 0 &&
      Math.abs(speedMs - this.lastSpeed) / Math.max(dt, 1) > maxAccelMs2
    ) {
      return this.reject()
    }

    const accelMs2 = prev && dt > 0 ? (speedMs - this.lastSpeed) / dt : 0
    this.prev = fix
    this.lastSpeed = speedMs
    this.lastChangeT = fix.t
    return { t: fix.t, speedMs, accelMs2, source, quality: 'good' }
  }

  /** Call periodically; returns a stale sample when motion was reported but updates stopped. */
  tick(now: number): TelemetrySample | null {
    if (this.lastChangeT === null) return null
    const { staleAfterMs, staleMinSpeedMs } = this.opts
    if (now - this.lastChangeT > staleAfterMs && this.lastSpeed > staleMinSpeedMs) {
      return { t: now, speedMs: this.lastSpeed, accelMs2: 0, source: 'gps', quality: 'stale' }
    }
    return null
  }

  lost(now: number): TelemetrySample {
    return { t: now, speedMs: this.lastSpeed, accelMs2: 0, source: 'gps', quality: 'lost' }
  }

  private reject() {
    this.rejected++
    return null
  }
}
