/* FHSalon — cache static assets only.
   Never cache Next.js HTML/RSC documents (stale shells cause white screens). */
const ASSET_CACHE = "fhsalon-assets-v4";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== ASSET_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Do not intercept navigations or API — always hit the network.
  if (request.mode === "navigate") return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname === "/fhsalon-sw.js") return;

  if (!url.pathname.startsWith("/_next/static/")) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(ASSET_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      const res = await fetch(request);
      if (res && res.ok) {
        cache.put(request, res.clone()).catch(() => {});
      }
      return res;
    })()
  );
});
