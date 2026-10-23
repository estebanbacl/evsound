import { create } from 'zustand'

interface PwaState {
  needRefresh: boolean
  offlineReady: boolean
  online: boolean
  /** Set by registerPwa(); applies the waiting service worker and reloads. */
  applyUpdate: (() => Promise<void>) | null
  setNeedRefresh: (v: boolean, apply?: () => Promise<void>) => void
  setOfflineReady: (v: boolean) => void
  setOnline: (v: boolean) => void
}

export const usePwaStore = create<PwaState>((set) => ({
  needRefresh: false,
  offlineReady: false,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  applyUpdate: null,
  setNeedRefresh: (needRefresh, applyUpdate) =>
    set((s) => ({ needRefresh, applyUpdate: applyUpdate ?? s.applyUpdate })),
  setOfflineReady: (offlineReady) => set({ offlineReady }),
  setOnline: (online) => set({ online }),
}))
