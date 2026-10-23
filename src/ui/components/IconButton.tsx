import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label: string
  size?: 'md' | 'lg'
  active?: boolean
}

export function IconButton({ icon, label, size = 'md', active, className = '', ...rest }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`ev-iconbtn is-${size} ${active ? 'is-active' : ''} ${className}`}
      {...rest}
    >
      {icon}
    </button>
  )
}
