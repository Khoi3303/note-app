const CACHE_NAME = 'notes-app-v1';

const urlsToCache = [
    '/',
    '/home.html',
    '/css/base.css',
    '/css/layout.css',
    '/css/notes.css',
    '/css/labels.css',
    '/css/darkmode.css',
    '/css/mobile.css',
    '/js/config.js',
    '/js/app.js',
    '/js/ui.js',
    '/js/notes.js',
    '/js/labels.js',
    '/js/toast.js'
];

self.addEventListener('install', event => {

    event.waitUntil(

        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );

    self.skipWaiting();
});

self.addEventListener('activate', event => {

    event.waitUntil(

        caches.keys().then(keys => {

            return Promise.all(

                keys.map(key => {

                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );

    self.clients.claim();
});

self.addEventListener('fetch', event => {

    event.respondWith(

        fetch(event.request)
            .catch(() => caches.match(event.request))
    );
});