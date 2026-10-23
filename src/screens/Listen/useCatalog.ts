import { useCallback, useEffect, useState } from 'react'
import { loadCatalog, type AmbientCollection } from '../../audio/ambientCatalog'

export function useCatalog() {
  const [collections, setCollections] = useState<AmbientCollection[] | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let live = true
    loadCatalog()
      .then((c) => live && (setCollections(c.collections), setError(false)))
      .catch(() => live && setError(true))
    return () => {
      live = false
    }
  }, [attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { collections, error, retry }
}
