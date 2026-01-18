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

  // ✅ Icone Android
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-192-maskable.png",
  "./icons/icon-512-maskable.png",

  // ✅ Icone iPhone + favicon (se le hai)
  "./apple-touch-icon.png",
  "./favicon-32.png",
  "./favicon.ico"
];

// ✅ INSTALL: pre-cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS);
      await self.skipWaiting();
    })()
  );
});

// ✅ ACTIVATE: pulizia cache vecchie
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
          return Promise.resolve(true);
        })
      );
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

  // ✅ 1) Navigazione / apertura pagina (HTML): NETWORK FIRST
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          // Prova sempre internet per avere aggiornamenti
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          cache.put("./index.html", fresh.clone());
          return fresh;
        } catch (e) {
          // Se offline, torna alla cache
          const cached = await caches.match("./index.html");
          return cached || new Response("Offline", { status: 503, statusText: "Offline" });
        }
      })()
    );
    return;
  }

  // ✅ 2) File statici (icone, css, js): CACHE FIRST
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;

      try {
        const resp = await fetch(req);

        // non cacheare risposte strane
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

// ✅ (OPZIONALE) Se vuoi forzare update manuale dalla pagina:
// navigator.serviceWorker.controller.postMessage("SKIP_WAITING");
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
