import { useEffect, useState } from 'react'
import { esListen } from '../../i18n/es'
import {
  remainingMs,
  TIMER_OPTIONS,
  usePlayerStore,
  type TimerMinutes,
} from '../../state/playerStore'
import { useSettingsStore } from '../../state/settingsStore'
import { IconPause, IconPlay, IconStop } from '../../ui/icons'
import { fmtTime } from '../../ui/components/MiniPlayer'
import { SegmentedControl } from '../../ui/components/SegmentedControl'
import { Slider } from '../../ui/components/Slider'
import { Cover } from './Cover'
import { useCatalog } from './useCatalog'

const t = esListen.now

/** Remaining time of the sleep timer, ticking once a second while it runs. */
export function useRemaining() {
  const endsAt = usePlayerStore((s) => s.endsAt)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (endsAt === null) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [endsAt])
  const ms = remainingMs(endsAt, now)
  return ms === null ? null : fmtTime(ms / 1000)
}

/** Persistent "now playing" panel: transport, independent volume, sleep timer and engine policy. */
export function NowPlaying() {
  const { catalog } = useCatalog()
  const p = usePlayerStore()
  const mode = useSettingsStore((s) => s.ambientMode)
  const setMode = useSettingsStore((s) => s.setAmbientMode)
  const remaining = useRemaining()
  const sound = catalog?.sounds.find((s) => s.id === p.soundId)
  const cat = catalog?.categories.find((c) => c.id === sound?.categoryId)

  return (
    <aside className="now" aria-label={t.title}>
      <small className="now-kicker">{t.title}</small>
      {sound && cat ? (
        <div className="now-head">
          <Cover cover={cat.cover} size={160} className="now-cover" />
          <div>
            <strong className="now-title">{sound.title}</strong>
            <span className="now-sub">
              {cat.title} · {t.kind}
            </span>
          </div>
        </div>
      ) : (
        <div className="now-idle">
          <strong>{t.idle}</strong>
          <span>{t.idleHint}</span>
        </div>
      )}

      <div className="now-controls">
        <button
          className="now-main"
          disabled={!sound}
          aria-label={p.playing ? t.pause : t.play}
          onClick={p.toggle}
        >
          {p.playing ? <IconPause /> : <IconPlay />}
          <span>{p.playing ? t.pause : t.play}</span>
        </button>
        <button className="now-stop" disabled={!sound} aria-label={t.stop} onClick={p.stop}>
          <IconStop />
          <span>{t.stop}</span>
        </button>
      </div>

      <Slider label={t.volume} value={p.volume} onChange={p.setVolume} />

      <SegmentedControl
        label={t.timer}
        value={String(p.timerMin)}
        onChange={(v) => p.setTimer(Number(v) as TimerMinutes)}
        options={TIMER_OPTIONS.map((m) => ({
          value: String(m),
          label: m === 0 ? '∞' : String(m),
        }))}
      />
      <p className="now-note" aria-live="polite">
        {p.timerMin === 0
          ? t.timerOff
          : remaining && p.playing
            ? t.remaining(remaining)
            : t.timerMin(p.timerMin)}
      </p>

      <SegmentedControl
        label={t.withEngine}
        value={mode}
        onChange={setMode}
        options={[
          { value: 'pause', label: t.pauseOther },
          { value: 'mix', label: t.mix },
        ]}
      />
      <p className="now-note">{t.modeHint[mode]}</p>
    </aside>
  )
}
