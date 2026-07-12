const CACHE_NAME = "bookverse-static-cache-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/bookverse_logo.svg"
];

// Install Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Precaching app shell...");
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn("[Service Worker] Precaching error during installation:", err);
      });
    })
  );
  // Force active state immediately
  self.skipWaiting();
});

// Activate Service Worker
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache:", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Strategy: Network-First falling back to Cache
self.addEventListener("fetch", (event) => {
  // Do not intercept non-GET requests or external API calls
  if (event.request.method !== "GET" || event.request.url.startsWith("chrome-extension://")) {
    return;
  }

  // Handle local app shell and assets
  const url = new URL(event.request.url);
  
  // For API calls, try network first. If it fails, let api.ts local IndexedDB handle it
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        console.log("[Service Worker] API request failed (Offline), letting app state handle IndexedDB");
        return new Response(JSON.stringify({ error: "offline" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If response is valid, clone and cache it for future offline usage
        if (response && response.status === 200 && response.type === "basic") {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // If offline and request fails, try serving from cache
        console.log("[Service Worker] Network failed, looking for cached resource:", event.request.url);
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If not in cache and it's a page navigation, return index.html
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
          return new Response("Offline content not available.", { status: 503, statusText: "Offline" });
        });
      })
  );
});
