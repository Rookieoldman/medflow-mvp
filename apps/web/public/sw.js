const CACHE_NAME = "medflow-v1";

// Recursos estáticos a cachear en instalación
const SHELL_URLS = ["/", "/celador", "/tecnico"];

// ── Instalación: caché del shell ──────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(SHELL_URLS).catch(() => {})
    )
  );
  self.skipWaiting();
});

// ── Activación: eliminar cachés antiguas ──────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first para API, cache-first para estáticos ────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar peticiones de extensiones y no-GET
  if (request.method !== "GET" || !url.origin.startsWith("http")) return;

  // API y SSE: siempre red, sin caché
  if (url.pathname.startsWith("/api/")) return;

  // Resto: network-first con fallback a caché
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok && res.type !== "opaque") {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return res;
      })
      .catch(() => caches.match(request))
  );
});

// ── Push notifications ────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "MedFlow", body: event.data.text() };
  }

  const { title = "MedFlow", body = "", url = "/" } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:  "/icon-192.svg",
      badge: "/icon-192.svg",
      tag:   "medflow-notification",
      renotify: true,
      data: { url },
      vibrate: [200, 100, 200],
    })
  );
});

// ── Clic en notificación → abrir/enfocar la app ───────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        existing.navigate(targetUrl);
      } else {
        self.clients.openWindow(targetUrl);
      }
    })
  );
});
