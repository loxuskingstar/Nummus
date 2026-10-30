'use strict';
/* =====================================================================
   COUCHE DE DONNÉES (Store)
   Interface commune, toutes les méthodes sont asynchrones :
     ready()
     users.list() · users.put(user) · users.delete(uid)
     items.list(uid) · items.get(uid,id) · items.put(uid,item)
     items.bulkPut(uid,items) · items.delete(uid,id) · items.bulkDelete(uid,ids)
     items.clear(uid) · items.search(uid,query)
     events.list(uid) · events.bulkAdd(uid,events) · events.clear(uid)   (journal des opérations)
     meta.get(uid,key) · meta.put(uid,key,value)
   ===================================================================== */
const reqP=r=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const txDone=t=>new Promise((res,rej)=>{t.oncomplete=()=>res();t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error||new Error('abort'))});
const stripUser=o=>{if(!o)return o;const{userId,...r}=o;return r};

function makeIdb(DBN){
 let dbp=null;
 const open=()=>dbp||(dbp=new Promise((res,rej)=>{
  if(!window.indexedDB)return rej(new Error('IndexedDB indisponible'));
  const r=indexedDB.open(DBN,5);
  r.onupgradeneeded=e=>{
   const db=r.result,tx=r.transaction;
   if(!db.objectStoreNames.contains('items')){const s=db.createObjectStore('items',{keyPath:['userId','id']});s.createIndex('byUser','userId')}
   if(!db.objectStoreNames.contains('meta'))db.createObjectStore('meta',{keyPath:['userId','key']});
   if(!db.objectStoreNames.contains('users'))db.createObjectStore('users',{keyPath:'id'});
   if(!db.objectStoreNames.contains('images'))db.createObjectStore('images',{keyPath:['userId','id']});
   if(!db.objectStoreNames.contains('queue'))db.createObjectStore('queue',{keyPath:'seq',autoIncrement:true});
   if(!db.objectStoreNames.contains('events')){const s=db.createObjectStore('events',{keyPath:'seq',autoIncrement:true});s.createIndex('byUser','userId')}
   /* migration depuis le prototype v1 (clé unique "state" dans le store "kv") */
   if(e.oldVersion===1&&db.objectStoreNames.contains('kv')){
    tx.objectStore('kv').get('state').onsuccess=ev=>{
     const old=ev.target.result;if(!old)return;const id='local';
     tx.objectStore('users').put({id,name:'Ma collection',created:Date.now()});
     (old.items||[]).forEach(it=>tx.objectStore('items').put({...it,userId:id}));
     tx.objectStore('meta').put({userId:id,key:'prefs',value:{settings:old.settings,modules:old.modules,fieldPrefs:old.fieldPrefs,customFields:old.customFields}});
    };
   }
  };
  r.onsuccess=()=>res(r.result);r.onerror=()=>{dbp=null;rej(r.error)};r.onblocked=()=>rej(new Error('Base bloquée par un autre onglet'));
 }));
 const store=async(name,mode='readonly')=>{const db=await open();const t=db.transaction(name,mode);return[t,t.objectStore(name)]};
 const items={
  async list(uid){const[,s]=await store('items');return(await reqP(s.index('byUser').getAll(uid))).map(stripUser)},
  async get(uid,id){const[,s]=await store('items');return stripUser(await reqP(s.get([uid,id])))},
  async put(uid,it){return items.bulkPut(uid,[it])},
  async bulkPut(uid,list){const[t,s]=await store('items','readwrite');list.forEach(it=>s.put({...clone(it),userId:uid}));return txDone(t)},
  async delete(uid,id){return items.bulkDelete(uid,[id])},
  async bulkDelete(uid,ids){const[t,s]=await store('items','readwrite');ids.forEach(id=>s.delete([uid,id]));return txDone(t)},
  async clear(uid){const l=await items.list(uid);return items.bulkDelete(uid,l.map(i=>i.id))},
  async search(uid,q){return(await items.list(uid)).filter(i=>matchItem(i,q))}
 };
 const images={
  async get(u,id){const[,s]=await store('images');const r=await reqP(s.get([u,id]));return r&&r.blob},
  async put(u,id,blob){const[t,s]=await store('images','readwrite');s.put({userId:u,id,blob});return txDone(t)},
  async bulkDelete(u,ids){const[t,s]=await store('images','readwrite');ids.forEach(id=>s.delete([u,id]));return txDone(t)},
  async clear(u){const[t,s]=await store('images','readwrite');s.delete(IDBKeyRange.bound([u,''],[u,'\uffff']));return txDone(t)}
 };
 const events={
  async list(uid){const[,s]=await store('events');return(await reqP(s.index('byUser').getAll(uid))).sort((a,b)=>a.t-b.t||a.seq-b.seq).map(({userId,seq,...e})=>e)},
  async bulkAdd(uid,evs){const[t,s]=await store('events','readwrite');evs.forEach(e=>s.add({...clone(e),userId:uid}));return txDone(t)},
  async clear(uid){const[t,s]=await store('events','readwrite');const r=s.index('byUser').openKeyCursor(IDBKeyRange.only(uid));r.onsuccess=()=>{const c=r.result;if(c){s.delete(c.primaryKey);c.continue()}};return txDone(t)}
 };
 return{
  kind:'indexeddb',
  async ready(){await open()},
  users:{
   async list(){const[,s]=await store('users');return reqP(s.getAll())},
   async put(u){const[t,s]=await store('users','readwrite');s.put(clone(u));return txDone(t)},
   async delete(id){await items.clear(id);await images.clear(id);await events.clear(id);const db=await open();const t=db.transaction(['users','meta'],'readwrite');t.objectStore('users').delete(id);t.objectStore('meta').delete([id,'prefs']);return txDone(t)}
  },
  items,images,events,
  meta:{
   async get(uid,key){const[,s]=await store('meta');const r=await reqP(s.get([uid,key]));return r?r.value:undefined},
   async put(uid,key,value){const[t,s]=await store('meta','readwrite');s.put({userId:uid,key,value:clone(value)});return txDone(t)}
  },
  /* file d'attente des écritures faites hors ligne (utilisée par OfflineRest) */
  queue:{
   async add(e){const[t,s]=await store('queue','readwrite');s.add(e);return txDone(t)},
   async list(){const[,s]=await store('queue');return reqP(s.getAll())},
   async del(seq){const[t,s]=await store('queue','readwrite');s.delete(seq);return txDone(t)}
  },
  async destroy(){try{(await open()).close()}catch(e){}dbp=null;await new Promise(r=>{const q=indexedDB.deleteDatabase(DBN);q.onsuccess=q.onerror=q.onblocked=()=>r()})}
 };
}
const IdbAdapter=makeIdb('nummus');

