/**
 * @fileoverview Chuck's Jokes - Progressive Web App Service Worker
 * ================================================================
 * Provides offline caching and network routing strategies for the Chuck's Jokes application:
 *
 * Caching Strategies:
 * -------------------
 * 1. Static Assets (HTML, CSS, JS, Favicons, Images, Fonts, CDN Icons):
 *    Cache-First with background cache revalidation. If found in cache, return
 *    cached copy immediately and re-fetch from network in background to keep cache fresh.
 *
 * 2. Chuck Norris API Requests (https://api.chucknorris.io/*):
 *    Network-First with offline JSON fallback. Tries live network first; if offline
 *    or unreachable, returns a witty offline fallback joke.
 *
 * @author Guilherme Marques (https://guinuxbr.com)
 * @license GNU GPLv3
 */

/**
 * Identifier for the current service worker cache version.
 * Increment this string (e.g., 'chucks-jokes-v2') when updating cached shell assets.
 * @constant {string}
 */
const CACHE_NAME = "chucks-jokes-v1";

/**
 * List of static shell assets to pre-cache upon service worker installation.
 * @constant {string[]}
 */
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/script.js",
  "./favicon.png",
  "./img/chuck_norris_approved.png",
  "./manifest.json",
  "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
];

/**
 * Service Worker 'install' event.
 * Pre-caches all core shell assets and immediately forces activation.
 */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

/**
 * Service Worker 'activate' event.
 * Purges obsolete cache versions from prior releases and claims control of all open client tabs.
 */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

/**
 * Service Worker 'fetch' event.
 * Intercepts HTTP GET requests and applies tailored caching strategies:
 * - Network-First for chucknorris.io API requests (with offline fallback joke)
 * - Cache-First (with background revalidation) for static assets
 */
self.addEventListener("fetch", (event) => {
  // Only handle standard HTTP GET requests
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);

  // 1. Network-First Strategy for Chuck Norris API requests
  if (requestUrl.hostname === "api.chucknorris.io") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({
            value: "Chuck Norris once went offline, but the Internet was too scared to disconnect him. (Offline mode: Connect to internet for more jokes!)"
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      })
    );
    return;
  }

  // 2. Cache-First with Background Revalidation Strategy for Static Assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache for subsequent visits
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {
          // Suppress background revalidation errors while offline
        });
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});

