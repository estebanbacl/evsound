import type { GpsState, PermissionState } from './readiness'

export function detectAudioEngine(): boolean {
  const w = globalThis as unknown as { AudioContext?: unknown; webkitAudioContext?: unknown }
  return typeof w.AudioContext === 'function' || typeof w.webkitAudioContext === 'function'
}

/** Permissions API state for geolocation; 'unknown' where the API is missing. Never prompts. */
export async function queryGeoPermission(
  perms: Pick<Permissions, 'query'> | undefined = typeof navigator !== 'undefined'
    ? navigator.permissions
    : undefined,
): Promise<PermissionState> {
  if (!perms) return 'unknown'
  try {
    const r = await perms.query({ name: 'geolocation' })
    return r.state as PermissionState
  } catch {
    return 'unknown'
  }
}

/**
 * One real position request (this is what triggers the browser permission prompt, so call it
 * only from an explicit user action). Resolves to the resulting GPS state.
 */
export function probeGps(
  geo: Pick<Geolocation, 'getCurrentPosition'> | undefined = typeof navigator !== 'undefined'
    ? navigator.geolocation
    : undefined,
  timeoutMs = 15_000,
): Promise<GpsState> {
  if (!geo) return Promise.resolve('unsupported')
  return new Promise((resolve) => {
    geo.getCurrentPosition(
      () => resolve('ok'),
      (e) => resolve(e.code === 1 ? 'denied' : 'nosignal'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs },
    )
  })
}
