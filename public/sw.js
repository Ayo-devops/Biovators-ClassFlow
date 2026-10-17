/* Public ClassFlow content may be cached. Admin and authenticated traffic stay on the network. */
const SHELL_CACHE = "classflow-shell-v2";
const DATA_CACHE = "classflow-public-data-v2";
const PUBLIC_PAGES = [
  "/",
  "/assignments",
  "/materials",
  "/announcements",
  "/reminders",
  "/offline.html",
];
const PUBLIC_APIS = ["/api/assignments", "/api/materials", "/api/announcements"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PUBLIC_PAGES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) =>
              key.startsWith("classflow-") &&
              key !== SHELL_CACHE &&
              key !== DATA_CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

async function networkFirst(request, cacheName, fallback) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallback) return caches.match(fallback);
    return new Response(JSON.stringify({ error: "Offline and no saved copy is available." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/admin")) return;

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request, SHELL_CACHE, "/offline.html"));
    return;
  }

  if (PUBLIC_APIS.includes(url.pathname)) {
    event.respondWith(networkFirst(event.request, DATA_CACHE));
  }
});
