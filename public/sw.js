// Service worker mínimo para PWA. Permite "Añadir a la pantalla de inicio".
self.addEventListener("install", (event) => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
