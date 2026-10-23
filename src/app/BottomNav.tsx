import { NavLink } from 'react-router-dom'
import { getProfile } from '../audio/profiles'
import { es } from '../i18n/es'
import { useSettingsStore } from '../state/settingsStore'
import { useTelemetryStore } from '../state/telemetryStore'
import { BigNumber } from '../ui/components/BigNumber'
import { IconButton } from '../ui/components/IconButton'
import { IconChevronLeft, IconChevronRight, IconVolume } from '../ui/icons'

const tabs = [
  { to: '/vehicle', label: es.nav.vehicle },
  { to: '/listen', label: es.nav.listen },
  { to: '/dynamics', label: es.nav.dynamics },
]

export function BottomNav() {
  const speedMs = useTelemetryStore((s) => s.speedMs)
  const { profileId, volume, cycleProfile, setVolume } = useSettingsStore()
  return (
    <nav className="bottom-nav" aria-label="Principal">
      <div className="nav-speed">
        <IconButton
          icon={<IconChevronLeft />}
          label={es.nav2.prevProfile}
          onClick={() => cycleProfile(-1)}
        />
        <BigNumber value={Math.round(speedMs * 3.6)} unit="km/h" size="lg" label={es.nav2.speed} />
        <IconButton
          icon={<IconChevronRight />}
          label={es.nav2.nextProfile}
          onClick={() => cycleProfile(1)}
        />
        <span className="nav-caption" aria-label={es.nav2.profile}>
          {getProfile(profileId).name}
        </span>
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
      <div className="nav-volume">
        <IconButton
          icon={<IconChevronLeft />}
          label={es.nav2.volumeDown}
          onClick={() => setVolume(volume - 0.1)}
        />
        <IconVolume style={{ color: 'var(--accent)', fontSize: 26 }} />
        <span className="nav-vol-level" aria-label={es.nav2.volume}>
          {Math.round(volume * 100)}
        </span>
        <IconButton
          icon={<IconChevronRight />}
          label={es.nav2.volumeUp}
          onClick={() => setVolume(volume + 0.1)}
        />
      </div>
    </nav>
  )
}
