const CACHE_NAME = 'cerflak-shell-v1';
const SHELL_FILES = ['./index.html', './scriptum.js', './manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first pour le shell de l'app ; tout le reste (Kura, OTS) passe toujours par le réseau
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isShellFile = SHELL_FILES.some((f) => url.pathname.endsWith(f.replace('./', '')));
  if (!isShellFile) return; // laisse passer les appels réseau vers Kura/OTS sans interception

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
