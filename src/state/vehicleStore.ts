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
    {
      name: 'ev-vehicle',
      storage: createJSONStorage(() => safeStorage),
      version: 2,
      // v1 ids carried trim/motor suffixes; map them to the plain model ids
      migrate: (persisted) => {
        const s = (persisted ?? {}) as { vehicleId?: string | null; onboarded?: boolean }
        const legacy: Record<string, string> = {
          'model-y-juniper-dm': 'tesla-model-y',
          'model-3-highland-dm': 'tesla-model-3',
          'icar-03-4x4': 'icar-03',
        }
        return {
          vehicleId: s.vehicleId ? (legacy[s.vehicleId] ?? s.vehicleId) : null,
          onboarded: Boolean(s.onboarded),
        }
      },
    },
  ),
)

/** Selected vehicle profile (falls back to the first catalog entry). */
export const useVehicle = (): VehicleProfile => getVehicle(useVehicleStore((s) => s.vehicleId))
