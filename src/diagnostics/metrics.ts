import type { HistoryPoint } from '../telemetry/TelemetryEngine'

/** Mean GPS update rate (Hz) over the last `n` raw samples; null with fewer than 2. */
export function computeGpsHz(raw: readonly HistoryPoint[], n = 10): number | null {
  const s = raw.slice(-n - 1)
  if (s.length < 2) return null
  const span = (s[s.length - 1].t - s[0].t) / 1000
  return span > 0 ? (s.length - 1) / span : null
}

export interface FeatureSupport {
  name: string
  supported: boolean
}

export function featureSupport(w: Window & typeof globalThis = window): FeatureSupport[] {
  const nav = w.navigator as Navigator & { wakeLock?: unknown }
  let webgl2 = false
  try {
    webgl2 = !!w.document.createElement('canvas').getContext('webgl2')
  } catch {
    /* unsupported */
  }
  return [
    { name: 'Geolocation', supported: 'geolocation' in nav },
    { name: 'DeviceMotion', supported: 'DeviceMotionEvent' in w },
    { name: 'Service Worker', supported: 'serviceWorker' in nav },
    { name: 'Cache Storage', supported: 'caches' in w },
    { name: 'storage.estimate', supported: !!nav.storage?.estimate },
    { name: 'Media Session', supported: 'mediaSession' in nav },
    { name: 'Wake Lock', supported: 'wakeLock' in nav },
    { name: 'WebGL2', supported: webgl2 },
  ]
}

/** Measures UI frames per second with rAF; returns a stop function. */
export function startFpsMeter(onFps: (fps: number) => void, intervalMs = 1000): () => void {
  let frames = 0
  let last = performance.now()
  let raf = 0
  const loop = (now: number) => {
    frames++
    if (now - last >= intervalMs) {
      onFps((frames * 1000) / (now - last))
      frames = 0
      last = now
    }
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)
  return () => cancelAnimationFrame(raf)
}
