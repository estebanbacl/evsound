import { kmhToMs, type SampleCallback, type SpeedSource } from '../types'

export interface SimParams {
  zeroTo100s: number
  maxSpeedKmh: number
  /** kg, used for rolling resistance and braking feel. */
  massKg?: number
}

/** Pure vehicle-speed physics for the virtual throttle. */
export class VehiclePhysics {
  speedMs = 0
  accelMs2 = 0
  throttle = 0
  brake = 0
  private aMax: number
  private vMax: number
  private mass: number

  constructor(p: SimParams) {
    this.vMax = kmhToMs(p.maxSpeedKmh)
    // 1.08 compensates the thrust fall-off so 0-100 lands on the spec time.
    this.aMax = (kmhToMs(100) / p.zeroTo100s) * 1.08
    this.mass = p.massKg ?? 1900
  }

  step(dt: number) {
    const thrust = this.throttle * this.aMax * (1 - (this.speedMs / this.vMax) ** 2)
    const drag = 0.0004 * this.speedMs ** 2 + (this.speedMs > 0 ? 0.12 : 0)
    const brake = this.brake * (9 * (1900 / this.mass) ** 0.2)
    const coast = this.throttle === 0 ? 0.25 : 0
    let a = thrust - drag - brake - (this.speedMs > 0 ? coast : 0)
    const next = Math.max(0, this.speedMs + a * dt)
    if (next === 0 && this.speedMs + a * dt < 0) a = -this.speedMs / dt
    this.speedMs = next
    this.accelMs2 = a
  }
}

export class SimulatedSource implements SpeedSource {
  readonly id = 'sim'
  readonly physics: VehiclePhysics
  private timer: ReturnType<typeof setInterval> | null = null

  private now: () => number
  private hz: number

  constructor(params: SimParams, now: () => number = () => Date.now(), hz = 10) {
    this.now = now
    this.hz = hz
    this.physics = new VehiclePhysics(params)
  }

  setThrottle(v: number) {
    this.physics.throttle = Math.min(1, Math.max(0, v))
  }
  setBrake(v: number) {
    this.physics.brake = Math.min(1, Math.max(0, v))
  }

  start(onSample: SampleCallback) {
    this.stop()
    this.timer = setInterval(() => {
      this.physics.step(1 / this.hz)
      onSample({
        t: this.now(),
        speedMs: this.physics.speedMs,
        accelMs2: this.physics.accelMs2,
        source: 'sim',
        quality: 'good',
      })
    }, 1000 / this.hz)
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }
}
