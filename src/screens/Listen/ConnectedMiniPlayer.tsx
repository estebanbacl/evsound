import { seek } from '../../app/ambientController'
import { currentItem, usePlayerStore } from '../../state/playerStore'
import { MiniPlayer } from '../../ui/components/MiniPlayer'

/** Global mini player (bottom bar). Renders nothing until something was played. */
export function ConnectedMiniPlayer() {
  const s = usePlayerStore()
  const cur = currentItem(s)
  if (!cur) return null
  return (
    <MiniPlayer
      title={cur.track.title}
      subtitle={cur.collectionTitle}
      playing={s.playing}
      shuffle={s.shuffle}
      repeat={s.repeat}
      positionS={s.positionS}
      durationS={s.durationS || cur.track.durationS}
      onToggle={s.toggle}
      onNext={s.next}
      onPrev={s.prev}
      onShuffle={s.toggleShuffle}
      onRepeat={s.toggleRepeat}
      onSeek={seek}
    />
  )
}
