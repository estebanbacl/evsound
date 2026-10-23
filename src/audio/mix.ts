export interface LayerMix {
  index: number
  gain: number
  rate: number
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

/** Equal-power crossfade between the two layers nearest to `rpm`; rate = rpm / layerRpm in [0.5, 2]. */
export function layerMix(rpm: number, layerRpms: number[]): LayerMix[] {
  const gains = layerRpms.map(() => 0)
  const n = layerRpms.length
  if (n === 1 || rpm <= layerRpms[0]) gains[0] = 1
  else if (rpm >= layerRpms[n - 1]) gains[n - 1] = 1
  else {
    let i = 0
    while (rpm > layerRpms[i + 1]) i++
    const x = (rpm - layerRpms[i]) / (layerRpms[i + 1] - layerRpms[i])
    gains[i] = Math.cos((x * Math.PI) / 2)
    gains[i + 1] = Math.sin((x * Math.PI) / 2)
  }
  return layerRpms.map((lr, index) => ({
    index,
    gain: gains[index],
    rate: clamp(rpm / lr, 0.5, 2),
  }))
}

/** Volume 0.4 + 0.6·load, low-pass between base and load cut-off. */
export function loadMix(load: number, fx: { lowpassBaseHz: number; lowpassLoadHz: number }) {
  const l = clamp(load, 0, 1)
  return {
    volume: 0.4 + 0.6 * l,
    lowpassHz: fx.lowpassBaseHz + (fx.lowpassLoadHz - fx.lowpassBaseHz) * l,
  }
}

export const firingFreq = (rpm: number, cylinders: number) => ((rpm / 60) * cylinders) / 2

export function distortionCurve(amount: number, samples = 1024): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(samples)
  const k = amount * 60
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * 2 - 1
    curve[i] = k === 0 ? x : ((1 + k) * x) / (1 + k * Math.abs(x))
  }
  return curve
}
