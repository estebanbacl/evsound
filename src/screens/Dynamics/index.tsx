import { useEffect, useState } from 'react'
import { engineDriver } from '../../audio/EngineDriver'
import { soundPresets, type SoundPresetId } from '../../audio/presets'
import { soundProfiles } from '../../audio/profiles'
import {
  applyProfileChange,
  getSimulator,
  previewSound,
  startEngine,
  stopEngine,
} from '../../app/engineSession'
import { esDynamics as t } from '../../i18n/es'
import { useAudioStore } from '../../state/audioStore'
import {
  useSessionStore,
  type SourceKind,
  type TraceName,
  type TraceSpeed,
} from '../../state/sessionStore'
import { useSettingsStore } from '../../state/settingsStore'
import { useTelemetryStore } from '../../state/telemetryStore'
import { audioEngine } from '../../audio/AudioEngine'
import { Gauge } from '../../ui/components/Gauge'
import { BigNumber } from '../../ui/components/BigNumber'
import { Panel } from '../../ui/components/Panel'
import { SegmentedControl } from '../../ui/components/SegmentedControl'
import { Slider } from '../../ui/components/Slider'
import { PacksPanel } from '../../app/PacksPanel'
import { downloadJson } from '../../diagnostics/download'
import { telemetry } from '../../telemetry'
import { Waveform } from './Waveform'
import './dynamics.css'

const presetIds: SoundPresetId[] = ['comfort', 'balanced', 'sport']

/** Hold-to-press virtual pedal (pointer capture keeps the press if the finger slides). */
function Pedal({
  label,
  hint,
  onChange,
}: {
  label: string
  hint?: string
  onChange: (v: number) => void
}) {
  const [down, setDown] = useState(false)
  const set = (v: boolean) => {
    setDown(v)
    onChange(v ? 1 : 0)
  }
  return (
    <button
      type="button"
      className={`pedal ${down ? 'is-down' : ''}`}
      aria-pressed={down}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        set(true)
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && !e.repeat && set(true)}
      onKeyUp={(e) => (e.key === ' ' || e.key === 'Enter') && set(false)}
    >
      <strong>{label}</strong>
      {hint && <small>{hint}</small>}
    </button>
  )
}

