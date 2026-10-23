export type SampleSource = 'gps' | 'derived' | 'sim' | 'trace'
export type SampleQuality = 'good' | 'stale' | 'lost'

/** `t` in milliseconds (same clock as the `now` the consumer uses). */
export interface TelemetrySample {
  t: number
  speedMs: number
  accelMs2: number
  source: SampleSource
  quality: SampleQuality
}

export type SampleCallback = (sample: TelemetrySample) => void

export interface SpeedSource {
  readonly id: string
  start(onSample: SampleCallback): void
  stop(): void
}

export const KMH = 3.6
export const msToKmh = (ms: number) => ms * KMH
export const kmhToMs = (kmh: number) => kmh / KMH
