/* ============================================================
   Sakin — Anksiyete Günlüğü
   sw.js — Service Worker

   GÜNCELLEME STRATEJİSİ
   -------------------------------------------------------------
   CACHE_VERSION her sürüm yükseltmesinde değiştirilmelidir
   (örn. "sakin-v1" -> "sakin-v2"). Bu tek değişiklik:
     1) Yeni bir cache adı açar, dosyaları yeniden indirir.
     2) activate aşamasında eski cache adlarını siler.
     3) Açık sekmelere "yeni sürüm var" mesajı gönderir; app.js
        bunu yakalayıp kullanıcıya "Yenile" bildirimini gösterir.

   index.html, app.js ve style.css gibi temel dosyalar
   "network-first" stratejisiyle çekilir: yani cihaz internete
   bağlıyken her zaman GitHub Pages'teki en güncel sürüm denenir,
   sadece offline durumda cache'e düşülür. Böylece web tarafında
   yapılan küçük güncellemeler APK yeniden üretmeden, kullanıcı
   uygulamayı bir sonraki açışında otomatik yansır.
   ============================================================ */

var CACHE_VERSION = "sakin-v1.2.0";

var APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-192.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./favicon-32.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_VERSION; })
          .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);
  var isAppShellFile = APP_SHELL.some(function (path) {
    return url.pathname.endsWith(path.replace("./", "/")) || url.pathname.endsWith(path.replace("./", ""));
  }) || req.mode === "navigate";

  if (isAppShellFile) {
    // Network-first: güncel sürüm varsa onu kullan, yoksa cache'e düş.
    event.respondWith(
      fetch(req).then(function (response) {
        var copy = response.clone();
        caches.open(CACHE_VERSION).then(function (cache) { cache.put(req, copy); });
        return response;
      }).catch(function () {
        return caches.match(req).then(function (cached) {
          return cached || caches.match("./index.html");
        });
      })
    );
    return;
  }

  // Diğer istekler için cache-first.
  event.respondWith(
    caches.match(req).then(function (cached) {
      return cached || fetch(req);
    })
  );
});
