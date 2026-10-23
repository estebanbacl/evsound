import type { EngineSettings } from './EngineModel'

export type SoundPresetId = 'comfort' | 'balanced' | 'sport'

/** Sound presets only: they never touch the vehicle. */
export const soundPresets: Record<SoundPresetId, EngineSettings & { label: string }> = {
  comfort: { label: 'Confort', intensity: 0.5, character: -0.3, shiftBias: -700 },
  balanced: { label: 'Balanceado', intensity: 0.8, character: 0, shiftBias: 0 },
  sport: { label: 'Deportivo', intensity: 1, character: 0.3, shiftBias: 800 },
}
