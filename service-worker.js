const VERSION = '1.15.6';

self.addEventListener('install', (event) =>
    event.waitUntil(
        caches.open('v1').then((cache) =>
            fetch('.?v=' + VERSION).then((response) => {
                if (response.ok) {
                    return cache.put('.', response);
                }
            })
        )
    )
);

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request.url).then((response) => response || fetch(event.request))
    );
});
