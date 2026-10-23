import { useSettingsStore } from './settingsStore'
import { soundProfiles } from '../audio/profiles'

describe('settingsStore', () => {
  it('cycles profiles with wrap-around', () => {
    const s = useSettingsStore.getState()
    s.setProfile(soundProfiles[0].id)
    s.cycleProfile(-1)
    expect(useSettingsStore.getState().profileId).toBe(soundProfiles.at(-1)!.id)
    useSettingsStore.getState().cycleProfile(1)
    expect(useSettingsStore.getState().profileId).toBe(soundProfiles[0].id)
  })

  it('clamps values and flips to custom on manual tweaks', () => {
    const s = useSettingsStore.getState()
    s.setPreset('sport')
    s.setVolume(3)
    expect(useSettingsStore.getState().volume).toBe(1)
    useSettingsStore.getState().setIntensity(0.3)
    expect(useSettingsStore.getState().preset).toBe('custom')
  })

  it('presets set intensity, character and shift bias; manual tweaks go custom', () => {
    useSettingsStore.getState().setPreset('sport')
    expect(useSettingsStore.getState()).toMatchObject({
      preset: 'sport',
      intensity: 1,
      shiftBias: 800,
    })
    useSettingsStore.getState().setPreset('comfort')
    expect(useSettingsStore.getState()).toMatchObject({ preset: 'comfort', shiftBias: -700 })
    useSettingsStore.getState().setCharacter(0.5)
    expect(useSettingsStore.getState().preset).toBe('custom')
  })
})
