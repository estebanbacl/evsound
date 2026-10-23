/**
 * First-order smoothing of the published speed. Hides the correction step the Kalman filter
 * makes at every 1 Hz measurement. Snaps to exactly 0 when the target is 0 (stops are crisp).
 */
export class OutputSmoother {
  private v = 0
  private lastT: number | null = null
  private tauS: number

  constructor(tauS = 0.2) {
    this.tauS = tauS
  }

  reset() {
    this.v = 0
    this.lastT = null
  }

  /** `target` in m/s at time `tMs`; returns the smoothed value. */
  step(target: number, tMs: number): number {
    const dt = this.lastT === null ? Infinity : Math.max(0, (tMs - this.lastT) / 1000)
    this.lastT = tMs
    this.v += (target - this.v) * (1 - Math.exp(-dt / this.tauS))
    if (target === 0 && this.v < 0.05) this.v = 0
    return this.v
  }
}
