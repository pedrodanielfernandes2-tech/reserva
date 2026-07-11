const CACHE = "reservas-ad-v1";
const ASSETS = ["/", "/icon-192.png", "/icon-512.png", "/logo.jpg"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  // Requisições de API sempre vão para a rede (dados em tempo real)
  if (e.request.url.includes("/api/")) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Para o restante: tenta rede primeiro, cai no cache se offline
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
