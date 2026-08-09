/* FHSalon app-shell cache — instant reopen for manager / stylist / display PWAs */
const NAV_CACHE = "fhsalon-nav-v3";
const ASSET_CACHE = "fhsalon-assets-v3";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(NAV_CACHE).then((cache) =>
      cache.addAll(["/shells/manager.html", "/shells/stylist.html", "/shells/display.html"]).catch(() => {})
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== NAV_CACHE && k !== ASSET_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

function appShellPath(pathname) {
  if (pathname.startsWith("/manager") || pathname.startsWith("/admin")) {
    return "/shells/manager.html";
  }
  if (pathname.startsWith("/stylist")) return "/shells/stylist.html";
  if (pathname.startsWith("/display")) return "/shells/display.html";
  return null;
}

function isAppNavigate(request, url) {
  if (request.method !== "GET") return false;
  if (request.mode !== "navigate") return false;
  if (url.pathname.startsWith("/shells/")) return false;
  return Boolean(appShellPath(url.pathname));
}

async function navigationStrategy(request, url) {
  const cache = await caches.open(NAV_CACHE);
  const cached = await cache.match(request);
  const shellPath = appShellPath(url.pathname);
  const shell = shellPath ? await cache.match(shellPath) : null;

  const networkPromise = fetch(request)
    .then((res) => {
      if (res && res.ok) {
        cache.put(request, res.clone()).catch(() => {});
      }
      return res;
    })
    .catch(() => null);

  // Reopen / warm cache: paint instantly, refresh in background.
  if (cached) {
    networkPromise.catch(() => {});
    return cached;
  }

  // First load: if the server is slow, show branded shell instead of a white screen.
  if (!shell) {
    const network = await networkPromise;
    return network || fetch(request);
  }

  return new Promise((resolve) => {
    let done = false;
    const finish = (res) => {
      if (done || !res) return;
      done = true;
      clearTimeout(timer);
      resolve(res);
    };
    const timer = setTimeout(() => finish(shell), 700);
    networkPromise.then((res) => {
      if (res) finish(res);
      else finish(shell);
    });
  });
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res && res.ok) {
    cache.put(request, res.clone()).catch(() => {});
  }
  return res;
}

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
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname === "/fhsalon-sw.js") return;

  if (isAppNavigate(request, url)) {
    event.respondWith(navigationStrategy(request, url));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirstAsset(request));
  }
});
