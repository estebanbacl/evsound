import {
  downloadPack,
  formatBytes,
  packStatus,
  removePack,
  requestPersistence,
  storageInfo,
  loadPacks,
  type PackDeps,
  type SoundPack,
} from './packManager'

const pack: SoundPack = {
  id: 'ambient-x',
  extras: ['/sounds/ambient/catalog.json'],
  kind: 'ambient',
  title: 'X',
  bytes: 300,
  files: [100, 100, 100].map((bytes, i) => ({ url: `/sounds/x/${i}.wav`, bytes })),
}

function fakeDeps(failOn?: string) {
  const stores = new Map<string, Map<string, Response>>()
  const open = async (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map())
    const store = stores.get(name)!
    return {
      match: async (u: string) => store.get(u)?.clone(),
      put: async (u: string, r: Response) => void store.set(u, r),
      delete: async (u: string) => store.delete(u),
    } as unknown as Cache
  }
  const store = new Map<string, Response>()
  stores.set('test', store)
  const fetched: string[] = []
  const deps: PackDeps = {
    caches: { open },
    fetch: (async (u: string) => {
      fetched.push(u)
      if (u === failOn) return new Response('nope', { status: 500 })
      return new Response(new Blob([new Uint8Array(100)]), {
        status: 200,
        headers: { 'content-type': 'audio/wav' },
      })
    }) as unknown as typeof fetch,
    cacheName: 'test',
  }
  return { deps, store, stores, fetched }
}

describe('packManager', () => {
  it('reports missing → installed and reports progress while downloading', async () => {
    const { deps, store, stores } = fakeDeps()
    expect((await packStatus(pack, deps)).state).toBe('missing')
    const seen: number[] = []
    await downloadPack(pack, (p) => seen.push(p.doneBytes / p.totalBytes), undefined, deps)
    expect(seen).toEqual([1 / 3, 2 / 3, 1])
    expect(store.size).toBe(3)
    expect(stores.get('ev-data-v1')!.has('/sounds/ambient/catalog.json')).toBe(true)
    expect(await packStatus(pack, deps)).toEqual({
      state: 'installed',
      cachedFiles: 3,
      totalFiles: 3,
    })
    expect(store.get('/sounds/x/0.wav')!.headers.get('content-type')).toBe('audio/wav')
  })

  it('resumes: already cached files are not fetched again', async () => {
    const { deps, fetched } = fakeDeps('/sounds/x/2.wav')
    await expect(downloadPack(pack, () => {}, undefined, deps)).rejects.toThrow(/500/)
    expect((await packStatus(pack, deps)).state).toBe('partial')
    expect(fetched).toHaveLength(4) // catalog extra + 3 files

    const ok = fakeDeps()
    ok.store.set('/sounds/x/0.wav', new Response('a'))
    ok.store.set('/sounds/x/1.wav', new Response('b'))
    await downloadPack(pack, () => {}, undefined, ok.deps)
    expect(ok.fetched).toEqual(['/sounds/ambient/catalog.json', '/sounds/x/2.wav'])
  })

  it('abort stops the download but keeps finished files', async () => {
    const { deps, store } = fakeDeps()
    const ctrl = new AbortController()
    await expect(
      downloadPack(pack, (p) => p.fileIndex === 0 && ctrl.abort(), ctrl.signal, deps),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(store.size).toBe(1)
  })

  it('remove deletes every file', async () => {
    const { deps, store } = fakeDeps()
    await downloadPack(pack, () => {}, undefined, deps)
    await removePack(pack, deps)
    expect(store.size).toBe(0)
    expect((await packStatus(pack, deps)).state).toBe('missing')
  })

  it('storage estimate and persistence degrade gracefully', async () => {
    expect(await storageInfo({ estimate: async () => ({ usage: 5, quota: 10 }) })).toEqual({
      usageBytes: 5,
      quotaBytes: 10,
    })
    expect(await storageInfo(undefined)).toBeNull()
    expect(await requestPersistence({ persist: async () => true })).toBe(true)
    expect(await requestPersistence({ persist: async () => Promise.reject(new Error('x')) })).toBe(
      false,
    )
    expect(await requestPersistence(undefined)).toBe(false)
  })

  it('loads the pack list and formats sizes', async () => {
    const f = (async () => ({
      ok: true,
      json: async () => ({ version: 1, packs: [pack] }),
    })) as unknown as typeof fetch
    expect(await loadPacks(f)).toEqual([pack])
    expect(formatBytes(3_600_000)).toBe('3.6 MB')
    expect(formatBytes(2_500)).toBe('3 KB')
    expect(formatBytes(2e9)).toBe('2.0 GB')
  })

  it('respects the ≤ 8 MB per pack requirement (RNF-5) for the shipped packs', async () => {
    const { readFileSync } = await import('node:fs')
    const { packs } = JSON.parse(readFileSync('public/sounds/packs.json', 'utf8')) as {
      packs: SoundPack[]
    }
    for (const p of packs) expect(p.bytes).toBeLessThanOrEqual(8 * 1024 * 1024)
  })
})
