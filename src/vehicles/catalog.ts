import icar03 from './catalog/icar-03-4x4.json'
import model3 from './catalog/model-3-highland-dm.json'
import modelY from './catalog/model-y-juniper-dm.json'
import type { VehicleId, VehicleProfile } from './types'

/** Adding a vehicle = one JSON in ./catalog + one entry here (+ optional .glb in public/models). */
export const vehicleCatalog = [modelY, model3, icar03] as VehicleProfile[]

export const getVehicle = (id: VehicleId | null | undefined): VehicleProfile =>
  vehicleCatalog.find((v) => v.id === id) ?? vehicleCatalog[0]
