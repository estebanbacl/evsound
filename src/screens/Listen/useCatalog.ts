import { useCallback, useEffect, useState } from 'react'
import { loadCatalog, type AmbientCatalog } from '../../audio/ambientCatalog'

export function useCatalog() {
  const [catalog, setCatalog] = useState<AmbientCatalog | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let live = true
    loadCatalog()
      .then((c) => live && (setCatalog(c), setError(false)))
      .catch(() => live && setError(true))
    return () => {
      live = false
    }
  }, [attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { catalog, error, retry }
}
