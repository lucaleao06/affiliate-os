// Affiliate OS — Service Worker
// Cache-first para assets estáticos, network-first para API e páginas dinâmicas

const CACHE_VERSION = 'aff-os-v1'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const API_CACHE = `${CACHE_VERSION}-api`

// Assets para pré-cachear na instalação
const PRECACHE_ASSETS = [
  '/',
  '/dashboard',
  '/hoje',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// Instala e pré-cacheia assets críticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache =>
      cache.addAll(PRECACHE_ASSETS).catch(() => {})
    ).then(() => self.skipWaiting())
  )
})

// Ativa e remove caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('aff-os-') && k !== STATIC_CACHE && k !== API_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

// Estratégia de fetch
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignorar requests de outras origens
  if (url.origin !== self.location.origin) return

  // API routes → network-first, sem cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    )
    return
  }

  // Assets estáticos (_next/static, icons, fonts) → cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(STATIC_CACHE).then(c => c.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // Páginas HTML → network-first com fallback para /dashboard offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(STATIC_CACHE).then(c => c.put(request, clone))
          }
          return response
        })
        .catch(() =>
          caches.match(request).then(cached =>
            cached || caches.match('/dashboard')
          )
        )
    )
    return
  }
})

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json().catch(() => ({})) ?? {}
  const title = data.title ?? 'Affiliate OS'
  const body = data.body ?? 'Nova notificação'
  const icon = '/icons/icon-192.png'
  const badge = '/icons/icon-192.png'
  const url = data.url ?? '/dashboard'

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data: { url },
      vibrate: [100, 50, 100],
      tag: data.tag ?? 'aff-os-notification',
    })
  )
})

// Clique em notificação → abre a URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
