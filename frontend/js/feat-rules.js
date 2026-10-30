'use strict';
/* =====================================================================
   RAPPROCHEMENT ET AUTOMATISATION
   • Un seul moteur de ressemblance (ddScore) sert trois usages : l'alerte « vous en avez déjà une » dans
     le formulaire, l'assistant de dédoublonnage (page « Doublons et échanges ») et la recherche éclair.
   • Règles automatiques : « si … alors … », appliquées à l'enregistrement d'une fiche, à l'import CSV et,
     sur demande, à toute la collection. Elles ne remplacent jamais une valeur déjà saisie, sauf si la règle le demande.
   ===================================================================== */

/* ---------- moteur de ressemblance ---------- */
function ddScore(a,b){
 const da=norm(a.denomination),db=norm(b.denomination),none={score:0,why:[]};
 if(!da||!db)return none;
 let s=0;const why=[];
 if(da===db){s+=40;why.push('même dénomination')}
 else if(da.includes(db)||db.includes(da)||lev(da,db)<=2){s+=27;why.push('dénomination proche')}
 else return none;
 const ya=hasYear(a),yb=hasYear(b);
 if(ya&&yb){if(+a.year===+b.year){s+=25;why.push('même année')}else return none}   // années différentes : jamais un doublon
 else if(!ya&&!yb)s+=5;
 if(a.country&&b.country){if(a.country===b.country){s+=10;why.push('même pays')}else return none}
 if(a.mint&&b.mint){if(norm(a.mint)===norm(b.mint)){s+=10;why.push('même atelier')}else s-=10}
 const wa=+a.weight,wb=+b.weight;
 if(wa>0&&wb>0){const d=Math.abs(wa-wb)/Math.max(wa,wb);if(d<=.02){s+=10;why.push('poids voisin')}else if(d>.08)s-=15}
 if(a.catalog&&b.catalog&&norm(a.catalog)===norm(b.catalog)){s+=15;why.push('même référence')}
 if(a.variety&&b.variety&&norm(a.variety)!==norm(b.variety))s-=20;
 return{score:Math.max(0,Math.min(100,s)),why};
}
const DD_MIN=65;
/* fiches existantes ressemblant à un candidat (champs partiels acceptés) */
function ddFind(cand,min=DD_MIN){
 return state.items.filter(i=>i.id!==cand.id).map(i=>({it:i,...ddScore(cand,i)})).filter(r=>r.score>=min).sort((a,b)=>b.score-a.score);
}
/* groupes de fiches possédées qui se ressemblent (blocage par préfixe de dénomination pour rester rapide) */
function ddClusters(){
 const L=state.items.filter(i=>i.status!=='wish'),blocks=new Map();
 L.forEach(i=>{const k=norm(i.denomination).replace(/[^a-z0-9]/g,'').slice(0,4);if(k)(blocks.get(k)||blocks.set(k,[]).get(k)).push(i)});
 const parent=new Map(L.map(i=>[i.id,i.id])),find=x=>{while(parent.get(x)!==x){parent.set(x,parent.get(parent.get(x)));x=parent.get(x)}return x};
 const best=new Map();
 blocks.forEach(b=>{for(let i=0;i<b.length;i++)for(let j=i+1;j<b.length;j++){const r=ddScore(b[i],b[j]);if(r.score>=DD_MIN){parent.set(find(b[i].id),find(b[j].id));best.set(b[i].id+'|'+b[j].id,r)}}});
 const groups=new Map();
 L.forEach(i=>{const r=find(i.id);(groups.get(r)||groups.set(r,[]).get(r)).push(i)});
 return[...groups.values()].filter(g=>g.length>1).map(g=>{
  const key=g.map(i=>i.id).sort().join('+'),scores=[...best.entries()].filter(([k])=>k.split('|').every(id=>g.some(i=>i.id===id))).map(([,r])=>r);
  return{items:g,key,score:Math.max(...scores.map(r=>r.score)),why:uniq(scores.flatMap(r=>r.why))};
 }).filter(c=>!(state.dismissed['dd:'+c.key])).sort((a,b)=>b.score-a.score);
}
/* fusion : la première fiche reste, les autres rejoignent la corbeille (restaurables) */
function ddMerge(ids){
 const L=ids.map(id=>state.items.find(i=>i.id===id)).filter(Boolean);if(L.length<2)return;
 const master=L[0],others=L.slice(1),before=clone(master);
 const skip=new Set(['id','created','updated','imgs','cover','qty','tags','cats','valueHistory','notes','fav']);
 others.forEach(o=>{
  Object.keys(o).forEach(k=>{if(!skip.has(k)&&!k.startsWith('_')&&isEmpty(master[k])&&!isEmpty(o[k]))master[k]=o[k]});
  master.qty=qtyOf(master)+qtyOf(o);
  master.tags=uniq([...tagsOf(master),...tagsOf(o)]).join(', ');
  master.cats=uniq([...(master.cats||[]),...(o.cats||[])]);
  master.valueHistory=[...(master.valueHistory||[]),...(o.valueHistory||[])].sort((x,y)=>String(x.date).localeCompare(String(y.date)));
  if(o.notes)master.notes=[master.notes,o.notes].filter(Boolean).join('\n\n');
  if(o.fav)master.fav=true;
  const have=new Set((master.imgs||[]).map(m=>m.id));
  master.imgs=[...(master.imgs||[]),...(o.imgs||[]).filter(m=>!have.has(m.id)).map(m=>({...m,role:master.imgs&&master.imgs.some(x=>x.role===m.role)?'other':m.role}))];
  if(!master.cover&&o.cover)master.cover=o.cover;
 });
 master.updated=Date.now();
 putItems([master]);trashItems(others.map(o=>o.id));
 toastAction(`${pl(others.length+1,'fiche fusionnée','fiches fusionnées')} (quantité ${qtyOf(master)}).`,'Annuler',()=>{putItems([before]);restoreItems(others.map(o=>o.id));render();toast('Fusion annulée')});
}

