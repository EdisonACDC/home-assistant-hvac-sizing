/* Service worker del portale bombole: tiene sul telefono le pagine per aprire i QR senza rete.
   I dati delle bombole non passano da qui: li salva offline.js nella memoria della pagina. */
const VERSION = 'bombole-0.16.2';
const SHELL = [
  '/app/', '/shell/portal', '/public.js', '/public.css', '/offline.js', '/bombole-app.js',
  '/machine-brands.js', '/vendor/jsqr.js', '/manifest.webmanifest', '/app-icon-192.png', '/app-icon-512.png',
  '/inter-400.woff2', '/inter-600.woff2', '/inter-800.woff2', '/barlow-700.woff2', '/mono-600.woff2'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('bombole-') && key !== VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request, fallbackKey) {
  try {
    const response = await fetch(request);
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(VERSION);
      cache.put(fallbackKey || request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(fallbackKey || request, {ignoreSearch: true});
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Le API e l'area amministratore vanno sempre in rete.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return;
  if (/^\/c\/[^/]+\/[^/]+\/?$/.test(url.pathname)) {
    // Pagina di una bombola: con la rete arriva dal server, senza rete si usa la copia senza dati.
    event.respondWith(fetch(request).catch(() => caches.match('/shell/portal')));
    return;
  }
  if (url.pathname === '/app' || url.pathname === '/app/') {
    event.respondWith(networkFirst(request, '/app/'));
    return;
  }
  const asset = url.pathname;
  if (SHELL.includes(asset)) event.respondWith(networkFirst(request, asset));
});
