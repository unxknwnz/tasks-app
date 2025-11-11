const CACHE_NAME = 'tasks-app-v2'; // Изменили версию
const urlsToCache = [
    '/',
    '/index.html?v=2',
    '/style.css?v=2',
    '/script.js?v=2',
    '/manifest.json?v=2'
];

self.addEventListener('install', function(event) {
    console.log('Service Worker installing v2');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('Opened cache v2');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('activate', function(event) {
    console.log('Service Worker activating v2');
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                // Возвращаем кеш если есть, иначе запрашиваем сеть
                if (response) {
                    return response;
                }
                return fetch(event.request);
            }
        )
    );
});