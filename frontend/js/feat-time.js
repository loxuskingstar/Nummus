'use strict';
/* =====================================================================
   MACHINE À REMONTER LE TEMPS
   S'appuie sur le journal d'opérations (events.js). Aucun passé n'est inventé : tout ce qui précède la
   première ouverture avec journal n'est pas reconstituable, et les fiches déjà présentes à ce moment-là
   sont marquées « présentes dès le début du journal », jamais « acquises ce jour-là ».
   La date d'acquisition saisie sur une fiche reste indépendante du journal.
   ===================================================================== */
addModule('timemachine','Remonter le temps','rewind','Revoir la collection à une date donnée, acquisitions et cessions entre deux dates.',{after:'timeline'});
const TM={at:'',from:''};
const dayEnd=d=>new Date(d+'T23:59:59').getTime();
const isoDay=t=>{const d=new Date(t),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`};
const dayIdx=(a,b)=>Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/864e5);
const snapItems=m=>[...m.entries()].map(([id,s])=>({id,...s}));
const ownedSnap=m=>snapItems(m).filter(s=>s.status!=='wish');
const totalValue=l=>l.reduce((n,s)=>n+(+s.value||0)*qtyOf(s),0);
const baseOnly=()=>state.events.length&&state.events.every(e=>e.snap&&e.snap._base);
EXT.views.timemachine=function viewTM(){
 const t0=historyStart();
 if(!t0)return `<header class="head"><div><h1>Remonter le temps</h1></div></header><div class="empty glass"><b>Le journal est vide</b><p>Il se remplit à chaque ajout, modification ou suppression de fiche.</p></div>`;
 const first=isoDay(t0),now=today();
 if(!TM.at)TM.at=now;if(!TM.from)TM.from=first;
 if(TM.at<first)TM.at=first;if(TM.from<first)TM.from=first;
 const A=stateAt(dayEnd(TM.at)),B=stateAt(dayEnd(TM.from)),own=ownedSnap(A),wish=snapItems(A).length-own.length;
 const nowOwned=state.items.filter(i=>i.status!=='wish');
 const ids=m=>new Set(ownedSnap(m).map(s=>s.id)),a=ids(A),b=ids(B);
 const gained=[...a].filter(id=>!b.has(id)),lost=[...b].filter(id=>!a.has(id));
 const changed=[...a].filter(id=>b.has(id)&&A.get(id).value!==B.get(id).value&&!isEmpty(A.get(id).value));
 const name=(m,id)=>{const s=m.get(id);return s?`${esc(s.denomination)} <span class="muted small">${esc([cname(s.country),fmtYear(s.year)].filter(Boolean).join(', '))}</span>`:''};
 const baseIds=new Set(state.events.filter(e=>e.snap&&e.snap._base).map(e=>e.id));
 const series=state.series.map(s=>{const p=seriesProgress(s,snapItems(A).map(x=>({...x}))),q=seriesProgress(s,pool());return `<div class="dl-row" style="grid-template-columns:1fr auto auto"><span>${esc(s.name)}</span><span class="muted small">à cette date : <b>${p.owned}${p.total?' / '+p.total:''}</b></span><span class="muted small">aujourd’hui : <b>${q.owned}${q.total?' / '+q.total:''}</b></span></div>`}).join('');
 return `<header class="head"><div><h1>Remonter le temps</h1><p class="sub">La collection telle que le journal l’a enregistrée. Historique disponible depuis le <b>${esc(dateFR(t0))}</b> ; avant cette date, rien n’est reconstitué.</p></div></header>
 ${baseOnly()?`<div class="notice">${ic('bulb',18)}<span>Le journal vient de démarrer : pour l’instant, toutes les fiches sont « présentes dès le début du journal ». Les acquisitions, cessions et changements d’estimation apparaîtront ici au fil du temps.</span></div>`:''}
 <div class="tm-bar glass panel"><label for="tm_at"><b>Voir la collection au</b> <span id="tm_atv">${esc(dateFR(TM.at))}</span></label>
  <input type="date" id="tm_at" data-ch="tmAt" value="${TM.at}" min="${first}" max="${now}"><input type="range" data-in="tmRange" data-ch="tmRange" data-first="${first}" min="0" max="${dayIdx(first,now)}" step="1" value="${dayIdx(first,TM.at)}" aria-label="Date"></div>
 <div class="tm-kpis"><div class="kpi2 glass"><div><span class="kl">Entrées possédées</span><b>${own.length}</b><small>aujourd’hui : ${nowOwned.length}</small></div></div>
  <div class="kpi2 glass"><div><span class="kl">Exemplaires</span><b>${own.reduce((n,s)=>n+qtyOf(s),0)}</b><small>aujourd’hui : ${nowOwned.reduce((n,i)=>n+qtyOf(i),0)}</small></div></div>
  ${hideVals()?'':`<div class="kpi2 glass"><div><span class="kl">Estimations enregistrées</span><b>${fmtMoney(totalValue(own))}</b><small>somme des valeurs estimées saisies, pas une cote</small></div></div>`}
  <div class="kpi2 glass"><div><span class="kl">Souhaits</span><b>${wish}</b></div></div></div>
 <section class="panel glass" style="margin-bottom:16px"><h3>Évolution des estimations enregistrées</h3><div class="chartbox">${tmChart()}</div></section>
 <section class="panel glass" style="margin-bottom:16px"><h3>Entre deux dates</h3><div class="fgrid" style="max-width:520px"><div class="fld"><label>Du</label><input type="date" data-ch="tmFrom" value="${TM.from}" min="${first}" max="${now}"></div><div class="fld"><label>Au</label><input type="date" data-ch="tmAt2" value="${TM.at}" min="${first}" max="${now}"></div></div>
 <h4 style="margin:14px 0 4px">Entrées ajoutées à la collection (${gained.length})</h4>${gained.map(id=>`<div class="dl-row"><span class="plus">+</span><span>${name(A,id)}</span><span class="muted small">${baseIds.has(id)&&B.size===0?'présente dès le début du journal':''}</span></div>`).join('')||'<p class="muted small">Aucune.</p>'}
 <h4 style="margin:14px 0 4px">Entrées sorties (supprimées ou repassées en souhait) (${lost.length})</h4>${lost.map(id=>`<div class="dl-row"><span class="minus">−</span><span>${name(B,id)}</span><span></span></div>`).join('')||'<p class="muted small">Aucune.</p>'}
 ${hideVals()?'':`<h4 style="margin:14px 0 4px">Estimations modifiées (${changed.length})</h4>${changed.map(id=>`<div class="dl-row"><span>≈</span><span>${name(A,id)}</span><span>${fmtMoney(B.get(id).value)} → <b>${fmtMoney(A.get(id).value)}</b></span></div>`).join('')||'<p class="muted small">Aucune.</p>'}`}</section>
 ${state.series.length?`<section class="panel glass"><h3>Progression des séries</h3>${series}<p class="muted small" style="margin-top:6px">Calculée avec les champs conservés dans le journal ; les liens manuels et la variante à identifier sont ceux d’aujourd’hui.</p></section>`:''}`;
};
function tmChart(){
 const evs=state.events;if(!evs.length)return'';
 const m=new Map(),pts=[];let day=null;
 const push=t=>{pts.push({date:isoDay(t),value:totalValue(ownedSnap(m))})};
 for(const e of evs){const d=isoDay(e.t);if(day!==null&&d!==day)push(new Date(day+'T12:00:00').getTime());day=d;if(e.kind==='put')m.set(e.id,e.snap);else if(e.kind==='del')m.delete(e.id)}
 if(day!==null)push(new Date(day+'T12:00:00').getTime());
 if(pts.length<2)return '<p class="muted small" style="margin-top:6px">Un seul jour de journal pour l’instant : la courbe apparaîtra dès qu’il y aura plusieurs dates.</p>';
 return histChart(pts);
}
Object.assign(CH,{
 tmAt:t=>{TM.at=t.value||today();render()},tmAt2:t=>{TM.at=t.value||today();render()},tmFrom:t=>{TM.from=t.value;render()},
});
const tmDay=t=>isoDay(new Date(t.dataset.first+'T12:00:00').getTime()+(+t.value)*864e5);
document.addEventListener('input',e=>{const t=e.target;if(t.dataset&&t.dataset.in==='tmRange'){const v=$('#tm_atv');if(v)v.textContent=dateFR(tmDay(t))}});
CH.tmRange=t=>{TM.at=tmDay(t);render()};
