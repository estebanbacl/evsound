import { useEffect, useRef, useState } from 'react'
import { audioEngine, engineDriver, getProfile, soundProfiles } from '../../audio'
import {
  SimulatedSource,
  TraceReplaySource,
  loadTrace,
  msToKmh,
  telemetry,
  type TraceRate,
} from '../../telemetry'
import { useTelemetryStore } from '../../state/telemetryStore'
import './dev.css'

type Kind = 'sim' | 'urban' | 'highway' | 'launch'

/** RMS of the analyser output (0..1). */
function outputLevel() {
  const a = audioEngine.analyser
  if (!a) return 0
  const buf = new Float32Array(a.fftSize)
  a.getFloatTimeDomainData(buf)
  let sum = 0
  for (const x of buf) sum += x * x
  return Math.sqrt(sum / buf.length)
}

export function AudioDevScreen() {
  const sim = useRef<SimulatedSource | null>(null)
  const [profileId, setProfileId] = useState(soundProfiles[0].id)
  const [kind, setKind] = useState<Kind>('sim')
  const [rate, setRate] = useState<TraceRate>(1)
  const [volume, setVolume] = useState(0.7)
  const [engineOn, setEngineOn] = useState(false)
  const [needsGesture, setNeedsGesture] = useState(false)
  const [, setTick] = useState(0)
  const speedMs = useTelemetryStore((s) => s.speedMs)

  useEffect(() => {
    const off = audioEngine.on('needsGesture', () => setNeedsGesture(true))
    const id = setInterval(() => setTick((n) => n + 1), 100)
    return () => {
      off()
      clearInterval(id)
      engineDriver.stop()
      telemetry.stop()
    }
  }, [])

  // keyboard throttle/brake for the simulator
  useEffect(() => {
    const key = (down: boolean) => (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') sim.current?.setThrottle(down ? 1 : 0)
      if (e.key === 'ArrowDown') sim.current?.setBrake(down ? 1 : 0)
    }
    const d = key(true)
    const u = key(false)
    window.addEventListener('keydown', d)
    window.addEventListener('keyup', u)
    return () => {
      window.removeEventListener('keydown', d)
      window.removeEventListener('keyup', u)
    }
  }, [])

  async function startEngine() {
    await audioEngine.unlock() // user gesture
    setNeedsGesture(false)
    audioEngine.setVolume(volume)
    await engineDriver.start(getProfile(profileId))
    sim.current = null
    if (kind === 'sim') {
      sim.current = new SimulatedSource({ zeroTo100s: 4.3, maxSpeedKmh: 217 })
      telemetry.start(sim.current)
    } else {
      const pts = await loadTrace(kind)
      telemetry.start(new TraceReplaySource(pts, rate, undefined, () => telemetry.stop()))
    }
    setEngineOn(true)
  }

  function stopEngine() {
    telemetry.stop()
    engineDriver.stop()
    setEngineOn(false)
  }

  const f = engineDriver.frame
  const level = outputLevel()
  const l = engineDriver.latency
  return (
    <section className="dev" aria-label="Audio dev">
      <h1>/dev/audio</h1>
      <div className="dev-row">
        <select
          value={profileId}
          onChange={(e) => setProfileId(e.target.value)}
          aria-label="Perfil"
        >
          {soundProfiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} aria-label="Fuente">
          <option value="sim">Acelerador virtual</option>
          <option value="urban">Traza urbana</option>
          <option value="highway">Traza autopista</option>
          <option value="launch">Traza 0-100</option>
        </select>
        <select
          value={rate}
          onChange={(e) => setRate(Number(e.target.value) as TraceRate)}
          aria-label="Velocidad de reproducción"
        >
          <option value={1}>x1</option>
          <option value={2}>x2</option>
          <option value={4}>x4</option>
        </select>
        {engineOn ? (
          <button onClick={stopEngine}>Detener motor</button>
        ) : (
          <button onClick={startEngine}>Arrancar motor</button>
        )}
        <label>
          Volumen
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => {
              setVolume(Number(e.target.value))
              audioEngine.setVolume(Number(e.target.value))
            }}
          />
        </label>
      </div>
      {kind === 'sim' && engineOn && (
        <div className="dev-row">
          <label>
            Acelerador (↑)
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              defaultValue={0}
              onChange={(e) => sim.current?.setThrottle(Number(e.target.value))}
            />
          </label>
          <label>
            Freno (↓)
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              defaultValue={0}
              onChange={(e) => sim.current?.setBrake(Number(e.target.value))}
            />
          </label>
        </div>
      )}
      {needsGesture && (
        <button onClick={() => void audioEngine.unlock().then(() => setNeedsGesture(false))}>
          Audio en pausa: toca para reanudar
        </button>
      )}
      <p className="dev-readout" data-testid="audio-readout">
        audio {audioEngine.state} · {msToKmh(speedMs).toFixed(0)} km/h · marcha {f?.gear ?? '-'} ·{' '}
        {f ? Math.round(f.rpm) : '-'} rpm · carga {f ? Math.round(f.load * 100) : '-'} % · latencia{' '}
        {l.avgMs.toFixed(2)} ms (máx {l.maxMs.toFixed(2)}) · nivel {level.toFixed(3)}
      </p>
    </section>
  )
}
