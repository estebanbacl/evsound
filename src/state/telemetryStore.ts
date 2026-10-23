import { create } from 'zustand'
import type { SampleQuality, SampleSource } from '../telemetry/types'

interface TelemetryState {
  speedMs: number
  accelMs2: number
  rawSpeedMs: number | null
  quality: SampleQuality
  source: SampleSource | null
  running: boolean
  setEstimate: (speedMs: number, accelMs2: number) => void
  setRaw: (rawSpeedMs: number, quality: SampleQuality, source: SampleSource) => void
  setRunning: (running: boolean) => void
  reset: () => void
}

const initial = {
  speedMs: 0,
  accelMs2: 0,
  rawSpeedMs: null,
  quality: 'good' as SampleQuality,
  source: null,
  running: false,
}

export const useTelemetryStore = create<TelemetryState>((set) => ({
  ...initial,
  setEstimate: (speedMs, accelMs2) => set({ speedMs, accelMs2 }),
  setRaw: (rawSpeedMs, quality, source) => set({ rawSpeedMs, quality, source }),
  setRunning: (running) => set({ running }),
  reset: () => set(initial),
}))