function RestAdapter(base){
 const j=async(method,path,body)=>{
  const r=await fetch(base+path,{method,credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  if(!r.ok)throw new Error(`${method} ${path} : HTTP ${r.status}`);
  return r.status===204?null:r.json();
 };
 const u=id=>`/users/${encodeURIComponent(id)}`;
 const qs=q=>new URLSearchParams(Object.entries(q||{}).filter(([,v])=>!isEmpty(v)&&v!==false)).toString();
 return{
  kind:'rest',
  async ready(){await j('GET','/health')},
  users:{list:()=>j('GET','/users'),put:x=>j('PUT',u(x.id),x),delete:id=>j('DELETE',u(id))},
  items:{
   list:uid=>j('GET',u(uid)+'/items'),
   get:(uid,id)=>j('GET',`${u(uid)}/items/${encodeURIComponent(id)}`),
   put:(uid,it)=>j('PUT',`${u(uid)}/items/${encodeURIComponent(it.id)}`,it),
   bulkPut:(uid,l)=>j('POST',u(uid)+'/items/bulk',{items:l}),
   delete:(uid,id)=>j('DELETE',`${u(uid)}/items/${encodeURIComponent(id)}`),
   bulkDelete:(uid,ids)=>j('POST',u(uid)+'/items/bulk-delete',{ids}),
   clear:uid=>j('DELETE',u(uid)+'/items'),
   search:(uid,q)=>j('GET',`${u(uid)}/items?${qs(q)}`)
  },
  images:{
   async get(uid,id){const r=await fetch(`${base}${u(uid)}/images/${encodeURIComponent(id)}`,{credentials:'same-origin'});return r.ok?r.blob():undefined},
   async put(uid,id,blob){const r=await fetch(`${base}${u(uid)}/images/${encodeURIComponent(id)}`,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':blob.type||'application/octet-stream'},body:blob});if(!r.ok)throw new Error('PUT image : HTTP '+r.status)},
   bulkDelete:(uid,ids)=>j('POST',u(uid)+'/images/bulk-delete',{ids}),
   clear:uid=>j('DELETE',u(uid)+'/images')
  },
  events:{list:uid=>j('GET',u(uid)+'/events'),bulkAdd:(uid,evs)=>j('POST',u(uid)+'/events/bulk',{events:evs}),clear:uid=>j('DELETE',u(uid)+'/events')},
  meta:{get:(uid,k)=>j('GET',`${u(uid)}/meta/${k}`).then(r=>(r&&r.value!==null)?r.value:undefined).catch(()=>undefined),put:(uid,k,v)=>j('PUT',`${u(uid)}/meta/${k}`,{value:v})}
 };
}

function MemoryAdapter(){
 const users=new Map(),items=new Map(),meta=new Map(),imgs=new Map(),evs=new Map(),k=(a,b)=>a+'\u0001'+b;
 const I={
  async list(uid){return[...items.entries()].filter(([x])=>x.startsWith(uid+'\u0001')).map(e=>clone(e[1]))},
  async get(uid,id){const v=items.get(k(uid,id));return v?clone(v):undefined},
  async put(uid,it){items.set(k(uid,it.id),clone(it))},
  async bulkPut(uid,l){l.forEach(it=>items.set(k(uid,it.id),clone(it)))},
  async delete(uid,id){items.delete(k(uid,id))},
  async bulkDelete(uid,ids){ids.forEach(id=>items.delete(k(uid,id)))},
  async clear(uid){[...items.keys()].filter(x=>x.startsWith(uid+'\u0001')).forEach(x=>items.delete(x))},
  async search(uid,q){return(await I.list(uid)).filter(i=>matchItem(i,q))}
 };
 return{kind:'memory',async ready(){},
  users:{async list(){return[...users.values()].map(clone)},async put(x){users.set(x.id,clone(x))},async delete(id){users.delete(id);await I.clear(id);[...imgs.keys()].filter(x=>x.startsWith(id+'\u0001')).forEach(x=>imgs.delete(x));meta.delete(k(id,'prefs'))}},
  items:I,
  events:{async list(uid){return(evs.get(uid)||[]).map(clone)},async bulkAdd(uid,l){evs.set(uid,(evs.get(uid)||[]).concat(l.map(clone)))},async clear(uid){evs.delete(uid)}},
  images:{async get(u,id){return imgs.get(k(u,id))},async put(u,id,b){imgs.set(k(u,id),b)},async bulkDelete(u,ids){ids.forEach(id=>imgs.delete(k(u,id)))},async clear(u){[...imgs.keys()].filter(x=>x.startsWith(u+'\u0001')).forEach(x=>imgs.delete(x))}},
  meta:{async get(uid,key){const v=meta.get(k(uid,key));return v===undefined?undefined:clone(v)},async put(uid,key,v){meta.set(k(uid,key),clone(v))}}};
}

let Store=null,persistent=true;

/* ---------- images : Blob Store séparé (les fiches ne contiennent qu'une miniature « cover ») ---------- */
const IMGURL=new Map(),DRAFT=new Map(),COVER_MAX=240;
const blobToData=b=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(b)});
const dataToBlob=async d=>(await fetch(d)).blob();
const imgSync=id=>IMGURL.get(id)||'';
async function imgURL(id){
 if(IMGURL.has(id))return IMGURL.get(id);
 let b=DRAFT.get(id);if(!b){try{b=await Store.images.get(state.userId,id)}catch(e){}}
 if(!b)return'';const u=URL.createObjectURL(b);IMGURL.set(id,u);return u;
}
const preload=ids=>Promise.all(ids.map(imgURL));
function forgetImg(id){const u=IMGURL.get(id);if(u)URL.revokeObjectURL(u);IMGURL.delete(id);DRAFT.delete(id)}
async function coverOf(blob){const u=URL.createObjectURL(blob);try{const im=await loadImage(u),c=scaled(toCanvas(im,COVER_MAX*2),COVER_MAX);return coverEnc(c)}finally{URL.revokeObjectURL(u)}}
function coverEnc(c){const w=c.toDataURL('image/webp',.8);return w.startsWith('data:image/webp')?w:c.toDataURL('image/png')}
/* migre une fiche : anciennes clés front/back/frontT/backT et images embarquées (data) -> Blob Store */
async function normalizeItemImages(user,it){
 let ch=false;it.imgs=Array.isArray(it.imgs)?it.imgs:[];
 for(const m of it.imgs){if(m.data){const b=await dataToBlob(m.data);await Store.images.put(user,m.id,b);if(!it.cover&&m===it.imgs[0])it.cover=await coverOf(b).catch(()=>'');delete m.data;ch=true}}
 for(const d of Array.isArray(it.docs)?it.docs:[])if(d.data){await Store.images.put(user,d.id,await dataToBlob(d.data));delete d.data;ch=true}
 for(const[k,role]of[['front','front'],['back','back']]){
  if(!it[k])continue;const id='im_'+uid(),b=await dataToBlob(it[k]);
  await Store.images.put(user,id,b);it.imgs.push({id,role});
  if(role==='front'||!it.cover)it.cover=it[k+'T']||await coverOf(b).catch(()=>'');ch=true;
 }
 ['front','back','frontT','backT'].forEach(k=>{if(k in it){delete it[k];ch=true}});
 if(it.imgs.length&&!it.cover){const b=await Store.images.get(user,it.imgs[0].id).catch(()=>null);if(b){it.cover=await coverOf(b).catch(()=>'');ch=true}}
 return ch;
}
/* ---------- import / export (indépendant de l'adaptateur) ---------- */
const sanitizeItem=it=>{const o={...it};delete o.userId;o.id=o.id||uid();o.type=o.type==='note'?'note':'coin';o.status=o.status==='wish'?'wish':'owned';o.created=o.created||Date.now();return o};
const DataIO={
 async export(uid){
  const items=await Store.items.list(uid).catch(()=>state.items);
  const prefs=uid===state.userId?prefsOf():await Store.meta.get(uid,'prefs');
  const u=(session.users||[]).find(x=>x.id===uid)||{id:uid};
  const out=[];
  for(const it of items){if(it.deleted)continue;const o=stripUser(it);o.imgs=[];for(const m of it.imgs||[]){let data;try{const b=await Store.images.get(uid,m.id);data=b&&await blobToData(b)}catch(e){}o.imgs.push(data?{...m,data}:{...m})}o.docs=[];for(const m of it.docs||[]){let data;try{const b=await Store.images.get(uid,m.id);data=b&&await blobToData(b)}catch(e){}o.docs.push(data?{...m,data}:{...m})}out.push(o)}
  const pf=stripSecrets(prefs);
  const events=await Store.events.list(uid).catch(()=>[]);
  return{format:'nummus',schema:4,exportedAt:new Date().toISOString(),user:{id:u.id,name:u.name},items:out,prefs:pf,events};
 },
 parse(json){
  if(!json||!Array.isArray(json.items))throw new Error('format');
  if(json.schema>=2)return{items:json.items,prefs:json.prefs||{},events:Array.isArray(json.events)?json.events:[]};
  return{items:json.items,prefs:{settings:json.settings,modules:json.modules,fieldPrefs:json.fieldPrefs,customFields:json.customFields},events:[]};
 },
 async import(uid,json,mode,opts={}){
  const d=DataIO.parse(json);
  if(mode==='replace'){await Store.items.clear(uid);await Store.images.clear(uid);await Store.events.clear(uid);const np=normalizePrefs(d.prefs);if(uid===state.userId){np.settings.webdav.pass=np.settings.webdav.pass||state.settings.webdav.pass;np.settings.numista.key=np.settings.numista.key||state.settings.numista.key}await Store.meta.put(uid,'prefs',np);if(d.events.length)await Store.events.bulkAdd(uid,d.events)}
  else{
   const cur=normalizePrefs(uid===state.userId?prefsOf():await Store.meta.get(uid,'prefs')),inc=normalizePrefs(d.prefs);
   inc.customFields.forEach(f=>{if(!cur.customFields.some(x=>x.key===f.key))cur.customFields.push(f)});
   mergeById(cur,inc);
   if(d.events.length&&!(await Store.events.list(uid).catch(()=>[])).length)await Store.events.bulkAdd(uid,d.events);
   await Store.meta.put(uid,'prefs',cur);
  }
  const src=opts.skip?d.items.filter(i=>!opts.skip.has(i.id)):d.items,list=src.map(sanitizeItem);for(const it of list)await normalizeItemImages(uid,it);
  await Store.items.bulkPut(uid,list);
  return list.length;
 }
};
