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
      [2.4, 0.62],
      [2.2, 0.78],
      [1.6, 0.88],
      [0.9, 0.94],
      [-0.8, 0.98],
      [-1.9, 1.0],
      [-2.4, 0.94],
    ],
    cabin: [
      [-2.12, 1.0],
      [-1.95, 1.3],
      [-1.55, 1.5],
      [-0.9, 1.6],
      [-0.1, 1.64],
      [0.45, 1.58],
      [0.95, 1.28],
      [1.3, 0.99],
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
      [2.2, 0.76],
      [1.5, 0.86],
      [0.9, 0.93],
      [-1.9, 0.98],
      [-2.38, 0.96],
    ],
    cabin: [
      [-1.9, 0.98],
      [-1.5, 1.2],
      [-1.0, 1.38],
      [-0.2, 1.44],
      [0.5, 1.4],
      [1.0, 1.15],
      [1.35, 0.94],
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
      [-2.1, 1.05],
      [-2.08, 1.68],
      [-1.9, 1.76],
      [0.55, 1.78],
      [0.85, 1.55],
      [1.05, 1.08],
    ],
    cabinInset: 0.2,
    batteryY: 0.52,
  },
}
