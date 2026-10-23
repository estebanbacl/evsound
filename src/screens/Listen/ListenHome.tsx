import { Link } from 'react-router-dom'
import { esListen as t } from '../../i18n/es'
import { usePlayerStore } from '../../state/playerStore'
import { useSettingsStore } from '../../state/settingsStore'
import { SegmentedControl } from '../../ui/components/SegmentedControl'
import { IconPlay } from '../../ui/icons'
import type { AmbientCollection } from '../../audio/ambientCatalog'
import { Cover } from './Cover'
import { useCatalog } from './useCatalog'
import './listen.css'

function AlbumCard({ c, subtitle }: { c: AmbientCollection; subtitle?: string }) {
  const play = usePlayerStore((s) => s.playCollection)
  return (
    <div className="album-card">
      <Link to={`/listen/${c.id}`} className="album-link" aria-label={`${t.open} ${c.title}`}>
        <Cover cover={c.cover} size={320} />
        <strong>{c.title}</strong>
        <span>{subtitle ?? c.artist}</span>
      </Link>
      <button className="album-play" aria-label={`${t.play} ${c.title}`} onClick={() => play(c)}>
        <IconPlay />
      </button>
    </div>
  )
}

export function ListenHome() {
  const { collections, error, retry } = useCatalog()
  const { recent, lastCollectionId, lastTrackId } = usePlayerStore()
  const { ambientMode, setAmbientMode } = useSettingsStore()

  if (error)
    return (
      <section className="listen" aria-label="Escuchar">
        <p className="listen-empty">{t.loadError}</p>
        <button className="big-btn" onClick={retry}>
          {t.retry}
        </button>
      </section>
    )
  if (!collections) return <section className="listen" aria-label="Escuchar" aria-busy="true" />

  const byId = new Map(collections.map((c) => [c.id, c]))
  const last = lastCollectionId ? byId.get(lastCollectionId) : undefined
  const lastTrack = last?.tracks.find((x) => x.id === lastTrackId)
  const recentCols = recent.map((id) => byId.get(id)).filter((c): c is AmbientCollection => !!c)
  // never played first, then least recently played
  const staleness = (id: string) => {
    const r = recent.indexOf(id)
    return r === -1 ? Number.MAX_SAFE_INTEGER : r
  }
  const forYou = [...collections].sort((a, b) => staleness(b.id) - staleness(a.id))

  return (
    <section className="listen" aria-label="Escuchar">
      <header className="listen-head">
        <h1>{t.title}</h1>
        <SegmentedControl
          label={t.withEngine}
          value={ambientMode}
          onChange={setAmbientMode}
          options={[
            { value: 'duck', label: t.duck },
            { value: 'pause', label: t.pause },
          ]}
        />
      </header>

      <div className="listen-row">
        <h2>{t.last}</h2>
        {last ? (
          <div className="shelf">
            <AlbumCard c={last} subtitle={lastTrack?.title} />
          </div>
        ) : (
          <p className="listen-empty">{t.nothingYet}</p>
        )}
      </div>

      <div className="listen-row">
        <h2>{t.recent}</h2>
        {recentCols.length ? (
          <div className="shelf">
            {recentCols.map((c) => (
              <AlbumCard key={c.id} c={c} />
            ))}
          </div>
        ) : (
          <p className="listen-empty">{t.nothingYet}</p>
        )}
      </div>

      <div className="listen-row">
        <h2>{t.forYou}</h2>
        <div className="shelf">
          {forYou.map((c) => (
            <AlbumCard key={c.id} c={c} subtitle={`${c.genre} · ${c.tracks.length} ${t.tracks}`} />
          ))}
        </div>
      </div>
    </section>
  )
}
