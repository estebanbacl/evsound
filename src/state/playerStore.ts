import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { makeOrder, nextPos, prevPos } from '../audio/playerQueue'
import type { AmbientCollection, AmbientTrack } from '../audio/ambientCatalog'
import { safeStorage } from './safeStorage'

export interface QueueItem {
  collectionId: string
  collectionTitle: string
  artist: string
  cover: AmbientCollection['cover']
  track: AmbientTrack
}

interface PlayerState {
  queue: QueueItem[]
  order: number[]
  pos: number
  playing: boolean
  shuffle: boolean
  repeat: boolean
  positionS: number
  durationS: number
  /** Persisted: collection ids, most recent first. */
  recent: string[]
  lastTrackId: string | null
  lastCollectionId: string | null

  playCollection: (c: AmbientCollection, trackId?: string) => void
  setPlaying: (v: boolean) => void
  toggle: () => void
  next: () => void
  prev: () => void
  toggleShuffle: () => void
  toggleRepeat: () => void
  setProgress: (positionS: number, durationS: number) => void
  /** Track ended naturally. */
  ended: () => void
}

export const currentItem = (s: Pick<PlayerState, 'queue' | 'order' | 'pos'>): QueueItem | null =>
  s.queue[s.order[s.pos]] ?? null

const MAX_RECENT = 8

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => {
      const goto = (pos: number, playing = true) => {
        const s = get()
        const item = s.queue[s.order[pos]]
        set({
          pos,
          playing,
          positionS: 0,
          durationS: item?.track.durationS ?? 0,
          lastTrackId: item?.track.id ?? s.lastTrackId,
          lastCollectionId: item?.collectionId ?? s.lastCollectionId,
        })
      }
      return {
        queue: [],
        order: [],
        pos: 0,
        playing: false,
        shuffle: false,
        repeat: false,
        positionS: 0,
        durationS: 0,
        recent: [],
        lastTrackId: null,
        lastCollectionId: null,

        playCollection: (c, trackId) => {
          const queue = c.tracks.map((track) => ({
            collectionId: c.id,
            collectionTitle: c.title,
            artist: c.artist,
            cover: c.cover,
            track,
          }))
          const start = Math.max(0, trackId ? queue.findIndex((q) => q.track.id === trackId) : 0)
          const { shuffle } = get()
          const order = makeOrder(queue.length, start, shuffle)
          set({
            queue,
            order,
            recent: [c.id, ...get().recent.filter((id) => id !== c.id)].slice(0, MAX_RECENT),
          })
          goto(order.indexOf(start))
        },
        setPlaying: (playing) => set({ playing }),
        toggle: () => {
          if (get().queue.length) set({ playing: !get().playing })
        },
        next: () => {
          const s = get()
          const p = nextPos(s.pos, s.order.length, s.repeat)
          if (p === null) set({ playing: false, positionS: 0 })
          else goto(p, s.playing || s.positionS > 0)
        },
        prev: () => {
          const s = get()
          // like most players: restart the track if we are past the first seconds
          if (s.positionS > 3) return goto(s.pos, s.playing)
          goto(prevPos(s.pos, s.order.length, s.repeat), s.playing)
        },
        toggleShuffle: () => {
          const s = get()
          const cur = s.order[s.pos] ?? 0
          const shuffle = !s.shuffle
          const order = makeOrder(s.queue.length, cur, shuffle)
          set({ shuffle, order, pos: order.indexOf(cur) })
        },
        toggleRepeat: () => set({ repeat: !get().repeat }),
        setProgress: (positionS, durationS) => set({ positionS, durationS }),
        ended: () => {
          const s = get()
          const p = nextPos(s.pos, s.order.length, s.repeat)
          if (p === null) set({ playing: false, positionS: 0 })
          else goto(p, true)
        },
      }
    },
    {
      name: 'ev-player',
      storage: createJSONStorage(() => safeStorage),
      version: 1,
      partialize: (s) => ({
        recent: s.recent,
        lastTrackId: s.lastTrackId,
        lastCollectionId: s.lastCollectionId,
        shuffle: s.shuffle,
        repeat: s.repeat,
      }),
    },
  ),
)
