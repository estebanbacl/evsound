import type { BodyType } from './types'

type Pt = [number, number]

export interface BodyShape {
  length: number
  width: number
  wheelRadius: number
  wheelbaseHalf: number
  /** Lower body side profile (x forward, y up, metres, centred on x). */
  lower: Pt[]
  /** Greenhouse side profile. */
  cabin: Pt[]
  /** How much narrower than the body the cabin is (m, total). */
  cabinInset: number
  batteryY: number
}

export const bodyShapes: Record<BodyType, BodyShape> = {
  suv: {
    length: 4.75,
    width: 1.92,
    wheelRadius: 0.36,
    wheelbaseHalf: 1.4,
    lower: [
      [-2.37, 0.32],
      [2.37, 0.32],
      [2.4, 0.6],
      [2.2, 0.82],
      [1.0, 0.95],
      [-1.9, 1.0],
      [-2.4, 0.9],
    ],
    cabin: [
      [-2.0, 0.97],
      [-1.5, 1.55],
      [0.3, 1.62],
      [1.25, 1.0],
    ],
    cabinInset: 0.28,
    batteryY: 0.42,
  },
  sedan: {
    length: 4.72,
    width: 1.85,
    wheelRadius: 0.34,
    wheelbaseHalf: 1.4,
    lower: [
      [-2.36, 0.3],
      [2.36, 0.3],
      [2.38, 0.58],
      [2.2, 0.8],
      [0.9, 0.93],
      [-1.9, 0.98],
      [-2.38, 0.9],
    ],
    cabin: [
      [-1.75, 0.95],
      [-0.95, 1.4],
      [0.35, 1.44],
      [1.15, 0.97],
    ],
    cabinInset: 0.3,
    batteryY: 0.4,
  },
  offroad: {
    length: 4.4,
    width: 1.91,
    wheelRadius: 0.42,
    wheelbaseHalf: 1.35,
    lower: [
      [-2.2, 0.42],
      [2.2, 0.42],
      [2.24, 0.75],
      [2.2, 1.02],
      [0.9, 1.04],
      [-2.2, 1.05],
    ],
    cabin: [
      [-2.1, 1.02],
      [-2.1, 1.72],
      [0.7, 1.74],
      [1.0, 1.02],
    ],
    cabinInset: 0.2,
    batteryY: 0.52,
  },
}
