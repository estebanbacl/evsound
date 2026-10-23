import { IconNext, IconPause, IconPlay, IconPrev, IconRepeat, IconShuffle } from '../icons'
import { IconButton } from './IconButton'

export interface MiniPlayerProps {
  title: string
  subtitle: string
  playing: boolean
  shuffle: boolean
  repeat: boolean
  positionS: number
  durationS: number
  onToggle: () => void
  onNext: () => void
  onPrev: () => void
  onShuffle: () => void
  onRepeat: () => void
  onSeek?: (s: number) => void
}

export const fmtTime = (s: number) => {
  const t = Math.max(0, Math.floor(s))
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

export function MiniPlayer(p: MiniPlayerProps) {
  const pct = p.durationS > 0 ? (p.positionS / p.durationS) * 100 : 0
  return (
    <div className="ev-miniplayer" role="group" aria-label="Reproductor">
      <div className="ev-mp-info">
        <strong>{p.title}</strong>
        <span>{p.subtitle}</span>
      </div>
      <div className="ev-mp-controls">
        <IconButton
          icon={<IconShuffle />}
          label="Aleatorio"
          active={p.shuffle}
          onClick={p.onShuffle}
        />
        <IconButton icon={<IconPrev />} label="Anterior" onClick={p.onPrev} />
        <IconButton
          icon={p.playing ? <IconPause /> : <IconPlay />}
          label={p.playing ? 'Pausar' : 'Reproducir'}
          size="lg"
          onClick={p.onToggle}
        />
        <IconButton icon={<IconNext />} label="Siguiente" onClick={p.onNext} />
        <IconButton icon={<IconRepeat />} label="Repetir" active={p.repeat} onClick={p.onRepeat} />
      </div>
      <div className="ev-mp-time">
        <span>{fmtTime(p.positionS)}</span>
        <span>{fmtTime(p.durationS)}</span>
      </div>
      <div
        className="ev-mp-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
      >
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
