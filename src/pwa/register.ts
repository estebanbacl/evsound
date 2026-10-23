import { registerSW } from 'virtual:pwa-register'
import { usePwaStore } from '../state/pwaStore'

/** Registers the service worker (production only) and mirrors its lifecycle into pwaStore. */
export function registerPwa() {
  const store = usePwaStore.getState()
  window.addEventListener('online', () => usePwaStore.getState().setOnline(true))
  window.addEventListener('offline', () => usePwaStore.getState().setOnline(false))
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  const update = registerSW({
    onNeedRefresh: () => store.setNeedRefresh(true, () => update(true)),
    onOfflineReady: () => store.setOfflineReady(true),
    onRegisterError: (e) => console.warn('[pwa] SW registration failed', e),
  })
}
