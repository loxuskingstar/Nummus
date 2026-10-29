'use strict';
/* ---------- préférences & état ---------- */
/* listes d'objets (à identifiant) stockées avec les préférences du profil, donc exportées et fusionnées avec elles */
const LIST_PREFS=['series','containers','expos','journal','mints','goals'];
function mergeById(cur,inc){['folders','catalogs',...LIST_PREFS].forEach(k=>(inc[k]||[]).forEach(x=>{if(!(cur[k]=cur[k]||[]).some(y=>y.id===x.id))cur[k].push(x)}))}
const DEFAULT_PREFS=()=>({
 fieldPrefs:{},customFields:[],folders:[],catalogs:[],
 ...Object.fromEntries(LIST_PREFS.map(k=>[k,[]])),views:{},dismissed:{},
 modules:{catalogs:true,wishlist:true,atlas:true,timeline:true,stats:true,doubles:true,storage:true,tools:true},
 settings:{theme:'dark',accent:'#2f8a78',currency:'€',currencyCode:'EUR',view:'grid',glass:true,ambient:true,blur:14,contrast:false,owner:'',
  wishBudget:'',journalAcq:false,daily:{mode:'random'},anomaly:{weight:3,diameter:2},
  prices:{gold:'',silver:'',platinum:'',palladium:''},
  numista:{key:'',baseUrl:CONFIG.numista.baseUrl},
  backup:{intervalDays:CONFIG.backupIntervalDays,last:null,since:null,snoozeUntil:null},
  vitrine:{active:false,scope:'all',hideValues:false,pin:'',pinHash:'',pinSalt:''},webdav:{url:'',user:'',pass:'',last:null}}
});
function normalizePrefs(p){
 const d=DEFAULT_PREFS();p=p||{};const ps=p.settings||{};
 const s=Object.assign(d.settings,ps);
 ['prices','numista','backup','vitrine','webdav','daily','anomaly'].forEach(k=>s[k]=Object.assign(DEFAULT_PREFS().settings[k],ps[k]||{}));
 return{fieldPrefs:p.fieldPrefs||{},customFields:p.customFields||[],folders:p.folders||[],catalogs:p.catalogs||[],
  ...Object.fromEntries(LIST_PREFS.map(k=>[k,Array.isArray(p[k])?p[k]:[]])),views:p.views||{},dismissed:p.dismissed||{},
  modules:Object.assign(d.modules,p.modules||{}),settings:s};
}
let state=null;
const session={users:[]};
const prefsOf=()=>({fieldPrefs:state.fieldPrefs,customFields:state.customFields,folders:state.folders,catalogs:state.catalogs,...Object.fromEntries(LIST_PREFS.map(k=>[k,state[k]])),views:state.views,dismissed:state.dismissed,modules:state.modules,settings:state.settings});
function fail(e){console.error(e);if(persistent){persistent=false;toast('Sauvegarde impossible : les données ne seront pas conservées');const f=$('#pstate');if(f)f.textContent='Mode temporaire'}}
let prefsDirty=false;
function savePrefsNow(){prefsDirty=false;mirrorUI();return Store.meta.put(state.userId,'prefs',prefsOf()).catch(fail)}
const savePrefsLater=debounce(()=>{if(prefsDirty)savePrefsNow()},250);
function savePrefs(){prefsDirty=true;mirrorUI();savePrefsLater()}
addEventListener('pagehide',()=>{if(prefsDirty)savePrefsNow()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&prefsDirty)savePrefsNow()});
function putItems(list){
 list.forEach(it=>{const i=state.items.findIndex(x=>x.id===it.id);if(i>=0)state.items[i]=it;else state.items.unshift(it)});
 recordPut(list);
 return Store.items.bulkPut(state.userId,list).catch(fail);
}
function removeItems(ids){const s=new Set(ids);recordDel(state.items.filter(i=>s.has(i.id)));const im=state.items.filter(i=>s.has(i.id)).flatMap(i=>(i.imgs||[]).map(m=>m.id));state.items=state.items.filter(i=>!s.has(i.id));ids.forEach(id=>ui.picked.delete(id));im.forEach(forgetImg);return Promise.all([Store.items.bulkDelete(state.userId,[...s]),im.length?Store.images.bulkDelete(state.userId,im):0]).catch(fail)}
function mirrorUI(){const s=state.settings;lsSet('nummus.ui',{theme:s.theme,accent:s.accent,glass:s.glass,ambient:s.ambient,blur:s.blur,contrast:s.contrast})}
async function loadUser(id){
 if(state&&prefsDirty)await savePrefsNow();
 const[items,prefs]=await Promise.all([Store.items.list(id).catch(()=>[]),Store.meta.get(id,'prefs').catch(()=>undefined)]);
 const raw=items.map(sanitizeItem),chg=[];
 for(const it of raw){try{if(await normalizeItemImages(id,it))chg.push(it)}catch(e){console.warn('migration images',e)}}
 if(chg.length)await Store.items.bulkPut(id,chg).catch(fail);
 state={userId:id,items:raw.sort((a,b)=>(b.created||0)-(a.created||0)),...normalizePrefs(prefs)};
 await primeEvents(id);
 if(!state.settings.backup.since){state.settings.backup.since=Date.now();savePrefs()}
 lsSet('nummus.user',id);mirrorUI();
}
const userName=()=>((session.users||[]).find(u=>u.id===state.userId)||{}).name||'Ma collection';

