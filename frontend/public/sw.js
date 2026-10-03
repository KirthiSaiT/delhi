// AirCouple service worker: app shell + last forecast stay available offline.
const V = "aircouple-v1"
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png"]

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener("fetch", (e) => {
  const r = e.request
  if (r.method !== "GET") return
  const url = new URL(r.url)
  if (url.origin !== location.origin) return                       // map tiles etc.: network only
  if (url.pathname.startsWith("/api/")) {                          // forecast: network first, fall back to the last copy
    if (url.pathname.endsWith(".csv")) return
    e.respondWith(
      fetch(r).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(V).then((c) => c.put(r, cp)) } return res })
        .catch(() => caches.match(r).then((m) => m || new Response(JSON.stringify({ error: "offline" }), { status: 503, headers: { "Content-Type": "application/json" } })))
    )
    return
  }
  if (r.mode === "navigate") { e.respondWith(fetch(r).catch(() => caches.match("/"))); return }
  e.respondWith(caches.match(r).then((m) => m || fetch(r).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(V).then((c) => c.put(r, cp)) } return res })))
})
