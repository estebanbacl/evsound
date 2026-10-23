import { NavLink } from 'react-router-dom'
import { es } from '../i18n/es'

const tabs = [
  { to: '/vehicle', label: es.nav.vehicle },
  { to: '/listen', label: es.nav.listen },
  { to: '/dynamics', label: es.nav.dynamics },
]

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Principal">
      <div className="nav-speed" aria-label="Velocidad">
        <span className="big">0</span>
        <small>km/h</small>
      </div>
      <ul>
        {tabs.map((t) => (
          <li key={t.to}>
            <NavLink to={t.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              {t.label}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="nav-volume" aria-hidden="true" />
    </nav>
  )
}
