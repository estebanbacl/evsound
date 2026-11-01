import icar03 from './catalog/icar-03.json'
import model3 from './catalog/tesla-model-3.json'
import modelY from './catalog/tesla-model-y.json'
import type { VehicleId, VehicleProfile } from './types'

/** Adding a vehicle = one JSON in ./catalog + one entry here (+ optional .glb in public/models). */
export const vehicleCatalog = [modelY, model3, icar03] as VehicleProfile[]

/** Maker + model, e.g. "Tesla Model Y" / "iCAR 03" (no trim, motor or drivetrain). */
export const fullName = (v: Pick<VehicleProfile, 'maker' | 'displayName'>) =>
  v.displayName.startsWith(v.maker) ? v.displayName : `${v.maker} ${v.displayName}`

export const getVehicle = (id: VehicleId | null | undefined): VehicleProfile =>
  vehicleCatalog.find((v) => v.id === id) ?? vehicleCatalog[0]
