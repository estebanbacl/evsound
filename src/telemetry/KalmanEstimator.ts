export interface KalmanOptions {
  /** Process noise intensity (jerk variance, (m/s³)²). */
  q: number
  /** Measurement noise variance ((m/s)²). */
  r: number
  /** Time constant of the exponential decay of acceleration while extrapolating (s). */
  accelTau: number
  /** Maximum time the estimate is extrapolated past the last measurement (s). */
  maxExtrapolation: number
}

export const defaultKalmanOptions: KalmanOptions = {
  q: 2,
  r: 0.25,
  accelTau: 0.8,
  maxExtrapolation: 1.5,
}

export interface Estimate {
  speedMs: number
  accelMs2: number
}

/** 1-D constant-acceleration Kalman filter, state [v, a], measurement v. Pure, no I/O. */
export class KalmanEstimator {
  private opts: KalmanOptions
  private v = 0
  private a = 0
  // covariance [[p00, p01], [p01, p11]]
  private p00 = 1
  private p01 = 0
  private p11 = 1
  private lastT: number | null = null

  constructor(opts: Partial<KalmanOptions> = {}) {
    this.opts = { ...defaultKalmanOptions, ...opts }
  }

  get lastUpdateT(): number | null {
    return this.lastT
  }

  reset() {
    this.v = 0
    this.a = 0
    this.p00 = 1
    this.p01 = 0
    this.p11 = 1
    this.lastT = null
  }

  /** Feed a speed measurement `z` (m/s) taken at time `t` (ms). */
  update(z: number, t: number): Estimate {
    if (this.lastT === null) {
      this.v = z
      this.a = 0
      this.lastT = t
      return this.state()
    }
    const dt = Math.max((t - this.lastT) / 1000, 1e-3)
    this.lastT = t
    // predict
    const { q, r } = this.opts
    this.v += this.a * dt
    const p00 = this.p00 + dt * (2 * this.p01 + dt * this.p11) + (q * dt ** 3) / 3
    const p01 = this.p01 + dt * this.p11 + (q * dt ** 2) / 2
    const p11 = this.p11 + q * dt
    // correct
    const s = p00 + r
    const k0 = p00 / s
    const k1 = p01 / s
    const y = z - this.v
    this.v += k0 * y
    this.a += k1 * y
    this.p00 = (1 - k0) * p00
    this.p01 = (1 - k0) * p01
    this.p11 = p11 - k1 * p01
    return this.state()
  }

  /** Last filtered state without extrapolation. */
  state(): Estimate {
    return { speedMs: Math.max(0, this.v), accelMs2: this.a }
  }

  /**
   * Extrapolated estimate at time `t` (ms): v + a·τ·(1 − e^(−Δt/τ)), i.e. integrating an
   * exponentially attenuated acceleration. Δt is capped, so the value settles smoothly.
   */
  estimateAt(t: number): Estimate {
    if (this.lastT === null) return { speedMs: 0, accelMs2: 0 }
    const { accelTau: tau, maxExtrapolation } = this.opts
    const dt = Math.min(Math.max((t - this.lastT) / 1000, 0), maxExtrapolation)
    const speedMs = Math.max(0, this.v + this.a * tau * (1 - Math.exp(-dt / tau)))
    return { speedMs: speedMs < 0.05 ? 0 : speedMs, accelMs2: this.a * Math.exp(-dt / tau) }
  }
}
