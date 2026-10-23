export interface GearboxConfig {
  gears: number[]
  idleRpm: number
  redlineRpm: number
  shiftUpRpm: number
  shiftDownRpm: number
  maxSpeedKmh: number
  /** Minimum time between shifts (s). */
  minShiftIntervalS?: number
  /** Duration of the shift dip (s). */
  shiftDurationS?: number
}

export interface GearboxState {
  /** 1-based. */
  gear: number
  rpm: number
  shiftDip: number
  shifted: 'up' | 'down' | null
  idle: boolean
}

const IDLE_KMH = 3
const HYSTERESIS_RPM = 300

/** Virtual gearbox: speed → rpm with hysteresis and load-dependent shift points. Pure. */
export class Gearbox {
  private cfg: Required<GearboxConfig>
  private g = 0
  private sinceShift = Infinity
  private dipT = 0
  /** rpm added to the upshift point (and half of it to the downshift point). */
  shiftBiasRpm = 0

  constructor(cfg: GearboxConfig) {
    this.cfg = { minShiftIntervalS: 0.5, shiftDurationS: 0.3, ...cfg }
  }

  get gear() {
    return this.g + 1
  }

  reset() {
    this.g = 0
    this.sinceShift = Infinity
    this.dipT = 0
  }

  /** Speed (m/s) at which gear index `g` reaches redline. Top gear reaches redline at max speed. */
  vMaxMs(g: number): number {
    const { gears, maxSpeedKmh } = this.cfg
    return ((maxSpeedKmh / 3.6) * gears[gears.length - 1]) / gears[g]
  }

  rpmIn(g: number, speedMs: number): number {
    const { idleRpm, redlineRpm } = this.cfg
    const r = idleRpm + (speedMs / this.vMaxMs(g)) * (redlineRpm - idleRpm)
    return Math.min(r, redlineRpm)
  }

  /** Higher load postpones the upshift towards redline (sporty feel). */
  upshiftRpm(load: number): number {
    const { shiftUpRpm, redlineRpm } = this.cfg
    const base = Math.min(redlineRpm - 100, shiftUpRpm + this.shiftBiasRpm)
    return base + Math.min(1, Math.max(0, load)) * 0.6 * (redlineRpm - base)
  }

  update(speedMs: number, load: number, dtS: number): GearboxState {
    const { gears, idleRpm, shiftDurationS, minShiftIntervalS } = this.cfg
    const shiftDownRpm = this.cfg.shiftDownRpm + this.shiftBiasRpm * 0.5
    this.sinceShift += dtS
    this.dipT = Math.max(0, this.dipT - dtS)

    const idle = speedMs * 3.6 < IDLE_KMH
    let shifted: GearboxState['shifted'] = null
    if (idle) {
      this.g = 0
      this.dipT = 0
    } else if (this.sinceShift >= minShiftIntervalS) {
      const rpm = this.rpmIn(this.g, speedMs)
      const up = this.upshiftRpm(load)
      if (
        this.g < gears.length - 1 &&
        rpm > up &&
        this.rpmIn(this.g + 1, speedMs) > shiftDownRpm + HYSTERESIS_RPM
      ) {
        this.g++
        shifted = 'up'
      } else if (
        this.g > 0 &&
        rpm < shiftDownRpm &&
        this.rpmIn(this.g - 1, speedMs) < up - HYSTERESIS_RPM
      ) {
        this.g--
        shifted = 'down'
      }
      if (shifted) {
        this.sinceShift = 0
        this.dipT = shiftDurationS
      }
    }

    const shiftDip = this.dipT > 0 ? Math.sin(Math.PI * (1 - this.dipT / shiftDurationS)) : 0
    return {
      gear: this.gear,
      rpm: idle ? idleRpm : this.rpmIn(this.g, speedMs),
      shiftDip,
      shifted,
      idle,
    }
  }
}
