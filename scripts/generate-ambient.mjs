// Renders original ambient tracks (WAV, 16-bit mono 11.025 kHz) with plain DSP. No external audio.
// Output: public/sounds/ambient/<collection>/<nn-slug>.wav + public/sounds/ambient/catalog.json
import { mkdirSync, writeFileSync } from 'node:fs'

const SR = 11025
let seed = 1234567
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32)
const noise = () => rnd() * 2 - 1
const TAU = Math.PI * 2

/** One-pole low-pass state holder. */
const lp = (hz) => {
  const a = 1 - Math.exp((-TAU * hz) / SR)
  let y = 0
  return (x, hzOverride) => {
    const k = hzOverride ? 1 - Math.exp((-TAU * hzOverride) / SR) : a
    y += k * (x - y)
    return y
  }
}
const hp = (hz) => {
  const l = lp(hz)
  return (x) => x - l(x)
}

function render(seconds, fn) {
  const n = Math.floor(seconds * SR)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) out[i] = fn(i / SR, i)
  return out
}

/** Normalises and makes the buffer loop seamlessly: the tail is cross-faded into the head. */
function finish(buf) {
  const xf = Math.floor(SR * 2)
  const n = buf.length - xf
  const out = new Float32Array(n)
  out.set(buf.subarray(0, n))
  for (let i = 0; i < xf; i++) {
    const w = i / xf // head fades in while the extra tail (continuing the signal) fades out
    out[i] = buf[i] * w + buf[n + i] * (1 - w)
  }
  let peak = 0
  for (const v of out) peak = Math.max(peak, Math.abs(v))
  const g = 0.7 / (peak || 1)
  for (let i = 0; i < n; i++) out[i] *= g
  return out
}

function wav(buf) {
  const data = Buffer.alloc(44 + buf.length * 2)
  data.write('RIFF', 0)
  data.writeUInt32LE(36 + buf.length * 2, 4)
  data.write('WAVEfmt ', 8)
  data.writeUInt32LE(16, 16)
  data.writeUInt16LE(1, 20)
  data.writeUInt16LE(1, 22)
  data.writeUInt32LE(SR, 24)
  data.writeUInt32LE(SR * 2, 28)
  data.writeUInt16LE(2, 32)
  data.writeUInt16LE(16, 34)
  data.write('data', 36)
  data.writeUInt32LE(buf.length * 2, 40)
  for (let i = 0; i < buf.length; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2)
  return data
}

// ---------- shared voices ----------
const pinkNoise = () => {
  // Paul Kellet's economy pink filter
  let b0 = 0, b1 = 0, b2 = 0
  return () => {
    const w = noise()
    b0 = 0.99765 * b0 + w * 0.099046
    b1 = 0.963 * b1 + w * 0.2965164
    b2 = 0.57 * b2 + w * 1.0526913
    return (b0 + b1 + b2 + w * 0.1848) * 0.3
  }
}
const brownNoise = () => {
  let y = 0
  return () => {
    y = (y + 0.02 * noise()) / 1.02
    return y * 3.5
  }
}
/** Slow random control signal in [0,1] (smoothed noise). */
const wander = (hz) => {
  const l = lp(hz)
  return () => Math.min(1, Math.max(0, 0.5 + l(noise()) * (2.2 + 8 * hz ** 0.3)))
}

const wind = ({ level = 0.5, cutoff = 600, gust = 0.12, rustle = 0 } = {}) => {
  const body = lp(cutoff)
  const g = wander(gust)
  const leaf = hp(2200)
  const leafLow = lp(5000)
  const leafMod = wander(3)
  return (t) => {
    const k = 0.35 + 0.65 * g()
    const b = body(noise(), cutoff * (0.5 + k))
    const l = rustle ? leafLow(leaf(noise())) * leafMod() * k * rustle : 0
    return b * level * (0.4 + k) * 2.2 + l
  }
}

