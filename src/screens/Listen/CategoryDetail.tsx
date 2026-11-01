import { Link, useParams } from 'react-router-dom'
import { esListen as t } from '../../i18n/es'
import { IconChevronLeft } from '../../ui/icons'
import { CatalogGate } from './ListenHome'
import { Cover } from './Cover'
import { SoundRow } from './SoundRow'
import './listen.css'

export function CategoryDetail() {
  const { id } = useParams()
  return (
    <CatalogGate>
      {(catalog) => {
        const c = catalog.categories.find((x) => x.id === id)
        if (!c)
          return (
            <>
              <Link to="/listen" className="back">
                <IconChevronLeft /> {t.back}
              </Link>
              <p className="listen-empty">{t.notFound}</p>
            </>
          )
        const sounds = catalog.sounds.filter((s) => s.categoryId === c.id)
        return (
          <>
            <Link to="/listen" className="back">
              <IconChevronLeft /> {t.back}
            </Link>
            <header className="cat-head">
              <Cover cover={c.cover} size={200} className="cat-cover" />
              <div>
                <h1>{c.title}</h1>
                <p>{c.description}</p>
                <span>{t.sounds(sounds.length)}</span>
              </div>
            </header>
            <div className="sound-list">
              {sounds.map((s) => (
                <SoundRow key={s.id} sound={s} catalog={catalog} />
              ))}
            </div>
          </>
        )
      }}
    </CatalogGate>
  )
}
