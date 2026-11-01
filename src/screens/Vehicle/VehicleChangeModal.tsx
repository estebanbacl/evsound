import { useEffect, useRef, useState } from 'react'
import { esVehicle } from '../../i18n/es'
import { fullName, vehicleCatalog } from '../../vehicles/catalog'
import type { VehicleId } from '../../vehicles/types'

interface Props {
  currentId: VehicleId
  onCancel: () => void
  onConfirm: (id: VehicleId) => void
}

const t = esVehicle

/** Modal to switch vehicle: pre-selects the active one, nothing changes until "Confirmar cambio". */
export function VehicleChangeModal({ currentId, onCancel, onConfirm }: Props) {
  const [pick, setPick] = useState<VehicleId>(currentId)
  const root = useRef<HTMLDivElement>(null)
  const unchanged = pick === currentId

  useEffect(() => {
    root.current?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')?.focus()
  }, [])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      return onCancel()
    }
    if (e.key === 'Tab') {
      // keep focus inside the dialog
      const items = [
        ...root.current!.querySelectorAll<HTMLElement>('button:not([disabled])'),
      ].filter((el) => el.tabIndex >= 0)
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  const onRadioKey = (e: React.KeyboardEvent, i: number) => {
    const n = vehicleCatalog.length
    const step =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0
    if (!step) return
    e.preventDefault()
    const next = vehicleCatalog[(i + step + n) % n]
    setPick(next.id)
    requestAnimationFrame(() =>
      root.current?.querySelector<HTMLElement>(`[data-id="${next.id}"]`)?.focus(),
    )
  }

  return (
    <div
      className="vmodal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        ref={root}
        className="vmodal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vmodal-title"
        onKeyDown={onKeyDown}
      >
        <h2 id="vmodal-title">{t.changeTitle}</h2>
        <p>{t.changeHint}</p>
        <div className="vmodal-options" role="radiogroup" aria-label={t.changeTitle}>
          {vehicleCatalog.map((v, i) => {
            const checked = v.id === pick
            return (
              <button
                key={v.id}
                data-id={v.id}
                role="radio"
                aria-checked={checked}
                tabIndex={checked ? 0 : -1}
                className={`vmodal-card ${checked ? 'is-active' : ''}`}
                onClick={() => setPick(v.id)}
                onKeyDown={(e) => onRadioKey(e, i)}
              >
                {v.image && <img src={v.image} alt="" draggable={false} />}
                <small>{v.id === currentId ? t.active : t.select}</small>
                <strong>{fullName(v)}</strong>
              </button>
            )
          })}
        </div>
        <div className="vmodal-actions">
          <button className="vmodal-btn" onClick={onCancel}>
            {t.cancel}
          </button>
          <button
            className="vmodal-btn is-primary"
            disabled={unchanged}
            onClick={() => onConfirm(pick)}
          >
            {t.confirmChange}
          </button>
        </div>
      </div>
    </div>
  )
}