const birds = ({ rate = 0.4, low = 2200, high = 4400, level = 0.5 } = {}) => {
  const calls = []
  return (t) => {
    if (rnd() < (rate / SR) * (1 + 1.5 * Math.sin(t * 0.3) ** 2)) {
      const f0 = low + rnd() * (high - low)
      const notes = 2 + Math.floor(rnd() * 4)
      for (let n = 0; n < notes; n++) {
        calls.push({ t0: t + n * (0.09 + rnd() * 0.08), f0, f1: f0 * (0.8 + rnd() * 0.5), dur: 0.05 + rnd() * 0.07, amp: 0.25 + rnd() * 0.4 })
      }
    }
    let s = 0
    for (let k = calls.length - 1; k >= 0; k--) {
      const c = calls[k]
      const d = t - c.t0
      if (d < 0) continue
      if (d > c.dur) { calls.splice(k, 1); continue }
      const u = d / c.dur
      const f = c.f0 + (c.f1 - c.f0) * u
      c.ph = (c.ph ?? 0) + (TAU * f) / SR
      s += Math.sin(c.ph) * Math.sin(Math.PI * u) ** 1.5 * c.amp
    }
    return s * level
  }
}

const river = ({ level = 0.6, bright = 2600 } = {}) => {
  const bands = [
    { f: lp(bright), h: hp(500), m: wander(9), g: 1 },
    { f: lp(bright * 0.5), h: hp(250), m: wander(5), g: 0.8 },
    { f: lp(bright * 1.4), h: hp(900), m: wander(14), g: 0.5 },
  ]
  const low = lp(180)
  return () => {
    let s = 0
    for (const b of bands) s += b.h(b.f(noise())) * (0.3 + 0.7 * b.m()) * b.g
    return (s * 1.6 + low(noise()) * 0.5) * level
  }
}

const waves = ({ period = 9, swell = 0.7, foam = 0.5, level = 0.6, cutoff = 1400 } = {}) => {
  const body = lp(cutoff)
  const fz = lp(4200)
  const fh = hp(1200)
  const jitter = wander(0.15)
  const low = lp(120)
  return (t) => {
    const ph = (t / (period * (0.85 + 0.3 * jitter()))) * TAU
    const env = Math.max(0, 0.5 + 0.5 * Math.sin(ph) ) ** 1.6
    const crest = Math.max(0, Math.sin(ph + 0.9)) ** 3
    const n = noise()
    return (body(n, cutoff * (0.5 + env)) * (0.25 + swell * env) * 2.2 + fh(fz(noise())) * crest * foam * 1.4 + low(noise()) * 0.3) * level
  }
}

const crickets = ({ level = 0.4, count = 4 } = {}) => {
  const voices = Array.from({ length: count }, () => ({
    f: 3600 + rnd() * 900,
    rate: 13 + rnd() * 9,
    ph: rnd() * TAU,
    gate: rnd() * 10,
    gRate: 0.15 + rnd() * 0.25,
    amp: 0.5 + rnd() * 0.5,
  }))
  return (t) => {
    let s = 0
    for (const v of voices) {
      const gate = Math.max(0, Math.sin(TAU * v.gRate * t + v.gate)) ** 0.5
      const chirp = Math.max(0, Math.sin(TAU * v.rate * t + v.ph)) ** 2
      s += Math.sin(TAU * v.f * t) * chirp * gate * v.amp
    }
    return (s / count) * level
  }
}

const owl = ({ level = 0.4 } = {}) => {
  const hoots = [] // [start, ...]
  let next = 3
  let ph = 0
  return (t) => {
    if (t > next) {
      hoots.push(t)
      next = t + 9 + rnd() * 8
    }
    let s = 0
    for (let k = hoots.length - 1; k >= 0; k--) {
      const d = t - hoots[k]
      if (d > 1.6) { hoots.splice(k, 1); continue }
      const seg = (d % 0.8)
      const on = d < 1.5 && seg < 0.38
      if (on) {
        const f = 330 - 40 * (seg / 0.38)
        ph += (TAU * f) / SR
        s += (Math.sin(ph) + 0.3 * Math.sin(2 * ph)) * Math.sin((Math.PI * seg) / 0.38) ** 2
      }
    }
    return s * level
  }
}

const fan = () => {
  const b = brownNoise()
  const p = pinkNoise()
  const mod = lp(30)
  return (t) => b() * 0.6 + p() * 0.25 + Math.sin(TAU * 118 * t) * 0.05 + Math.sin(TAU * 4.7 * t) * 0.03 * mod(noise())
}

const mix = (...voices) => (t, i) => voices.reduce((s, v) => s + v(t, i), 0)
const gain = (v, g) => (t, i) => v(t, i) * g

