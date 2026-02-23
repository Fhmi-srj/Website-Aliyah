// Service Worker - MAHAKAM APP PWA
const CACHE_NAME = 'mahakam-v2';

// Install event
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch event — network-first strategy
self.addEventListener('fetch', (event) => {
    // Only cache GET requests
    if (event.request.method !== 'GET') return;

    // Skip API requests and non-http
    if (event.request.url.includes('/api/') || !event.request.url.startsWith('http')) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cache successful responses for static assets
                if (response.status === 200 && (
                    event.request.url.includes('/build/') ||
                    event.request.url.includes('/images/') ||
                    event.request.url.includes('/pwa-icon/')
                )) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Fallback to cache
                return caches.match(event.request);
            })
    );
});

// ─── Push Notification Handler ─────────────────────────────────
self.addEventListener('push', (event) => {
    if (!event.data) return;

    let data;
    try {
        data = event.data.json();
    } catch (e) {
        data = {
            title: 'MAHAKAM APP',
            body: event.data.text(),
        };
    }

    const options = {
        body: data.body || '',
        icon: data.icon || '/pwa-icon/192',
        badge: data.badge || '/pwa-icon/72',
        tag: data.tag || 'default',
        renotify: true,
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/',
        },
        actions: [
            { action: 'open', title: 'Buka' },
            { action: 'dismiss', title: 'Tutup' },
        ],
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'MAHAKAM APP', options)
    );
});

// ─── Notification Click Handler ────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // If app is already open, focus it and navigate
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin)) {
                        client.focus();
                        client.navigate(urlToOpen);
                        return;
                    }
                }
                // Otherwise open new window
                return clients.openWindow(urlToOpen);
            })
    );
});
