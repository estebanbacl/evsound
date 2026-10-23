import { useEffect, useState } from 'react'
import { stopEngine } from '../../app/engineSession'
import { engineDriver } from '../../audio/EngineDriver'
import { getProfile } from '../../audio/profiles'
import { esDrive as t } from '../../i18n/es'
import { useSettingsStore } from '../../state/settingsStore'
import { useTelemetryStore } from '../../state/telemetryStore'
import { BigNumber } from '../../ui/components/BigNumber'
import { Gauge } from '../../ui/components/Gauge'
import { IconButton } from '../../ui/components/IconButton'
import { IconChevronLeft, IconChevronRight, IconVolume } from '../../ui/icons'
import './drive.css'

/** Minimal driving UI: huge rpm, active profile, volume ±, stop. Targets ≥ 64 px, no scroll. */
export function DriveModeOverlay() {
  const { profileId, volume, setVolume, cycleProfile } = useSettingsStore()
  const speedMs = useTelemetryStore((s) => s.speedMs)
  const [rpm, setRpm] = useState(0)
  const profile = getProfile(profileId)

  useEffect(() => {
    const id = setInterval(() => setRpm(engineDriver.frame?.rpm ?? profile.idleRpm), 100)
    return () => clearInterval(id)
  }, [profile.idleRpm])

  return (
    <section className="drive" role="region" aria-label={t.region}>
      <div className="drive-center">
        <Gauge
          value={rpm}
          max={Math.ceil(profile.redlineRpm / 1000) * 1000}
          redline={profile.redlineRpm * 0.92}
          label="RPM"
          unit="rpm"
          size={420}
        />
        <BigNumber value={Math.round(speedMs * 3.6)} unit="km/h" size="lg" label="Velocidad" />
      </div>
      <div className="drive-bar">
        <button className="drive-profile" aria-label={t.profile} onClick={() => cycleProfile(1)}>
          {profile.name}
        </button>
        <div className="drive-volume">
          <IconButton
            icon={<IconChevronLeft />}
            label={t.volumeDown}
            size="lg"
            onClick={() => setVolume(volume - 0.1)}
          />
          <IconVolume style={{ color: 'var(--accent)', fontSize: 30 }} />
          <span className="drive-vol-level">{Math.round(volume * 100)}</span>
          <IconButton
            icon={<IconChevronRight />}
            label={t.volumeUp}
            size="lg"
            onClick={() => setVolume(volume + 0.1)}
          />
        </div>
        <button className="drive-stop" onClick={stopEngine}>
          {t.stop}
        </button>
      </div>
    </section>
  )
}
