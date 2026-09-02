const CACHE = "delis-crm-v2";
// Экран логина рендерится самим "/" (отдельного маршрута /login нет),
// поэтому прекешируем только корень.
const PRECACHE = ["/"];

self.addEventListener("install", (e) => {
  // addAll атомарен: один неудачный ответ отменяет всю установку SW.
  // Кешируем поштучно и не падаем, если какой-то ресурс недоступен.
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(PRECACHE.map((url) => c.add(url).catch(() => undefined)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (!req.url.startsWith(self.location.origin)) return;
  if (req.url.includes("/api/")) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("/")))
  );
});
