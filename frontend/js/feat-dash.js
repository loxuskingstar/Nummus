'use strict';
/* =====================================================================
   ACCUEIL : widgets supplémentaires et TROPHÉES
   Le moteur de disposition (ordre, masquage, glisser-déposer) est dans view-home.js ; ce fichier ajoute des widgets
   « à la demande » (masqués par défaut, à ajouter via Personnaliser) et le module Trophées.
   ===================================================================== */
Object.assign(ACT,{
 homeEdit:()=>{ui.homeEdit=!ui.homeEdit;render()},
 hwHide:t=>{const d=state.settings.dash;d.hidden=uniq([...(d.hidden||[]),t.dataset.id]);d.shown=(d.shown||[]).filter(x=>x!==t.dataset.id);hwSave()},
 hwShow:t=>{const d=state.settings.dash;d.hidden=(d.hidden||[]).filter(x=>x!==t.dataset.id);d.shown=uniq([...(d.shown||[]),t.dataset.id]);hwSave()},
 hwMove:t=>{
  const d=state.settings.dash,ids=homeLayout().map(w=>w.id),i=ids.indexOf(t.dataset.id),j=i+(+t.dataset.d);
  if(i<0||j<0||j>=ids.length)return;[ids[i],ids[j]]=[ids[j],ids[i]];d.order=ids;hwSave();
 },
 hwReset:()=>{state.settings.dash={order:[],hidden:[],shown:[]};hwSave()},
});

const hbars=rows=>{
 if(!rows.length)return'<p class="muted small">Aucune donnée.</p>';
 const mx=Math.max(...rows.map(r=>r[1]));
 return rows.map(([l,n])=>`<div class="bar"><span title="${esc(l)}">${esc(l)}</span><i><b style="width:${n/mx*100}%"></b></i><em>${n}</em></div>`).join('');
};
const miniRow=i=>`<div class="row" data-act="open" data-id="${i.id}" tabindex="0"><span class="mini">${thumb(i,16)}</span><span class="rt"><b>${esc(i.denomination)}</b><small class="muted">${esc(subtitle(i))}</small></span></div>`;
const owned=()=>pool().filter(i=>i.status!=='wish');

