import { Gearbox } from './Gearbox'
import { loadMix } from './mix'
import type { EngineFrame, SoundProfile, VehicleCalibration } from './types'

export interface EngineSettings {
  /** 0..1 */
  intensity: number
  /** -1 (deeper) .. 1 (higher) */
  character: number
}

export const defaultSettings: EngineSettings = { intensity: 1, character: 0 }

/** Pure: telemetry → engine frame (gear, rpm, load, level). No Web Audio. */
export class EngineModel {
  readonly gearbox: Gearbox
  settings: EngineSettings = { ...defaultSettings }

  private profile: SoundProfile
  private cal: VehicleCalibration

  constructor(profile: SoundProfile, cal: VehicleCalibration) {
    this.profile = profile
    this.cal = cal
    this.gearbox = new Gearbox({ ...profile, maxSpeedKmh: cal.maxSpeedKmh })
  }

  step(
    speedMs: number,
    accelMs2: number,
    dtS: number,
    quality: 'good' | 'stale' | 'lost' = 'good',
  ): EngineFrame {
    // Lost signal: settle at a soft idle instead of freezing at a random rpm.
    const v = quality === 'lost' ? 0 : speedMs
    const load = Math.min(1, Math.max(0, accelMs2 / this.cal.accelRefMs2))
    const g = this.gearbox.update(v, load, dtS)
    const mix = loadMix(load, this.profile.fx)
    const { intensity, character } = this.settings
    return {
      rpm: g.rpm,
      gear: g.gear,
      load,
      shiftDip: g.shiftDip,
      pop: g.shifted === 'up' && load > 0.7,
      level: mix.volume * (1 - 0.6 * g.shiftDip) * intensity,
      lowpassHz: mix.lowpassHz,
      pitchMul: 2 ** (character * 0.3),
    }
  }
}
