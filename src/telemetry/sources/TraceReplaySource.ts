import type { SampleCallback, SpeedSource } from '../types'

export interface TracePoint {
  /** seconds from start */
  t: number
  speedMs: number
}

export type TraceRate = 1 | 2 | 4

export class TraceReplaySource implements SpeedSource {
  readonly id = 'trace'
  private timer: ReturnType<typeof setInterval> | null = null
  private i = 0
  rate: TraceRate

  private points: TracePoint[]
  private now: () => number
  private onEnd?: () => void

  constructor(
    points: TracePoint[],
    rate: TraceRate = 1,
    now: () => number = () => Date.now(),
    onEnd?: () => void,
  ) {
    this.points = points
    this.now = now
    this.onEnd = onEnd
    this.rate = rate
  }

  start(onSample: SampleCallback) {
    this.stop()
    this.i = 0
    const emit = () => {
      if (this.i >= this.points.length) {
        this.stop()
        this.onEnd?.()
        return
      }
      const p = this.points[this.i]
      const prev = this.points[this.i - 1]
      const dt = prev ? p.t - prev.t : 0
      onSample({
        t: this.now(),
        speedMs: p.speedMs,
        accelMs2: dt > 0 ? (p.speedMs - prev.speedMs) / dt : 0,
        source: 'trace',
        quality: 'good',
      })
      this.i++
    }
    emit()
    this.timer = setInterval(emit, 1000 / this.rate)
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }
}

export async function loadTrace(
  name: string,
  fetcher: typeof fetch = fetch,
): Promise<TracePoint[]> {
  const res = await fetcher(`${import.meta.env.BASE_URL}traces/${name}.json`)
  if (!res.ok) throw new Error(`Trace ${name} not found`)
  return (await res.json()) as TracePoint[]
}
