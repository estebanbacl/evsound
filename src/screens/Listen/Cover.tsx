import { useMemo } from 'react'
import type { AmbientCover } from '../../audio/ambientCatalog'
import { coverDataUri } from '../../audio/cover'

export function Cover({
  cover,
  size = 512,
  className = '',
}: {
  cover: AmbientCover
  size?: number
  className?: string
}) {
  const src = useMemo(() => coverDataUri(cover, size), [cover, size])
  return <img className={`cover ${className}`} src={src} alt="" draggable={false} />
}
