import { vehicleCatalog } from './catalog'
import type { VehicleId } from './types'

/**
 * Suggests a vehicle from the user agent. Only a suggestion: the user always confirms.
 * Tesla's browser exposes "Tesla/<software version>" but never the model, so we suggest the
 * first Tesla in the catalog.
 */
export function detectVehicle(userAgent: string): VehicleId | null {
  if (/tesla\//i.test(userAgent)) {
    return vehicleCatalog.find((v) => v.maker === 'Tesla')?.id ?? null
  }
  return null
}