// ---------- ambient: pads and drones ----------
const pad = (freqs, { lfo = 0.07, shimmer = 0, noiseAmt = 0.05, sweep = 0 } = {}) => {
  const air = lp(1500)
  const phases = freqs.map(() => rnd() * TAU)
  return (t) => {
    let s = 0
    freqs.forEach((f, k) => {
      const am = 0.6 + 0.4 * Math.sin(TAU * lfo * (1 + k * 0.37) * t + k)
      s += Math.sin(TAU * f * t + phases[k]) * am
      s += Math.sin(TAU * f * 1.003 * t + phases[k] * 2) * am * 0.5
      if (shimmer) s += Math.sin(TAU * f * 3 * t) * am * shimmer
    })
    const cut = 1200 + sweep * Math.sin(TAU * 0.03 * t) * 800
    return s / freqs.length + air(noise(), cut) * noiseAmt
  }
}
const deepSpace = () => {
  const dustBand = lp(300)
  return mix(pad([41, 55, 82.4], { lfo: 0.03, noiseAmt: 0.02 }), (t) => dustBand(noise()) * (0.35 + 0.2 * Math.sin(TAU * 0.04 * t)))
}

// ---------- rain ----------
const rain = ({ density = 1, cutoff = 3000, drip = 0.3, rumble = 0.2, wiper = false, thunder = false }) => {
  const hiss = lp(cutoff)
  const low = lp(160)
  const dripFilt = lp(2200)
  let dripEnv = 0
  let nextThunder = 6 * SR
  let thunderEnv = 0
  return (t, i) => {
    if (rnd() < 0.0012 * density) dripEnv = 0.6 + rnd() * 0.5
    dripEnv *= 0.94
    let s = hiss(noise()) * (0.45 * density) + dripFilt(noise()) * dripEnv * drip + low(noise()) * rumble
    if (wiper) {
      const ph = (t % 2.4) / 2.4
      if (ph < 0.25) s += hiss(noise(), 2500) * Math.sin((ph / 0.25) * Math.PI) * 0.5
    }
    if (thunder) {
      if (i > nextThunder) {
        thunderEnv = 1
        nextThunder = i + (7 + rnd() * 6) * SR
      }
      thunderEnv *= 0.99985
      s += low(noise(), 90) * thunderEnv * 2.2
    }
    return s
  }
}

