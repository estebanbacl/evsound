import { useId } from 'react'

interface Props {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (v: number) => void
  format?: (v: number) => string
  disabled?: boolean
}

export function Slider({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  format,
  disabled,
}: Props) {
  const id = useId()
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="ev-slider">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        style={{ ['--pct' as string]: `${pct}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <output htmlFor={id}>{format ? format(value) : `${Math.round(pct)}%`}</output>
    </div>
  )
}