/* ---------- trophées ---------- */
const hasPhotos=i=>(i.imgs||[]).some(m=>m.role==='front')&&(i.imgs||[]).some(m=>m.role==='back');
const BADGES=[
 {id:'first',name:'Premier pas',icon:'coin',desc:'Une première entrée dans la collection',goal:1,val:c=>c.L.length},
 {id:'cent',name:'Centurion',icon:'layers',desc:'100 entrées',goal:100,val:c=>c.L.length},
 {id:'mille',name:'Millénaire',icon:'grid',desc:'1 000 entrées',goal:1000,val:c=>c.L.length},
 {id:'voyage',name:'Grand Voyageur',icon:'globe',desc:'50 pays représentés',goal:50,val:c=>c.countries},
 {id:'archeo',name:'Archéologue',icon:'bulb',desc:'20 monnaies antiques (frappées avant 476)',goal:20,val:c=>c.L.filter(i=>i.type==='coin'&&hasYear(i)&&+i.year<=476).length},
 {id:'medi',name:'Médiéviste',icon:'book',desc:'20 monnaies médiévales (477–1500)',goal:20,val:c=>c.L.filter(i=>i.type==='coin'&&hasYear(i)&&+i.year>476&&+i.year<=1500).length},
 {id:'midas',name:'Midas',icon:'coin',desc:'100 g d’or fin accumulés',goal:100,unit:' g',val:c=>c.mp.r.gold.g},
 {id:'argent',name:'Argentier',icon:'coin',desc:'500 g d’argent fin accumulés',goal:500,unit:' g',val:c=>c.mp.r.silver.g},
 {id:'siecles',name:'Chrononaute',icon:'clock',desc:'Des pièces de 10 siècles différents',goal:10,val:c=>new Set(c.L.filter(hasYear).map(i=>Math.ceil(+i.year/100))).size},
 {id:'ateliers',name:'Cartographe',icon:'pin',desc:'Des pièces de 15 ateliers différents',goal:15,val:c=>new Set(c.L.map(i=>norm(i.mint)).filter(Boolean)).size},
 {id:'metaux',name:'Alchimiste',icon:'refresh',desc:'5 métaux ou alliages différents',goal:5,val:c=>new Set(c.L.map(i=>norm(i.metal)).filter(Boolean)).size},
 {id:'photo',name:'Photographe',icon:'image',desc:'50 entrées avec photo d’avers et de revers',goal:50,val:c=>c.L.filter(hasPhotos).length},
 {id:'soigne',name:'Fiches soignées',icon:'edit',desc:'25 entrées complètes (photo, année, pays, poids, diamètre)',goal:25,val:c=>c.L.filter(i=>(i.imgs||[]).length&&hasYear(i)&&i.country&&+i.weight>0&&+i.diameter>0).length},
 {id:'serie',name:'Série complète',icon:'target',desc:'Compléter une série à cases à 100 %',goal:1,val:c=>state.series.filter(s=>{const p=seriesProgress(s,c.L);return!p.open&&p.total>0&&p.missing===0&&p.unid===0}).length},
 {id:'range',name:'Tout est rangé',icon:'slots',desc:'Au moins 20 entrées, toutes avec un emplacement',goal:1,val:c=>{const pm=placedMap();return c.L.length>=20&&c.L.every(i=>normPath(i.storage)||(pm.get(i.id)||[]).length)?1:0}},
];
function badgeCtx(){const L=owned();return{L,countries:new Set(L.map(i=>i.country).filter(Boolean)).size,mp:metalPortfolio(L)}}
function badgeState(){
 const c=badgeCtx();
 return BADGES.map(b=>{const v=Math.max(0,+b.val(c)||0);return{...b,v,pct:Math.min(100,v/b.goal*100),done:v>=b.goal,date:state.settings.badgeSeen[b.id]}});
}
/* enregistre la date d'obtention ; ne félicite pas pour les trophées déjà acquis à la première ouverture */
function badgeSync(){
 if(vit())return;
 const seen=state.settings.badgeSeen,first=!seen._init;let ch=false;
 badgeState().forEach(b=>{if(b.done&&!seen[b.id]){seen[b.id]=Date.now();ch=true;if(!first)toast(`Trophée obtenu : ${b.name}`)}});
 if(first){seen._init=1;ch=true}
 if(ch)savePrefs();
}
EXT.after.home=badgeSync;
addModule('badges','Trophées','trophy','Succès de collectionneur : pays représentés, métal fin, séries complétées…',{after:'stats',view:()=>viewBadges(),after_:badgeSync});
function viewBadges(){
 const l=badgeState(),n=l.filter(b=>b.done).length;
 const fmtv=b=>`${nf1(b.v)}${b.unit||''} / ${b.goal}${b.unit||''}`;
 return `<header class="head"><div><h1>Trophées</h1><p class="sub">${n} sur ${l.length} obtenus. Ces succès ne comparent rien aux autres : ils mesurent seulement l’avancement de votre propre collection.</p></div></header>
 <div class="modgrid">${l.map(b=>`<div class="mcard glass" style="${b.done?'':'opacity:.85'}"><h3>${ic(b.icon,18)} ${esc(b.name)} ${b.done?`<span class="chip acc">${ic('check',12)} obtenu</span>`:''}</h3>
  <span class="meta">${esc(b.desc)}</span><div class="pbar"><i style="width:${b.pct}%"></i></div>
  <span class="meta">${b.done?`Obtenu le ${esc(b.date?dateFR(b.date):'—')}`:esc(fmtv(b))}</span></div>`).join('')}</div>`;
}

/* ---------- widgets ---------- */
homeWidget({id:'trophies',title:'Trophées',icon:'trophy',link:()=>moreLink('badges','Tous'),when:()=>!vit(),body:()=>{
 const l=badgeState(),got=l.filter(b=>b.done),next=l.filter(b=>!b.done).sort((a,b)=>b.pct-a.pct).slice(0,2);
 return `<div class="kl muted small" style="margin-bottom:6px">${got.length} / ${l.length} obtenus</div><div class="pbar" style="margin-bottom:10px"><i style="width:${got.length/l.length*100}%"></i></div>
 ${next.map(b=>`<div class="mrow"><span>${esc(b.name)}</span><span class="muted">${esc(nf1(b.v))}${b.unit||''} / ${b.goal}</span><b>${Math.round(b.pct)} %</b></div>`).join('')||'<p class="muted small">Tous les trophées sont obtenus.</p>'}`}});
homeWidget({id:'quick',title:'Recherche éclair',icon:'bolt',when:()=>!vit(),body:()=>`<p class="muted small" style="margin-bottom:10px">En bourse, vérifiez en deux secondes si une pièce est déjà dans votre collection, en double ou dans votre wishlist.</p><button class="btn primary" data-act="quickOpen">${ic('search',16)} Vérifier une pièce</button>`});
homeWidget({id:'wishtop',title:'Wishlist prioritaire',icon:'star',off:true,link:()=>moreLink('wishlist'),when:()=>!vit(),body:()=>{
 const w=pool().filter(i=>i.status==='wish').sort((a,b)=>(+b.priority||0)-(+a.priority||0)).slice(0,5);
 return w.length?`<div class="wl">${w.map(miniRow).join('')}</div>`:'<p class="muted small">Aucun souhait.</p>'}});
