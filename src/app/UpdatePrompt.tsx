import { esPwa as t } from '../i18n/es'
import { useDriveStore } from '../state/driveStore'
import { usePwaStore } from '../state/pwaStore'

/** "New version available" banner. Never shown (nor applied) while driving. */
export function UpdatePrompt() {
  const { needRefresh, applyUpdate, setNeedRefresh } = usePwaStore()
  const driving = useDriveStore((s) => s.active)
  if (!needRefresh || driving) return null
  return (
    <div className="update-prompt" role="alert">
      <span>{t.updateAvailable}</span>
      <button onClick={() => void applyUpdate?.()}>{t.update}</button>
      <button className="is-ghost" onClick={() => setNeedRefresh(false)}>
        {t.later}
      </button>
    </div>
  )
}
