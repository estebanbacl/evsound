export interface SoundProfile {
  id: string
  name: string
  kind: 'sampled' | 'synth'
  /** Virtual gear ratios, first gear first. One entry = continuous (no shifts). */
  gears: number[]
  idleRpm: number
  redlineRpm: number
  shiftUpRpm: number
  shiftDownRpm: number
  /** Firing pulses = rpm/60 · cylinders/2. Also used as "pulses per rev" for turbine-like profiles. */
  cylinders: number
  layers?: { rpm: number; onLoad: string; offLoad?: string }[]
  synth?: {
    oscillators: { type: OscillatorType; harmonic: number; gain: number; detuneCents?: number }[]
    noise: number
  }
  fx: { lowpassBaseHz: number; lowpassLoadHz: number; distortion: number }
}

/** Per-frame engine state computed by EngineModel and applied to a voice. */
export interface EngineFrame {
  rpm: number
  gear: number
  load: number
  /** 0..1 torque-cut dip during a gear change. */
  shiftDip: number
  /** True on the single frame an aggressive upshift happens. */
  pop: boolean
  /** Linear output level 0..1 (load, intensity and shift dip applied). */
  level: number
  lowpassHz: number
  /** Pitch multiplier from the "character" setting. */
  pitchMul: number
}

export interface Voice {
  connect(dest: AudioNode): void
  setFrame(frame: EngineFrame): void
  stop(): void
}

export interface VehicleCalibration {
  maxSpeedKmh: number
  accelRefMs2: number
}

export const defaultCalibration: VehicleCalibration = { maxSpeedKmh: 217, accelRefMs2: 6 }