homeWidget({id:'series',title:'Séries en cours',icon:'target',off:true,link:()=>moreLink('series'),when:()=>isOn('series'),body:()=>{
 const l=state.series.map(s=>({s,p:seriesProgress(s,pool())})).filter(x=>x.p.pct===null||x.p.pct<100).sort((a,b)=>(b.p.pct||0)-(a.p.pct||0)).slice(0,4);
 return l.length?l.map(({s,p})=>`<button class="mrow" style="all:unset;display:block;cursor:pointer;margin-bottom:8px;width:100%" data-act="nav" data-v="series:${s.id}"><span>${esc(s.name)}</span><div class="pbar"><i style="width:${p.pct||0}%"></i></div></button>`).join(''):'<p class="muted small">Aucune série en cours.</p>'}});
homeWidget({id:'eras',title:'Siècles représentés',icon:'clock',off:true,link:()=>moreLink('timeline'),body:()=>{
 const m={};owned().filter(hasYear).forEach(i=>{const k=century(+i.year);m[k]=m[k]||{n:0,y:+i.year};m[k].n+=qtyOf(i)});
 return hbars(Object.entries(m).sort((a,b)=>b[1].n-a[1].n).slice(0,6).map(([k,v])=>[k,v.n]))}});
homeWidget({id:'grades',title:'États de conservation',icon:'shield',off:true,body:()=>{
 const m={};owned().forEach(i=>{if(i.grade)m[i.grade]=(m[i.grade]||0)+qtyOf(i)});
 return hbars(Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,6))}});
homeWidget({id:'storage',title:'Rangement',icon:'slots',off:true,link:()=>moreLink('storage'),when:()=>!vit(),body:()=>{
 const L=owned(),pm=placedMap(),ranged=L.filter(i=>normPath(i.storage)||(pm.get(i.id)||[]).length).length;
 return `<div class="kl muted small" style="margin-bottom:6px">${ranged} / ${L.length} entrées rangées</div><div class="pbar"><i style="width:${L.length?ranged/L.length*100:0}%"></i></div>
 ${L.length-ranged?`<p class="muted small" style="margin-top:8px">${pl(L.length-ranged,'entrée','entrées')} sans emplacement. <button class="link" data-act="nav" data-v="storage">Ranger</button></p>`:''}`}});
homeWidget({id:'records',title:'Records de la collection',icon:'chart',off:true,body:H=>{
 const L=owned(),best=(f,cmp)=>L.filter(i=>!isEmpty(i[f])&&!isNaN(+i[f])).sort(cmp)[0];
 const old=L.filter(hasYear).sort((a,b)=>a.year-b.year)[0],rec=L.filter(hasYear).sort((a,b)=>b.year-a.year)[0],hv=best('weight',(a,b)=>b.weight-a.weight),big=best('diameter',(a,b)=>b.diameter-a.diameter);
 const row=(t,i,x)=>i?`<div class="mrow"><span>${t}</span><span class="muted"><button class="link" data-act="open" data-id="${i.id}">${esc(i.denomination)}</button></span><b>${esc(x)}</b></div>`:'';
 return `<div class="mlist">${row('Plus ancienne',old,old&&fmtYear(old.year))}${row('Plus récente',rec,rec&&fmtYear(rec.year))}${row('Plus lourde',hv,hv&&hv.weight+' g')}${row('Plus grande',big,big&&big.diameter+' mm')}</div>`||'<p class="muted small">Pas assez de données.</p>'}});
homeWidget({id:'attention',title:'À vérifier',icon:'warn',off:true,when:()=>!vit(),body:()=>{
 const L=owned(),dd=ddClusters().length,nophoto=L.filter(i=>!(i.imgs||[]).length).length,nostor=L.filter(i=>!normPath(i.storage)&&!(placedMap().get(i.id)||[]).length).length;
 const line=(n,t,v)=>`<div class="mrow"><span>${t}</span><span></span><b><button class="link" data-act="nav" data-v="${v}">${n}</button></b></div>`;
 return `<div class="mlist">${line(dd,'Doublons probables','doubles')}${line(nophoto,'Sans photo','collection')}${line(nostor,'Sans emplacement','storage')}${line(state.trash.length,'Dans la corbeille','trash')}</div>`}});
homeWidget({id:'months',title:'Acquisitions sur 12 mois',icon:'chart',off:true,when:()=>!vit(),body:()=>{
 const now=new Date(),keys=[...Array(12)].map((_,k)=>{const d=new Date(now.getFullYear(),now.getMonth()-11+k,1);return[d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'),MONTHS[d.getMonth()].slice(0,3)]});
 const m={};owned().forEach(i=>{const d=i.acquired?String(i.acquired).slice(0,7):new Date(i.created||0).toISOString().slice(0,7);m[d]=(m[d]||0)+qtyOf(i)});
 const mx=Math.max(1,...keys.map(k=>m[k[0]]||0));
 return `<div style="display:flex;align-items:flex-end;gap:4px;height:90px">${keys.map(([k,l])=>`<div style="flex:1;text-align:center" title="${k} : ${m[k]||0}"><div style="height:${(m[k]||0)/mx*70}px;min-height:2px;background:var(--accent);border-radius:3px"></div><small class="muted" style="font-size:9px">${l}</small></div>`).join('')}</div>`}});
