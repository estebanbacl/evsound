interface Props {
  value: number
  min?: number
  max: number
  /** Value from which the arc turns to the redline colour. */
  redline?: number
  label?: string
  unit?: string
  size?: number
}

const START = 135
const SWEEP = 270

function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const p = (a: number) => {
    const rad = (a * Math.PI) / 180
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
  }
  const [x1, y1] = p(from)
  const [x2, y2] = p(to)
  return `M ${x1} ${y1} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`
}

/** Circular tachometer: 270° arc, redline zone, value in the centre. */
export function Gauge({ value, min = 0, max, redline, label, unit, size = 280 }: Props) {
  const c = size / 2
  const r = c - 18
  const frac = Math.min(1, Math.max(0, (value - min) / (max - min)))
  const end = START + SWEEP * frac
  const redStart = redline !== undefined ? START + SWEEP * ((redline - min) / (max - min)) : null
  const ticks = []
  const n = Math.round((max - min) / 1000)
  for (let i = 0; i <= n; i++) {
    const a = ((START + (SWEEP * i) / n) * Math.PI) / 180
    ticks.push(
      <line
        key={i}
        x1={c + (r - 4) * Math.cos(a)}
        y1={c + (r - 4) * Math.sin(a)}
        x2={c + (r - 14) * Math.cos(a)}
        y2={c + (r - 14) * Math.sin(a)}
        className="ev-gauge-tick"
      />,
    )
  }
  return (
    <svg
      className="ev-gauge"
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label={`${label ?? 'Medidor'} ${Math.round(value)} ${unit ?? ''}`}
    >
      <path d={arc(c, c, r, START, START + SWEEP)} className="ev-gauge-track" />
      {redStart !== null && (
        <path d={arc(c, c, r, redStart, START + SWEEP)} className="ev-gauge-red" />
      )}
      {frac > 0.001 && <path d={arc(c, c, r, START, end)} className="ev-gauge-value" />}
      {ticks}
      <text x={c} y={c + 8} className="ev-gauge-num">
        {Math.round(value)}
      </text>
      {unit && (
        <text x={c} y={c + 34} className="ev-gauge-unit">
          {unit}
        </text>
      )}
      {label && (
        <text x={c} y={c - 48} className="ev-gauge-label">
          {label}
        </text>
      )}
    </svg>
  )
}
