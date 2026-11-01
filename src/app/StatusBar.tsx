import { useEffect, useState } from 'react'
import { es } from '../i18n/es'
import { useAudioStore } from '../state/audioStore'
import { usePwaStore } from '../state/pwaStore'
import { useTelemetryStore } from '../state/telemetryStore'
import { esPwa } from '../i18n/es'
import { DiagnosticsPanel } from '../diagnostics/DiagnosticsPanel'
import { useTapSequence } from '../diagnostics/useTapSequence'
import { Onboarding } from '../screens/Onboarding'
import { esVehicle } from '../i18n/es'
import { IconHelp } from '../ui/icons'

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(id)
  }, [])
  return now
}

export function StatusBar() {
  const now = useClock()
  const { speedMs, quality, running, source } = useTelemetryStore()
  const audio = useAudioStore()
  const online = usePwaStore((s) => s.online)
  const [diag, setDiag] = useState(false)
  const [help, setHelp] = useState(false)
  const onTimeTap = useTapSequence(5, 3000, () => setDiag(true))

  // P/D is inferred from speed: the app never reads the vehicle.
  const driving = speedMs * 3.6 > 1
  const gps =
    !running || source === 'sim' || source === 'trace'
      ? {
          text:
            source === 'sim' ? es.status.sim : source === 'trace' ? es.status.trace : es.status.off,
          cls: '',
        }
      : quality === 'good'
        ? { text: es.status.ok, cls: 'ok' }
        : { text: quality === 'stale' ? es.status.stale : es.status.lost, cls: 'warn' }
  const audioChip = audio.needsGesture
    ? { text: es.status.tapToResume, cls: 'warn' }
    : audio.status === 'running'
      ? { text: es.status.ok, cls: 'ok' }
      : { text: es.status.off, cls: '' }

  return (
    <header className="status-bar" role="banner">
      <div className="status-left">
        <span
          className="gear"
          aria-label={driving ? 'Modo inferido: marcha' : 'Modo inferido: parado'}
        >
          <i className={driving ? '' : 'on'}>P</i>
          <i>R</i>
          <i>N</i>
          <i className={driving ? 'on' : ''}>D</i>
        </span>
        <span className={`status-chip ${gps.cls}`}>
          {es.status.gps}: {gps.text}
        </span>
        <span className={`status-chip ${audioChip.cls}`}>
          {es.status.audio}: {audioChip.text}
        </span>
      </div>
      <div className="status-right">
        {!online && <span className="status-chip offline">{esPwa.offline}</span>}
        <button className="status-help" aria-label={esVehicle.help} onClick={() => setHelp(true)}>
          <IconHelp />
          <span>{esVehicle.help}</span>
        </button>
        <time onClick={onTimeTap}>
          {now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
        </time>
      </div>
      {help && <Onboarding onClose={() => setHelp(false)} />}
      {diag && <DiagnosticsPanel onClose={() => setDiag(false)} />}
    </header>
  )
}
