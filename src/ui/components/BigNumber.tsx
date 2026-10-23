interface Props {
  value: string | number
  unit?: string
  size?: 'md' | 'lg' | 'xl'
  label?: string
}

export function BigNumber({ value, unit, size = 'md', label }: Props) {
  return (
    <div className={`ev-bignum is-${size}`} aria-label={label}>
      <span className="ev-bignum-value">{value}</span>
      {unit && <span className="ev-bignum-unit">{unit}</span>}
    </div>
  )
}
