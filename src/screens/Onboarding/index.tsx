import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { detectVehicle } from '../../vehicles/detectVehicle'
import { fullName, vehicleCatalog } from '../../vehicles/catalog'
import type { VehicleId } from '../../vehicles/types'
import { esVehicle } from '../../i18n/es'
import { previewSound } from '../../app/engineSession'
import { initialReadiness, overallStatus, type Readiness } from '../../app/readiness'
import { detectAudioEngine, probeGps, queryGeoPermission } from '../../app/readinessChecks'
import { useVehicleStore } from '../../state/vehicleStore'
import './onboarding.css'

const t = esVehicle.onboarding

type Step = 'welcome' | 'choose' | 'ready'

function Welcome({ onNext, onClose }: { onNext?: () => void; onClose?: () => void }) {
  return (
    <div className="ob-card ob-welcome">
      <small className="ob-kicker">
        {t.kicker} · {t.step}
      </small>
      <h1 tabIndex={-1}>{t.welcomeTitle}</h1>
      <p className="ob-lead">{t.welcomeLead}</p>
      <h2>{t.before}</h2>
      <ol className="ob-steps">
        {t.steps.map(([title, text], i) => (
          <li key={title}>
            <span className="ob-num">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <strong>{title}</strong>
              <span>{text}</span>
            </div>
          </li>
        ))}
      </ol>
      <ul className="ob-legal">
        {t.legal.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      {onNext && (
        <button className="ob-primary" onClick={onNext}>
          {t.continue}
        </button>
      )}
      {onClose && (
        <button className="ob-primary" onClick={onClose}>
          {t.close}
        </button>
      )}
    </div>
  )
}

function Choose({
  value,
  onChange,
  suggested,
  onBack,
  onNext,
}: {
  value: VehicleId
  onChange: (id: VehicleId) => void
  suggested: VehicleId | null
  onBack: () => void
  onNext: () => void
}) {
  return (
    <div className="ob-card">
      <h1 tabIndex={-1}>{t.chooseTitle}</h1>
      <p className="ob-lead">{t.chooseLead}</p>
      <div className="ob-options" role="radiogroup" aria-label={t.chooseTitle}>
        {vehicleCatalog.map((v) => (
          <button
            key={v.id}
            role="radio"
            aria-checked={v.id === value}
            className={`ob-option ${v.id === value ? 'is-active' : ''}`}
            onClick={() => onChange(v.id)}
          >
            {v.image && <img src={v.image} alt="" draggable={false} />}
            <strong>{fullName(v)}</strong>
            {v.id === suggested && <em>{t.suggested}</em>}
          </button>
        ))}
      </div>
      <div className="ob-actions">
        <button className="ob-secondary" onClick={onBack}>
          {t.back}
        </button>
        <button className="ob-primary" onClick={onNext}>
          {t.confirm}
        </button>
      </div>
    </div>
  )
}

const chip = (cls: 'ok' | 'warn' | 'bad' | '', text: string) => (
  <span className={`ob-chip ${cls}`}>{text}</span>
)

function Ready({
  vehicleId,
  onBack,
  onFinish,
}: {
  vehicleId: VehicleId
  onBack: () => void
  onFinish: (overall: ReturnType<typeof overallStatus>) => void
}) {
  const [r, setR] = useState<Readiness>(() => initialReadiness(detectAudioEngine()))
  const [testing, setTesting] = useState(false)
  const live = useRef(true)
  const v = vehicleCatalog.find((x) => x.id === vehicleId) ?? vehicleCatalog[0]
  const v2 = t.values

  useEffect(() => {
    live.current = true
    void queryGeoPermission().then(
      (permission) => live.current && setR((s) => ({ ...s, permission })),
    )
    return () => {
      live.current = false
    }
  }, [])

  const overall = overallStatus(r)

  async function checkGps() {
    setR((s) => ({ ...s, gps: 'checking' }))
    const gps = await probeGps()
    const permission = await queryGeoPermission()
    if (live.current) setR((s) => ({ ...s, gps, permission }))
  }
  async function testSound() {
    setTesting(true)
    await previewSound()
    setTimeout(() => live.current && setTesting(false), 2500)
  }

  const permissionChip =
    r.permission === 'granted' || r.gps === 'ok'
      ? chip('ok', v2.granted)
      : r.permission === 'denied' || r.gps === 'denied'
        ? chip('bad', v2.denied)
        : r.permission === 'prompt'
          ? chip('warn', v2.prompt)
          : chip('', v2.unknown)
  const gpsChip =
    r.gps === 'ok'
      ? chip('ok', v2.available)
      : r.gps === 'checking'
        ? chip('warn', v2.checking)
        : r.gps === 'unchecked'
          ? chip('', v2.unchecked)
          : chip(
              'bad',
              r.gps === 'unsupported'
                ? v2.unavailable
                : r.gps === 'denied'
                  ? v2.denied
                  : v2.noSignal,
            )
  const outputChip =
    r.output === 'confirmed'
      ? chip('ok', v2.confirmed)
      : r.output === 'failed'
        ? chip('bad', v2.notHeard)
        : chip('', v2.notConfirmed)

  return (
    <div className="ob-card">
      <h1 tabIndex={-1}>{t.readyTitle}</h1>
      <div className="ob-vehicle">
        <div>
          <small>{t.vehicleLabel}</small>
          <strong>{fullName(v)}</strong>
        </div>
        {chip('ok', t.selected)}
      </div>

      <ul className="ob-checks" aria-label={t.readyTitle}>
        <li>
          <span>{t.checks.engine}</span>
          {r.audioEngine ? chip('ok', v2.available) : chip('bad', v2.unavailable)}
        </li>
        <li>
          <span>{t.checks.permission}</span>
          {permissionChip}
        </li>
        <li>
          <span>{t.checks.gps}</span>
          {gpsChip}
        </li>
        <li>
          <span>{t.checks.output}</span>
          {outputChip}
        </li>
      </ul>

      <div className="ob-tests">
        <div>
          <p>{t.actions.locationWhy}</p>
          <button
            className="ob-secondary"
            disabled={r.gps === 'checking'}
            onClick={() => void checkGps()}
          >
            {t.actions.requestLocation}
          </button>
        </div>
        <div>
          <p>{t.actions.testHint}</p>
          <div className="ob-row">
            <button
              className="ob-secondary"
              disabled={!r.audioEngine || testing}
              onClick={() => void testSound()}
            >
              {t.actions.testSound}
            </button>
            <button
              className="ob-secondary"
              onClick={() => setR((s) => ({ ...s, output: 'confirmed' }))}
              disabled={testing}
            >
              {t.actions.heard}
            </button>
            <button
              className="ob-secondary"
              onClick={() => setR((s) => ({ ...s, output: 'failed' }))}
              disabled={testing}
            >
              {t.actions.notHeard}
            </button>
          </div>
        </div>
      </div>

      <div className={`ob-banner is-${overall}`} role="status">
        <small>{t.status[overall]}</small>
        <strong>{t.summary[overall]}</strong>
        <span>{t.summary[`${overall}Hint` as 'readyHint']}</span>
      </div>
      <p className="ob-note">{t.parkNote}</p>

      <div className="ob-actions">
        <button className="ob-secondary" onClick={onBack}>
          {t.back}
        </button>
        <button className="ob-primary" onClick={() => onFinish(overall)}>
          {t.explore}
        </button>
      </div>
    </div>
  )
}

/** First-run flow (welcome → vehicle → validation) or, with `onClose`, the read-only help. */
export function Onboarding({ onClose }: { onClose?: () => void }) {
  const complete = useVehicleStore((s) => s.completeOnboarding)
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('welcome')
  const suggested = typeof navigator !== 'undefined' ? detectVehicle(navigator.userAgent) : null
  const [vehicleId, setVehicleId] = useState<VehicleId>(() => suggested ?? vehicleCatalog[0].id)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!onClose) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  useEffect(() => dialogRef.current?.querySelector<HTMLElement>('h1')?.focus(), [step])

  const label =
    step === 'welcome' ? t.welcomeTitle : step === 'choose' ? t.chooseTitle : t.readyTitle
  return (
    <div className="onboarding" role="dialog" aria-modal="true" aria-label={label} ref={dialogRef}>
      {onClose ? (
        <Welcome onClose={onClose} />
      ) : step === 'welcome' ? (
        <Welcome onNext={() => setStep('choose')} />
      ) : step === 'choose' ? (
        <Choose
          value={vehicleId}
          onChange={setVehicleId}
          suggested={suggested}
          onBack={() => setStep('welcome')}
          onNext={() => setStep('ready')}
        />
      ) : (
        <Ready
          vehicleId={vehicleId}
          onBack={() => setStep('choose')}
          onFinish={(overall) => {
            complete(vehicleId)
            navigate(overall === 'ready' ? '/vehicle' : '/listen')
          }}
        />
      )}
    </div>
  )
}
