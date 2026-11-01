import { IconPause, IconPlay, IconStop } from '../icons'
import { IconButton } from './IconButton'

export interface MiniPlayerProps {
  title: string
  subtitle: string
  playing: boolean
  /** e.g. "12:30 restantes" when a sleep timer is running. */
  detail?: string
  onToggle: () => void
  onStop: () => void
}

export const fmtTime = (s: number) => {
  const t = Math.max(0, Math.floor(s))
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

/** Compact persistent player shown in the bottom bar on Vehículo and Dinámica. */
export function MiniPlayer(p: MiniPlayerProps) {
  return (
    <div className="ev-miniplayer" role="group" aria-label="Reproductor">
      <div className="ev-mp-info">
        <strong>{p.title}</strong>
        <span>{p.subtitle}</span>
      </div>
      <div className="ev-mp-controls">
        <IconButton
          icon={p.playing ? <IconPause /> : <IconPlay />}
          label={p.playing ? 'Pausar' : 'Reproducir'}
          size="lg"
          onClick={p.onToggle}
        />
        <IconButton icon={<IconStop />} label="Detener" onClick={p.onStop} />
      </div>
      <div className="ev-mp-time">{p.detail && <span>{p.detail}</span>}</div>
    </div>
  )
}
