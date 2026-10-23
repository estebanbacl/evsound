import { AmbientPlayer } from './AmbientPlayer'
import { installMediaSession, updateMediaSession } from './mediaSession'
import { coverSvg } from './cover'
import { loadCatalog } from './ambientCatalog'
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
      { play: vi.fn(), pause: vi.fn(), next: vi.fn(), prev: vi.fn(), seekTo },
      ms as never,
    )
    expect(Object.keys(handlers).sort()).toEqual([
      'nexttrack',
      'pause',
      'play',
      'previoustrack',
      'seekto',
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
    expect(() =>
      installMediaSession({ play() {}, pause() {}, next() {}, prev() {}, seekTo() {} }, null),
    ).not.toThrow()
    expect(() => updateMediaSession(null, false, null, null)).not.toThrow()
  })
})

describe('AmbientPlayer', () => {
  const mkEl = () => {
    const el = new EventTarget() as unknown as HTMLAudioElement & { _src: string | null }
    Object.assign(el, {
      _src: null,
      currentTime: 0,
      duration: 30,
      paused: true,
      preload: '',
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
    input: null,
    unlock: vi.fn(async () => ({})),
  } as unknown as AudioEngine

  it('loads a url once, plays, pauses, seeks and reports time/end/error', async () => {
    const el = mkEl()
    const cb = { onTime: vi.fn(), onEnded: vi.fn(), onError: vi.fn() }
    const p = new AmbientPlayer(engine, cb, el)
    p.load('/a.wav')
    p.load('/a.wav')
    expect(el.load).toHaveBeenCalledOnce()
    await p.play()
    expect(el.play).toHaveBeenCalled()
    p.pause()
    expect(p.paused).toBe(true)
    p.seek(12)
    expect(el.currentTime).toBe(12)
    el.dispatchEvent(new Event('timeupdate'))
    expect(cb.onTime).toHaveBeenCalledWith(12, 30)
    el.dispatchEvent(new Event('ended'))
    expect(cb.onEnded).toHaveBeenCalled()
    el.dispatchEvent(new Event('error'))
    expect(cb.onError).toHaveBeenCalled()
  })

  it('reports a blocked play() instead of throwing', async () => {
    const el = mkEl()
    ;(el.play as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('NotAllowed'))
    const cb = { onTime: vi.fn(), onEnded: vi.fn(), onError: vi.fn() }
    await new AmbientPlayer(engine, cb, el).play()
    expect(cb.onError).toHaveBeenCalled()
  })
})

describe('cover + catalog', () => {
  it('cover is deterministic and brand-free', () => {
    const c = { style: 'rain' as const, hue: 355, seed: 21 }
    expect(coverSvg(c)).toBe(coverSvg(c))
    expect(coverSvg({ style: 'orbit', hue: 2, seed: 7 })).toContain('<svg')
    expect(coverSvg(c)).not.toMatch(/tesla|icar/i)
  })

  it('loadCatalog retries after a failure', async () => {
    const bad = vi.fn(async () => ({ ok: false, status: 500 }) as Response)
    await expect(loadCatalog(bad as never)).rejects.toThrow()
    const good = vi.fn(
      async () => ({ ok: true, json: async () => ({ version: 1, collections: [] }) }) as Response,
    )
    await expect(loadCatalog(good as never)).resolves.toEqual({ version: 1, collections: [] })
  })
})
