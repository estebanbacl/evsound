import { useCallback, useEffect, useRef, useState } from 'react'
import { esPwa } from '../i18n/es'
import {
  downloadPack,
  formatBytes,
  loadPacks,
  packStatus,
  removePack,
  requestPersistence,
  storageInfo,
  type PackStatus,
  type SoundPack,
  type StorageInfo,
} from '../pwa/packManager'
import { usePwaStore } from '../state/pwaStore'
import { useToastStore } from '../state/toastStore'
import { Panel } from '../ui/components/Panel'

const t = esPwa.packs

/** Dynamics > "Sonidos descargados": download/remove packs with progress and storage usage. */
export function PacksPanel() {
  const [packs, setPacks] = useState<SoundPack[] | null>(null)
  const [status, setStatus] = useState<Record<string, PackStatus>>({})
  const [progress, setProgress] = useState<Record<string, number>>({})
  const [storage, setStorage] = useState<StorageInfo | null>(null)
  const [error, setError] = useState(false)
  const aborts = useRef<Record<string, AbortController>>({})
  const online = usePwaStore((s) => s.online)

  const refresh = useCallback(async (list: SoundPack[]) => {
    const entries = await Promise.all(list.map(async (p) => [p.id, await packStatus(p)] as const))
    setStatus(Object.fromEntries(entries))
    setStorage(await storageInfo())
  }, [])

  useEffect(() => {
    let live = true
    loadPacks()
      .then(async (list) => {
        if (!live) return
        setPacks(list)
        await refresh(list)
      })
      .catch(() => live && setError(true))
    return () => {
      live = false
    }
  }, [refresh])

  async function download(p: SoundPack) {
    if (!online) return useToastStore.getState().push(t.needsNetwork, 'warn')
    const ctrl = new AbortController()
    aborts.current[p.id] = ctrl
    setProgress((s) => ({ ...s, [p.id]: 0 }))
    void requestPersistence()
    try {
      await downloadPack(
        p,
        (d) => setProgress((s) => ({ ...s, [p.id]: d.doneBytes / d.totalBytes })),
        ctrl.signal,
      )
    } catch (e) {
      if ((e as Error).name !== 'AbortError') useToastStore.getState().push(String(e), 'error')
    } finally {
      delete aborts.current[p.id]
      setProgress((s) => Object.fromEntries(Object.entries(s).filter(([id]) => id !== p.id)))
      if (packs) await refresh(packs)
    }
  }

  async function remove(p: SoundPack) {
    await removePack(p)
    if (packs) await refresh(packs)
  }

  if (error) return <p className="dyn-note">{t.loadError}</p>
  if (!packs) return null

  return (
    <Panel title={t.title} className="packs" aria-label={t.title}>
      <p className="dyn-note">{t.hint}</p>
      <ul className="pack-list">
        {packs.map((p) => {
          const st = status[p.id]
          const busy = p.id in progress
          return (
            <li key={p.id} className="pack">
              <div className="pack-info">
                <strong>{p.title}</strong>
                <span>
                  {formatBytes(p.bytes)} · {st ? t[st.state] : '…'}
                </span>
                {busy && (
                  <div
                    className="pack-bar"
                    role="progressbar"
                    aria-label={`${t.download} ${p.title}`}
                    aria-valuenow={Math.round(progress[p.id] * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <i style={{ width: `${progress[p.id] * 100}%` }} />
                  </div>
                )}
              </div>
              {busy ? (
                <button onClick={() => aborts.current[p.id]?.abort()}>{t.cancel}</button>
              ) : st?.state === 'installed' ? (
                <button onClick={() => void remove(p)} aria-label={`${t.remove} ${p.title}`}>
                  {t.remove}
                </button>
              ) : (
                <button onClick={() => void download(p)} aria-label={`${t.download} ${p.title}`}>
                  {t.download}
                </button>
              )}
            </li>
          )
        })}
      </ul>
      <p className="dyn-note">{t.engines}</p>
      {storage && storage.quotaBytes > 0 && (
        <p className="dyn-note">
          {t.storage}: {formatBytes(storage.usageBytes)} / {formatBytes(storage.quotaBytes)}
        </p>
      )}
    </Panel>
  )
}
