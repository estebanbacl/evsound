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

function finish(buf) {
  let peak = 0
  for (const v of buf) peak = Math.max(peak, Math.abs(v))
  const g = 0.7 / (peak || 1)
  const fade = Math.floor(SR * 1.5)
  for (let i = 0; i < buf.length; i++) {
    const f = Math.min(1, i / fade, (buf.length - 1 - i) / fade)
    buf[i] *= g * f * f * (3 - 2 * f) // smoothstep fades
  }
  return buf
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

// ---------- orbit: pads and drones ----------
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

const dust = () => {
  const bp = lp(900)
  const hpf = hp(120)
  const sub = (t) => Math.sin(TAU * 41 * t) * 0.25
  return (t) => {
    const f = 300 + 700 * (0.5 + 0.5 * Math.sin(TAU * 0.05 * t))
    return hpf(bp(noise(), f)) * 1.6 + sub(t)
  }
}

const arpeggio = () => {
  const notes = [392, 329.6, 261.6, 196, 164.8]
  const base = pad([98, 146.8], { lfo: 0.05 })
  return (t) => {
    let s = base(t) * 0.5
    notes.forEach((f, k) => {
      const start = 1 + k * 5.5
      const dt = t - start
      if (dt > 0 && dt < 5) s += Math.sin(TAU * f * t) * Math.exp(-dt * 0.9) * 0.55
    })
    return s
  }
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

const collections = [
  {
    id: 'orbita',
    title: 'Órbita',
    artist: 'EV Sound Studio',
    genre: 'Ambiental',
    year: 2026,
    cover: { style: 'orbit', hue: 2, seed: 7 },
    tracks: [
      ['Perigeo', 32, pad([110, 164.8, 220, 329.6], { shimmer: 0.15 })],
      ['Horizonte lento', 34, pad([146.8, 220, 293.7, 440], { lfo: 0.05, sweep: 1 })],
      ['Cinturón de polvo', 30, dust()],
      ['Luz del apogeo', 33, pad([174.6, 261.6, 349.2, 523.3, 659.3], { lfo: 0.09, shimmer: 0.1 })],
      ['Aterrizaje suave', 36, arpeggio()],
    ],
  },
  {
    id: 'lluvia-en-cabina',
    title: 'Lluvia en cabina',
    artist: 'EV Sound Studio',
    genre: 'Naturaleza',
    year: 2026,
    cover: { style: 'rain', hue: 355, seed: 21 },
    tracks: [
      ['Gotas en el techo', 31, rain({ density: 1, drip: 0.5, cutoff: 3500 })],
      ['Lluvia ligera', 30, rain({ density: 0.6, drip: 0.25, cutoff: 2800, rumble: 0.1 })],
      ['Tormenta lejana', 34, rain({ density: 1.2, cutoff: 2600, rumble: 0.3, thunder: true })],
      ['Parabrisas', 32, rain({ density: 0.9, cutoff: 3200, wiper: true })],
      ['Cabina cálida', 35, rain({ density: 0.7, cutoff: 900, drip: 0.1, rumble: 0.35 })],
    ],
  },
]

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const catalog = { version: 1, collections: [] }
for (const c of collections) {
  const dir = `public/sounds/ambient/${c.id}`
  mkdirSync(dir, { recursive: true })
  const tracks = []
  c.tracks.forEach(([title, secs, voice], k) => {
    const buf = finish(render(secs, voice))
    const file = `${String(k + 1).padStart(2, '0')}-${slug(title)}.wav`
    writeFileSync(`${dir}/${file}`, wav(buf))
    tracks.push({ id: `${c.id}-${k + 1}`, title, file, durationS: Math.round(buf.length / SR) })
    console.log(c.id, file, `${secs}s`)
  })
  catalog.collections.push({ id: c.id, title: c.title, artist: c.artist, genre: c.genre, year: c.year, cover: c.cover, tracks })
}
writeFileSync('public/sounds/ambient/catalog.json', JSON.stringify(catalog, null, 2))

// ---- download packs manifest (sizes in bytes) ----
import { statSync } from 'node:fs'
const packs = catalog.collections.map((c) => {
  const files = c.tracks.map((t) => {
    const url = `/sounds/ambient/${c.id}/${t.file}`
    return { url, bytes: statSync(`public${url}`).size }
  })
  return {
    id: `ambient-${c.id}`,
    kind: 'ambient',
    title: c.title,
    bytes: files.reduce((s, f) => s + f.bytes, 0),
    // small JSON the UI needs to browse/play the pack offline
    extras: ['/sounds/ambient/catalog.json'],
    files,
  }
})
writeFileSync('public/sounds/packs.json', JSON.stringify({ version: 1, packs }, null, 2))
console.log('packs.json', packs.map((p) => `${p.id} ${(p.bytes / 1e6).toFixed(1)} MB`).join(', '))
