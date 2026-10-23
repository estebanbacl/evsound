import { AmbientPlayer } from '../audio/AmbientPlayer'
import { audioEngine } from '../audio/AudioEngine'
import { trackUrl } from '../audio/ambientCatalog'
import { coverDataUri } from '../audio/cover'
import { installMediaSession, updateMediaSession } from '../audio/mediaSession'
import { currentItem, usePlayerStore } from '../state/playerStore'
import { useSessionStore } from '../state/sessionStore'
import { useSettingsStore } from '../state/settingsStore'
import { useToastStore } from '../state/toastStore'

const DUCK_LEVEL = 0.25

let player: AmbientPlayer | null = null
let started = false

/** Glue between playerStore, the AmbientPlayer, Media Session and the engine (ducking). Idempotent. */
export function initAmbient(): void {
  if (started) return
  started = true
  const store = usePlayerStore
  player = new AmbientPlayer(audioEngine, {
    onTime: (p, d) => {
      const s = store.getState()
      if (Math.abs(p - s.positionS) > 0.2) s.setProgress(p, d || s.durationS)
    },
    onEnded: () => store.getState().ended(),
    onError: (m) => {
      useToastStore.getState().push(m, 'error')
      store.getState().setPlaying(false)
    },
  })

  installMediaSession({
    play: () => store.getState().setPlaying(true),
    pause: () => store.getState().setPlaying(false),
    next: () => store.getState().next(),
    prev: () => store.getState().prev(),
    seekTo: seek,
  })

  store.subscribe((s, prev) => {
    const cur = currentItem(s)
    const before = currentItem(prev)
    const trackChanged = cur?.track.id !== before?.track.id
    const restarted = !trackChanged && s.positionS === 0 && prev.positionS > 3
    if (trackChanged && cur) player?.load(trackUrl(cur.collectionId, cur.track.file))
    if (restarted) player?.seek(0)
    if (cur && (trackChanged || restarted || s.playing !== prev.playing)) {
      if (s.playing) void player?.play()
      else player?.pause()
    }
    if (!cur) player?.pause()
    if (trackChanged || s.playing !== prev.playing) {
      updateMediaSession(
        cur
          ? {
              title: cur.track.title,
              artist: cur.artist,
              album: cur.collectionTitle,
              artworkUrl: coverDataUri(cur.cover),
            }
          : null,
        s.playing,
        { positionS: s.positionS, durationS: s.durationS },
      )
    }
  })

  const applyEnginePolicy = () => {
    const running = useSessionStore.getState().running
    const mode = useSettingsStore.getState().ambientMode
    if (mode === 'pause') {
      player?.setDuck(1)
      if (running) store.getState().setPlaying(false)
    } else {
      player?.setDuck(running ? DUCK_LEVEL : 1)
    }
  }
  useSessionStore.subscribe((s, prev) => s.running !== prev.running && applyEnginePolicy())
  useSettingsStore.subscribe((s, prev) => s.ambientMode !== prev.ambientMode && applyEnginePolicy())
}

export function seek(s: number) {
  player?.seek(s)
  const { durationS, setProgress } = usePlayerStore.getState()
  setProgress(s, durationS)
}