/* ---------- alerte en direct dans le formulaire ---------- */
const ddLive=debounce(()=>{
 const form=$('#itemForm');if(!form||!formDraft)return;
 const g=n=>(form.elements[n]&&form.elements[n].value)||'';
 const cand={id:formDraft.id,denomination:g('denomination'),year:g('year')===''?null:+g('year'),country:g('country'),mint:g('mint'),
  weight:parseFloat(g('weight')),catalog:g('catalog'),variety:g('variety')};
 let box=$('#dupLive');
 if(!norm(cand.denomination)||(cand.year===null&&!cand.country)){if(box)box.remove();return}
 const hits=ddFind(cand,60).slice(0,3),owned=hits.filter(h=>h.it.status!=='wish'),wish=hits.filter(h=>h.it.status==='wish');
 if(!hits.length){if(box)box.remove();return}
 if(!box){box=document.createElement('div');box.id='dupLive';box.className='notice';form.insertBefore(box,form.firstChild)}
 const line=h=>`<li><button type="button" class="link" data-act="open" data-id="${h.it.id}">${esc(h.it.denomination)}</button> <span class="muted small">${esc(subtitle(h.it))}${h.it.grade?' · '+esc(h.it.grade):''} — ${esc(h.why.join(', '))}</span></li>`;
 const n=owned.reduce((s,h)=>s+qtyOf(h.it),0);
 box.innerHTML=`${ic('shield',18)}<span>${owned.length?`<b>Vous en avez déjà ${pl(n,'exemplaire','exemplaires')}.</b>`:''}${wish.length?` <b>Cette pièce figure dans votre wishlist.</b>`:''}
  <ul class="small" style="margin:4px 0 0 16px">${[...owned,...wish].map(line).join('')}</ul><span class="muted small">Information seulement : vous pouvez enregistrer quand même, ou augmenter la quantité de la fiche existante.</span></span>`;
},250);
document.addEventListener('input',e=>{if(e.target.closest&&e.target.closest('#itemForm')&&['denomination','year','country','mint','weight','catalog','variety'].includes(e.target.name))ddLive()});
document.addEventListener('change',e=>{if(e.target.closest&&e.target.closest('#itemForm')&&['country','mint','_status'].includes(e.target.name))ddLive()});