// ---------- catalog ----------
const D = 24 // seconds per loop
const categories = [
  {
    id: 'naturaleza', title: 'Naturaleza', description: 'Bosques, fauna, hojas y viento.',
    cover: { style: 'forest', hue: 140, seed: 11 },
    sounds: [
      ['Bosque tranquilo', mix(wind({ level: 0.35, cutoff: 500, rustle: 0.25 }), birds({ rate: 0.25, level: 0.35 })), true],
      ['Río en el bosque', mix(river({ level: 0.55 }), birds({ rate: 0.18, level: 0.25 }))],
      ['Viento entre árboles', wind({ level: 0.7, cutoff: 700, gust: 0.15, rustle: 0.7 })],
      ['Aves al amanecer', mix(birds({ rate: 1.6, level: 0.6 }), wind({ level: 0.15, cutoff: 400 }))],
    ],
  },
  {
    id: 'mar-y-oceano', title: 'Mar y océano', description: 'Olas, costa y lluvia sobre el mar.',
    cover: { style: 'sea', hue: 200, seed: 31 },
    sounds: [
      ['Olas suaves', waves({ period: 8, swell: 0.55, foam: 0.35, level: 0.8 }), true],
      ['Mar abierto', mix(waves({ period: 12, swell: 0.9, foam: 0.5, level: 0.7, cutoff: 1000 }), wind({ level: 0.25, cutoff: 450 }))],
      ['Lluvia en el mar', mix(rain({ density: 0.8, cutoff: 3200, drip: 0.2, rumble: 0.1 }), waves({ period: 10, swell: 0.6, foam: 0.2, level: 0.5 })), true],
      ['Costa al atardecer', mix(waves({ period: 9, swell: 0.5, foam: 0.4, level: 0.6 }), wind({ level: 0.15, cutoff: 380 }), birds({ rate: 0.1, low: 2800, high: 4000, level: 0.2 }))],
    ],
  },
  {
    id: 'lluvia', title: 'Lluvia', description: 'Lluvia suave, intensa y tormentas.',
    cover: { style: 'rain', hue: 355, seed: 21 },
    sounds: [
      ['Lluvia en cabina', rain({ density: 0.9, drip: 0.5, cutoff: 1800, rumble: 0.3 })],
      ['Lluvia ligera', rain({ density: 0.6, drip: 0.25, cutoff: 2800, rumble: 0.1 })],
      ['Lluvia intensa', rain({ density: 1.5, cutoff: 3600, drip: 0.4, rumble: 0.3 })],
      ['Lluvia con truenos', rain({ density: 1.1, cutoff: 2600, rumble: 0.3, thunder: true })],
    ],
  },
  {
    id: 'noche-y-descanso', title: 'Noche y descanso', description: 'Grillos, bosque nocturno y calma.',
    cover: { style: 'night', hue: 255, seed: 41 },
    sounds: [
      ['Noche en el bosque', mix(crickets({ level: 0.3, count: 4 }), wind({ level: 0.2, cutoff: 350, rustle: 0.1 }), owl({ level: 0.25 })), true],
      ['Grillos nocturnos', mix(crickets({ level: 0.55, count: 7 }), wind({ level: 0.06, cutoff: 300 }))],
      ['Viento nocturno', wind({ level: 0.6, cutoff: 380, gust: 0.1 })],
      ['Bosque bajo la lluvia', mix(rain({ density: 0.6, cutoff: 2400, drip: 0.5, rumble: 0.15 }), wind({ level: 0.2, cutoff: 420, rustle: 0.3 }))],
    ],
  },
  {
    id: 'ruido-blanco', title: 'Ruido blanco', description: 'Ruido blanco, rosa y marrón.',
    cover: { style: 'noise', hue: 20, seed: 51 },
    sounds: [
      ['Ruido blanco', (() => { const l = lp(5200); return () => l(noise()) * 0.5 })()],
      ['Ruido rosa', (() => { const p = pinkNoise(); return () => p() })()],
      ['Ruido marrón', (() => { const b = brownNoise(); return () => b() })()],
      ['Ventilador suave', fan()],
    ],
  },
  {
    id: 'ambiental', title: 'Ambiental', description: 'Órbita, atmósferas y sonidos espaciales.',
    cover: { style: 'orbit', hue: 2, seed: 7 },
    sounds: [
      ['Órbita', pad([110, 164.8, 220, 329.6], { shimmer: 0.15 })],
      ['Espacio profundo', deepSpace()],
      ['Atmósfera espacial', pad([146.8, 220, 293.7, 440], { lfo: 0.05, sweep: 1, shimmer: 0.08 })],
      ['Frecuencias ambientales', pad([174.6, 285, 396, 528], { lfo: 0.04, noiseAmt: 0.01 })],
    ],
  },
]

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const only = process.argv[2] // optional category id to regenerate
const catalog = { version: 2, categories: [], sounds: [] }
for (const c of categories) {
  const dir = `public/sounds/ambient/${c.id}`
  mkdirSync(dir, { recursive: true })
  catalog.categories.push({ id: c.id, title: c.title, description: c.description, cover: c.cover })
  for (const [title, voice, priority] of c.sounds) {
    const file = `${slug(title)}.wav`
    if (!only || only === c.id) {
      const buf = finish(render(D + 2, voice))
      writeFileSync(`${dir}/${file}`, wav(buf))
      console.log(c.id, file)
    }
    catalog.sounds.push({ id: `${c.id}/${slug(title)}`, categoryId: c.id, title, file, durationS: D, ...(priority ? { featured: true } : {}) })
  }
}
writeFileSync('public/sounds/ambient/catalog.json', JSON.stringify(catalog, null, 2))

// ---- download packs manifest: one pack per category (sizes in bytes) ----
import { statSync } from 'node:fs'
const packs = catalog.categories.map((c) => {
  const files = catalog.sounds
    .filter((s) => s.categoryId === c.id)
    .map((s) => {
      const url = `/sounds/ambient/${c.id}/${s.file}`
      return { url, bytes: statSync(`public${url}`).size }
    })
  return {
    id: `ambient-${c.id}`,
    kind: 'ambient',
    title: c.title,
    bytes: files.reduce((a, f) => a + f.bytes, 0),
    extras: ['/sounds/ambient/catalog.json'],
    files,
  }
})
writeFileSync('public/sounds/packs.json', JSON.stringify({ version: 1, packs }, null, 2))
console.log('packs.json', packs.map((p) => `${p.id} ${(p.bytes / 1e6).toFixed(1)} MB`).join(', '))
