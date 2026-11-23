/* Multimetrónomo · sw.js
   Service worker para usar la app sin conexión: guarda los archivos de la app al instalarse y los sirve desde la caché.
   Al publicar cambios, subir VERSION para que los celulares descarguen la versión nueva. */
'use strict';
const VERSION = 'multimetronomo-v1';
const FILES = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'js/datos.js', 'js/audio.js', 'js/pulso.js', 'js/tempo.js', 'js/temas.js', 'js/listas.js', 'js/compartir.js', 'js/guia.js', 'js/inicio.js',
  'icons/logo.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png',
  'fonts/atkinson-hyperlegible-400-latin.woff2', 'fonts/atkinson-hyperlegible-400-latin-ext.woff2',
  'fonts/atkinson-hyperlegible-700-latin.woff2', 'fonts/atkinson-hyperlegible-700-latin-ext.woff2',
  'fonts/jetbrains-mono-latin.woff2', 'fonts/jetbrains-mono-latin-ext.woff2',
  'fonts/young-serif-400-latin.woff2', 'fonts/young-serif-400-latin-ext.woff2',
  'ayuda/Multimetronomo-ayuda.pdf'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Primero la red (para recibir cambios) y, sin conexión, la caché. El enlace #temas= no llega aquí: el hash no se envía.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