/* ---------- page « Doublons et échanges » : fusionne l'ancienne liste et l'assistant ---------- */
function viewDoublesPlus(){
 const L=pool().filter(i=>i.status!=='wish'),multi=L.filter(i=>qtyOf(i)>1),trade=L.filter(i=>i.trade);
 const cl=ddClusters();
 const rows=l=>l.length?`<div class="rows">${l.map(rowOf).join('')}</div>`:'';
 const box=(t,sub,body)=>`<section class="panel glass"><h2>${t}</h2><p class="muted" style="margin-bottom:8px">${sub}</p>${body||'<p class="muted">Rien pour le moment.</p>'}</section>`;
 const cluster=c=>`<div class="panel" style="margin-bottom:12px;border:1px solid var(--line,rgba(127,127,127,.25));border-radius:14px;padding:10px">
  <div class="actions" style="justify-content:space-between;margin-bottom:6px"><span class="muted small">${pl(c.items.length,'fiche','fiches')} · ressemblance ${c.score} % — ${esc(c.why.join(', '))}</span>
  <span class="actions"><button class="btn sm primary" data-act="ddMerge" data-k="${c.key}">${ic('copy',14)} Fusionner</button><button class="btn sm" data-act="ddKeep" data-k="${c.key}">Ce ne sont pas des doublons</button></span></div>${rows(c.items)}</div>`;
 return `<header class="head"><h1>Doublons et échanges</h1></header><div class="stack">
 ${box('Doublons probables',`Fiches saisies plusieurs fois par inadvertance, rapprochées par dénomination, année, pays, atelier, poids et référence. « Fusionner » additionne les quantités, garde la première fiche et envoie les autres à la corbeille (annulable). Aucune fiche n’est modifiée sans votre clic.`,cl.map(cluster).join(''))}
 ${box('Exemplaires multiples',`Entrées avec une quantité supérieure à 1 (${multi.length}).`,rows(multi))}
 ${box('À échanger',`Entrées cochées « Disponible à l’échange » (${trade.length}).`,rows(trade))}</div>`;
}
EXT.views.doubles=viewDoublesPlus;
Object.assign(ACT,{
 ddMerge:t=>{const c=ddClusters().find(x=>x.key===t.dataset.k);if(!c)return;ddMerge(c.items.map(i=>i.id));render()},
 ddKeep:t=>{state.dismissed['dd:'+t.dataset.k]=1;savePrefs();render()},
});

