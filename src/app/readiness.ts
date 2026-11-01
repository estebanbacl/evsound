/** Pure readiness logic for the "listo para escuchar" screen (no DOM, no Web Audio). */

export type PermissionState = 'granted' | 'prompt' | 'denied' | 'unknown'
export type GpsState = 'unchecked' | 'checking' | 'ok' | 'nosignal' | 'denied' | 'unsupported'
export type OutputState = 'unchecked' | 'confirmed' | 'failed'

export interface Readiness {
  /** AudioContext (or webkit prefix) exists in this browser. */
  audioEngine: boolean
  /** Geolocation permission as reported by the Permissions API (never assumed). */
  permission: PermissionState
  gps: GpsState
  /** The user heard the test sound. */
  output: OutputState
}

export type Overall = 'ready' | 'pending' | 'limited'

/**
 * ready   — audio works and GPS delivers a position.
 * limited — audio confirmed, but no GPS (denied / no signal / unsupported): ambient sounds only.
 * pending — something still has to be checked or enabled.
 */
export function overallStatus(r: Readiness): Overall {
  const audioOk = r.audioEngine && r.output === 'confirmed'
  if (!audioOk) return 'pending'
  if (r.gps === 'ok') return 'ready'
  if (r.gps === 'nosignal' || r.gps === 'denied' || r.gps === 'unsupported') return 'limited'
  return 'pending'
}

export const initialReadiness = (audioEngine: boolean): Readiness => ({
  audioEngine,
  permission: 'unknown',
  gps: 'unchecked',
  output: 'unchecked',
})
