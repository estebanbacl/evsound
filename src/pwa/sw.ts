/// <reference lib="webworker" />
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { RangeRequestsPlugin } from 'workbox-range-requests'
import { DATA_CACHE, IMAGE_CACHE, MODEL_CACHE, SOUND_CACHE } from './cacheNames'

declare const self: ServiceWorkerGlobalScope

// App shell (hashed js/css, index.html, icons, offline page). Sounds/models are NOT precached:
// they are downloaded explicitly as packs (see packManager).
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// SPA: any navigation gets the shell; the offline page is the last resort.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

const only200 = new CacheableResponsePlugin({ statuses: [200] })

// Audio elements ask for byte ranges: serve them as 206 slices out of the cached full file.
registerRoute(
  ({ url }) => url.pathname.startsWith('/sounds/') && !url.pathname.endsWith('.json'),
  new CacheFirst({ cacheName: SOUND_CACHE, plugins: [only200, new RangeRequestsPlugin()] }),
)
registerRoute(
  ({ url }) => url.pathname.startsWith('/models/'),
  new CacheFirst({ cacheName: MODEL_CACHE, plugins: [only200] }),
)
// Vehicle renders (~2 MB each): cached the first time they are shown, not precached.
registerRoute(
  ({ url }) => url.pathname.startsWith('/images/'),
  new CacheFirst({ cacheName: IMAGE_CACHE, plugins: [only200] }),
)
// Small JSON (catalogs, pack sizes, traces): fast from cache, refreshed in the background.
registerRoute(
  ({ url }) => /^\/(sounds|traces)\/.*\.json$/.test(url.pathname),
  new StaleWhileRevalidate({ cacheName: DATA_CACHE, plugins: [only200] }),
)

self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') void self.skipWaiting()
})