/* ---------- règles automatiques ---------- */
const SR_OPS=[['eq','est égal à'],['contains','contient'],['starts','commence par'],['empty','est vide'],['filled','est renseigné'],['gt','supérieur à'],['lt','inférieur à']];
const srFields=()=>{const seen=new Set();return getFields().filter(f=>f.enabled!==false&&!['markdown','catalogs','checkbox','path'].includes(f.type)&&!seen.has(f.key)&&seen.add(f.key)).map(f=>[f.key,f.label])};
function srValue(it,key){const v=it[key];return isEmpty(v)?'':key==='country'?`${cname(v)} ${v}`:String(v)}
function srCond(c,it){
 const raw=srValue(it,c.key),v=norm(raw),t=norm(c.value||'');
 switch(c.op){
  case'eq':return c.key==='country'?(norm(cname(it.country))===t||it.country===c.value):v===t;
  case'contains':return !!t&&v.includes(t);
  case'starts':return !!t&&v.startsWith(t);
  case'empty':return !raw.trim();
  case'filled':return !!raw.trim();
  case'gt':return raw!==''&&+raw>+String(c.value).replace(',','.');
  case'lt':return raw!==''&&+raw<+String(c.value).replace(',','.');
 }
 return false;
}
const srMatch=(r,it)=>r.on!==false&&(r.when||[]).length>0&&r.when.every(c=>srCond(c,it));
/* applique les règles à une fiche ; renvoie le nombre de champs modifiés */
function srApply(it){
 let n=0;
 state.rules.forEach(r=>{
  if(!srMatch(r,it))return;
  (r.then||[]).forEach(a=>{
   if(a.kind==='set'){
    const f=getFields().find(x=>x.key===a.key);if(!f||(!isEmpty(it[a.key])&&!a.overwrite))return;
    let v=a.value;
    if(f.type==='number'||f.type==='money'){v=parseFloat(String(v).replace(',','.'));if(isNaN(v))return}
    if(f.type==='country'){const c=COUNTRIES.find(x=>norm(x.name)===norm(v)||x.id===v);if(!c)return;v=c.id}
    if(it[a.key]!==v){it[a.key]=v;n++}
   }else if(a.kind==='tag'){
    const t=tagsOf(it);if(a.value&&!t.map(norm).includes(norm(a.value))){it.tags=[...t,a.value].join(', ');n++}
   }else if(a.kind==='cat'){
    if(state.catalogs.some(c=>c.id===a.value)&&!(it.cats||[]).includes(a.value)){it.cats=[...(it.cats||[]),a.value];n++}
   }
  });
 });
 return n;
}
EXT.beforeSave.push(it=>{srApply(it)});

const srDescribe=r=>{
 const f=Object.fromEntries(srFields()),op=Object.fromEntries(SR_OPS);
 const w=(r.when||[]).map(c=>`${f[c.key]||c.key} ${op[c.op]||''} ${['empty','filled'].includes(c.op)?'':'« '+c.value+' »'}`).join(' et ');
 const t=(r.then||[]).map(a=>a.kind==='tag'?`ajouter l’étiquette « ${a.value} »`:a.kind==='cat'?`ranger dans « ${catName(a.value)} »`:`${f[a.key]||a.key} ← « ${a.value} »${a.overwrite?' (remplace)':''}`).join(', ');
 return`Si ${w} → ${t}`;
};
EXT.settings.push(()=>`<section class="panel glass" id="srpanel"><h2>${ic('zap',18)} Règles automatiques</h2>
 <p class="muted" style="margin-bottom:10px">Complètent les fiches à l’enregistrement et à l’import CSV (ex. : si le pays est « Empire romain », ajouter l’étiquette « Antiquité »). Une valeur déjà saisie n’est jamais écrasée, sauf si la règle le demande.</p>
 ${state.rules.map(r=>`<div class="exrow"><label class="chk"><input type="checkbox" data-ch="srOn" data-id="${r.id}" ${r.on!==false?'checked':''} aria-label="Active"></label><span><b>${esc(r.name||'Règle')}</b><br><span class="muted small">${esc(srDescribe(r))}</span></span><span><button class="btn sm" data-act="srEdit" data-id="${r.id}">${ic('edit',14)}</button> <button class="btn sm danger" data-act="srDel" data-id="${r.id}" aria-label="Supprimer">${ic('trash',14)}</button></span></div>`).join('')||'<p class="muted small">Aucune règle.</p>'}
 <div class="actions" style="margin-top:10px"><button class="btn primary" data-act="srEdit">${ic('plus',16)} Nouvelle règle</button>${state.rules.length?`<button class="btn" data-act="srRunAll">Appliquer à toute la collection…</button>`:''}</div></section>`);

