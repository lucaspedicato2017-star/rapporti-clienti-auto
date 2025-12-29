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

const CORE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE);
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

// match che ignora la query (ok per assets)
// NB: per HTML usiamo una chiave fissa index.html
async function cacheMatch(req) {
  return caches.match(req, { ignoreSearch: true });
}

async function networkFirstHTML(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    // sempre rete, così prendi subito gli update
    const res = await fetch(req, { cache: "no-store" });
    if (res && res.ok) {
      // IMPORTANTISSIMO: cache SOLO index.html (senza ?sms=...&t=...)
      await cache.put(new Request("./index.html"), res.clone());
    }
    return res;
  } catch (e) {
    // offline: torna index cached
    const cachedIndex = await cacheMatch("./index.html");
    if (cachedIndex) return cachedIndex;
    throw e;
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cacheMatch(req);
  if (cached) {
    fetch(req).then((res) => {
      const url = new URL(req.url);
      if (res && res.ok && url.origin === self.location.origin) cache.put(req, res.clone());
    }).catch(() => {});
    return cached;
  }
  const res = await fetch(req);
  const url = new URL(req.url);
  if (res && res.ok && url.origin === self.location.origin) cache.put(req, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const accept = req.headers.get("accept") || "";

  // HTML / navigazione: network first, ma cache solo index.html (senza query)
  if (req.mode === "navigate" || accept.includes("text/html")) {
    event.respondWith(networkFirstHTML(req));
    return;
  }

  // asset same-origin: cache first
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(req));
  }
});
