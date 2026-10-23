import { create } from 'zustand'

export type AudioStatus = 'uninitialized' | 'running' | 'suspended' | 'interrupted' | 'closed'

interface AudioState {
  status: AudioStatus
  needsGesture: boolean
  setStatus: (s: AudioStatus) => void
  setNeedsGesture: (v: boolean) => void
}

export const useAudioStore = create<AudioState>((set) => ({
  status: 'uninitialized',
  needsGesture: false,
  setStatus: (status) => set({ status }),
  setNeedsGesture: (needsGesture) => set({ needsGesture }),
}))
