import { AmbientPlayer } from '../audio/AmbientPlayer'
import { audioEngine } from '../audio/AudioEngine'
import { loadCatalog, soundUrl, type AmbientCatalog } from '../audio/ambientCatalog'
import { coverDataUri } from '../audio/cover'
import { installMediaSession, updateMediaSession } from '../audio/mediaSession'
import { usePlayerStore } from '../state/playerStore'
import { useSessionStore } from '../state/sessionStore'
import { useSettingsStore } from '../state/settingsStore'
import { useToastStore } from '../state/toastStore'
import { stopEngine } from './engineSession'

const MIX_DUCK_LEVEL = 0.55

let player: AmbientPlayer | null = null
let started = false
let catalog: AmbientCatalog | null = null
let timer: ReturnType<typeof setTimeout> | null = null

/** Glue between playerStore, the AmbientPlayer, Media Session, the sleep timer and the engine policy. */
export function initAmbient(): void {
  if (started) return
  started = true
  const store = usePlayerStore
  player = new AmbientPlayer(audioEngine, {
    onError: (m) => {
      useToastStore.getState().push(m, 'error')
      store.getState().stop()
    },
  })
  player.setVolume(store.getState().volume)
  void loadCatalog()
    .then((c) => {
      catalog = c
      syncSession(store.getState())
    })
    .catch(() => undefined)

  installMediaSession({
    play: () => store.getState().setPlaying(true),
    pause: () => store.getState().setPlaying(false),
    stop: () => store.getState().stop(),
  })

  const syncSession = (s: ReturnType<typeof store.getState>) => {
    const sound = catalog?.sounds.find((x) => x.id === s.soundId)
    const cat = catalog?.categories.find((c) => c.id === sound?.categoryId)
    updateMediaSession(
      sound && cat
        ? {
            title: sound.title,
            artist: cat.title,
            album: 'EV Sound Studio',
            artworkUrl: coverDataUri(cat.cover),
          }
        : null,
      s.playing,
      null,
    )
  }

  const armTimer = (endsAt: number | null) => {
    if (timer) clearTimeout(timer)
    timer = null
    if (endsAt === null) return
    timer = setTimeout(() => store.getState().stop(), Math.max(0, endsAt - Date.now()))
  }

  store.subscribe((s, prev) => {
    if (s.volume !== prev.volume) player?.setVolume(s.volume)
    if (s.endsAt !== prev.endsAt) armTimer(s.endsAt)

    if (s.soundId !== prev.soundId && s.soundId) {
      const sound = catalog?.sounds.find((x) => x.id === s.soundId)
      if (sound) player?.load(soundUrl(sound))
      else
        void loadCatalog().then((c) => {
          catalog = c
          const found = c.sounds.find((x) => x.id === s.soundId)
          if (found) {
            player?.load(soundUrl(found))
            if (store.getState().playing) void player?.play()
          }
          syncSession(store.getState())
        })
    }
    if (s.playing !== prev.playing || s.soundId !== prev.soundId) {
      if (s.playing) {
        // "pause" policy: relaxation sounds replace the simulated engine
        if (
          useSettingsStore.getState().ambientMode === 'pause' &&
          useSessionStore.getState().running
        )
          stopEngine()
        void player?.play()
      } else if (prev.playing) {
        player?.pause()
      }
      syncSession(s)
    }
  })

  const applyEnginePolicy = () => {
    const running = useSessionStore.getState().running
    const mode = useSettingsStore.getState().ambientMode
    if (mode === 'pause') {
      player?.setDuck(1)
      if (running) store.getState().setPlaying(false)
    } else {
      player?.setDuck(running ? MIX_DUCK_LEVEL : 1)
    }
  }
  useSessionStore.subscribe((s, prev) => s.running !== prev.running && applyEnginePolicy())
  useSettingsStore.subscribe((s, prev) => s.ambientMode !== prev.ambientMode && applyEnginePolicy())
}
