/* service-worker.js
   PWA cache robusta per GitHub Pages + iPhone (Home screen)
   - Legge la versione da ?v=... (SW_VER) usata nella register()
   - HTML: network-first (aggiornamenti subito)
   - Asset: cache-first + refresh in background
*/

const CACHE_PREFIX = "rapporti-clienti-auto";

// legge ?v=44 da service-worker.js?v=44
const SW_URL = (self.location && self.location.href) ? self.location.href : "";
const SW_VER = (() => {
  try {
    const u = new URL(SW_URL);
    return u.searchParams.get("v") || "0";
  } catch (e) {
    const m = SW_URL.match(/[?&]v=([^&]+)/);
    return (m && m[1]) ? m[1] : "0";
  }
})();

const CACHE_NAME = `${CACHE_PREFIX}-v${SW_VER}`;

// Precache: devono esistere davvero nella cartella
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

function isHtmlRequest(request) {
  if (request.mode === "navigate") return true;
  const accept = request.headers.get("accept") || "";
  return accept.includes("text/html");
}

function sameOrigin(url) {
  try { return new URL(url).origin === self.location.origin; }
  catch (e) { return false; }
}

async function putInCache(cache, request, response) {
  try {
    if (response && response.ok) {
      await cache.put(request, response.clone());
    }
  } catch (e) {}
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Precache "safe": non blocca se un file manca
    await Promise.allSettled(
      CORE_ASSETS.map(async (path) => {
        try {
          const req = new Request(path, { cache: "reload" });
          const res = await fetch(req);
          await putInCache(cache, req, res);
        } catch (e) {}
      })
    );

    // attiva subito la nuova versione
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.map((key) => {
        if (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) {
          return caches.delete(key);
        }
      })
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // gestiamo solo GET e solo stessa origin (no cdnjs)
  if (req.method !== "GET") return;
  if (!sameOrigin(req.url)) return;

  // HTML: NETWORK FIRST
  if (isHtmlRequest(req)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        // no-store per prendere davvero HTML aggiornato
        const fresh = await fetch(req, { cache: "no-store" });
        await putInCache(cache, req, fresh);
        return fresh;
      } catch (e) {
        // fallback: cache o index
        const cached = await caches.match(req);
        return cached || (await caches.match("./index.html")) || new Response("Offline", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      }
    })());
    return;
  }

  // ASSET: CACHE FIRST + refresh background
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) {
      event.waitUntil((async () => {
        try {
          const cache = await caches.open(CACHE_NAME);
          const fresh = await fetch(req);
          await putInCache(cache, req, fresh);
        } catch (e) {}
      })());
      return cached;
    }

    // niente cache -> rete -> salva
    try {
      const cache = await caches.open(CACHE_NAME);
      const fresh = await fetch(req);
      await putInCache(cache, req, fresh);
      return fresh;
    } catch (e) {
      return new Response("Offline", {
