/* Nummus — service worker : fonctionnement hors ligne (coquille de l'application).
   - code de l'application : réseau d'abord (toujours la dernière version), cache en secours ;
   - bibliothèques (vendor/), icônes : cache d'abord ;
   - API (/api/) : jamais mise en cache — les données restent côté serveur. */
const V='nummus-v5';
self.addEventListener('install',e=>{e.waitUntil(self.skipWaiting())});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
const put=(r,x)=>{if(x&&x.ok){const c=x.clone();caches.open(V).then(h=>h.put(r,c))}return x};
self.addEventListener('fetch',e=>{
 const r=e.request;if(r.method!=='GET')return;
 const u=new URL(r.url);
 if(u.origin!==location.origin||u.pathname.startsWith('/api/'))return;
 if(u.pathname.includes('/vendor/')||u.pathname.includes('/icons/')){
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(x=>put(r,x))));return}
 e.respondWith(fetch(r).then(x=>put(r,x)).catch(()=>caches.match(r).then(m=>m||(r.mode==='navigate'?caches.match('./'):undefined))));
});
