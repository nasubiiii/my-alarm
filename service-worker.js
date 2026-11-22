
const CACHE_NAME = "my-alarm-v35";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
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
