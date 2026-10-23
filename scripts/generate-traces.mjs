// Generates deterministic synthetic speed traces (1 Hz) into public/traces/*.json
import { writeFileSync, mkdirSync } from 'node:fs'

let seed = 42
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32)
const noise = () => (rnd() + rnd() + rnd() - 1.5) * 0.3
const smooth = (x) => x * x * (3 - 2 * x)

/** segments: [durationS, targetKmh]; speed eases from the previous target to the next. */
function build(segments) {
  const pts = []
  let v = 0
  let t = 0
  for (const [dur, target] of segments) {
    const from = v
    for (let i = 0; i < dur; i++, t++) {
      const k = smooth(Math.min(1, (i + 1) / dur))
      const kmh = from + (target - from) * k
      const ms = Math.max(0, kmh / 3.6 + (kmh > 0.5 ? noise() : 0))
      pts.push({ t, speedMs: +ms.toFixed(2) })
    }
    v = target
  }
  return pts
}

const urban = []
for (let i = 0; i < 8; i++) urban.push([8, 0], [10, 40 + (i % 3) * 5], [18, 45], [9, 20], [8, 50], [10, 0])
urban.push([5, 0])

const highway = [
  [10, 0],
  [14, 60],
  [16, 100],
  [20, 120],
  [380, 120],
  [30, 90],
  [60, 110],
  [20, 40],
  [30, 0],
  [10, 0],
]
// vary cruise a bit so the gearbox has something to do
const hw = []
for (const [d, k] of highway) {
  if (d === 380) for (let i = 0; i < 6; i++) hw.push([60, 115 + (i % 2) * 10]), hw.push([4, 120])
  else hw.push([d, k])
}

const launch = [[3, 0], [4, 100], [10, 100], [6, 0], [3, 0]]

mkdirSync('public/traces', { recursive: true })
for (const [name, segs] of [['urban', urban], ['highway', hw], ['launch', launch]]) {
  const pts = build(segs)
  writeFileSync(`public/traces/${name}.json`, JSON.stringify(pts))
  console.log(name, pts.length, 's')
}
