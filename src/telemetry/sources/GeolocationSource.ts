import { GpsProcessor } from '../GpsProcessor'
import type { SampleCallback, SpeedSource } from '../types'

type Geo = Pick<Geolocation, 'watchPosition' | 'clearWatch'>

export class GeolocationSource implements SpeedSource {
  readonly id = 'gps'
  private watchId: number | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private proc = new GpsProcessor()

  private geo: Geo | undefined
  private now: () => number

  constructor(
    geo: Geo | undefined = typeof navigator !== 'undefined' ? navigator.geolocation : undefined,
    now: () => number = () => Date.now(),
  ) {
    this.geo = geo
    this.now = now
  }

  start(onSample: SampleCallback) {
    if (!this.geo) {
      onSample(this.proc.lost(this.now()))
      return
    }
    this.watchId = this.geo.watchPosition(
      (pos) => {
        const s = this.proc.process({
          t: this.now(),
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          speed: pos.coords.speed,
          accuracy: pos.coords.accuracy,
        })
        if (s) onSample(s)
      },
      () => onSample(this.proc.lost(this.now())),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10_000 },
    )
    this.timer = setInterval(() => {
      const s = this.proc.tick(this.now())
      if (s) onSample(s)
    }, 1000)
  }

  stop() {
    if (this.watchId !== null) this.geo?.clearWatch(this.watchId)
    if (this.timer) clearInterval(this.timer)
    this.watchId = null
    this.timer = null
  }
}
