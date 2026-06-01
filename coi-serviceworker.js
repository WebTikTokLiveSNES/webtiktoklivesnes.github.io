// Service Worker that injects Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy headers.
// Required for SharedArrayBuffer (used by RetroArch / Nostalgist.js via Emscripten threads).
// Must be served from the same origin as the page (same directory).

self.addEventListener('install', (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  // Skip non-GET and opaque (cross-origin no-cors) requests
  if (e.request.method !== 'GET') return;
  if (e.request.cache === 'only-if-cached' && e.request.mode !== 'same-origin') return;

  e.respondWith(
    fetch(e.request).then((response) => {
      // Only modify HTML and script responses; pass others through
      const ct = response.headers.get('content-type') || '';
      const headers = new Headers(response.headers);

      // COOP: prevents cross-origin windows from sharing the same browsing context group
      headers.set('Cross-Origin-Opener-Policy', 'same-origin');
      // COEP credentialless: less strict than require-corp, works with CDN resources
      headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
      // Allow cross-origin resources to be loaded
      headers.set('Cross-Origin-Resource-Policy', 'cross-origin');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }).catch(() => fetch(e.request))
  );
});
