import type { AmbientCatalog, AmbientSound } from '../../audio/ambientCatalog'
import { esListen as t } from '../../i18n/es'
import { usePlayerStore } from '../../state/playerStore'
import { IconPause, IconPlay, IconStar, IconStarOutline } from '../../ui/icons'

/** One playable sound: tap to play/pause, star to favourite. */
export function SoundRow({ sound, catalog }: { sound: AmbientSound; catalog: AmbientCatalog }) {
  const current = usePlayerStore((s) => s.soundId)
  const playing = usePlayerStore((s) => s.playing)
  const fav = usePlayerStore((s) => s.favorites.includes(sound.id))
  const { play, toggle, toggleFavorite } = usePlayerStore.getState()
  const active = current === sound.id
  const cat = catalog.categories.find((c) => c.id === sound.categoryId)
  return (
    <div className={`sound ${active ? 'is-active' : ''}`}>
      <button
        className="sound-main"
        aria-current={active ? 'true' : undefined}
        aria-label={`${active && playing ? 'Pausar' : t.play} ${sound.title}`}
        onClick={() => (active ? toggle() : play(sound.id))}
      >
        <span className="sound-icon">{active && playing ? <IconPause /> : <IconPlay />}</span>
        <span className="sound-title">{sound.title}</span>
        <span className="sound-cat">{cat?.title}</span>
      </button>
      <button
        className="sound-fav"
        aria-pressed={fav}
        aria-label={`${fav ? t.removeFavorite : t.addFavorite}: ${sound.title}`}
        onClick={() => toggleFavorite(sound.id)}
      >
        {fav ? <IconStar /> : <IconStarOutline />}
      </button>
    </div>
  )
}
