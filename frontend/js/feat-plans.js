'use strict';
/* =====================================================================
   PLANIFICATEUR DE RANGEMENT PHYSIQUE
   Complète l'arborescence textuelle « Rangement » (champ Emplacement) : ici on modélise des contenants
   (classeur, plateau, boîte, tiroir, capsules) avec des emplacements numérotés.
   Un emplacement contient une pièce principale (c.occ[n]) et, si besoin, d'autres pièces rangées dans la même case
   (c.more[n] = liste d'identifiants) : pochette partagée, capsule commune, tiroir de médaillier.
   Avant : un emplacement contient UNE pièce (un exemplaire). Une entrée de quantité 3 peut donc occuper 3 emplacements :
   la quantité d'une fiche est un nombre d'exemplaires identiques, non des exemplaires nommés un à un.
   Les déplacements sont journalisés ; les propositions d'organisation ne s'appliquent qu'après validation.
   ===================================================================== */
EXT.views.plans=()=>viewPlans();EXT.views.storage=()=>viewRangement();   // un seul écran « Rangement » (plans et arborescence)
MODULE_INFO.storage=['Rangement','Plans à emplacements numérotés (classeurs, plateaux, médailliers) et arborescence des emplacements, réunis dans un même écran.'];
const CLOOKS={grid:'Grille simple',album:'Album relié (pochettes)',medal:'Médaillier (tiroir en bois)'};
const CKINDS={classeur:'Classeur',plateau:'Plateau',boite:'Boîte',tiroir:'Tiroir',capsules:'Capsules',autre:'Autre'};
const ctrOf=id=>state.containers.find(c=>c.id===id);
const ctrSize=c=>Math.max(1,(c.pages||1)*(c.cols||1)*(c.rows||1));
/* identifiants rangés dans la case n : pièce principale puis pièces supplémentaires */
const cellIds=(c,n)=>[(c.occ||{})[n],...(((c.more||{})[n])||[])].filter(Boolean);
const cellItems=(c,n)=>cellIds(c,n).map(id=>state.items.find(i=>i.id===id)).filter(Boolean);
/* groupes {it,k} : une fiche rangée en k exemplaires dans la case */
function cellGroups(c,n){const g=new Map();cellIds(c,n).forEach(id=>{const it=itemById(id);if(!it)return;(g.get(id)||g.set(id,{it,k:0}).get(id)).k++});return[...g.values()]}
/* réécrit la case n à partir d'une liste d'identifiants (doublons = plusieurs exemplaires de la même fiche) */
function cellSet(c,n,L){
 L=L.filter(id=>itemById(id));c.occ=c.occ||{};
 if(L.length)c.occ[n]=L[0];else delete c.occ[n];
 if(L.length>1){c.more=c.more||{};c.more[n]=L.slice(1)}else if(c.more)delete c.more[n];
}
function cellAdd(c,n,id,k=1){const L=cellIds(c,n);for(let i=0;i<k;i++)L.push(id);cellSet(c,n,L)}
/* retire k exemplaires de id (all = tous) ; renvoie le nombre retiré */
function cellRemove(c,n,id,k=1,all=false){
 let L=cellIds(c,n),r=0;
 L=L.filter(x=>{if(x===id&&(all||r<k)){r++;return false}return true});cellSet(c,n,L);return r;
}
function placedMap(){ // itemId -> [{c,n}]
 const m=new Map(),ids=new Set(state.items.map(i=>i.id));
 state.containers.forEach(c=>new Set([...Object.keys(c.occ||{}),...Object.keys(c.more||{})]).forEach(n=>cellIds(c,n).forEach(id=>{if(!ids.has(id))return;(m.get(id)||m.set(id,[]).get(id)).push({c:c.id,n:+n})})));
 return m;
}
const ctrFree=c=>ctrSize(c)-Object.keys(c.occ||{}).filter(n=>+n<=ctrSize(c)&&state.items.some(i=>i.id===c.occ[n])).length;
const slotRef=(c,n)=>`${c.name}, n° ${n}`;
const itemById=id=>state.items.find(i=>i.id===id);

