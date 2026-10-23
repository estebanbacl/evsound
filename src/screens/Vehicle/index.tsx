import { Suspense, lazy, useState } from 'react'
import { esVehicle } from '../../i18n/es'
import { useDriveStore } from '../../state/driveStore'
import { useVehicle, useVehicleStore } from '../../state/vehicleStore'
import { vehicleCatalog } from '../../vehicles/catalog'
import type { VehiclePart } from './ProceduralVehicle'
import { SpecsPanel } from './SpecsPanel'
import { webglAvailable } from './webgl'
import './vehicle.css'

const VehicleScene = lazy(() => import('./VehicleScene'))

export function VehicleScreen() {
  const vehicle = useVehicle()
  const select = useVehicleStore((s) => s.select)
  const driveActive = useDriveStore((s) => s.active)
  const [part, setPart] = useState<VehiclePart | null>(null)
  const [gl] = useState(webglAvailable)

  return (
    <section className="vehicle-screen" aria-label="Vehículo">
      <div className="vehicle-list" role="radiogroup" aria-label={esVehicle.select}>
        {vehicleCatalog.map((v) => {
          const active = v.id === vehicle.id
          return (
            <button
              key={v.id}
              role="radio"
              aria-checked={active}
              className={`vehicle-card ${active ? 'is-active' : ''}`}
              onClick={() => {
                select(v.id)
                setPart(null)
              }}
            >
              <small>{active ? esVehicle.active : esVehicle.select}</small>
              <strong>{v.displayName}</strong>
              <span>{v.variant}</span>
            </button>
          )
        })}
      </div>

      <div className="vehicle-stage">
        <header className="vehicle-title">
          <small>{vehicle.maker}</small>
          <h1>{vehicle.displayName}</h1>
          <span>{vehicle.variant}</span>
        </header>
        {gl ? (
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
        <p className="vehicle-hint">{esVehicle.partHint}</p>
      </div>

      <SpecsPanel vehicle={vehicle} part={part} />
    </section>
  )
}