function srForm(r){
 r=r||{name:'',when:[{key:'country',op:'eq',value:''}],then:[{kind:'tag',value:''}]};
 const fo=srFields(),cats=state.catalogs;
 const wrow=(c,i)=>`<div class="fgrid" style="margin-bottom:6px"><div class="fld"><select id="sr_wk${i}"><option value="">—</option>${opt(fo,c?c.key:'')}</select></div><div class="fld"><select id="sr_wo${i}">${opt(SR_OPS,c?c.op:'eq')}</select></div><div class="fld"><input id="sr_wv${i}" value="${esc(c?c.value:'')}" placeholder="valeur"></div></div>`;
 const arow=(a,i)=>`<div class="fgrid" style="margin-bottom:6px"><div class="fld"><select id="sr_ak${i}">${opt([['','—'],['tag','Ajouter l’étiquette'],['cat','Ranger dans le catalogue'],['set','Renseigner le champ']],a?a.kind:'')}</select></div><div class="fld"><select id="sr_af${i}"><option value="">(champ)</option>${opt(fo,a&&a.kind==='set'?a.key:'')}</select></div><div class="fld"><input id="sr_av${i}" value="${esc(a?(a.kind==='cat'?catName(a.value):a.value):'')}" placeholder="valeur ou nom du catalogue"></div><label class="chk small"><input type="checkbox" id="sr_ao${i}" ${a&&a.overwrite?'checked':''}> remplace</label></div>`;
 promptModal(r.id?'Modifier la règle':'Nouvelle règle',`<div class="fld wide"><label>Nom</label><input id="sr_n" value="${esc(r.name||'')}" placeholder="Antiquité romaine"></div>
  <h3 style="margin:12px 0 6px">Si… (toutes les conditions)</h3>${[0,1,2].map(i=>wrow(r.when[i],i)).join('')}
  <h3 style="margin:12px 0 6px">Alors…</h3>${[0,1,2].map(i=>arow(r.then[i],i)).join('')}
  <p class="muted small">Catalogues disponibles : ${cats.length?cats.map(c=>esc(c.name)).join(', '):'aucun'}.</p>`,'srOk','Enregistrer',r.id?`data-id="${r.id}"`:'');
}
SUBMIT.srOk=f=>{
 const when=[0,1,2].map(i=>({key:$('#sr_wk'+i).value,op:$('#sr_wo'+i).value,value:$('#sr_wv'+i).value.trim()})).filter(c=>c.key&&(['empty','filled'].includes(c.op)||c.value));
 const then=[];
 for(const i of [0,1,2]){
  const kind=$('#sr_ak'+i).value,v=$('#sr_av'+i).value.trim();if(!kind)continue;
  if(kind==='tag'&&v)then.push({kind,value:v});
  else if(kind==='cat'){const c=state.catalogs.find(x=>norm(x.name)===norm(v));if(!c){toast(`Catalogue « ${v} » introuvable`);return}then.push({kind,value:c.id})}
  else if(kind==='set'){const k=$('#sr_af'+i).value;if(k&&v)then.push({kind,key:k,value:v,overwrite:$('#sr_ao'+i).checked})}
 }
 if(!when.length||!then.length){toast('Indiquez au moins une condition et une action');return}
 const d={name:$('#sr_n').value.trim()||'Règle',when,then};
 if(f.dataset.id){const r=state.rules.find(x=>x.id===f.dataset.id);if(r)Object.assign(r,d)}else state.rules.push({id:uid(),on:true,...d});
 savePrefs();closeModal();render();toast('Règle enregistrée');
};
Object.assign(ACT,{
 srEdit:t=>srForm(t.dataset.id?state.rules.find(r=>r.id===t.dataset.id):null),
 srDel:t=>{if(confirm('Supprimer cette règle ?')){state.rules=state.rules.filter(r=>r.id!==t.dataset.id);savePrefs();render()}},
 srRunAll:()=>{
  const changed=state.items.map(it=>{const c=clone(it);return srApply(c)?c:null}).filter(Boolean);
  if(!changed.length){toast('Aucune fiche à modifier');return}
  if(confirm(`Les règles modifieraient ${pl(changed.length,'fiche','fiches')}. Appliquer ?`)){changed.forEach(c=>{c.updated=Date.now()});putItems(changed);render();toast(`${pl(changed.length,'fiche mise à jour','fiches mises à jour')}`)}
 },
});
CH.srOn=t=>{const r=state.rules.find(x=>x.id===t.dataset.id);if(r){r.on=t.checked;savePrefs()}};
