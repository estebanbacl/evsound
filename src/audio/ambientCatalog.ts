export interface AmbientTrack {
  id: string
  title: string
  file: string
  durationS: number
}

export interface AmbientCollection {
  id: string
  title: string
  artist: string
  genre: string
  year: number
  cover: { style: 'orbit' | 'rain'; hue: number; seed: number }
  tracks: AmbientTrack[]
}

export interface AmbientCatalog {
  version: number
  collections: AmbientCollection[]
}

export const trackUrl = (collectionId: string, file: string) =>
  `${import.meta.env.BASE_URL}sounds/ambient/${collectionId}/${file}`

let cached: Promise<AmbientCatalog> | null = null

/** Test hook: forget the cached catalog. */
export function resetCatalogCache() {
  cached = null
}

export function loadCatalog(fetcher: typeof fetch = fetch): Promise<AmbientCatalog> {
  cached ??= fetcher(`${import.meta.env.BASE_URL}sounds/ambient/catalog.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`catalog ${r.status}`)
      return r.json() as Promise<AmbientCatalog>
    })
    .catch((e) => {
      cached = null // allow retry
      throw e
    })
  return cached
}
