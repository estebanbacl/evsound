export type Quality = 'high' | 'medium' | 'low'

export const qualitySettings: Record<
  Quality,
  { dpr: number; antialias: boolean; edgeAngle: number; stations: number }
> = {
  high: { dpr: 1.5, antialias: true, edgeAngle: 20, stations: 56 },
  medium: { dpr: 1, antialias: true, edgeAngle: 30, stations: 40 },
  low: { dpr: 0.75, antialias: false, edgeAngle: 40, stations: 28 },
}

/** Initial quality from the GPU renderer string (software renderers and old iGPUs start lower). */
export function pickInitialQuality(renderer: string | null): Quality {
  if (!renderer) return 'medium'
  if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) return 'low'
  if (/intel|atom|mali|adreno [1-5]\d\d/i.test(renderer)) return 'medium'
  return 'high'
}

/** Quality adjustment from a measured average fps: only ever steps down (avoids flapping). */
export function nextQuality(q: Quality, fps: number): Quality {
  if (fps >= 28) return q
  return q === 'high' ? 'medium' : 'low'
}
