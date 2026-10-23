import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { getVehicle } from '../vehicles/catalog'
import type { VehicleId, VehicleProfile } from '../vehicles/types'
import { safeStorage } from './safeStorage'

interface VehicleState {
  vehicleId: VehicleId | null
  /** True once the user went through the first-run safety notice + vehicle choice. */
  onboarded: boolean
  select: (id: VehicleId) => void
  completeOnboarding: (id: VehicleId) => void
}

export const useVehicleStore = create<VehicleState>()(
  persist(
    (set) => ({
      vehicleId: null,
      onboarded: false,
      select: (vehicleId) => set({ vehicleId }),
      completeOnboarding: (vehicleId) => set({ vehicleId, onboarded: true }),
    }),
    { name: 'ev-vehicle', storage: createJSONStorage(() => safeStorage), version: 1 },
  ),
)

/** Selected vehicle profile (falls back to the first catalog entry). */
export const useVehicle = (): VehicleProfile => getVehicle(useVehicleStore((s) => s.vehicleId))
