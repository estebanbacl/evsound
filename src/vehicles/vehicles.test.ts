import { vehicleCatalog, getVehicle } from './catalog'
import { bodyShapes } from './bodyShapes'
import { detectVehicle } from './detectVehicle'
import { nextQuality, pickInitialQuality } from './quality'

describe('catalog', () => {
  it('has the three v1 vehicles with unique ids', () => {
    expect(vehicleCatalog.map((v) => v.id)).toEqual(['tesla-model-y', 'tesla-model-3', 'icar-03'])
  })

  it('matches the SPEC §6 spec table and is flagged unverified', () => {
    const [y, m3, icar] = vehicleCatalog
    expect(y.specs).toMatchObject({
      powerKw: 384,
      powerHp: 517,
      zeroTo100s: 4.3,
      rangeKm: 533,
      rangeCycle: 'WLTP',
      batteryKwh: 75,
      dcChargeKw: 250,
      drivetrain: 'AWD',
    })
    expect(m3.specs).toMatchObject({ powerKw: 366, zeroTo100s: 4.4, rangeKm: 513 })
    expect(icar.specs).toMatchObject({
      powerKw: 205,
      zeroTo100s: 6.5,
      rangeKm: 501,
      rangeCycle: 'CLTC',
      batteryKwh: 69.8,
      dcChargeKw: 80,
    })
    expect(vehicleCatalog.every((v) => v.verified === false)).toBe(true)
  })

  it('every vehicle has a body shape, calibration and model3d', () => {
    for (const v of vehicleCatalog) {
      expect(bodyShapes[v.body]).toBeDefined()
      expect(v.calibration.maxSpeedKmh).toBeGreaterThan(100)
      expect(v.calibration.accelRefMs2).toBeGreaterThan(0)
      expect(v.model3d.cameraPreset).toHaveLength(3)
    }
  })

  it('falls back to the first vehicle for unknown ids', () => {
    expect(getVehicle('nope').id).toBe(vehicleCatalog[0].id)
    expect(getVehicle(null).id).toBe(vehicleCatalog[0].id)
  })

  it('never ships brand logos or wordmark assets in the catalog', () => {
    expect(JSON.stringify(vehicleCatalog)).not.toMatch(/logo|wordmark/i)
  })
})

describe('detectVehicle', () => {
  it('suggests a Tesla for the Tesla browser UA', () => {
    expect(
      detectVehicle('Mozilla/5.0 (X11; GNU/Linux) Chrome/130 Safari/537.36 Tesla/2026.20.1'),
    ).toBe('tesla-model-y')
  })
  it('suggests nothing otherwise', () => {
    expect(detectVehicle('Mozilla/5.0 (Macintosh) Chrome/130')).toBeNull()
  })
})

describe('quality', () => {
  it('starts low on software renderers and medium on unknown/integrated GPUs', () => {
    expect(pickInitialQuality('Google SwiftShader')).toBe('low')
    expect(pickInitialQuality(null)).toBe('medium')
    expect(pickInitialQuality('Intel(R) UHD Graphics')).toBe('medium')
    expect(pickInitialQuality('NVIDIA GeForce RTX 3060')).toBe('high')
  })
  it('only steps down when fps is under 28', () => {
    expect(nextQuality('high', 60)).toBe('high')
    expect(nextQuality('high', 20)).toBe('medium')
    expect(nextQuality('medium', 20)).toBe('low')
    expect(nextQuality('low', 5)).toBe('low')
  })
})
