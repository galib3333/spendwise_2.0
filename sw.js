const CACHE_NAME = 'spendwise-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/expense-tracker.css',
  '/manifest.json',
  '/js/app.js',
  '/js/store.js',
  '/js/utils.js',
  '/js/charts.js',
  '/js/toast.js',
  '/js/router.js',
  '/js/modals.js',
  '/js/pages/dashboard.js',
  '/js/pages/transactions.js',
  '/js/pages/reports.js',
  '/js/pages/budgets.js',
  '/js/pages/recurring.js',
  '/js/pages/savings.js',
  '/js/pages/export-page.js',
  '/js/pages/settings.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Network first, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
