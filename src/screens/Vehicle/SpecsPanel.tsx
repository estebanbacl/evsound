import { es, esVehicle } from '../../i18n/es'
import type { VehicleProfile } from '../../vehicles/types'
import { IconBattery, IconBolt, IconDrive, IconPlug, IconRoad, IconStopwatch } from '../../ui/icons'
import { highlightedSpecs, specRows, type SpecKey } from './specs'
import type { VehiclePart } from './ProceduralVehicle'

const icons: Record<SpecKey, typeof IconBolt> = {
  power: IconBolt,
  zeroTo100: IconStopwatch,
  range: IconRoad,
  battery: IconBattery,
  dcCharge: IconPlug,
  drivetrain: IconDrive,
}

export function SpecsPanel({
  vehicle,
  part,
}: {
  vehicle: VehicleProfile
  part: VehiclePart | null
}) {
  const hi = highlightedSpecs(part)
  return (
    <aside className="specs" aria-label="Especificaciones">
      <ul>
        {specRows(vehicle).map((r) => {
          const Icon = icons[r.key]
          return (
            <li key={r.key} className={hi.includes(r.key) ? 'is-hi' : ''}>
              <Icon />
              <span className="spec-label">{r.label}</span>
              <strong className="spec-value">{r.value}</strong>
            </li>
          )
        })}
      </ul>
      {!vehicle.verified && <p className="spec-note">{esVehicle.unverified}</p>}
      <p className="spec-note">{es.disclaimer}</p>
    </aside>
  )
}
