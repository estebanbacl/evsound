import { useId } from 'react'

interface Option<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  label: string
  options: Option<T>[]
  value: T
  onChange: (v: T) => void
  disabled?: boolean
  /** Larger touch targets (drive mode). */
  large?: boolean
}

/** Row with a label on the left and mutually exclusive options on the right (see Interfaz.png). */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
  large,
}: Props<T>) {
  const id = useId()
  return (
    <div className={`ev-seg ${large ? 'is-large' : ''}`} role="radiogroup" aria-labelledby={id}>
      <span id={id} className="ev-seg-label">
        {label}
      </span>
      <div className="ev-seg-options">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            disabled={disabled}
            className={o.value === value ? 'is-selected' : ''}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
