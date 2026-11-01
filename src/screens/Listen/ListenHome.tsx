import { Link } from 'react-router-dom'
import type { AmbientCatalog, AmbientSound } from '../../audio/ambientCatalog'
import { PacksPanel } from '../../app/PacksPanel'
import { esListen as t } from '../../i18n/es'
import { usePlayerStore } from '../../state/playerStore'
import { Cover } from './Cover'
import { NowPlaying } from './NowPlaying'
import { SoundRow } from './SoundRow'
import { useCatalog } from './useCatalog'
import './listen.css'

export function ListenFrame({ children }: { children: React.ReactNode }) {
  return (
    <section className="listen" aria-label="Escuchar">
      <div className="listen-main">{children}</div>
      <NowPlaying />
    </section>
  )
}

export function CatalogGate({
  children,
}: {
  children: (catalog: AmbientCatalog) => React.ReactNode
}) {
  const { catalog, error, retry } = useCatalog()
  // same tree in every state so the player panel is never remounted
  return (
    <ListenFrame>
      {error ? (
        <>
          <p className="listen-empty">{t.loadError}</p>
          <button className="big-btn" onClick={retry}>
            {t.retry}
          </button>
        </>
      ) : catalog ? (
        children(catalog)
      ) : null}
    </ListenFrame>
  )
}

export function ListenHome() {
  const favorites = usePlayerStore((s) => s.favorites)
  const recent = usePlayerStore((s) => s.recent)
  return (
    <CatalogGate>
      {(catalog) => {
        const byId = new Map(catalog.sounds.map((s) => [s.id, s]))
        const pick = (ids: string[]) =>
          ids.map((id) => byId.get(id)).filter((s): s is AmbientSound => !!s)
        const favs = pick(favorites)
        const rec = pick(recent)
        const featured = catalog.sounds.filter((s) => s.featured)
        return (
          <>
            <header className="listen-head">
              <div>
                <h1>{t.title}</h1>
                <p>{t.tagline}</p>
              </div>
            </header>

            <div className="listen-row">
              <h2>
                {t.categories} · {t.categoriesCount(catalog.categories.length)}
              </h2>
              <div className="cat-grid">
                {catalog.categories.map((c) => (
                  <Link
                    key={c.id}
                    to={`/listen/${c.id}`}
                    className="cat-card"
                    aria-label={`${t.open} ${c.title}`}
                  >
                    <Cover cover={c.cover} size={240} />
                    <strong>{c.title}</strong>
                    <span>{c.description}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="listen-row">
              <h2>{t.featured}</h2>
              <div className="sound-list is-compact">
                {featured.map((s) => (
                  <SoundRow key={s.id} sound={s} catalog={catalog} />
                ))}
              </div>
            </div>

            <div className="listen-row">
              <h2>{t.favorites}</h2>
              {favs.length ? (
                <div className="sound-list is-compact">
                  {favs.map((s) => (
                    <SoundRow key={s.id} sound={s} catalog={catalog} />
                  ))}
                </div>
              ) : (
                <p className="listen-empty">{t.noFavorites}</p>
              )}
            </div>

            <div className="listen-row">
              <h2>{t.recent}</h2>
              {rec.length ? (
                <div className="sound-list is-compact">
                  {rec.map((s) => (
                    <SoundRow key={s.id} sound={s} catalog={catalog} />
                  ))}
                </div>
              ) : (
                <p className="listen-empty">{t.nothingYet}</p>
              )}
            </div>

            <p className="listen-empty">{t.noGps}</p>
            <PacksPanel />
          </>
        )
      }}
    </CatalogGate>
  )
}
