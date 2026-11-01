export type VehicleId = 'tesla-model-y' | 'tesla-model-3' | 'icar-03' | (string & {})

export type BodyType = 'suv' | 'sedan' | 'offroad'

export interface VehicleProfile {
  id: VehicleId
  displayName: string
  maker: string
  /** False until the specs were checked against the official data sheet. */
  verified: boolean
  /** Procedural body used when no .glb is available. */
  body: BodyType
  specs: {
    powerKw: number
    powerHp: number
    zeroTo100s: number
    rangeKm: number
    rangeCycle: 'WLTP' | 'CLTC' | 'EPA'
    batteryKwh: number
    dcChargeKw: number
    drivetrain: 'AWD' | 'RWD' | 'FWD'
  }
  /** Hero render shown on the Vehicle screen (falls back to the procedural 3D scene when absent). */
  image?: string
  model3d: { url: string; scale: number; cameraPreset: [number, number, number] }
  calibration: { maxSpeedKmh: number; accelRefMs2: number }
}
