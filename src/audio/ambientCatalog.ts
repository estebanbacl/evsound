export type CoverStyle = 'forest' | 'sea' | 'rain' | 'night' | 'noise' | 'orbit'

export interface AmbientCover {
  style: CoverStyle
  hue: number
  seed: number
}

export interface AmbientCategory {
  id: string
  title: string
  description: string
  cover: AmbientCover
}

export interface AmbientSound {
  /** `<categoryId>/<slug>`, also the file path under public/sounds/ambient. */
  id: string
  categoryId: string
  title: string
  file: string
  /** Length of one seamless loop. */
  durationS: number
  featured?: boolean
}

export interface AmbientCatalog {
  version: number
  categories: AmbientCategory[]
  sounds: AmbientSound[]
}

export const soundUrl = (s: Pick<AmbientSound, 'categoryId' | 'file'>) =>
  `${import.meta.env.BASE_URL}sounds/ambient/${s.categoryId}/${s.file}`

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
