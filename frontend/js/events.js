'use strict';
/* =====================================================================
   JOURNAL DES OPÉRATIONS
   Chaque ajout, modification (de champs suivis) ou suppression d'une fiche écrit un événement
   horodaté contenant un instantané des champs utiles. Il alimente la « machine à remonter le temps ».

   Principe d'honnêteté : l'historique commence à la première ouverture après la mise en place du
   journal. Les fiches déjà présentes à ce moment reçoivent un événement « de départ » (_base) daté
   de ce jour ; on n'invente jamais un passé que l'on ne connaît pas.
   ===================================================================== */
const TRACKED=['denomination','country','year','type','status','qty','value','paid','rarity','storage','mint','metal','weight','acquired','cats','fav','variety'];
function snapOf(it){const s={};TRACKED.forEach(k=>{const v=it[k];if(v===undefined||v===null||v===''||v===false||(Array.isArray(v)&&!v.length)||(v&&typeof v==='object'&&!Array.isArray(v)&&!Object.keys(v).length))return;s[k]=Array.isArray(v)||typeof v==='object'?clone(v):v});return s}
const snapKey=s=>JSON.stringify(Object.keys(s).sort().map(k=>[k,s[k]]));
let EV_LAST=new Map();       // id -> clé de l'instantané déjà journalisé
let EV_QUEUE=[];             // événements en attente d'écriture
async function primeEvents(uid){
 let list=[];try{list=await Store.events.list(uid)}catch(e){console.warn('journal indisponible',e)}
 state.events=list;EV_LAST=new Map();EV_QUEUE=[];
 const present=new Set();
 for(const e of list){if(e.kind==='put'){EV_LAST.set(e.id,snapKey(e.snap));present.add(e.id)}else if(e.kind==='del'){EV_LAST.delete(e.id);present.delete(e.id)}}
 // fiches sans événement (profil existant, import…) : événement de départ daté d'aujourd'hui
 const t=Date.now(),base=[];
 for(const it of state.items){if(present.has(it.id))continue;const s=snapOf(it);s._base=true;base.push({t,kind:'put',id:it.id,snap:s});EV_LAST.set(it.id,snapKey(snapOf(it)))}
 // les fiches déjà journalisées dont l'état a changé hors application sont rattrapées par le prochain recordPut
 if(base.length){state.events.push(...base);await flushEvents(base)}
}
function pushEvents(evs){if(!evs.length)return;state.events.push(...evs);flushEvents(evs)}
async function flushEvents(evs){try{await Store.events.bulkAdd(state.userId,evs)}catch(e){console.warn('journal : écriture impossible',e)}}
function recordPut(list){
 const t=Date.now(),evs=[];
 for(const it of list){const s=snapOf(it),k=snapKey(s);if(EV_LAST.get(it.id)===k)continue;EV_LAST.set(it.id,k);evs.push({t,kind:'put',id:it.id,snap:s})}
 pushEvents(evs);
}
function recordDel(items){
 const t=Date.now(),evs=items.map(it=>{EV_LAST.delete(it.id);return{t,kind:'del',id:it.id,snap:snapOf(it)}});
 pushEvents(evs);
}
/* état de la collection à l'instant T (ms) : id -> instantané. Ignore ce qui précède le début du journal. */
const historyStart=()=>state.events.length?state.events[0].t:null;
function stateAt(T){
 const m=new Map();
 for(const e of state.events){if(e.t>T)break;if(e.kind==='put')m.set(e.id,e.snap);else if(e.kind==='del')m.delete(e.id)}
 return m;
}

/* événement libre (ex. déplacement dans un classeur) : conservé dans le journal, ignoré par stateAt */
const logEvent=(kind,id,data)=>pushEvents([{t:Date.now(),kind,id,snap:data||{}}]);