/* ---------- champs : accès ---------- */
function getFields(){
 const p=state.fieldPrefs;
 return BUILTIN.map(f=>{const o=p[f.key]||{};return{...f,label:o.label||f.label,enabled:f.core?true:o.enabled!==false,private:o.private!==undefined?!!o.private:!!f.private}})
  .concat(state.customFields.map(f=>({...f,group:'Champs personnalisés',custom:true,enabled:f.enabled!==false,private:!!f.private})));
}
const applies=(f,it)=>(!f.applies||f.applies==='both'||f.applies===it.type)&&(!f.scope||f.scope===(it.status==='wish'?'wish':'owned'));
const vit=()=>!!(state&&state.settings.vitrine.active);
const hideVals=()=>vit()&&state.settings.vitrine.hideValues;
const visibleFields=(it,display)=>getFields().filter(f=>f.enabled&&applies(f,it)&&!(display&&vit()&&(f.private||(hideVals()&&f.type==='money'))));
const privateKeys=()=>new Set(getFields().filter(f=>f.private).map(f=>f.key));
function pool(){let l=state.items;if(vit()){const pub=state.settings.vitrine.scope==='public';l=l.filter(i=>i.status!=='wish'&&(!pub||i.public))}return l}
const lists={
 issuers:()=>uniq([...ISSUERS,...state.items.map(i=>i.issuer)]),
 metals:()=>uniq([...METALS,...state.items.map(i=>i.metal)]),
 grades:()=>uniq([...GRADES,...state.items.map(i=>i.grade)]),
 storages:()=>{const s=new Set();state.items.forEach(i=>{const p=normPath(i.storage);if(!p)return;const parts=p.split(' > ');parts.forEach((_,n)=>s.add(parts.slice(0,n+1).join(' > ')))});return[...s].sort((a,b)=>a.localeCompare(b,'fr',{numeric:true}))},
 materials:()=>['Papier','Coton','Polymère','Papier / fibres mixtes'],
 tags:()=>uniq(state.items.flatMap(tagsOf)).sort((a,b)=>a.localeCompare(b,'fr')),
 currencies:()=>uniq(['EUR','USD','GBP','JPY','CHF','CAD','AUD','CNY','SEK','NOK','DKK','PLN','CZK','HUF','TRY','INR','MXN','BRL','ZAR',state.settings.currencyCode,...state.items.map(i=>i.paidCur)])
};
const catName=id=>(state.catalogs.find(c=>c.id===id)||{}).name||'';
const catsOf=i=>(i.cats||[]).filter(id=>state.catalogs.some(c=>c.id===id));
const datalists=keys=>keys.map(k=>`<datalist id="dl_${k}">${lists[k]().map(x=>`<option value="${esc(x)}">`).join('')}</datalist>`).join('');
const fmtMoney=n=>(isEmpty(n)||isNaN(+n))?'—':new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(+n)+'\u00a0'+state.settings.currency;
const qtyOf=i=>+i.qty||1;
function searchText(i){
 const priv=vit()?privateKeys():null;
 return norm(Object.entries(i).filter(([k,v])=>typeof v==='string'&&!IMG_KEYS.has(k)&&k!=='id'&&!(priv&&priv.has(k))).map(e=>e[1]).join(' ')+' '+cname(i.country)+' '+(i.year??'')+' '+(i.cats||[]).map(catName).join(' '));
}
