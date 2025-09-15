/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies'
import { BackgroundSyncPlugin } from 'workbox-background-sync'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any }

clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)

registerRoute(
  ({ request }) =>
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'worker',
  new StaleWhileRevalidate({
    cacheName: 'asset-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  })
)

registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'image-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  })
)

const bgSyncPlugin = new BackgroundSyncPlugin('api-queue', { maxRetentionTime: 24 * 60 })

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/') && url.searchParams.get('method') !== 'POST' && url.searchParams.get('method') !== 'PATCH',
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 5 * 60 })],
  })
)

registerRoute(
  ({ url }) => {
    const method = url.searchParams.get('method')
    return url.pathname.startsWith('/api/') && (method === 'POST' || method === 'PATCH')
  },
  new NetworkFirst({ cacheName: 'api-mutations', plugins: [bgSyncPlugin] })
)

self.addEventListener('message', (event) => {
  if (event.data && typeof event.data === 'object') {
    if (event.data.type === 'SKIP_WAITING') self.skipWaiting()
  }
})

// Handle SPA navigation with a more robust strategy
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'spa-navigation-cache',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 }),
      // Add a custom plugin to handle navigation failures
      {
        cacheKeyWillBeUsed: async ({ request }) => {
          return request.url
        },
        cacheWillUpdate: async ({ response }) => {
          // Only cache successful responses
          return response.status === 200 ? response : null
        }
      }
    ]
  })
)

// Handle the main page and login page specifically
registerRoute(
  ({ url }) => url.pathname === '/' || url.pathname === '/index.html',
  new NetworkFirst({
    cacheName: 'main-page-cache',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 24 * 60 * 60 }),
      {
        cacheWillUpdate: async ({ response }) => {
          // Always cache the main page and login page for offline access
          return response.status === 200 ? response : null
        }
      }
    ],
  })
)

// Define SPA routes for the Plant Tour Management System
const spaRoutes = [
  '/', // Login page
  '/home',
  '/plant-tour-section',
  '/qualityplantour',
  '/creampercentage',
  '/sieveandmagnetoldplant',
  '/sieveandmagnetnewplant',
  '/productmonitoringrecord',
  '/netweightmonitoringrecord',
  '/codeverificationrecord',
  '/oprpandccprecord',
  '/bakingprocessrecord',
  '/sealintegritytest',
  '/alc'
]

spaRoutes.forEach((route) => {
  registerRoute(
    ({ url }) => url.pathname === route,
    new NetworkFirst({
      cacheName: `spa-route-${route.replace('/', '')}`,
      networkTimeoutSeconds: 3,
      plugins: [
        new ExpirationPlugin({ maxEntries: 5, maxAgeSeconds: 24 * 60 * 60 }),
        {
          cacheWillUpdate: async ({ response }) => {
            // Only cache successful responses
            return response.status === 200 ? response : null
          }
        }
      ]
    })
  )
})

// Add a fallback route for any unmatched navigation requests
registerRoute(
  ({ request }) => {
    // Only handle navigation requests that are not in our SPA routes
    if (request.mode !== 'navigate') return false;
    
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // Don't handle the root path or any of our defined SPA routes
    return !spaRoutes.includes(pathname);
  },
  new NetworkFirst({
    cacheName: 'fallback-navigation-cache',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 24 * 60 * 60 })
    ]
  })
)


