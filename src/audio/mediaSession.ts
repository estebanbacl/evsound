export interface MediaHandlers {
  play: () => void
  pause: () => void
  next: () => void
  prev: () => void
  seekTo: (s: number) => void
}

export interface MediaInfo {
  title: string
  artist: string
  album: string
  artworkUrl?: string
}

type MS = Pick<MediaSession, 'metadata' | 'playbackState' | 'setActionHandler'> & {
  setPositionState?: MediaSession['setPositionState']
}

const get = (): MS | null =>
  typeof navigator !== 'undefined' && 'mediaSession' in navigator ? navigator.mediaSession : null

/** Media Session metadata + handlers; a no-op where unsupported. */
export function installMediaSession(h: MediaHandlers, ms: MS | null = get()) {
  if (!ms) return
  const set = (a: MediaSessionAction, fn: MediaSessionActionHandler | null) => {
    try {
      ms.setActionHandler(a, fn)
    } catch {
      /* action not supported */
    }
  }
  set('play', h.play)
  set('pause', h.pause)
  set('nexttrack', h.next)
  set('previoustrack', h.prev)
  set('seekto', (d) => d.seekTime != null && h.seekTo(d.seekTime))
}

export function updateMediaSession(
  info: MediaInfo | null,
  playing: boolean,
  position: { positionS: number; durationS: number } | null,
  ms: MS | null = get(),
  MetadataCtor: typeof MediaMetadata | undefined = typeof MediaMetadata !== 'undefined'
    ? MediaMetadata
    : undefined,
) {
  if (!ms) return
  if (!info || !MetadataCtor) {
    ms.metadata = null
    ms.playbackState = 'none'
    return
  }
  ms.metadata = new MetadataCtor({
    title: info.title,
    artist: info.artist,
    album: info.album,
    artwork: info.artworkUrl
      ? [{ src: info.artworkUrl, sizes: '512x512', type: 'image/svg+xml' }]
      : [],
  })
  ms.playbackState = playing ? 'playing' : 'paused'
  if (position && position.durationS > 0 && ms.setPositionState) {
    try {
      ms.setPositionState({
        duration: position.durationS,
        position: Math.min(position.positionS, position.durationS),
        playbackRate: 1,
      })
    } catch {
      /* invalid state while loading */
    }
  }
}
