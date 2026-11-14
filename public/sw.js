/* PokéTrade service worker: offline shell + previously viewed data/artwork. No analytics, no push. */
const VERSION = "v1";
const SHELL = `poketrade-shell-${VERSION}`;
const DATA = `poketrade-data-${VERSION}`;
const IMG = `poketrade-img-${VERSION}`;
const BASE = new URL(self.registration.scope).pathname;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll([BASE, `${BASE}data/catalog.json`, `${BASE}manifest.webmanifest`, `${BASE}icon.svg`]).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const network = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || network;
}

async function cacheFirst(req, cacheName, max = 600) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && (res.ok || res.type === "opaque")) {
      cache.put(req, res.clone());
      cache.keys().then((keys) => keys.length > max && cache.delete(keys[0]));
    }
    return res;
  } catch {
    return new Response("", { status: 504 });
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname === "raw.githubusercontent.com") {
    e.respondWith(cacheFirst(req, IMG));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith(`${BASE}data/`)) {
    e.respondWith(staleWhileRevalidate(req, DATA));
    return;
  }
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put(req, copy));
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match(BASE)) || Response.error()),
    );
    return;
  }
  if (url.pathname.includes("/_next/static/")) {
    e.respondWith(cacheFirst(req, SHELL, 400));
  }
});
