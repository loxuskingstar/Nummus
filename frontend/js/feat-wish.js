'use strict';
/* =====================================================================
   FAVORIS  +  WISHLIST « CARNET D'ACQUISITION »
   La wishlist existait déjà (statut « souhait », priorité, prix cible) : on l'enrichit, on n'en crée pas une seconde.
   Ajouts : avancement de la recherche, prix maximal, état minimal, budget prévisionnel, prix observés
   à la main, alerte quand une pièce ajoutée correspond à un souhait (toujours validée par l'utilisateur).
   ===================================================================== */
addModule('favorites','Favoris','heart','Un cœur sur les fiches pour retrouver vos pièces préférées en un clic.',{after:'wishlist'});

/* ---------- favoris ---------- */
Object.assign(ACT,{
 fav:(t,e)=>{
  if(e&&e.stopPropagation)e.stopPropagation();
  const it=state.items.find(i=>i.id===t.dataset.id);if(!it)return;
  it.fav=!it.fav;if(!it.fav)delete it.fav;putItems([it]);
  const inModal=!$('#modal').hidden;
  if(inModal){t.classList.toggle('on',!!it.fav);t.innerHTML=ic(it.fav?'heartf':'heart',20);t.title=it.fav?'Retirer des favoris':'Ajouter aux favoris'}
  if(view==='favorites'&&!it.fav&&!inModal){renderResults()}
  else if(!inModal){t.classList.toggle('on',!!it.fav);t.innerHTML=ic(it.fav?'heartf':'heart',16)}
  else if(isListView()){renderResults()}
  toast(it.fav?'Ajoutée aux favoris':'Retirée des favoris');
 }
});

/* ---------- échelle d'états (indicative, FR + anglo-saxon) ---------- */
const GRADE_RANK={B:1,G:1,VG:1.5,TB:2,F:2,TTB:3,VF:3,SUP:4,XF:4,SPL:5,AU:5,'MS-60':5.5,FDC:6,UNC:6,NEUF:6,'MS-63':6,'MS-65':6.5,'PF-65':6.5,BE:6.5};
const gradeRank=g=>{const k=String(g||'').toUpperCase().replace(/\s+/g,'').replace(/[^A-Z0-9-]/g,'');return GRADE_RANK[k]??null};

/* ---------- panneau de tête de la wishlist ---------- */
const wishOpen=()=>state.items.filter(i=>i.status==='wish'&&i.wishStatus!=='bought');
function wishPanel(base){
 if(vit()||!base.length)return'';
 const open=base.filter(i=>i.wishStatus!=='bought'),by={search:0,spotted:0,nego:0,bought:0};
 base.forEach(i=>by[i.wishStatus||'search']++);
 const sum=open.reduce((s,i)=>s+(+i.target||0),0),noPrice=open.filter(i=>isEmpty(i.target)).length;
 const bud=state.settings.wishBudget===''?null:+state.settings.wishBudget,left=bud===null?null:bud-sum;
 const chip=(k,q)=>`<button class="chip wsf ${ui.filters.q===q?'acc':''}" data-act="wsFilter" data-q="${esc(q)}">${esc(WISH_ST[k])} <b>${by[k]}</b></button>`;
 return `<section class="panel glass wishpanel"><div class="chips">${chip('search','is:cherche')}${chip('spotted','is:repere')}${chip('nego','is:nego')}${chip('bought','is:achetee')}${ui.filters.q?`<button class="chip" data-act="wsFilter" data-q="">Tout afficher</button>`:''}</div>
 <div class="wp-grid"><div><span class="tl">Somme des prix maximaux</span><b>${fmtMoney(sum)}</b>${noPrice?`<small class="muted"> · ${pl(noPrice,'souhait sans prix','souhaits sans prix')}</small>`:''}</div>
 <div class="fld"><label for="wb">Budget prévisionnel (${esc(state.settings.currency)})</label><input id="wb" type="number" min="0" step="any" data-ch="wishBudget" value="${bud===null?'':bud}" placeholder="facultatif"></div>
 <div><span class="tl">Marge</span><b class="${left!==null&&left<0?'neg':''}">${left===null?'—':fmtMoney(left)}</b>${left!==null&&left<0?'<small class="muted"> · budget dépassé si tout est acheté au prix maximal</small>':''}</div></div></section>`;
}
Object.assign(ACT,{
 wsFilter:t=>{ui.filters.q=t.dataset.q;const i=$('input[data-k=q]');if(i)i.value=ui.filters.q;const p=$('.wishpanel');if(p){const n=document.createElement('div');n.innerHTML=wishPanel(viewBase());p.replaceWith(n.firstElementChild)}renderResults()},
});
Object.assign(CH,{
 wishBudget:t=>{state.settings.wishBudget=t.value===''?'':Math.max(0,+t.value);savePrefs();const p=$('.wishpanel');if(p){const n=document.createElement('div');n.innerHTML=wishPanel(viewBase());p.replaceWith(n.firstElementChild)}},
 wsSet:t=>{const it=state.items.find(i=>i.id===t.dataset.id);if(!it)return;it.wishStatus=t.value;putItems([it]);toast('Avancement mis à jour')},
});

