import { AmbientPlayer } from './AmbientPlayer'
import { installMediaSession, updateMediaSession } from './mediaSession'
import { coverSvg } from './cover'
import { loadCatalog, resetCatalogCache } from './ambientCatalog'
import type { AudioEngine } from './AudioEngine'

describe('mediaSession', () => {
  const mk = () => {
    const handlers: Record<string, unknown> = {}
    return {
      handlers,
      ms: {
        metadata: null as MediaMetadata | null,
        playbackState: 'none' as MediaSessionPlaybackState,
        setActionHandler: (a: string, fn: unknown) => {
          handlers[a] = fn
        },
        setPositionState: vi.fn(),
      },
    }
  }
  class FakeMeta {
    title: string
    artist: string
    album: string
    artwork: unknown
    constructor(i: { title: string; artist: string; album: string; artwork: unknown }) {
      Object.assign(this, i)
      this.title = i.title
      this.artist = i.artist
      this.album = i.album
      this.artwork = i.artwork
    }
  }

  it('registers all handlers and routes seekto', () => {
    const { ms, handlers } = mk()
    const seekTo = vi.fn()
    installMediaSession(
      { play: vi.fn(), pause: vi.fn(), stop: vi.fn(), next: vi.fn(), prev: vi.fn(), seekTo },
      ms as never,
    )
    expect(Object.keys(handlers).sort()).toEqual([
      'nexttrack',
      'pause',
      'play',
      'previoustrack',
      'seekto',
      'stop',
    ])
    ;(handlers.seekto as (d: { seekTime: number }) => void)({ seekTime: 12 })
    expect(seekTo).toHaveBeenCalledWith(12)
  })

  it('updates metadata, state and position; clears when nothing plays', () => {
    const { ms } = mk()
    updateMediaSession(
      { title: 'T', artist: 'A', album: 'B', artworkUrl: 'x' },
      true,
      { positionS: 5, durationS: 30 },
      ms as never,
      FakeMeta as never,
    )
    expect(ms.metadata).toMatchObject({ title: 'T', artist: 'A', album: 'B' })
    expect(ms.playbackState).toBe('playing')
    expect(ms.setPositionState).toHaveBeenCalledWith({ duration: 30, position: 5, playbackRate: 1 })
    updateMediaSession(null, false, null, ms as never, FakeMeta as never)
    expect(ms.metadata).toBeNull()
    expect(ms.playbackState).toBe('none')
  })

  it('is a no-op without Media Session support', () => {
    expect(() => installMediaSession({ play() {}, pause() {} }, null)).not.toThrow()
    expect(() => updateMediaSession(null, false, null, null)).not.toThrow()
  })
})

describe('AmbientPlayer', () => {
  const mkEl = () => {
    const el = new EventTarget() as unknown as HTMLAudioElement & { _src: string | null }
    Object.assign(el, {
      _src: null,
      currentTime: 0,
      paused: true,
      preload: '',
      loop: false,
      volume: 1,
      getAttribute: () => el._src,
      load: vi.fn(),
      play: vi.fn(async () => {
        ;(el as { paused: boolean }).paused = false
      }),
      pause: vi.fn(() => {
        ;(el as { paused: boolean }).paused = true
      }),
    })
    Object.defineProperty(el, 'src', {
      set: (v) => ((el as { _src: string })._src = v),
      get: () => el._src,
    })
    return el
  }
  const engine = {
    context: null,
    ambientInput: null,
    unlock: vi.fn(async () => ({})),
  } as unknown as AudioEngine

  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('loops, loads a url once, plays, pauses and stops (rewinding)', async () => {
    const el = mkEl()
    const p = new AmbientPlayer(engine, { onError: vi.fn() }, el)
    expect(el.loop).toBe(true)
    p.load('/a.wav')
    p.load('/a.wav')
    expect(el.load).toHaveBeenCalledOnce()
    await p.play()
    expect(el.play).toHaveBeenCalled()
    el.currentTime = 7
    p.pause()
    expect(p.paused).toBe(true)
    expect(el.currentTime).toBe(7)
    await p.play()
    p.stop()
    expect(p.paused).toBe(true)
    expect(el.currentTime).toBe(0)
  })

  it('sets the element volume independently when there is no audio graph', () => {
    const el = mkEl()
    const p = new AmbientPlayer(engine, { onError: vi.fn() }, el)
    p.setVolume(0.3)
    expect(el.volume).toBe(0.3)
    p.setVolume(5)
    expect(el.volume).toBe(1)
  })

  it('reports element errors and a blocked play() instead of throwing', async () => {
    const el = mkEl()
    ;(el.play as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('NotAllowed'))
    const onError = vi.fn()
    const p = new AmbientPlayer(engine, { onError }, el)
    await p.play()
    el.dispatchEvent(new Event('error'))
    expect(onError).toHaveBeenCalledTimes(2)
  })
})

describe('cover + catalog', () => {
  it('every cover style renders deterministically and brand-free', () => {
    for (const style of ['forest', 'sea', 'rain', 'night', 'noise', 'orbit'] as const) {
      const c = { style, hue: 120, seed: 9 }
      expect(coverSvg(c)).toBe(coverSvg(c))
      expect(coverSvg(c)).toContain('<svg')
      expect(coverSvg(c)).not.toMatch(/tesla|icar/i)
    }
  })

  it('loadCatalog retries after a failure', async () => {
    resetCatalogCache()
    const bad = vi.fn(async () => ({ ok: false, status: 500 }) as Response)
    await expect(loadCatalog(bad as never)).rejects.toThrow()
    const data = { version: 2, categories: [], sounds: [] }
    const good = vi.fn(async () => ({ ok: true, json: async () => data }) as Response)
    await expect(loadCatalog(good as never)).resolves.toEqual(data)
    resetCatalogCache()
  })
})
