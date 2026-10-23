import type { HTMLAttributes, ReactNode } from 'react'

interface PanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode
  active?: boolean
}

/** Red-bordered translucent surface with glow, the base block of the UI. */
export function Panel({ title, active, className = '', children, ...rest }: PanelProps) {
  return (
    <div className={`ev-panel ${active ? 'is-active' : ''} ${className}`} {...rest}>
      {title && <div className="ev-panel-title">{title}</div>}
      {children}
    </div>
  )
}
