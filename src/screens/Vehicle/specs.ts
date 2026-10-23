import type { VehicleProfile } from '../../vehicles/types'
import { esVehicle } from '../../i18n/es'
import type { VehiclePart } from './ProceduralVehicle'

export type SpecKey = 'power' | 'zeroTo100' | 'range' | 'battery' | 'dcCharge' | 'drivetrain'

const n = (v: number, digits = 0) =>
  v.toLocaleString('es-CO', { minimumFractionDigits: digits, maximumFractionDigits: digits })

export interface SpecRow {
  key: SpecKey
  label: string
  value: string
}

export function specRows(v: VehicleProfile): SpecRow[] {
  const s = v.specs
  const l = esVehicle.specs
  return [
    { key: 'power', label: l.power, value: `${n(s.powerKw)} kW (${n(s.powerHp)} hp)` },
    { key: 'zeroTo100', label: l.zeroTo100, value: `${n(s.zeroTo100s, 1)} s` },
    { key: 'range', label: `${l.range} (${s.rangeCycle})`, value: `${n(s.rangeKm)} km` },
    { key: 'battery', label: l.battery, value: `${n(s.batteryKwh, s.batteryKwh % 1 ? 1 : 0)} kWh` },
    { key: 'dcCharge', label: l.dcCharge, value: `${n(s.dcChargeKw)} kW` },
    { key: 'drivetrain', label: l.drivetrain, value: s.drivetrain },
  ]
}

/** Spec rows highlighted for a selected 3D part. */
export function highlightedSpecs(part: VehiclePart | null): SpecKey[] {
  if (part === 'battery') return ['battery', 'dcCharge', 'range']
  if (part === 'motor') return ['power', 'drivetrain', 'zeroTo100']
  return []
}
