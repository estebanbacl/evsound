import { create } from 'zustand'

export type SourceKind = 'gps' | 'sim' | 'trace'
export type TraceName = 'urban' | 'highway' | 'launch'
export type TraceSpeed = 1 | 2 | 4

interface SessionState {
  /** True while the engine sound + a speed source are running. */
  running: boolean
  source: SourceKind
  trace: TraceName
  traceRate: TraceSpeed
  setRunning: (v: boolean) => void
  setSource: (s: SourceKind) => void
  setTrace: (t: TraceName) => void
  setTraceRate: (r: TraceSpeed) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  running: false,
  source: 'sim',
  trace: 'urban',
  traceRate: 1,
  setRunning: (running) => set({ running }),
  setSource: (source) => set({ source }),
  setTrace: (trace) => set({ trace }),
  setTraceRate: (traceRate) => set({ traceRate }),
}))
