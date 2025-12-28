/* service-worker.js
   Cache solida per GitHub Pages + iPhone Home screen
   - HTML: network-first (così prende subito versioni nuove)
   - Asset same-origin: cache-first
   - Navigazioni offline: serve index.html da cache
*/

const CACHE_PREFIX = "rapporti-clienti-auto";

// Legge ?v=... da service-worker.js?v=51
const SW_URL = (self.location && self.location.href) ? self.location.href : "";
const SW_VER = (() => {
  try {
    const u = new URL(SW_URL);
    return u.searchParams.get("v") || "0";
  } catch (e) {
    const m = SW_URL.match(/[?&]v=([^&]+)/);
    return m ? m[1] : "0";
  }
})();

const CACHE_NAME = `${CACHE_PREFIX}-v${SW_VER}`;

// Core files (stessa cartella)
const CORE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(CORE);
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

async function cacheMatch(req) {
  return caches.match(req, { ignoreSearch: true });
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const res = await fetch(req, { cache: "no-store" });
    // salva solo risposte OK e same-origin
    if (res && res.ok) {
      const url = new URL(req.url);
      if (url.origin === self.location.origin) {
        cache.put(req, res.clone());
      }
    }
    return res;
  } catch (e) {
    // fallback cache
    const cached = await cacheMatch(req);
    if (cached) return cached;

    // fallback navigazione: index.html
    const accept = (req.headers.get("accept") || "");
    if (req.mode === "navigate" || accept.includes("text/html")) {
      const indexCached = await cacheMatch("./index.html");
      if (indexCached) return indexCached;
    }

    throw e;
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cacheMatch(req);
  if (cached) {
    // aggiorna in background
    fetch(req).then((res) => {
      const url = new URL(req.url);
      if (res && res.ok && url.origin === self.location.origin) {
        cache.put(req, res.clone());
      }
    }).catch(() => {});
    return cached;
  }
  const res = await fetch(req);
  const url = new URL(req.url);
  if (res && res.ok && url.origin === self.location.origin) {
    cache.put(req, res.clone());
  }
  return res;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const accept = req.headers.get("accept") || "";

  // HTML / navigazioni: network-first
  if (req.mode === "navigate" || accept.includes("text/html")) {
    event.respondWith(networkFirst(req));
    return;
  }

  // solo same-origin: cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(req));
  }
});
