/**
 * Offline cache for the presentation.
 *
 * Without this, the app survives losing the network only for as long as the tab stays open.
 * Reload it at a venue with no internet and you get the browser's error page instead of the
 * show — which is the one failure that cannot be recovered from in front of an audience.
 * The deck and the photos are already local (localStorage and IndexedDB); this is the last
 * piece, the app itself.
 *
 * Two strategies, chosen by what goes stale:
 *
 *   - Navigations are network-first. The HTML names the hashed asset files, so serving a
 *     stale copy of it pins the whole app to an old build. Online, you always get the current
 *     one; offline, the cached copy.
 *   - Everything else same-origin is cache-first. Those URLs are content-hashed by Vite, so a
 *     changed file is a different URL and a cached one can never be wrong. The brand assets
 *     and the Sinhala font are not hashed, but they are also effectively immutable.
 *
 * /api/* is never cached. The importer must always talk to the live voting site, and a cached
 * result would silently present yesterday's votes.
 */

const VERSION = 'toddy-presentation-v1';

/**
 * The file list to precache, written by the build (see offlineManifest in vite.config.ts).
 * importScripts has to run during the initial evaluation, so it cannot move into install.
 * Wrapped because there is no manifest in dev, where this worker is never registered anyway.
 */
try {
  importScripts('/sw-manifest.js');
} catch {
  self.__TODDY_PRECACHE = ['/', '/index.html'];
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then(async (cache) => {
      // One at a time rather than cache.addAll: addAll is atomic, so a single 404 — a stale
      // manifest entry, say — would throw away the entire precache and leave nothing offline.
      await Promise.all(
        (self.__TODDY_PRECACHE ?? []).map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => {}),
        ),
      );
    }),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== VERSION).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          void caches.open(VERSION).then((c) => c.put('/index.html', res.clone()));
          return res;
        })
        .catch(() =>
          match('/index.html').then(
            (hit) => hit ?? new Response('Offline and not cached yet.', { status: 503 }),
          ),
        ),
    );
    return;
  }

  event.respondWith(
    match(request).then(
      (hit) =>
        hit ??
        fetch(request).then((res) => {
          // Opaque and error responses are not worth keeping; everything else is.
          if (res.ok && res.type === 'basic') {
            void caches.open(VERSION).then((c) => c.put(request, res.clone()));
          }
          return res;
        }),
    ),
  );
});

/**
 * Cache lookup with `ignoreVary`.
 *
 * Without it the whole cache is nearly useless here. The precache stores plain
 * `new Request(url)` objects, while the page asks for the same URLs as a script, a stylesheet
 * or a font — different headers each time. The dev/preview server answers with a `Vary`
 * header, and `caches.match` honours Vary by default, so those lookups all miss, fall through
 * to the network, and fail precisely when the network is gone. The URLs are content-hashed,
 * so matching on URL alone is exactly what is wanted.
 */
function match(request) {
  return caches.match(request, { ignoreVary: true, cacheName: VERSION });
}
