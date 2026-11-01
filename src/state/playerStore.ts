import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { safeStorage } from './safeStorage'

export const TIMER_OPTIONS = [0, 15, 30, 45, 60] as const
export type TimerMinutes = (typeof TIMER_OPTIONS)[number]

const MAX_RECENT = 8

interface PlayerState {
  /** Sound loaded in the player (kept after pause/stop so it can be resumed). */
  soundId: string | null
  playing: boolean
  /** 0..1, independent from the simulated engine's volume. */
  volume: number
  /** Sleep timer selection in minutes (0 = unlimited). */
  timerMin: TimerMinutes
  /** Epoch ms when the timer ends; only set while playing with a timer. */
  endsAt: number | null
  /** Persisted: sound ids. */
  favorites: string[]
  /** Persisted: sound ids, most recent first. */
  recent: string[]

  play: (id: string) => void
  toggle: () => void
  stop: () => void
  setPlaying: (v: boolean) => void
  setVolume: (v: number) => void
  setTimer: (m: TimerMinutes) => void
  toggleFavorite: (id: string) => void
}

const endFor = (min: number, now = Date.now()) => (min > 0 ? now + min * 60_000 : null)

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      soundId: null,
      playing: false,
      volume: 0.5,
      timerMin: 0,
      endsAt: null,
      favorites: [],
      recent: [],

      play: (id) => {
        const s = get()
        set({
          soundId: id,
          playing: true,
          endsAt: endFor(s.timerMin),
          recent: [id, ...s.recent.filter((r) => r !== id)].slice(0, MAX_RECENT),
        })
      },
      toggle: () => {
        const s = get()
        if (!s.soundId) return
        set({ playing: !s.playing, endsAt: s.playing ? null : endFor(s.timerMin) })
      },
      stop: () => set({ playing: false, endsAt: null }),
      setPlaying: (playing) => {
        const s = get()
        if (!s.soundId && playing) return
        set({ playing, endsAt: playing ? (s.endsAt ?? endFor(s.timerMin)) : null })
      },
      setVolume: (v) => set({ volume: Math.min(1, Math.max(0, v)) }),
      setTimer: (timerMin) => set({ timerMin, endsAt: get().playing ? endFor(timerMin) : null }),
      toggleFavorite: (id) => {
        const f = get().favorites
        set({ favorites: f.includes(id) ? f.filter((x) => x !== id) : [id, ...f] })
      },
    }),
    {
      name: 'ev-player',
      storage: createJSONStorage(() => safeStorage),
      version: 2,
      partialize: (s) => ({ favorites: s.favorites, recent: s.recent, volume: s.volume }),
      // v1 stored album/track history that no longer exists
      migrate: () => ({ favorites: [], recent: [], volume: 0.5 }),
    },
  ),
)

export const remainingMs = (endsAt: number | null, now = Date.now()) =>
  endsAt === null ? null : Math.max(0, endsAt - now)
