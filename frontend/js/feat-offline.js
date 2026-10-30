'use strict';
/* =====================================================================
   MODE HORS LIGNE (mode serveur uniquement)
   OfflineRest enveloppe RestAdapter avec un miroir local complet (IndexedDB « nummus-mirror-<hôte> ») :
     · en ligne : lectures sur le serveur (le miroir est rafraîchi au passage), écritures sur le serveur ET dans le miroir ;
     · hors ligne (échec réseau) : lectures dans le miroir, écritures dans le miroir + file d'attente ordonnée, rejouée
       dès que le serveur répond (événement « online », puis toutes les 15 s).
   Une écriture rejetée par le serveur (4xx hors 401) est abandonnée avec un avertissement en console ; un 401 (session
   expirée) suspend la synchronisation sans rien perdre. Limite connue : pas de résolution de conflit — en cas de
   modification de la même fiche sur deux appareils, la dernière écriture rejouée l'emporte.
   Le miroir contient vos données : il est supprimé à la déconnexion depuis les réglages.
   ===================================================================== */
function OfflineRest(R,base){
 const M=makeIdb('nummus-mirror-'+location.host),st={offline:false,pending:0,authErr:false};
 const isNet=e=>e instanceof TypeError;
 let mqp=Promise.resolve();
 const mq=fn=>{const p=mqp.then(fn);mqp=p.catch(()=>{});return p};
 const txt=()=>st.authErr?'Session expirée : reconnectez-vous pour synchroniser':st.offline?`Hors ligne${st.pending?` : ${pl(st.pending,'modification en attente','modifications en attente')}`:' : données locales'}`:(st.pending?`Synchronisation en cours (${st.pending})…`:'Synchronisé avec le serveur');
 const paint=()=>{const el=document.querySelector('#pstate');if(el)el.textContent=txt()};
 const setOff=v=>{if(st.offline===v)return;st.offline=v;paint();if(typeof toast==='function')toast(v?'Hors ligne : vos modifications seront envoyées au retour de la connexion':'Connexion rétablie : synchronisation…')};
 const count=async()=>{try{st.pending=(await M.queue.list()).length}catch(e){}paint()};
 let flushing=null;
 function flush(){
  if(flushing)return flushing;
  flushing=(async()=>{
   let q;try{q=await M.queue.list()}catch(e){return}
   if(!q.length&&st.offline){try{await R.ready();setOff(false)}catch(e){}return}
   for(const e of q.sort((a,b)=>a.seq-b.seq)){
    let r;try{r=await fetch(base+e.path,{method:e.method,credentials:'same-origin',headers:e.ctype?{'Content-Type':e.ctype}:{},body:e.blob||e.body})}catch(x){setOff(true);break}
    if(r.status===401){st.authErr=true;paint();return}
    if(r.status>=500)break;
    if(!r.ok)console.warn('file hors ligne : écriture rejetée',e.method,e.path,r.status);
    await M.queue.del(e.seq);st.authErr=false;setOff(false);
   }
   await count();
  })().finally(()=>{flushing=null});
  return flushing;
 }
 addEventListener('online',()=>flush());
 setInterval(()=>{if(st.pending||st.offline)flush()},15000);
 const U=id=>`/users/${encodeURIComponent(id)}`,E=encodeURIComponent,J='application/json';
 async function read(remote,local,save){
  if(st.pending&&!st.offline)await flush();
  try{const v=await remote();if(st.offline)setOff(false);if(save)mq(()=>save(v)).catch(()=>{});return v}
  catch(e){if(!isNet(e))throw e;setOff(true);return local()}
 }
 async function write(local,remote,entry){
  await mq(local);
  if(st.offline||st.pending){await M.queue.add(entry);await count();flush();return}
  try{return await remote()}catch(e){if(!isNet(e))throw e;setOff(true);await M.queue.add(entry);await count()}
 }
 const jq=(method,path,body)=>({method,path,body:body===undefined?undefined:JSON.stringify(body),ctype:body===undefined?undefined:J});
 return{
  kind:'rest',statusText:txt,flush,wipeMirror:()=>M.destroy(),
  async ready(){
   try{await R.ready()}catch(e){if(!isNet(e))throw e;const u=await M.users.list().catch(()=>[]);if(!u.length)throw e;st.offline=true}
   count().then(()=>flush());
  },
  users:{
   list:()=>read(()=>R.users.list(),()=>M.users.list(),async l=>{const cur=await M.users.list();for(const x of cur)if(!l.some(y=>y.id===x.id))await M.users.delete(x.id);for(const x of l)await M.users.put(x)}),
   put:x=>write(()=>M.users.put(x),()=>R.users.put(x),jq('PUT',U(x.id),x)),
   delete:id=>write(()=>M.users.delete(id),()=>R.users.delete(id),jq('DELETE',U(id)))
  },
  items:{
   list:uid=>read(()=>R.items.list(uid),()=>M.items.list(uid),async l=>{await M.items.clear(uid);await M.items.bulkPut(uid,l)}),
   get:(uid,id)=>read(()=>R.items.get(uid,id),()=>M.items.get(uid,id)),
   search:(uid,q)=>read(()=>R.items.search(uid,q),()=>M.items.search(uid,q)),
   put:(uid,it)=>write(()=>M.items.put(uid,it),()=>R.items.put(uid,it),jq('PUT',`${U(uid)}/items/${E(it.id)}`,it)),
   bulkPut:(uid,l)=>write(()=>M.items.bulkPut(uid,l),()=>R.items.bulkPut(uid,l),jq('POST',U(uid)+'/items/bulk',{items:l})),
   delete:(uid,id)=>write(()=>M.items.delete(uid,id),()=>R.items.delete(uid,id),jq('DELETE',`${U(uid)}/items/${E(id)}`)),
   bulkDelete:(uid,ids)=>write(()=>M.items.bulkDelete(uid,ids),()=>R.items.bulkDelete(uid,ids),jq('POST',U(uid)+'/items/bulk-delete',{ids})),
   clear:uid=>write(()=>M.items.clear(uid),()=>R.items.clear(uid),jq('DELETE',U(uid)+'/items'))
  },
  images:{
   get:(uid,id)=>read(()=>R.images.get(uid,id),()=>M.images.get(uid,id),b=>b&&M.images.put(uid,id,b)),
   put:(uid,id,blob)=>write(()=>M.images.put(uid,id,blob),()=>R.images.put(uid,id,blob),{method:'PUT',path:`${U(uid)}/images/${E(id)}`,blob,ctype:blob.type||'application/octet-stream'}),
   bulkDelete:(uid,ids)=>write(()=>M.images.bulkDelete(uid,ids),()=>R.images.bulkDelete(uid,ids),jq('POST',U(uid)+'/images/bulk-delete',{ids})),
   clear:uid=>write(()=>M.images.clear(uid),()=>R.images.clear(uid),jq('DELETE',U(uid)+'/images'))
  },
  events:{
   list:uid=>read(()=>R.events.list(uid),()=>M.events.list(uid),async l=>{await M.events.clear(uid);if(l.length)await M.events.bulkAdd(uid,l)}),
   bulkAdd:(uid,evs)=>write(()=>M.events.bulkAdd(uid,evs),()=>R.events.bulkAdd(uid,evs),jq('POST',U(uid)+'/events/bulk',{events:evs})),
   clear:uid=>write(()=>M.events.clear(uid),()=>R.events.clear(uid),jq('DELETE',U(uid)+'/events'))
  },
  meta:{
   /* RestAdapter.meta.get avale les erreurs réseau (renvoie undefined) : on interroge donc directement pour distinguer « absent » de « hors ligne » */
   get:(uid,k)=>read(async()=>{const r=await fetch(`${base}${U(uid)}/meta/${k}`,{credentials:'same-origin'});if(!r.ok)return undefined;const j=await r.json();return(j&&j.value!==null)?j.value:undefined},()=>M.meta.get(uid,k),v=>v!==undefined&&M.meta.put(uid,k,v)),
   put:(uid,k,v)=>write(()=>M.meta.put(uid,k,v),()=>R.meta.put(uid,k,v),jq('PUT',`${U(uid)}/meta/${k}`,{value:v}))
  }
 };
}