function viewPlans(){
 if(view.startsWith('plans:')){const c=ctrOf(view.slice(6));if(c)return viewContainer(c)}
 ui.stTab='plans';return viewRangement();
}
/* écran unique « Rangement » : plans à alvéoles d'un côté, arborescence texte de l'autre */
function viewRangement(){
 const tab=ui.stTab||'plans';
 return `<header class="head"><div><h1>Rangement</h1><p class="sub">Où est quoi : représentez vos classeurs, plateaux et médailliers emplacement par emplacement, ou décrivez simplement un chemin de texte. Ranger une pièce dans un plan renseigne aussi son champ Emplacement.</p></div></header>
 <div class="seg" style="margin-bottom:14px"><button class="${tab==='plans'?'on':''}" data-act="stTab" data-t="plans">${ic('slots',15)} Plans à emplacements</button><button class="${tab==='tree'?'on':''}" data-act="stTab" data-t="tree">${ic('folder',15)} Arborescence</button></div>
 ${tab==='plans'?plansBody():viewStorage(true)}`;
}
function plansBody(){
 const cs=state.containers,pm=placedMap();
 const owned=state.items.filter(i=>i.status!=='wish'),copies=owned.reduce((n,i)=>n+qtyOf(i),0),placed=[...pm.values()].reduce((n,a)=>n+a.length,0);
 return `<p class="muted" style="margin-bottom:12px">${placed} exemplaire${placed>1?'s':''} rangé${placed>1?'s':''} sur ${copies} (${copies-placed>0?copies-placed+' sans emplacement':'tout est rangé'}).</p>
 <div class="actions" style="margin-bottom:14px"><button class="btn primary" data-act="ctrNew">${ic('plus')} Nouveau contenant</button><button class="btn" data-act="ctrFromSeries">${ic('album',16)} Album d’une série…</button>${cs.length?`<button class="btn" data-act="ctrSyncAll" title="Écrit « Classeur > Page > n° » dans le champ Emplacement des fiches rangées">${ic('refresh',16)} Synchroniser les emplacements</button>`:''}</div>
 ${cs.length?`<label class="search" style="margin-bottom:16px">${ic('search')}<input id="plq" placeholder="Où est… ? (nom d’une pièce) — ou numéro d’emplacement, ex. « 14 »" autocomplete="off"></label><div id="plres"></div>
 <div class="modgrid">${cs.map(c=>{const n=ctrSize(c),f=ctrFree(c);return `<button class="mcard glass" data-act="nav" data-v="plans:${c.id}"><h3>${ic('slots',18)} ${esc(c.name)}</h3><span class="meta">${CKINDS[c.kind]||'Contenant'} · ${n} emplacements${c.pages>1?` (${c.pages} pages)`:''}</span><div class="pbar"><i style="width:${(n-f)/n*100}%"></i></div><span class="meta">${n-f} occupés · ${f} libres</span></button>`}).join('')}</div>
 <div class="actions" style="margin-top:18px"><button class="btn" data-act="planPropose">${ic('refresh',16)} Proposer une organisation…</button></div>`
 :`<div class="empty glass"><b>Aucun contenant</b><p>Créez par exemple « Classeur bleu » (8 pages de 20 emplacements) ou « Plateau euros ».</p><button class="btn primary" data-act="ctrNew">${ic('plus')} Créer un contenant</button></div>`}`;
}
function afterPlans(){const q=$('#plq');if(q)q.addEventListener('input',()=>planSearch(q.value))}
EXT.after.plans=afterPlans;EXT.after.storage=afterPlans;
function planSearch(q){
 const el=$('#plres');if(!el)return;q=q.trim();if(!q){el.innerHTML='';return}
 const pm=placedMap(),out=[];
 if(/^\d+$/.test(q)){ // emplacement -> pièce
  state.containers.forEach(c=>{const its=cellItems(c,q),it=its[0];out.push(it?`<div class="exrow"><span class="mini">${thumb(it,18)}</span><span><b>${esc(cellGroups(c,q).map(g=>(g.k>1?g.k+'× ':'')+g.it.denomination).join(' + '))}</b> <span class="muted small">${esc(subtitle(it))}</span><br><span class="muted small">${esc(slotRef(c,q))}</span></span><button class="btn sm" data-act="open" data-id="${it.id}">Fiche</button></div>`:(+q<=ctrSize(c)?`<div class="exrow"><span></span><span class="muted">${esc(slotRef(c,q))} — libre</span><span></span></div>`:''))});
 }else{ // pièce -> emplacement
  const f=compileQuery(q);
  state.items.filter(i=>i.status!=='wish'&&f(i)).slice(0,25).forEach(it=>{const pl_=pm.get(it.id)||[];
   out.push(`<div class="exrow"><span class="mini">${thumb(it,18)}</span><span><b>${esc(it.denomination)}</b> <span class="muted small">${esc(subtitle(it))}</span><br><span class="muted small">${pl_.length?pl_.map(x=>esc(slotRef(ctrOf(x.c),x.n))).join(' · '):'pas d’emplacement dans un plan'}${it.storage?' · texte : '+esc(normPath(it.storage)):''}</span></span><button class="btn sm" data-act="open" data-id="${it.id}">Fiche</button></div>`)});
 }
 el.innerHTML=`<div class="panel glass" style="margin-bottom:16px">${out.join('')||'<span class="muted">Aucun résultat.</span>'}</div>`;
}
function viewContainer(c){
 const n=ctrSize(c),per=(c.cols||1)*(c.rows||1),pages=c.pages||1,pm=placedMap(),hl=ui.planHit||'';
 const cell=k=>{const its=cellItems(c,k),it=its[0],lab=ctrLabel(c,k);
  return `<button class="cell ${it?'occ':''} ${lab&&!it?'ghost':''} ${hl&&its.some(x=>x.id===hl)?'hit':''}" data-act="cellOpen" data-c="${c.id}" data-n="${k}" title="${esc(it?cellGroups(c,k).map(g=>(g.k>1?g.k+'× ':'')+g.it.denomination).join(' + ')+' — n° '+k:(lab?'Manquante : '+lab+' — n° '+k:'Libre — n° '+k))}">${it&&it.cover?`<img src="${esc(it.cover)}" alt="">`:it?ic(it.type==='note'?'note':'coin',14):''}<span class="${it&&it.cover?'n':''}">${k}</span>${its.length>1?`<b class="mc">${its.length}</b>`:''}${lab?`<em class="clab">${esc(lab)}</em>`:''}</button>`};
 const grids=[...Array(pages)].map((_,p)=>`<div class="cpage">${pages>1?`<h4>Page ${p+1}</h4>`:''}<div class="cgrid" style="grid-template-columns:repeat(${c.cols||1},minmax(0,${c.cols>14?32:(c.look&&c.look!=='grid'?66:54)}px))">${[...Array(per)].map((_,j)=>cell(p*per+j+1)).join('')}</div></div>`).join('');
 const hist=state.events.filter(e=>['place','free','move'].includes(e.kind)&&((e.snap.to&&e.snap.to.c===c.id)||(e.snap.from&&e.snap.from.c===c.id))).slice(-12).reverse();
 return `<header class="head"><div><p class="muted small"><button class="btn sm" data-act="nav" data-v="plans">← Plans</button> ${CKINDS[c.kind]||''}</p><h1>${esc(c.name)}</h1><p class="sub">${n-ctrFree(c)} occupés · ${ctrFree(c)} libres sur ${n}${c.series&&serOf(c.series)?` · cases de la série « ${esc(serOf(c.series).name)} »`:''}</p></div>
 <div class="actions"><button class="btn" data-act="ctrPrint" data-id="${c.id}">${ic('print',16)} Imprimer le plan</button><button class="btn" data-act="ctrEdit" data-id="${c.id}">${ic('edit',16)} Modifier</button><button class="btn danger" data-act="ctrDel" data-id="${c.id}">${ic('trash',16)}</button></div></header>
 <div class="panel glass cview look-${c.look||'grid'}">${grids}</div>${c.series&&serOf(c.series)&&serOf(c.series).slots.length>n?`<p class="muted small" style="margin-top:8px">${ic('warn',14)} La série « ${esc(serOf(c.series).name)} » compte ${serOf(c.series).slots.length} cases pour ${n} emplacements : agrandissez le contenant pour les voir toutes.</p>`:''}
 <p class="muted small" style="margin-top:8px">Cliquez un emplacement libre pour y ranger une pièce. Sur un emplacement occupé, vous pouvez déplacer ou retirer une pièce, ou en ajouter d’autres dans la même case (pastille numérotée).</p>
 ${hist.length?`<section class="panel glass" style="margin-top:16px"><h3>Derniers mouvements</h3>${hist.map(e=>`<div class="dl-row"><span class="muted small">${esc(dateFR(e.t))}</span><span>${esc(e.snap.name||'')} — ${e.kind==='free'?`retirée de n° ${e.snap.from.n}`:e.kind==='place'?`rangée en n° ${e.snap.to.n}`:`n° ${e.snap.from.n} → ${e.snap.to.c===c.id?'n° '+e.snap.to.n:esc((ctrOf(e.snap.to.c)||{}).name||'?')+' n° '+e.snap.to.n}`}</span><span></span></div>`).join('')}</section>`:''}`;
}
/* ---------- contenants ---------- */
function ctrForm(c){
 const k=c?c.kind:'classeur';
 promptModal(c?'Modifier le contenant':'Nouveau contenant',`<div class="fgrid"><div class="fld wide"><label>Nom</label><input id="ct_n" required value="${esc(c?c.name:'')}" placeholder="Classeur bleu, Plateau euros…"></div>
 <div class="fld"><label>Type</label><select id="ct_k">${opt(Object.entries(CKINDS),k)}</select></div>
 <div class="fld"><label>Aspect</label><select id="ct_l">${opt(Object.entries(CLOOKS),c&&c.look||'grid')}</select></div>
 <div class="fld"><label>Cases d’une série (facultatif)</label><select id="ct_s"><option value="">Emplacements libres</option>${opt(state.series.filter(x=>x.mode!=='rule').map(x=>[x.id,x.name]),c&&c.series||'')}</select></div>
 <div class="fld"><label>Pages / plateaux</label><input id="ct_p" type="number" min="1" max="60" value="${c?c.pages||1:1}"></div>
 <div class="fld"><label>Colonnes</label><input id="ct_c" type="number" min="1" max="30" value="${c?c.cols:5}"></div>
 <div class="fld"><label>Lignes par page</label><input id="ct_r" type="number" min="1" max="30" value="${c?c.rows:4}"></div></div>
 <p class="muted small">Total = pages × colonnes × lignes. Réduire la taille d’un contenant libère seulement les emplacements supprimés si ils sont vides.</p>`,'ctrOk','Enregistrer',c?`data-id="${c.id}"`:'');
}
SUBMIT.ctrOk=f=>{
 const d={name:$('#ct_n').value.trim(),kind:$('#ct_k').value,look:$('#ct_l').value,series:$('#ct_s').value||undefined,pages:Math.max(1,+$('#ct_p').value||1),cols:Math.max(1,+$('#ct_c').value||1),rows:Math.max(1,+$('#ct_r').value||1)};if(!d.name)return;
 let c=f.dataset.id?ctrOf(f.dataset.id):null;
 if(d.series){const ns=(serOf(d.series)||{slots:[]}).slots.length;if(ns>d.pages*d.cols*d.rows)d.pages=Math.ceil(ns/(d.cols*d.rows))}   // assez de pages pour toutes les cases de la série
 if(c){const old=c.occ||{},nn=d.pages*d.cols*d.rows,lost=[...Object.keys(old),...Object.keys(c.more||{})].filter(k=>+k>nn);if(lost.length){toast('Des emplacements occupés seraient supprimés : libérez-les d’abord');return}Object.assign(c,d)}
 else{c={id:uid(),occ:{},...d};state.containers.push(c)}
 savePrefs();closeModal();go('plans:'+c.id);
};
/* ---------- cellule ---------- */
function unplacedItems(){const pm=placedMap();return state.items.filter(i=>i.status!=='wish'&&(pm.get(i.id)||[]).length<qtyOf(i))}
function placeLog(kind,it,from,to){logEvent(kind,it.id,{name:it.denomination,from,to})}
Object.assign(ACT,{
 ctrNew:()=>ctrForm(null),ctrEdit:t=>ctrForm(ctrOf(t.dataset.id)),
 ctrDel:t=>{const c=ctrOf(t.dataset.id);if(!c||!confirm(`Supprimer le contenant « ${c.name} » ? Les pièces ne sont pas supprimées, seulement leur emplacement.`))return;state.containers=state.containers.filter(x=>x!==c);savePrefs();go('plans')},
 cellOpen:t=>{
  const c=ctrOf(t.dataset.c),n=+t.dataset.n,its=cellItems(c,n);
  if(!its.length){ // libre : choisir une pièce
   PICK.c=c.id;PICK.n=n;PICK.q='';
   openModal(`<div class="mhead"><h2>Ranger en ${esc(slotRef(c,n))}</h2><button class="x" data-act="close" aria-label="Fermer">${ic('x',22)}</button></div><label class="search" style="margin-bottom:10px">${ic('search')}<input id="pick_q" placeholder="Pièces sans emplacement complet…" autocomplete="off"></label><div id="pick_l" class="rows glass"></div>`);
   drawPick();$('#pick_q').addEventListener('input',e=>{PICK.q=e.target.value;drawPick()});return;
  }
  const gs=cellGroups(c,n);
  openModal(`<div class="mhead"><div><h2>${esc(slotRef(c,n))}</h2><p class="muted">${pl(its.length,'exemplaire rangé','exemplaires rangés')} dans cette case</p></div><button class="x" data-act="close" aria-label="Fermer">${ic('x',22)}</button></div>
  <div class="rows glass" style="margin-bottom:12px">${gs.map(({it,k})=>`<div class="exrow"><span class="mini">${thumb(it,18)}</span><span><b>${k>1?k+' × ':''}${esc(it.denomination)}</b> <span class="muted small">${esc(subtitle(it))}</span></span><span class="actions"><button class="btn sm" data-act="open" data-id="${it.id}">Fiche</button>${k>1?`<button class="btn sm" data-act="cellFree" data-c="${c.id}" data-n="${n}" data-id="${it.id}" data-k="1" title="Retirer un seul exemplaire">−1</button>`:''}<button class="btn sm" data-act="cellFree" data-c="${c.id}" data-n="${n}" data-id="${it.id}" data-all="1">${k>1?'Tout retirer':'Retirer'}</button></span></div>`).join('')}</div>
  <div class="actions" style="margin-bottom:14px"><button class="btn" data-act="cellAddMore" data-c="${c.id}" data-n="${n}">${ic('plus',15)} Ajouter d’autres pièces dans cette case</button></div>
  <h3 style="font-size:.95rem;margin:0 0 6px">Déplacer</h3>
  <div class="fgrid">${gs.length>1?`<div class="fld wide"><label>Pièce à déplacer</label><select id="mv_i" data-ch="mvSel">${gs.map(g=>`<option value="${g.it.id}" data-k="${g.k}">${g.k>1?g.k+' × ':''}${esc(g.it.denomination)}</option>`).join('')}</select></div>`:`<input type="hidden" id="mv_i" value="${gs[0].it.id}">`}
  <div class="fld"><label>Quantité à déplacer</label><input id="mv_q" type="number" min="1" max="${gs[0].k}" value="${gs[0].k}"></div>
  <div class="fld"><label>Vers le contenant</label><select id="mv_c">${state.containers.map(x=>`<option value="${x.id}" ${x.id===c.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></div><div class="fld"><label>N° d’emplacement (libre ou occupé)</label><input id="mv_n" type="number" min="1" placeholder="ex. 12"></div></div>
  <div class="actions end"><button class="btn primary" data-act="cellMove" data-c="${c.id}" data-n="${n}">Déplacer</button></div>`);
 },
 cellAddMore:t=>{const c=ctrOf(t.dataset.c),n=+t.dataset.n;PICK.c=c.id;PICK.n=n;PICK.q='';
  openModal(`<div class="mhead"><h2>Ajouter dans ${esc(slotRef(c,n))}</h2><button class="x" data-act="close" aria-label="Fermer">${ic('x',22)}</button></div><p class="muted small" style="margin-bottom:8px">Déjà dans cette case : ${esc(cellGroups(c,n).map(g=>(g.k>1?g.k+'× ':'')+g.it.denomination).join(', '))}</p><label class="search" style="margin-bottom:10px">${ic('search')}<input id="pick_q" placeholder="Pièces sans emplacement complet…" autocomplete="off"></label><div id="pick_l" class="rows glass"></div>`);
  drawPick();$('#pick_q').addEventListener('input',e=>{PICK.q=e.target.value;drawPick()})},
 cellFree:t=>{const c=ctrOf(t.dataset.c),n=+t.dataset.n,id=t.dataset.id||(c.occ||{})[n],it=itemById(id);const r=cellRemove(c,n,id,+t.dataset.k||1,!!t.dataset.all||!t.dataset.k);if(it&&r)placeLog('free',it,{c:c.id,n},null);savePrefs();closeModal();render()},
 cellMove:t=>{
  const c=ctrOf(t.dataset.c),n=+t.dataset.n,id=($('#mv_i')||{}).value||(c.occ||{})[n],it=itemById(id),d=ctrOf($('#mv_c').value),m=parseInt($('#mv_n').value);
  if(!it||!d||isNaN(m)||m<1||m>ctrSize(d)){toast('Numéro invalide pour ce contenant');return}
  if(d===c&&m===n){toast('Cette pièce est déjà dans cette case');return}
  const have=cellIds(c,n).filter(x=>x===id).length,q=Math.max(1,Math.min(have,parseInt(($('#mv_q')||{}).value)||have));
  cellRemove(c,n,id,q);cellAdd(d,m,id,q);placeLog('move',it,{c:c.id,n},{c:d.id,n:m});savePrefs();closeModal();go('plans:'+d.id);
 },
 pickSlot:t=>{
  const c=ctrOf(PICK.c),it=itemById(t.dataset.id);if(!c||!it)return;
  const rem=Math.max(1,qtyOf(it)-(placedMap().get(it.id)||[]).length),row=t.closest('.row'),inp=row&&row.querySelector('.pq'),q=Math.max(1,Math.min(rem,parseInt(inp&&inp.value)||rem));
  cellAdd(c,PICK.n,it.id,q);placeLog('place',it,null,{c:c.id,n:PICK.n});savePrefs();closeModal();render();if(q>1)toast(`${q} exemplaires rangés dans ${slotRef(c,PICK.n)}`)
 },
});
const PICK={c:null,n:0,q:''};
function drawPick(){
 const el=$('#pick_l');if(!el)return;const pm=placedMap(),f=PICK.q?compileQuery(PICK.q):()=>true;
 const l=unplacedItems().filter(f).slice(0,60);
 el.innerHTML=l.map(i=>{const rem=qtyOf(i)-(pm.get(i.id)||[]).length;return `<div class="row" style="grid-template-columns:40px 1fr auto auto;cursor:default"><span class="mini">${thumb(i,18)}</span><span><b>${esc(i.denomination)}</b> <span class="muted small">${esc(subtitle(i))}</span><br><span class="muted small">${(pm.get(i.id)||[]).length}/${qtyOf(i)} rangé${qtyOf(i)>1?'s':''}</span></span>${rem>1?`<label class="muted small" style="display:flex;align-items:center;gap:4px">Qté <input class="pq" type="number" min="1" max="${rem}" value="${rem}" style="width:60px"></label>`:'<span></span>'}<button class="btn sm primary" data-act="pickSlot" data-id="${i.id}">Ranger${rem>1?' ici':''}</button></div>`}).join('')||'<p class="muted" style="padding:10px">Tout est déjà rangé (ou aucun résultat).</p>';
}
/* ---------- proposition d'organisation, à valider ---------- */
const ORG={
 country:(a,b)=>cname(a.country).localeCompare(cname(b.country),'fr')||(+a.year||0)-(+b.year||0),
 year:(a,b)=>(+a.year||1e9)-(+b.year||1e9)||cname(a.country).localeCompare(cname(b.country),'fr'),
 type:(a,b)=>String(a.type).localeCompare(b.type)||ORG.country(a,b),
 denom:(a,b)=>String(a.denomination).localeCompare(String(b.denomination),'fr',{numeric:true})||(+a.year||0)-(+b.year||0),
 series:(a,b)=>String(a.series||'~').localeCompare(String(b.series||'~'),'fr')||ORG.year(a,b)
};
const ORG_L={country:'Pays puis année',year:'Année puis pays',type:'Pièces puis billets',denom:'Dénomination',series:'Série / type'};
let PROP=null;
ACT.planPropose=()=>{
 if(!state.containers.length){toast('Créez d’abord un contenant');return}
 openModal(`<div class="mhead"><h2>Proposer une organisation</h2><button class="x" data-act="close" aria-label="Fermer">${ic('x',22)}</button></div>
 <p class="muted">Le calcul n’applique rien : vous voyez le plan proposé, puis vous validez.</p>
 <div class="fgrid"><div class="fld"><label>Contenant cible</label><select id="pr_c">${state.containers.map(c=>`<option value="${c.id}">${esc(c.name)} (${ctrFree(c)} libres)</option>`).join('')}</select></div>
 <div class="fld"><label>Classer par</label><select id="pr_k">${opt(Object.entries(ORG_L),'country')}</select></div>
 <div class="fld"><label>Portée</label><select id="pr_s"><option value="free">Seulement les pièces sans emplacement, dans les places libres</option><option value="all">Tout réorganiser dans ce contenant (vide d’abord)</option></select></div></div>
 <div class="actions end"><button class="btn primary" data-act="planCalc">Calculer</button></div><div id="pr_out"></div>`,true);
};
ACT.planCalc=()=>{
 const c=ctrOf($('#pr_c').value),k=$('#pr_k').value,sc=$('#pr_s').value;
 const pm=placedMap();let list=[];
 const items=state.items.filter(i=>i.status!=='wish');
 if(sc==='free'){items.forEach(i=>{for(let j=(pm.get(i.id)||[]).length;j<qtyOf(i);j++)list.push(i)})}
 else items.forEach(i=>{const others=(pm.get(i.id)||[]).filter(x=>x.c!==c.id).length;for(let j=others;j<qtyOf(i);j++)list.push(i)});
 list.sort(ORG[k]);
 const slots=[];for(let n=1;n<=ctrSize(c);n++)if(sc==='all'||!(c.occ||{})[n]||!itemById(c.occ[n]))slots.push(n);
 const plan=list.slice(0,slots.length).map((it,j)=>({it,n:slots[j]})),left=list.length-plan.length;
 PROP={c:c.id,plan,sc};
 $('#pr_out').innerHTML=`<h3 style="margin:14px 0 6px">${plan.length} exemplaire${plan.length>1?'s':''} à ranger${left>0?` — ${left} ne tiennent pas`:''}</h3>${sc==='all'?`<p class="notice warn">${ic('warn',16)} <span>Les ${Object.keys(c.occ||{}).length} emplacements actuels de « ${esc(c.name)} » seront vidés puis remplis selon ce plan. Chaque changement reste dans l’historique.</span></p>`:''}
 <div class="rows glass" style="max-height:300px;overflow:auto">${plan.slice(0,200).map(x=>`<div class="row" style="grid-template-columns:70px 1fr auto"><b>n° ${x.n}</b><span>${esc(x.it.denomination)} <span class="muted small">${esc(subtitle(x.it))}</span></span><span></span></div>`).join('')}</div>
 ${plan.length?`<div class="actions end"><button class="btn primary" data-act="planApply">Valider et appliquer</button></div>`:'<p class="muted">Rien à proposer.</p>'}`;
};
ACT.planApply=()=>{
 if(!PROP)return;const c=ctrOf(PROP.c);if(!c)return;
 if(PROP.sc==='all'){new Set([...Object.keys(c.occ||{}),...Object.keys(c.more||{})]).forEach(n=>cellItems(c,n).forEach(it=>placeLog('free',it,{c:c.id,n:+n},null)));c.occ={};c.more={}}
 PROP.plan.forEach(x=>{cellAdd(c,x.n,x.it.id);placeLog('place',x.it,null,{c:c.id,n:x.n})});
 PROP=null;savePrefs();closeModal();go('plans:'+c.id);toast('Organisation appliquée');
};
/* ---------- impression ---------- */
ACT.ctrPrint=t=>{
 const c=ctrOf(t.dataset.id);if(!c)return;const per=c.cols*c.rows;
 const pages=[...Array(c.pages||1)].map((_,p)=>`<section class="pp-page"><h2 style="font:600 14pt sans-serif;margin:0 0 4mm">${esc(c.name)}${c.pages>1?` — page ${p+1}/${c.pages}`:''}</h2>
  <div class="pp-grid" style="grid-template-columns:repeat(${c.cols},1fr)">${[...Array(per)].map((_,j)=>{const n=p*per+j+1,gs=cellGroups(c,n);return `<div class="pp-cell"><b>${n}</b>${gs.length?`<span>${gs.map(({it,k})=>(k>1?k+'× ':'')+esc(it.denomination)+(hasYear(it)?' '+esc(fmtYear(it.year)):'')).join('<br>')}</span>`:''}</div>`}).join('')}</div></section>`).join('');
 let el=$('#planprint');if(!el){el=document.createElement('div');el.id='planprint';el.className='planprint';document.body.appendChild(el)}
 el.innerHTML=pages;document.body.classList.add('printing-plan');
 const done=()=>{document.body.classList.remove('printing-plan');el.remove();window.removeEventListener('afterprint',done)};
 window.addEventListener('afterprint',done);setTimeout(()=>window.print(),80);
};
/* ---------- fiche : où est rangée cette pièce ? ---------- */
EXT.detail.push(it=>{
 if(it.status==='wish'||!state.containers.length||vit())return'';
 const l=placedMap().get(it.id)||[];
 return `<section class="vhist"><h3>Rangement (plans)</h3><p class="small" style="margin-top:6px">${l.length?l.map(x=>`<button class="chip acc" data-act="planGo" data-c="${x.c}" data-n="${x.n}" data-id="${it.id}">${esc(slotRef(ctrOf(x.c),x.n))}</button>`).join(' '):'<span class="muted">Aucun emplacement dans un plan.</span>'}</p></section>`;
});
ACT.planGo=t=>{closeModal();ui.planHit=t.dataset.id;go('plans:'+t.dataset.c);setTimeout(()=>{ui.planHit='';const h=$('.cell.hit');if(h)h.scrollIntoView({block:'center',behavior:'smooth'})},50)};

/* ---------- cases issues d'une série : album, médaillier ---------- */
function ctrLabel(c,k){
 const sr=c.series&&serOf(c.series),sl=sr&&sr.slots[k-1];if(!sl)return'';
 return (sl.year!==undefined&&sl.year!==null&&sl.year!==''?fmtYear(sl.year):sl.label||'')+(sl.mint?' '+sl.mint:'');
}
Object.assign(ACT,{
 stTab:t=>{ui.stTab=t.dataset.t;render()},
 ctrFromSeries:()=>{
  const l=state.series.filter(x=>x.mode!=='rule');
  if(!l.length){toast('Créez d’abord une série à cases (menu Séries)');return}
  promptModal('Album d’une série',`<div class="fgrid"><div class="fld wide"><label>Série</label><select id="cs_s">${opt(l.map(x=>[x.id,`${x.name} (${x.slots.length} cases)`]),l[0].id)}</select></div>
   <div class="fld"><label>Aspect</label><select id="cs_l">${opt(Object.entries(CLOOKS).filter(x=>x[0]!=='grid'),'album')}</select></div>
   <div class="fld"><label>Colonnes</label><input id="cs_c" type="number" min="1" max="12" value="5"></div><div class="fld"><label>Lignes par page</label><input id="cs_r" type="number" min="1" max="12" value="4"></div>
   <label class="chk wide"><input type="checkbox" id="cs_p" checked> Ranger automatiquement les pièces que je possède déjà</label></div>
   <p class="muted small">Une case est créée pour chaque millésime ou type de la série, y compris ceux qui vous manquent : ils restent en pointillés, avec leur année, jusqu’à ce que vous les trouviez.</p>`,'ctrSerOk','Créer l’album');
 },
 ctrSyncAll:()=>{const n=ctrSync();render();toast(n?`${pl(n,'fiche mise à jour','fiches mises à jour')}`:'Les emplacements sont déjà à jour')},
});
SUBMIT.ctrSerOk=()=>{
 const sr=serOf($('#cs_s').value);if(!sr)return;
 const cols=Math.max(1,+$('#cs_c').value||5),rows=Math.max(1,+$('#cs_r').value||4),per=cols*rows;
 const c={id:uid(),name:sr.name,kind:'classeur',look:$('#cs_l').value,series:sr.id,cols,rows,pages:Math.max(1,Math.ceil(sr.slots.length/per)),occ:{}};
 if($('#cs_p').checked){
  const used=new Set();
  sr.slots.forEach((sl,i)=>{const it=state.items.find(x=>!used.has(x.id)&&slotMatches(sl,x));if(it){used.add(it.id);c.occ[i+1]=it.id;placeLog('place',it,null,{c:c.id,n:i+1})}});
 }
 state.containers.push(c);ctrSync();savePrefs();closeModal();go('plans:'+c.id);
 toast(`${pl(Object.keys(c.occ).length,'pièce rangée','pièces rangées')} sur ${sr.slots.length} cases`);
};

/* ---------- le plan renseigne le champ « Emplacement » (une seule vérité pour l'utilisateur) ---------- */
const ctrPath=(c,n)=>{const per=(c.cols||1)*(c.rows||1),p=Math.ceil(n/per);return[c.name,(c.pages||1)>1?`Page ${p}`:null,`n° ${n}`].filter(Boolean).join(' > ')};
function ctrSync(){
 const pm=placedMap(),ch=[];
 state.items.forEach(it=>{
  if(it.status==='wish')return;
  const at=pm.get(it.id)||[];
  if(at.length){
   const c=ctrOf(at[0].c),path=ctrPath(c,at[0].n);
   if((!it.storage||it.storageAuto)&&(it.storage!==path||!it.storageAuto))ch.push({...it,storage:path,storageAuto:true,updated:Date.now()});
  }else if(it.storageAuto){const o={...it,storage:'',updated:Date.now()};delete o.storageAuto;ch.push(o)}
 });
 if(ch.length)putItems(ch);
 return ch.length;
}
['cellFree','cellMove','pickSlot','planApply','ctrDel'].forEach(k=>{const f=ACT[k];if(f)ACT[k]=function(){const r=f.apply(this,arguments);if(ctrSync())render();return r}});
/* une modification manuelle du texte d'emplacement reprend la main sur la valeur automatique */
EXT.beforeSave.push(it=>{if(!it.storageAuto)return;const o=state.items.find(x=>x.id===it.id);if(!o||o.storage!==it.storage)delete it.storageAuto});

CH.mvSel=t=>{const o=t.selectedOptions[0],q=$('#mv_q');if(o&&q){q.max=o.dataset.k;q.value=o.dataset.k}};
