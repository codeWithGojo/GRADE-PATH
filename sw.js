/* Cache only public study tools. Account and provider responses always use the network. */
const cacheName = "gradepath-shell-__BUILD__";
const assets = ["/","/index.html","/styles.css","/core.js","/catalog.js","/app.js","/grades.js",
  "/school.js","/study.js","/exams.js","/online.js","/lab.js","/projects.js","/experience.js",
  "/appearance.js","/account-lifecycle-ui.js","/runner.html","/favicon.svg",
  "/vendor/fonts/sora.woff","/vendor/fonts/inter.woff","/vendor/pdf.min.mjs","/vendor/pdf.worker.min.mjs"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(assets)));
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith("gradepath-shell-") && key !== cacheName) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || !assets.includes(url.pathname)) return;
  event.respondWith((async () => {
    const cached = await (await caches.open(cacheName)).match(url.pathname);
    return cached || fetch(event.request);
  })());
});
