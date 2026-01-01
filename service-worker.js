const CACHE_PREFIX = "rapporti-clienti-auto";

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

/**
 * CORE:
 * - metto sia i nuovi percorsi (icons/ + manifest.webmanifest)
 * - sia i vecchi (manifest.json + icon-*.png) come fallback
 * - MA li aggiungo in modo "safe" (se uno manca non rompe l’install)
 */
const CORE = [
  "./",
  "./index.html",

  "./manifest.webmanifest",
  "./manifest.json", // fallback se esiste ancora

  "./icons/icon-192.png",
  "./icons/icon-512.png",

  "./icon-192.png",  // fallback vecchio
  "./icon-512.png"   // fallback vecchio
];

async function safeAddAll(cache, urls) {
  await Promise.all(
    urls.map((u) => cache.add(u).catch(() => null))
  );
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await safeAddAll(cache, CORE);
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

async function cacheMatch(req) {
  return caches.match(req, { ignoreSearch: true });
}

async function networkFirstHTML(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const res = await fetch(req, { cache: "no-store" });
    if (res && res.ok) {
      // aggiorno sempre la shell
      await cache.put(new Request("./index.html"), res.clone());
    }
    return res;
  } catch (e) {
    // offline -> torno alla shell cache
    const cachedIndex = await cacheMatch("./index.html");
    if (cachedIndex) return cachedIndex;
    throw e;
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cacheMatch(req);

  if (cached) {
    // aggiorno in background (solo same-origin)
    fetch(req).then((res) => {
      try {
        const url = new URL(req.url);
        if (res && res.ok && url.origin === self.location.origin) {
          cache.put(req, res.clone());
        }
      } catch (_) {}
    }).catch(() => {});
    return cached;
  }

  const res = await fetch(req);
  try {
    const url = new URL(req.url);
    if (res && res.ok && url.origin === self.location.origin) {
      cache.put(req, res.clone());
    }
  } catch (_) {}
  return res;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const accept = req.headers.get("accept") || "";

  // Navigazioni / HTML -> network first con fallback a index.html
  if (req.mode === "navigate" || accept.includes("text/html")) {
    // solo per same-origin: se no lascio fare al browser
    if (url.origin === self.location.origin) {
      event.respondWith(networkFirstHTML(req));
    }
    return;
  }

  // Statici same-origin -> cache first
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(req));
  }
});
