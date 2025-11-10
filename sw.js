self.addEventListener('install', e => {
  e.waitUntil(caches.open('omni-v1').then(c=>c.addAll(['./','./index.html','./contractor.html','./addons_master.js'])));
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r=>r || fetch(e.request)));
});
