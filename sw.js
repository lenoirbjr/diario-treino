const CACHE='diario-treino-v1.0.3';
const CORE=['./','./index.html','./style.css?v=1.0.3','./app.js?v=1.0.3','./evolution.js?v=1.0.2','./evolution.css?v=1.0.2','./manifest.webmanifest?v=1.0.1','./icon-192.png?v=1.0.1','./icon-512.png?v=1.0.1'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(a=>Promise.all(a.filter(k=>k.startsWith('diario-treino-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin||!e.request.url.startsWith(self.registration.scope))return;
 if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.match('./index.html')));return}
 e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
