import { create } from 'zustand'

interface DriveState {
  /** True while Drive Mode is active (set by the DriveMode logic in phase 5). */
  active: boolean
  setActive: (v: boolean) => void
}

export const useDriveStore = create<DriveState>((set) => ({
  active: false,
  setActive: (active) => set({ active }),
}))
