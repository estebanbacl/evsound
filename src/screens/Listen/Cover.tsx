import { useMemo } from 'react'
import type { AmbientCollection } from '../../audio/ambientCatalog'
import { coverDataUri } from '../../audio/cover'

export function Cover({
  cover,
  size = 512,
  className = '',
}: {
  cover: AmbientCollection['cover']
  size?: number
  className?: string
}) {
  const src = useMemo(() => coverDataUri(cover, size), [cover, size])
  return <img className={`cover ${className}`} src={src} alt="" draggable={false} />
}
