
const CACHE_NAME = "my-alarm-mod57-v1";

const APP_FILES = [
  "./",
  "./index.html",
  "./css/base.css",
  "./css/timer-gallery.css",
  "./css/timer-detail.css",
  "./js/alarm.js",
  "./js/settings.js",
  "./js/clock-controls.js",
  "./js/world-clock.js",
  "./timers/timer-core.js",
  "./js/stopwatch-and-ui.js",
  "./js/ui-enhancements.js",
  "./timers/timer-presets.js",
  "./timers/timer-scenes.js",
  "./css/fluid-timers.css",
  "./timers/fluid-timers.js",
  "./timers/oil/oil-canvas.js",
  "./timers/oil/oil-webgl.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./scenes/morning.svg", "./scenes/day.svg", "./scenes/evening.svg", "./scenes/night.svg",
  "./scenes/city-Tokyo.svg",
  "./scenes/city-London.svg",
  "./scenes/city-Paris.svg",
  "./scenes/city-New_York.svg",
  "./scenes/city-Los_Angeles.svg",
  "./scenes/city-Seoul.svg",
  "./scenes/city-Sydney.svg",
  "./scenes/city-Dubai.svg",
  "./scenes/city-Singapore.svg",
  "./scenes/city-Shanghai.svg",
  "./scenes/city-Kolkata.svg"
];

// インストール時に必要なファイルを保存
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_FILES);
    })
  );
});

// 古いキャッシュを削除
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 通信できない場合は保存済みファイルを使う
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
