export type VehicleId = 'model-y-juniper-dm' | 'model-3-highland-dm' | 'icar-03-4x4' | (string & {})

export interface VehicleProfile {
  id: VehicleId
  displayName: string
  variant: string
  maker: string
  verified?: boolean
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
  model3d: { url: string; scale: number; cameraPreset: [number, number, number] }
  calibration: { maxSpeedKmh: number; accelRefMs2: number }
}