/* ---------- fiche d'un souhait : avancement, critères, prix observés ---------- */
function obsStats(o){
 if(!o.length)return null;const s=[...o].sort((a,b)=>a.date.localeCompare(b.date)),p=s.map(x=>+x.price);
 return{n:o.length,min:Math.min(...p),max:Math.max(...p),last:s[s.length-1],avg:p.reduce((a,b)=>a+b,0)/p.length};
}
EXT.detail.push(it=>{
 if(it.status!=='wish'||vit())return'';
 const o=it.obs||[],st=obsStats(o),over=st&&!isEmpty(it.target)&&st.last.price>+it.target;
 return `<section class="vhist"><h3>Carnet d’acquisition</h3>
 <div class="fgrid" style="margin-top:8px"><div class="fld"><label>Avancement de la recherche</label><select data-ch="wsSet" data-id="${it.id}">${opt(Object.entries(WISH_ST),it.wishStatus||'search')}</select></div>
 <div class="fld"><label>Critères</label><div class="muted small" style="padding-top:8px">${[!isEmpty(it.target)?'Prix max. '+fmtMoney(it.target):'',it.minGrade?'État min. '+esc(it.minGrade):'',it.priority?prioLabel(it.priority):''].filter(Boolean).join(' · ')||'Aucun critère défini'}</div></div></div>
 <h3 style="margin-top:14px">Prix observés <span class="muted small">(saisis à la main, à titre indicatif — pas une cote)</span></h3>
 ${o.length?histChart([...o].sort((a,b)=>a.date.localeCompare(b.date)).map(x=>({date:x.date,value:+x.price}))):'<p class="muted small" style="margin-top:6px">Aucune observation. Notez un prix vu chez un marchand, en vente publique ou en bourse.</p>'}
 ${st?`<p class="small" style="margin-top:6px">${pl(st.n,'observation','observations')} · min ${fmtMoney(st.min)} · max ${fmtMoney(st.max)} · moyenne ${fmtMoney(st.avg)} · dernier relevé ${fmtMoney(st.last.price)}${over?' <span class="chip">au-dessus de votre prix maximal</span>':''}</p>`:''}
 <div class="hadd"><input type="date" id="o_d" value="${today()}" aria-label="Date"><input type="number" step="any" id="o_p" placeholder="Prix (${esc(state.settings.currency)})" aria-label="Prix observé"><input type="text" id="o_w" placeholder="Où ? (vendeur, bourse…)" aria-label="Source"><button class="btn sm" data-act="obsAdd" data-id="${it.id}">${ic('plus',14)} Ajouter</button></div>
 ${o.length?`<details style="margin-top:8px"><summary class="muted small">Gérer les observations (${o.length})</summary>${o.map((x,i)=>`<div class="hrow"><span>${esc(dateFR(x.date))}</span><b>${fmtMoney(x.price)}</b><span class="muted small">${esc(x.where||'')}</span><button class="x" data-act="obsDel" data-id="${it.id}" data-i="${i}" aria-label="Supprimer">${ic('x',14)}</button></div>`).join('')}</details>`:''}</section>`;
});
Object.assign(ACT,{
 obsAdd:t=>{const it=state.items.find(i=>i.id===t.dataset.id),p=$('#o_p').value;if(!it||p===''||isNaN(+p)){toast('Indiquez un prix');return}
  (it.obs=it.obs||[]).push({date:$('#o_d').value||today(),price:+p,where:$('#o_w').value.trim()});putItems([it]);openDetail(it.id)},
 obsDel:t=>{const it=state.items.find(i=>i.id===t.dataset.id);if(!it||!it.obs)return;it.obs.splice(+t.dataset.i,1);if(!it.obs.length)delete it.obs;putItems([it]);openDetail(it.id)},
});

