import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { soundPresets } from '../audio/presets'
import { soundProfiles } from '../audio/profiles'
import { safeStorage } from './safeStorage'

export type SoundPreset = 'comfort' | 'balanced' | 'sport' | 'custom'

interface SettingsState {
  profileId: string
  /** 0..1 user volume (output is further capped by AudioEngine.maxVolume). */
  volume: number
  intensity: number
  character: number
  shiftBias: number
  preset: SoundPreset
  setProfile: (id: string) => void
  cycleProfile: (dir: 1 | -1) => void
  setVolume: (v: number) => void
  setIntensity: (v: number) => void
  setCharacter: (v: number) => void
  setPreset: (p: SoundPreset) => void
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      profileId: soundProfiles[0].id,
      volume: 0.5,
      intensity: soundPresets.balanced.intensity,
      character: soundPresets.balanced.character,
      shiftBias: soundPresets.balanced.shiftBias,
      preset: 'balanced',
      setProfile: (profileId) => set({ profileId }),
      cycleProfile: (dir) => {
        const i = soundProfiles.findIndex((p) => p.id === get().profileId)
        const n = soundProfiles.length
        set({ profileId: soundProfiles[(i + dir + n) % n].id })
      },
      setVolume: (v) => set({ volume: clamp(v, 0, 1) }),
      setIntensity: (v) => set({ intensity: clamp(v, 0, 1), preset: 'custom' }),
      setCharacter: (v) => set({ character: clamp(v, -1, 1), preset: 'custom' }),
      setPreset: (preset) => {
        if (preset === 'custom') return set({ preset })
        const { intensity, character, shiftBias } = soundPresets[preset]
        set({ preset, intensity, character, shiftBias })
      },
    }),
    { name: 'ev-settings', storage: createJSONStorage(() => safeStorage), version: 1 },
  ),
)