export function DynamicsScreen() {
  const settings = useSettingsStore()
  const session = useSessionStore()
  const audio = useAudioStore()
  const speedMs = useTelemetryStore((s) => s.speedMs)
  const [, setTick] = useState(0)
  const [recording, setRecording] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 100)
    return () => clearInterval(id)
  }, [])

  const toggleRecording = () => {
    if (telemetry.recorder.recording) {
      telemetry.recorder.stop()
      downloadJson(`telemetry-${Date.now()}.json`, telemetry.recorder.exportJson())
      setRecording(false)
    } else {
      telemetry.recorder.start()
      setRecording(true)
    }
  }

  const frame = engineDriver.frame
  const profile = soundProfiles.find((p) => p.id === settings.profileId) ?? soundProfiles[0]

  return (
    <section className="dynamics" aria-label="Dinámica">
      <div className="dyn-presets" role="radiogroup" aria-label={t.presets}>
        {presetIds.map((id) => {
          const active = settings.preset === id
          return (
            <button
              key={id}
              role="radio"
              aria-checked={active}
              className={`preset-card ${active ? 'is-active' : ''}`}
              onClick={() => settings.setPreset(id)}
            >
              <small>{active ? t.active : t.select}</small>
              <strong>{soundPresets[id].label}</strong>
            </button>
          )
        })}
        <div
          className={`preset-card ${settings.preset === 'custom' ? 'is-active' : ''}`}
          aria-label="Personalizado"
        >
          <small>{settings.preset === 'custom' ? t.active : ''}</small>
          <strong>Custom</strong>
        </div>
      </div>

      <div className="dyn-controls">
        <p className="dyn-note" role="note">
          {t.soundOnly}
        </p>
        <SegmentedControl
          label={t.profile}
          value={settings.profileId}
          onChange={(id) => {
            settings.setProfile(id)
            void applyProfileChange()
          }}
          options={soundProfiles.map((p) => ({ value: p.id, label: p.name }))}
        />
        <SegmentedControl<SourceKind>
          label={t.source}
          value={session.source}
          onChange={session.setSource}
          disabled={session.running}
          options={(['gps', 'sim', 'trace'] as const).map((k) => ({
            value: k,
            label: t.sources[k],
          }))}
        />
        {session.source === 'trace' && (
          <>
            <SegmentedControl<TraceName>
              label={t.trace}
              value={session.trace}
              onChange={session.setTrace}
              disabled={session.running}
              options={(['urban', 'highway', 'launch'] as const).map((k) => ({
                value: k,
                label: t.traces[k],
              }))}
            />
            <SegmentedControl<`${TraceSpeed}`>
              label={t.traceSpeed}
              value={`${session.traceRate}`}
              onChange={(v) => session.setTraceRate(Number(v) as TraceSpeed)}
              disabled={session.running}
              options={[
                { value: '1', label: 'x1' },
                { value: '2', label: 'x2' },
                { value: '4', label: 'x4' },
              ]}
            />
          </>
        )}
        <Panel className="dyn-sliders">
          <Slider label={t.volume} value={settings.volume} onChange={settings.setVolume} />
          <Slider label={t.intensity} value={settings.intensity} onChange={settings.setIntensity} />
          <Slider
            label={t.character}
            value={settings.character}
            min={-1}
            max={1}
            onChange={settings.setCharacter}
            format={(v) => (v > 0.05 ? `+${Math.round(v * 100)}` : `${Math.round(v * 100)}`)}
          />
        </Panel>
        <div className="dyn-actions">
          {session.running ? (
            <button className="big-btn" onClick={stopEngine}>
              {t.stop}
            </button>
          ) : (
            <>
              <button className="big-btn" onClick={() => void startEngine()}>
                {t.start}
              </button>
              <button className="big-btn is-ghost" onClick={() => void previewSound()}>
                {t.preview}
              </button>
            </>
          )}
        </div>
        {audio.needsGesture && (
          <button className="big-btn is-warn" onClick={() => void audioEngine.unlock()}>
            {t.tapToResume}
          </button>
        )}
        <p className="dyn-note">{t.parkOnly}</p>
        <button className="big-btn is-ghost" aria-pressed={recording} onClick={toggleRecording}>
          {recording ? t.recordStop : t.record}
        </button>
        <p className="dyn-note">{t.recordHint}</p>
        <PacksPanel />
      </div>

      <div className="dyn-instruments">
        <Gauge
          value={frame?.rpm ?? profile.idleRpm}
          min={0}
          max={Math.ceil(profile.redlineRpm / 1000) * 1000}
          redline={profile.redlineRpm * 0.92}
          label={t.rpm}
          unit="rpm"
          size={300}
        />
        <div className="dyn-readouts">
          <BigNumber value={Math.round(speedMs * 3.6)} unit="km/h" size="lg" label="Velocidad" />
          <div className="readout">
            <span>{t.gear}</span>
            <strong>{session.running ? (frame?.gear ?? 1) : '-'}</strong>
          </div>
          <div className="readout">
            <span>{t.load}</span>
            <strong>{frame ? Math.round(frame.load * 100) : 0}%</strong>
          </div>
        </div>
        <Waveform />
        {session.running && session.source === 'sim' && (
          <div className="dyn-pedals">
            <Pedal label={t.brake} onChange={(v) => getSimulator()?.setBrake(v)} />
            <Pedal
              label={t.gas}
              hint={t.gasHint}
              onChange={(v) => getSimulator()?.setThrottle(v)}
            />
          </div>
        )}
      </div>
    </section>
  )
}
