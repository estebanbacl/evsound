import { useTelemetryStore } from '../state/telemetryStore'
import { KalmanEstimator } from './KalmanEstimator'
import { OutputSmoother } from './OutputSmoother'
import { SessionRecorder } from './SessionRecorder'
import type { SpeedSource, TelemetrySample } from './types'

export interface HistoryPoint {
  t: number
  v: number
}

export interface EngineDeps {
  now?: () => number
  raf?: (cb: (t: number) => void) => number
  caf?: (id: number) => void
  estimator?: KalmanEstimator
}

const HISTORY_MS = 60_000

/**
 * Connects a SpeedSource to the Kalman filter and publishes the extrapolated estimate to
 * `telemetryStore` on every animation frame (~60 Hz).
 */
export class TelemetryEngine {
  readonly estimator: KalmanEstimator
  readonly recorder = new SessionRecorder()
  readonly rawHistory: HistoryPoint[] = []
  readonly estHistory: HistoryPoint[] = []
  private source: SpeedSource | null = null
  private smoother = new OutputSmoother()
  private rafId: number | null = null
  private now: () => number
  private raf: (cb: (t: number) => void) => number
  private caf: (id: number) => void

  constructor(deps: EngineDeps = {}) {
    this.now = deps.now ?? (() => Date.now())
    this.raf = deps.raf ?? ((cb) => requestAnimationFrame(cb))
    this.caf = deps.caf ?? ((id) => cancelAnimationFrame(id))
    this.estimator = deps.estimator ?? new KalmanEstimator()
  }

  start(source: SpeedSource) {
    this.stop()
    this.source = source
    this.estimator.reset()
    this.smoother.reset()
    this.rawHistory.length = 0
    this.estHistory.length = 0
    useTelemetryStore.getState().reset()
    useTelemetryStore.getState().setRunning(true)
    source.start((s) => this.handleSample(s))
    const loop = () => {
      this.tick(this.now())
      this.rafId = this.raf(loop)
    }
    this.rafId = this.raf(loop)
  }

  stop() {
    this.source?.stop()
    this.source = null
    if (this.rafId !== null) this.caf(this.rafId)
    this.rafId = null
    useTelemetryStore.getState().setRunning(false)
  }

  handleSample(s: TelemetrySample) {
    const store = useTelemetryStore.getState()
    store.setRaw(s.speedMs, s.quality, s.source)
    this.recorder.addRaw(s)
    this.push(this.rawHistory, s.t, s.speedMs)
    // Stale/lost samples carry a held value, not a measurement: don't feed the filter.
    if (s.quality === 'good') this.estimator.update(s.speedMs, s.t)
  }

  /** One frame of the 60 Hz loop. Exposed for tests. */
  tick(t: number) {
    const e = this.estimator.estimateAt(t)
    const v = this.smoother.step(e.speedMs, t)
    useTelemetryStore.getState().setEstimate(v, e.accelMs2)
    this.recorder.addEstimate(t, v, e.accelMs2)
    this.push(this.estHistory, t, v)
  }

  private push(arr: HistoryPoint[], t: number, v: number) {
    arr.push({ t, v })
    while (arr.length && t - arr[0].t > HISTORY_MS) arr.shift()
  }
}
