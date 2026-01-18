/* =========================
   SERVICE WORKER – Reperibilità
   Cache smart per PWA su GitHub Pages
   - HTML: Network-first (così si aggiorna sempre)
   - Assets: Cache-first (veloce + offline)
   ========================= */

const CACHE_VERSION = "v109"; // 👈 cambia numero quando aggiorni app/icone
const CACHE_NAME = `rapporti-clienti-${CACHE_VERSION}`;

// ✅ Metti qui TUTTI i file importanti da tenere offline
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./service-worker.js",

  // ✅ Icone Android
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-192-maskable.png",
  "./icons/icon-512-maskable.png",

  // ✅ Icone iPhone + favicon
  "./apple-touch-icon.png",
  "./favicon.ico",
  "./favicon-32x32.png",
  "./favicon-16x16.png"
];

// ✅ INSTALL: pre-cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // ✅ Se manca un file non deve bloccare tutto l'install
      for (const asset of ASSETS) {
        try {
          await cache.add(asset);
        } catch (e) {
          // ignora file mancanti
        }
      }

      await self.skipWaiting();
    })()
  );
});

// ✅ ACTIVATE: pulizia cache vecchie
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)));
      await self.clients.claim();
    })()
  );
});

// ✅ FETCH: gestione intelligente
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Solo GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Solo stesso dominio
  if (url.origin !== self.location.origin) return;

  const accept = req.headers.get("accept") || "";

  // ✅ 1) HTML / navigazione: NETWORK FIRST
  if (req.mode === "navigate" || accept.includes("text/html")) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE_NAME);

          // ✅ aggiorno sia la URL reale che index.html
          cache.put(req, fresh.clone());
          cache.put("./index.html", fresh.clone());

          return fresh;
        } catch (e) {
          // ✅ offline: torno alla cache
          const cached =
            (await caches.match(req, { ignoreSearch: true })) ||
            (await caches.match("./index.html")) ||
            (await caches.match("./"));

          return cached || new Response("Offline", { status: 503, statusText: "Offline" });
        }
      })()
    );
    return;
  }

  // ✅ 2) Assets statici: CACHE FIRST
  event.respondWith(
    (async () => {
      const cached = await caches.match(req, { ignoreSearch: true });
      if (cached) return cached;

      try {
        const resp = await fetch(req);
        if (!resp || resp.status !== 200 || resp.type === "opaque") return resp;

        const cache = await caches.open(CACHE_NAME);
        cache.put(req, resp.clone());
        return resp;
      } catch (e) {
        return cached || new Response("Offline", { status: 503, statusText: "Offline" });
      }
    })()
  );
});

// ✅ Forza update manuale dalla pagina (se vuoi)
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
