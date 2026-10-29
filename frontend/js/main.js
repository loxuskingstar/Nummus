'use strict';
/* ---------- PWA : service worker (nécessite http(s) ou localhost) ---------- */
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}))}

/* ---------- démarrage ---------- */
(async function init(){
 if(CONFIG.storage==='rest'){Store=RestAdapter(CONFIG.api.baseUrl);try{await Store.ready()}catch(e){toast('Serveur injoignable : mode local temporaire');Store=null}}
 if(!Store){try{await IdbAdapter.ready();Store=IdbAdapter}catch(e){console.warn(e);Store=MemoryAdapter();persistent=false}}
 let users=await Store.users.list().catch(()=>[]);
 if(!users.length){const u={id:'local',name:'Ma collection',created:Date.now()};await Store.users.put(u).catch(fail);users=[u]}
 session.users=users;
 let id=lsGet('nummus.user',null);if(!users.some(u=>u.id===id))id=users[0].id;
 await loadUser(id);
 render();
 setInterval(checkBackup,36e5);
})();
