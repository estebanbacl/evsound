import { useLocation } from 'react-router-dom'
import { esListen } from '../../i18n/es'
import { usePlayerStore } from '../../state/playerStore'
import { MiniPlayer } from '../../ui/components/MiniPlayer'
import { useRemaining } from './NowPlaying'
import { useCatalog } from './useCatalog'

/** Global mini player (bottom bar). Hidden on Escuchar, where the full panel is shown. */
export function ConnectedMiniPlayer() {
  const { catalog } = useCatalog()
  const s = usePlayerStore()
  const remaining = useRemaining()
  const { pathname } = useLocation()
  const sound = catalog?.sounds.find((x) => x.id === s.soundId)
  const cat = catalog?.categories.find((c) => c.id === sound?.categoryId)
  if (!sound || !cat || pathname.startsWith('/listen')) return null
  return (
    <MiniPlayer
      title={sound.title}
      subtitle={cat.title}
      playing={s.playing}
      detail={remaining && s.playing ? esListen.now.remaining(remaining) : undefined}
      onToggle={s.toggle}
      onStop={s.stop}
    />
  )
}
