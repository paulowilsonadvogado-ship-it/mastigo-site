// Service worker do app do Mastigô (instalável no iPhone e no Android, sem loja e sem arquivo para baixar).
// Estratégia "rede primeiro": sempre busca a versão mais nova do site; a cópia guardada só é usada sem internet.
// Nunca guarda nada de outros endereços (Supabase, Mercado Pago): os dados continuam indo direto para a nuvem.
const CACHE = 'mastigo-v1';
const ESSENCIAIS = ['./sistema.html', './index.html', './acesso.html', './manifest.webmanifest', './icone-192.png', './icone-512.png'];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(ESSENCIAIS)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', ev => {
  const req = ev.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;   // só o próprio site
  if (url.pathname.endsWith('/assinantes.json')) return;                      // lista sempre fresca
  ev.respondWith(
    fetch(req).then(res => {
      if (res.ok && res.type === 'basic') { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === 'navigate' ? caches.match('./sistema.html') : undefined)))
  );
});