/* ---------- alerte : une entrée ajoutée correspond-elle à un souhait ? ---------- */
function wishCandidates(it){
 if(it.status==='wish')return[];
 const n=s=>norm(String(s||'')).replace(/[^a-z0-9]+/g,' ').trim();
 return wishOpen().filter(w=>{
  if(w.id===it.id||w.type!==it.type)return false;
  if(w.country&&it.country&&w.country!==it.country)return false;
  const a=n(w.denomination),b=n(it.denomination);if(!a||!b||!(a===b||a.includes(b)||b.includes(a)))return false;
  if(hasYear(w)&&hasYear(it)&&+w.year!==+it.year)return false;
  if(w.mint&&it.mint&&n(w.mint)!==n(it.mint))return false;
  return true;
 });
}
function wishVerdict(w,it){
 const r=[],min=gradeRank(w.minGrade),g=gradeRank(it.grade);
 if(w.minGrade){if(min!==null&&g!==null)r.push(g>=min?`état ${esc(it.grade)} ≥ minimum ${esc(w.minGrade)}`:`état ${esc(it.grade)} inférieur au minimum ${esc(w.minGrade)}`);else r.push(`état minimal souhaité : ${esc(w.minGrade)} — à vérifier`)}
 if(!isEmpty(w.target)&&!isEmpty(it.paid)){const u=(+it.paid)/qtyOf(it);r.push(u<=+w.target?`prix payé ${fmtMoney(u)} ≤ maximum ${fmtMoney(w.target)}`:`prix payé ${fmtMoney(u)} > maximum ${fmtMoney(w.target)}`)}
 return r.join(' · ');
}
function offerWishMatch(it){
 const c=wishCandidates(it);if(!c.length)return;
 promptModal('Cette entrée correspond à un souhait',`<p class="muted">« ${esc(it.denomination)} » ressemble à ${c.length>1?'des souhaits':'un souhait'} de votre wishlist. Rien n’est modifié sans votre accord.</p>
 ${c.map(w=>`<div class="panel" style="margin:10px 0"><b>${esc(w.denomination)}</b> <span class="muted small">${esc(subtitle(w))}</span>
 <p class="small muted" style="margin:4px 0 8px">${wishVerdict(w,it)||'Aucun critère de prix ou d’état à comparer.'}</p>
 <select name="w_${w.id}"><option value="keep">Garder le souhait</option><option value="bought">Marquer « achetée » (conserver la trace)</option><option value="del">Supprimer le souhait</option></select></div>`).join('')}`,'wishMatchOk','Appliquer');
}
SUBMIT.wishMatchOk=f=>{
 const ch=[],del=[];
 [...f.elements].forEach(el=>{if(!el.name||!el.name.startsWith('w_'))return;const w=state.items.find(i=>i.id===el.name.slice(2));if(!w)return;
  if(el.value==='bought'){w.wishStatus='bought';ch.push(w)}else if(el.value==='del')del.push(w.id)});
 if(ch.length)putItems(ch);if(del.length)removeItems(del);closeModal();render();toast('Wishlist mise à jour');
};
