import { Suspense, lazy, useRef, useState } from 'react'
import { esVehicle } from '../../i18n/es'
import { useDriveStore } from '../../state/driveStore'
import { useVehicle, useVehicleStore } from '../../state/vehicleStore'
import { fullName } from '../../vehicles/catalog'
import { VehicleChangeModal } from './VehicleChangeModal'
import type { VehiclePart } from './ProceduralVehicle'
import { SpecsPanel } from './SpecsPanel'
import { webglAvailable } from './webgl'
import './vehicle.css'

const VehicleScene = lazy(() => import('./VehicleScene'))

export function VehicleScreen() {
  const vehicle = useVehicle()
  const select = useVehicleStore((s) => s.select)
  const driveActive = useDriveStore((s) => s.active)
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  // renders are not in the repository: when one is missing, fall back to the procedural 3D scene
  const [missing, setMissing] = useState<string[]>([])
  const showImage = !!vehicle.image && !missing.includes(vehicle.id)
  const [part, setPart] = useState<VehiclePart | null>(null)
  const [gl] = useState(webglAvailable)

  return (
    <section className="vehicle-screen" aria-label="Vehículo">
      <div className="vehicle-active">
        <small>{esVehicle.activeLabel}</small>
        <strong>{fullName(vehicle)}</strong>
        <button ref={trigger} className="vehicle-change" onClick={() => setOpen(true)}>
          {esVehicle.change}
        </button>
      </div>

      <div className="vehicle-stage">
        <header className="vehicle-title">
          {!vehicle.displayName.startsWith(vehicle.maker) && <small>{vehicle.maker}</small>}
          <h1>{vehicle.displayName}</h1>
        </header>
        {showImage ? (
          <div className="vehicle-canvas vehicle-image" data-vehicle={vehicle.id}>
            <img
              key={vehicle.id}
              src={vehicle.image}
              alt={fullName(vehicle)}
              draggable={false}
              onError={() => setMissing((m) => [...m, vehicle.id])}
            />
          </div>
        ) : gl ? (
          <Suspense fallback={null}>
            <VehicleScene
              vehicle={vehicle}
              paused={driveActive}
              selected={part}
              onSelect={setPart}
            />
          </Suspense>
        ) : (
          <p className="vehicle-nogl">{esVehicle.noWebgl}</p>
        )}
        {!showImage && <p className="vehicle-hint">{esVehicle.partHint}</p>}
      </div>

      <SpecsPanel vehicle={vehicle} part={part} />

      {open && (
        <VehicleChangeModal
          currentId={vehicle.id}
          onCancel={() => {
            setOpen(false)
            trigger.current?.focus()
          }}
          onConfirm={(id) => {
            select(id)
            setPart(null)
            setOpen(false)
            trigger.current?.focus()
          }}
        />
      )}
    </section>
  )
}
