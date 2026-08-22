
/**
 * PAES Challenge / Búho Sabiondo — Service Worker v3
 * Soporte offline para archivos estáticos (App Shell).
 * No cachea respuestas de Firestore ni Google Sheets.
 */

const CACHE_NAME = 'paes-v3';

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/effects.js',
    '/buho-svg.js',
    '/firebase-config.js',
    '/manifest.json'
];

// Instalación: cachear app shell y forzar activación
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
    );
});

// Activación: limpiar versiones viejas de caché
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch: servir desde caché para estáticos y red para el resto
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Solo manejar peticiones GET
    if (request.method !== 'GET') return;

    // Evitar cachear respuestas de Firebase u otros servicios externos
    const url = new URL(request.url);
    if (url.origin !== location.origin) return;

    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) return cached;
            return fetch(request).then(response => {
                // Cachear solo si la respuesta es válida y es un archivo estático
                if (response.ok && (url.pathname.startsWith('/') && !url.pathname.includes('.'))) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                }
                return response;
            });
        })
    );
});
