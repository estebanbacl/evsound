import { Link, useParams } from 'react-router-dom'
import { esListen as t } from '../../i18n/es'
import { currentItem, usePlayerStore } from '../../state/playerStore'
import { IconChevronLeft, IconPause, IconPlay } from '../../ui/icons'
import { Cover } from './Cover'
import { useCatalog } from './useCatalog'
import './listen.css'

export const fmtDuration = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`

export function CollectionDetail() {
  const { id } = useParams()
  const { collections, error } = useCatalog()
  const player = usePlayerStore()
  const cur = currentItem(player)

  if (error)
    return (
      <section className="listen" aria-label="Colección">
        <p className="listen-empty">{t.loadError}</p>
      </section>
    )
  if (!collections) return <section className="listen" aria-label="Colección" aria-busy="true" />
  const c = collections.find((x) => x.id === id)
  if (!c)
    return (
      <section className="listen" aria-label="Colección">
        <Link to="/listen" className="back">
          <IconChevronLeft /> {t.back}
        </Link>
        <p className="listen-empty">{t.notFound}</p>
      </section>
    )

  const isCurrent = cur?.collectionId === c.id
  const playing = isCurrent && player.playing

  return (
    <section className="detail" aria-label="Colección">
      <aside className="detail-side">
        <Link to="/listen" className="back">
          <IconChevronLeft /> {t.back}
        </Link>
        <Cover cover={c.cover} className="detail-cover" />
        <button
          className="detail-play"
          aria-label={playing ? t.pauseCollection : t.playCollection}
          onClick={() => (isCurrent ? player.toggle() : player.playCollection(c))}
        >
          {playing ? <IconPause /> : <IconPlay />}
        </button>
      </aside>
      <div className="detail-main">
        <header>
          <div>
            <h1>{c.title}</h1>
            <p>{c.artist}</p>
          </div>
          <span>
            {c.genre} · {c.year}
          </span>
        </header>
        <ol className="tracklist">
          {c.tracks.map((tr, i) => {
            const active = cur?.track.id === tr.id
            return (
              <li key={tr.id}>
                <button
                  className={`track ${active ? 'is-active' : ''}`}
                  aria-current={active ? 'true' : undefined}
                  onClick={() => (active ? player.toggle() : player.playCollection(c, tr.id))}
                >
                  <span className="track-n">{String(i + 1).padStart(2, '0')}</span>
                  <span className="track-title">{tr.title}</span>
                  <span className="track-d">{fmtDuration(tr.durationS)}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
