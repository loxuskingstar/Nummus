/* Nummus — service worker : fonctionnement hors ligne (coquille de l'application).
   - code de l'application : réseau d'abord (toujours la dernière version), cache en secours ;
   - bibliothèques (vendor/), icônes : cache d'abord ;
   - API (/api/) : jamais mise en cache par le service worker — le hors ligne des données est géré par la page (feat-offline.js, miroir IndexedDB). */
const V='nummus-v7';
/* installation : met en cache la page d'accueil et tous les scripts/styles qu'elle référence, pour que le premier
   rechargement hors ligne fonctionne (sans cela, ce qui a été chargé avant l'activation du worker n'est pas en cache) */
async function precache(){
 try{
  const c=await caches.open(V),h=await fetch('./',{credentials:'same-origin'});
  if(!h.ok||h.redirected)return;
  const html=await h.clone().text();await c.put('./',h);
  const urls=[...html.matchAll(/(?:src|href)="([^"#?]+\.(?:js|css|webmanifest|svg|png))"/g)].map(m=>m[1]).filter(u=>!/^(https?:)?\/\//.test(u));
  await Promise.all(urls.map(u=>c.add(u).catch(()=>{})));
 }catch(e){}
}
self.addEventListener('install',e=>{e.waitUntil(precache().then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
const put=(r,x)=>{if(x&&x.ok&&!x.redirected&&!new URL(x.url).pathname.startsWith('/login')){const c=x.clone();caches.open(V).then(h=>h.put(r,c))}return x};
self.addEventListener('fetch',e=>{
 const r=e.request;if(r.method!=='GET')return;
 const u=new URL(r.url);
 if(u.origin!==location.origin||u.pathname.startsWith('/api/')||u.pathname==='/login'||u.pathname==='/logout'||u.pathname.startsWith('/s/'))return;
 if(u.pathname.includes('/vendor/')||u.pathname.includes('/icons/')){
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(x=>put(r,x))));return}
 e.respondWith(fetch(r).then(x=>put(r,x)).catch(()=>caches.match(r).then(m=>m||(r.mode==='navigate'?caches.match('./'):undefined))));
});
