const CACHE = "delis-crm-v3";
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

// ─── Web Push: показываем уведомление из push-события ───
self.addEventListener("push", (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch {
    /* пустой или битый payload */
  }
  const title = data.title || "DELIS CRM";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "delis",
    data: { url: data.url || "/" },
    renotify: true,
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// Клик по уведомлению открывает (или фокусирует) нужный раздел.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if ("focus" in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      })
  );
});
