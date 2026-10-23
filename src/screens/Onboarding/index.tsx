import { useState } from 'react'
import { esVehicle } from '../../i18n/es'
import { useVehicleStore } from '../../state/vehicleStore'
import { IconChevronLeft, IconChevronRight } from '../../ui/icons'
import { IconButton } from '../../ui/components/IconButton'
import { bodyShapes } from '../../vehicles/bodyShapes'
import { vehicleCatalog } from '../../vehicles/catalog'
import { detectVehicle } from '../../vehicles/detectVehicle'
import type { VehicleProfile } from '../../vehicles/types'
import './onboarding.css'

const t = esVehicle.onboarding

/** 2D side silhouette from the same shape data as the 3D body. */
function Silhouette({ vehicle }: { vehicle: VehicleProfile }) {
  const s = bodyShapes[vehicle.body]
  const pts = (p: [number, number][]) => p.map(([x, y]) => `${x},${-y}`).join(' ')
  const r = s.wheelRadius
  return (
    <svg
      viewBox="-2.8 -2 5.6 2.2"
      className="silhouette"
      role="img"
      aria-label={vehicle.displayName}
    >
      <polygon points={pts(s.lower)} />
      <polygon points={pts(s.cabin)} />
      <circle cx={s.wheelbaseHalf} cy={-r} r={r} />
      <circle cx={-s.wheelbaseHalf} cy={-r} r={r} />
    </svg>
  )
}

export function Onboarding() {
  const complete = useVehicleStore((s) => s.completeOnboarding)
  const [step, setStep] = useState<'safety' | 'choose'>('safety')
  const suggested = typeof navigator !== 'undefined' ? detectVehicle(navigator.userAgent) : null
  const [i, setI] = useState(() =>
    Math.max(
      0,
      vehicleCatalog.findIndex((v) => v.id === suggested),
    ),
  )
  const v = vehicleCatalog[i]
  const n = vehicleCatalog.length

  return (
    <div
      className="onboarding"
      role="dialog"
      aria-modal="true"
      aria-label={step === 'safety' ? t.safetyTitle : t.chooseTitle}
    >
      {step === 'safety' ? (
        <div className="ob-card">
          <h1>{t.safetyTitle}</h1>
          <ul>
            {t.safety.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <button className="ob-primary" onClick={() => setStep('choose')}>
            {t.accept}
          </button>
        </div>
      ) : (
        <div className="ob-card">
          <h1>{t.chooseTitle}</h1>
          <div className="ob-carousel">
            <IconButton
              icon={<IconChevronLeft />}
              label={t.prev}
              size="lg"
              onClick={() => setI((i + n - 1) % n)}
            />
            <div className="ob-slide" aria-live="polite">
              <Silhouette vehicle={v} />
              <h2>{v.displayName}</h2>
              <span>{v.variant}</span>
              {v.id === suggested && <em>{t.suggested}</em>}
            </div>
            <IconButton
              icon={<IconChevronRight />}
              label={t.next}
              size="lg"
              onClick={() => setI((i + 1) % n)}
            />
          </div>
          <button className="ob-primary" onClick={() => complete(v.id)}>
            {t.confirm}
          </button>
        </div>
      )}
    </div>
  )
}
