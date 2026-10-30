'use strict';
/* =====================================================================
   HISTORIQUE PAR FICHE : lit le journal d'opérations (state.events), affiche les changements champ par champ
   et permet de rétablir une ancienne valeur. Ne couvre que les champs suivis par le journal (TRACKED) ;
   les notes, photos et champs personnalisés ne sont pas versionnés.
   ===================================================================== */
const HF={denomination:'Dénomination',country:'Pays',year:'Année',type:'Type',status:'Statut',qty:'Quantité',value:'Valeur estimée',paid:'Prix payé',rarity:'Rareté',storage:'Emplacement',mint:'Atelier',metal:'Métal',weight:'Poids (g)',acquired:'Acquisition',cats:'Catalogues',fav:'Favori',variety:'Variété'};
const HF_MONEY=['value','paid'];
function hfShow(k,v){
 if(v===undefined||v===null||v==='')return'<i class="muted">vide</i>';
 if(k==='country')return esc(cname(v));if(k==='fav')return v?'oui':'non';if(k==='status')return v==='wish'?'wishlist':'collection';
 if(k==='cats')return esc((v||[]).map(id=>(state.catalogs.find(c=>c.id===id)||{}).name||'?').join(', ')||'aucun');
 if(k==='storage')return esc(typeof ctrPath==='function'?(ctrPath(v)||String(v)):String(v));
 if(HF_MONEY.includes(k)&&!isNaN(+v))return esc(fmtMoney(v));
 return esc(typeof v==='object'?JSON.stringify(v):String(v));
}
const hfSame=(a,b)=>JSON.stringify(a??null)===JSON.stringify(b??null);
function itemChanges(id){
 const ev=state.events.filter(e=>e.id===id),out=[];let prev=null;
 for(const e of ev){
  if(e.kind==='del'){out.push({t:e.t,del:true,diffs:[]});prev=null;continue}
  if(e.kind!=='put')continue;
  const s=e.snap||{};
  if(!prev){out.push({t:e.t,first:true,base:!!s._base,diffs:[]})}
  else{const diffs=[];Object.keys(HF).forEach(k=>{if(!hfSame(prev[k],s[k]))diffs.push([k,prev[k],s[k]])});if(diffs.length)out.push({t:e.t,diffs})}
  prev=s;
 }
 return out.reverse();
}
EXT.detail.push(it=>{
 if(vit())return'';
 const ch=itemChanges(it.id);if(ch.length<2&&!(ch[0]&&ch[0].diffs.length))return'';
 const rows=ch.slice(0,40).map((c,ci)=>{
  const head=`<div class="muted small" style="margin-top:8px">${esc(dateFR(c.t))} ${new Date(c.t).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>`;
  if(c.del)return head+'<div>Fiche supprimée puis restaurée</div>';
  if(c.first)return head+`<div>${c.base?'Début du suivi (fiche déjà présente)':'Fiche créée'}</div>`;
  return head+c.diffs.map(([k,a,b])=>`<div class="exrow"><span><b>${HF[k]}</b> : ${hfShow(k,a)} → ${hfShow(k,b)}</span><button class="btn sm" data-act="hfRevert" data-id="${it.id}" data-k="${k}" data-ci="${ci}" title="Remettre l’ancienne valeur">Rétablir</button></div>`).join('');
 }).join('');
 return `<details class="hist" style="margin-top:14px"><summary style="cursor:pointer;font-weight:600">Historique des modifications <span class="muted small">(${ch.length-1} changement${ch.length-1>1?'s':''})</span></summary>${rows}<p class="muted small" style="margin-top:8px">Champs suivis : ${Object.values(HF).join(', ')}.</p></details>`;
});
ACT.hfRevert=async t=>{
 const it=state.items.find(i=>i.id===t.dataset.id);if(!it)return;
 const c=itemChanges(it.id)[+t.dataset.ci],d=c&&c.diffs.find(x=>x[0]===t.dataset.k);if(!d)return;
 const n={...it,updated:Date.now()};
 if(d[1]===undefined||d[1]===null)delete n[d[0]];else n[d[0]]=clone(d[1]);
 await putItems([n]);toast(`« ${HF[d[0]]} » rétabli`);openDetail(it.id);
};
