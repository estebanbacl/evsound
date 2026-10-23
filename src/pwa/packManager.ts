import { DATA_CACHE, SOUND_CACHE } from './cacheNames'

export interface PackFile {
  url: string
  bytes: number
}

export interface SoundPack {
  id: string
  kind: 'ambient' | 'engine'
  title: string
  bytes: number
  /** Small JSON (e.g. the catalog) cached alongside so the pack is browsable offline. */
  extras?: string[]
  files: PackFile[]
}

export type PackState = 'missing' | 'partial' | 'installed'

export interface PackStatus {
  state: PackState
  cachedFiles: number
  totalFiles: number
}

export interface PackDeps {
  caches: Pick<CacheStorage, 'open'>
  fetch: typeof fetch
  cacheName?: string
}

const defaultDeps = (): PackDeps => ({
  caches: globalThis.caches,
  fetch: (...a) => globalThis.fetch(...a),
})

export async function loadPacks(
  fetcher: typeof fetch = (...a) => fetch(...a),
): Promise<SoundPack[]> {
  const res = await fetcher(`${import.meta.env.BASE_URL}sounds/packs.json`)
  if (!res.ok) throw new Error(`packs ${res.status}`)
  return ((await res.json()) as { packs: SoundPack[] }).packs
}

export async function packStatus(
  pack: SoundPack,
  deps: PackDeps = defaultDeps(),
): Promise<PackStatus> {
  const cache = await deps.caches.open(deps.cacheName ?? SOUND_CACHE)
  let cached = 0
  for (const f of pack.files) if (await cache.match(f.url)) cached++
  const state: PackState =
    cached === 0 ? 'missing' : cached === pack.files.length ? 'installed' : 'partial'
  return { state, cachedFiles: cached, totalFiles: pack.files.length }
}

export interface DownloadProgress {
  doneBytes: number
  totalBytes: number
  fileIndex: number
}

/**
 * Downloads every file of a pack into the sound cache (the same cache the service worker
 * serves from, so playback works offline). Files already cached are skipped, so an
 * interrupted download resumes. Aborting keeps what was fetched.
 */
export async function downloadPack(
  pack: SoundPack,
  onProgress: (p: DownloadProgress) => void = () => {},
  signal?: AbortSignal,
  deps: PackDeps = defaultDeps(),
): Promise<void> {
  const cache = await deps.caches.open(deps.cacheName ?? SOUND_CACHE)
  const data = await deps.caches.open(DATA_CACHE)
  for (const url of pack.extras ?? []) {
    const res = await deps.fetch(url, { signal, cache: 'no-store' })
    if (res.ok) await data.put(url, res)
  }
  let done = 0
  for (const [i, f] of pack.files.entries()) {
    if (signal?.aborted) throw new DOMException('Descarga cancelada', 'AbortError')
    if (await cache.match(f.url)) {
      done += f.bytes
      onProgress({ doneBytes: done, totalBytes: pack.bytes, fileIndex: i })
      continue
    }
    const res = await deps.fetch(f.url, { signal, cache: 'no-store' })
    if (!res.ok || res.status !== 200)
      throw new Error(`No se pudo descargar ${f.url} (${res.status})`)
    const blob = await res.blob()
    await cache.put(
      f.url,
      new Response(blob, {
        headers: { 'content-type': res.headers.get('content-type') ?? 'audio/wav' },
      }),
    )
    done += f.bytes
    onProgress({ doneBytes: done, totalBytes: pack.bytes, fileIndex: i })
  }
}

export async function removePack(pack: SoundPack, deps: PackDeps = defaultDeps()): Promise<void> {
  const cache = await deps.caches.open(deps.cacheName ?? SOUND_CACHE)
  await Promise.all(pack.files.map((f) => cache.delete(f.url)))
}

export interface StorageInfo {
  usageBytes: number
  quotaBytes: number
}

export async function storageInfo(
  storage: Pick<StorageManager, 'estimate'> | undefined = typeof navigator !== 'undefined'
    ? navigator.storage
    : undefined,
): Promise<StorageInfo | null> {
  if (!storage?.estimate) return null
  const e = await storage.estimate()
  return { usageBytes: e.usage ?? 0, quotaBytes: e.quota ?? 0 }
}

/** Ask the browser not to evict downloaded packs (best effort). */
export async function requestPersistence(
  storage: Pick<StorageManager, 'persist'> | undefined = typeof navigator !== 'undefined'
    ? navigator.storage
    : undefined,
): Promise<boolean> {
  try {
    return (await storage?.persist?.()) ?? false
  } catch {
    return false
  }
}

export const formatBytes = (b: number) =>
  b >= 1e9
    ? `${(b / 1e9).toFixed(1)} GB`
    : b >= 1e6
      ? `${(b / 1e6).toFixed(1)} MB`
      : `${Math.max(1, Math.round(b / 1e3))} KB`
