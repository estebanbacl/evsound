import { useEffect, useState } from 'react'
import { audioEngine } from '../audio/AudioEngine'
import { engineDriver } from '../audio/EngineDriver'
import { useAudioStore } from '../state/audioStore'
import { useTelemetryStore } from '../state/telemetryStore'
import { telemetry } from '../telemetry'
import { downloadJson } from './download'
import { getLog } from './log'
import { computeGpsHz, featureSupport, startFpsMeter } from './metrics'
import './diagnostics.css'

declare const __APP_VERSION__: string
declare const __BUILD_TIME__: string

function snapshot(fps: number | null) {
  const ctx = audioEngine.context
  const { quality, source, running } = useTelemetryStore.getState()
  const lat = engineDriver.latency
  return {
    version: __APP_VERSION__,
    build: __BUILD_TIME__,
    userAgent: navigator.userAgent,
    screen: `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio}`,
    gps: { hz: computeGpsHz(telemetry.rawHistory), quality, source, running },
    audio: {
      state: audioEngine.state,
      baseLatencyMs: ctx ? ctx.baseLatency * 1000 : null,
      outputLatencyMs:
        ctx && 'outputLatency' in ctx ? (ctx as AudioContext).outputLatency * 1000 : null,
      telemetryToParamAvgMs: lat.avgMs,
      telemetryToParamMaxMs: lat.maxMs,
    },
    uiFps: fps,
    features: featureSupport(),
  }
}

export function DiagnosticsPanel({ onClose }: { onClose: () => void }) {
  const [fps, setFps] = useState<number | null>(null)
  const [snap, setSnap] = useState(() => snapshot(null))
  const needsGesture = useAudioStore((s) => s.needsGesture)

  useEffect(() => startFpsMeter(setFps), [])
  useEffect(() => {
    const id = setInterval(() => setSnap(snapshot(fps)), 500)
    return () => clearInterval(id)
  }, [fps])

  const row = (k: string, v: string) => (
    <tr key={k}>
      <th scope="row">{k}</th>
      <td>{v}</td>
    </tr>
  )
  const f1 = (n: number | null | undefined, unit = '') =>
    n == null ? '--' : `${n.toFixed(n < 10 ? 2 : 0)}${unit}`

  return (
    <div className="diag" role="dialog" aria-modal="true" aria-label="Diagnóstico">
      <div className="diag-card">
        <h2>Diagnóstico</h2>
        <table>
          <tbody>
            {row('Versión', `${snap.version} (${snap.build})`)}
            {row('Pantalla', snap.screen)}
            {row(
              'GPS',
              `${f1(snap.gps.hz, ' Hz')} · calidad ${snap.gps.quality} · fuente ${snap.gps.source ?? '--'}`,
            )}
            {row('AudioContext', `${snap.audio.state}${needsGesture ? ' (requiere toque)' : ''}`)}
            {row(
              'Latencia base / salida',
              `${f1(snap.audio.baseLatencyMs, ' ms')} / ${f1(snap.audio.outputLatencyMs, ' ms')}`,
            )}
            {row(
              'Telemetría → audio',
              `prom ${f1(snap.audio.telemetryToParamAvgMs, ' ms')} · máx ${f1(snap.audio.telemetryToParamMaxMs, ' ms')}`,
            )}
            {row('FPS de UI', f1(fps))}
            {row(
              'Soporte',
              snap.features.map((x) => `${x.supported ? '✓' : '✗'} ${x.name}`).join('  '),
            )}
          </tbody>
        </table>
        <div className="diag-actions">
          <button
            onClick={() =>
              downloadJson(
                `ev-diagnostics-${Date.now()}.json`,
                JSON.stringify({ snapshot: snap, log: getLog() }, null, 2),
              )
            }
          >
            Exportar log
          </button>
          <button onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}
