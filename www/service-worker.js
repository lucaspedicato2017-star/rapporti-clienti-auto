/* Rapporti Clienti - Service Worker (cache base) */
const CACHE = "rapporti-cache-v1";
const CORE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : Promise.resolve())))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((resp) => {
        // cache solo same-origin
        try{
          const url = new URL(req.url);
          if (url.origin === self.location.origin) {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
        }catch(e){}
        return resp;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
