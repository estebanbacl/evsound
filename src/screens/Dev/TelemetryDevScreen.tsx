import { useEffect, useRef, useState } from 'react'
import {
  GeolocationSource,
  SimulatedSource,
  TraceReplaySource,
  loadTrace,
  msToKmh,
  telemetry,
  type SpeedSource,
  type TraceRate,
} from '../../telemetry'
import { useTelemetryStore } from '../../state/telemetryStore'
import './dev.css'

type Kind = 'sim' | 'gps' | 'urban' | 'highway' | 'launch'
const WINDOW_MS = 60_000
const MAX_KMH = 140

function drawChart(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const { width: w, height: h } = canvas
  ctx.clearRect(0, 0, w, h)
  const now = Date.now()
  const x = (t: number) => w - ((now - t) / WINDOW_MS) * w
  const y = (v: number) => h - (msToKmh(v) / MAX_KMH) * h
  ctx.strokeStyle = 'rgba(255,42,42,0.2)'
  ctx.fillStyle = '#8a2b2b'
  ctx.font = '14px sans-serif'
  for (let k = 0; k <= MAX_KMH; k += 20) {
    ctx.beginPath()
    ctx.moveTo(0, y(k / 3.6))
    ctx.lineTo(w, y(k / 3.6))
    ctx.stroke()
    ctx.fillText(`${k}`, 4, y(k / 3.6) - 3)
  }
  ctx.fillStyle = '#ffd9d9'
  for (const p of telemetry.rawHistory) ctx.fillRect(x(p.t) - 2, y(p.v) - 2, 4, 4)
  ctx.strokeStyle = '#ff9f43'
  ctx.lineWidth = 2
  ctx.beginPath()
  telemetry.estHistory.forEach((p, i) =>
    i ? ctx.lineTo(x(p.t), y(p.v)) : ctx.moveTo(x(p.t), y(p.v)),
  )
  ctx.stroke()
  ctx.lineWidth = 1
}

export function TelemetryDevScreen() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const sim = useRef<SimulatedSource | null>(null)
  const [kind, setKind] = useState<Kind>('sim')
  const [rate, setRate] = useState<TraceRate>(1)
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState('')
  const { speedMs, accelMs2, rawSpeedMs, quality, running } = useTelemetryStore()

  useEffect(() => {
    let id = 0
    const loop = () => {
      if (canvas.current) drawChart(canvas.current)
      id = requestAnimationFrame(loop)
    }
    id = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(id)
      telemetry.stop()
    }
  }, [])

  async function start() {
    setError('')
    let src: SpeedSource
    sim.current = null
    try {
      if (kind === 'gps') src = new GeolocationSource()
      else if (kind === 'sim') {
        sim.current = new SimulatedSource({ zeroTo100s: 4.3, maxSpeedKmh: 217 })
        src = sim.current
      } else
        src = new TraceReplaySource(await loadTrace(kind), rate, undefined, () => telemetry.stop())
    } catch (e) {
      setError(String(e))
      return
    }
    telemetry.start(src)
  }

  function toggleRecord() {
    if (telemetry.recorder.recording) {
      telemetry.recorder.stop()
      const blob = new Blob([telemetry.recorder.exportJson()], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `telemetry-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(a.href)
      setRecording(false)
    } else {
      telemetry.recorder.start()
      setRecording(true)
    }
  }

  return (
    <section className="dev" aria-label="Telemetry dev">
      <h1>/dev/telemetry</h1>
      <div className="dev-row">
        <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} aria-label="Fuente">
          <option value="sim">Simulador</option>
          <option value="gps">GPS</option>
          <option value="urban">Traza urbana</option>
          <option value="highway">Traza autopista</option>
          <option value="launch">Traza arranque 0-100</option>
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
        <button onClick={start}>Iniciar</button>
        <button onClick={() => telemetry.stop()}>Detener</button>
        <button onClick={toggleRecord}>{recording ? 'Detener y exportar' : 'Grabar'}</button>
      </div>
      {kind === 'sim' && (
        <div className="dev-row">
          <label>
            Acelerador
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
            Freno
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
      <p className="dev-readout" data-testid="readout">
        {running ? 'ON' : 'OFF'} · calidad {quality} · crudo{' '}
        {rawSpeedMs === null ? '--' : msToKmh(rawSpeedMs).toFixed(1)} km/h · estimado{' '}
        {msToKmh(speedMs).toFixed(1)} km/h · a {accelMs2.toFixed(2)} m/s²
      </p>
      {error && <p role="alert">{error}</p>}
      <canvas ref={canvas} width={1600} height={500} className="dev-chart" />
      <p className="dev-legend">■ muestras crudas · — estimación (60 Hz)</p>
    </section>
  )
}
