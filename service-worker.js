/* service-worker.js
   PWA cache robusta per GitHub Pages + iPhone (Home screen)
   - Legge la versione da ?v=... (SW_VER) usata nella register()
   - HTML: network-first (aggiornamenti subito)
   - Asset: cache-first + refresh in background
*/

const CACHE_PREFIX = "rapporti-clienti-auto";

// Legge ?v=44 da service-worker.js?v=44
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

// Precache: DEVONO esistere davvero nella stessa cartella
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

    // Attiva subito la nuova versione
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // Elimina cache vecchie
    const keys = await caches.keys();
    await Promise.all(
      keys.map((key) => {
        if (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) {
          return caches.delete(key);
        }
      })
    );

    // Prende controllo subito delle pagine
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Solo GET e solo stessa origin (no cdnjs ecc.)
  if (req.method !== "GET") return;
  if (!sameOrigin(req.url)) return;

  // HTML: NETWORK FIRST (per aggiornarsi subito)
  if (isHtmlRequest(req)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        // no-store per prendere l'HTML aggiornato
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

  // ASSET: CACHE FIRST + refresh in background
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) {
      // aggiorna in background
      event.waitUntil((async () => {
        try {
          const cache = await caches.open(CACHE_NAME);
          const fresh = await fetch(req);
          await putInCache(cache, req, fresh);
        } catch (e) {}
      })());
      return cached;
    }

    // Se non c'è cache -> rete -> salva
    try {
      const cache = await caches.open(CACHE_NAME);
      const fresh = await fetch(req);
      await putInCache(cache, req, fresh);
      return fresh;
    } catch (e) {
      return new Response("Offline", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }
  })());
});

// Opzionale: permette alla pagina di forzare l’attivazione
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
