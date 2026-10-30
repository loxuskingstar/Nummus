'use strict';
/* =====================================================================
   SÉRIES ET COLLECTIONS THÉMATIQUES
   Deux familles :
   - série à cases   : liste connue de pièces attendues (millésimes d'un type, liste libre). Le total est connu,
                       on affiche la progression et les cases manquantes (grisées) ;
   - série ouverte   : règle de recherche (pays, période, métal, mot-clé…). Le total n'est pas connu :
                       on suit un objectif chiffré choisi par l'utilisateur.
   Aucune liste « officielle » n'est embarquée : elle ne serait pas garantie exacte. Les associations
   proposées automatiquement restent des suggestions à valider.
   ===================================================================== */
addModule('series','Séries','target','Séries à cases ou ouvertes : progression, pièces manquantes, objectifs.',{after:'catalogs',view:()=>viewSeries()});
const SER_COLORS=['#2f8a78','#3b6fd4','#8a4fbf','#c0453a','#b7791f','#d4568f'];
const ovn=s=>norm(String(s||'')).replace(/[^a-z0-9]+/g,' ').trim();
const serOf=id=>state.series.find(s=>s.id===id);

/* ---------- correspondance case ↔ entrée ---------- */
function slotMatches(sl,it){
 if(it.status==='wish')return false;
 if((sl.items||[]).includes(it.id))return true;
 if(!(sl.country||sl.denom||sl.year!==undefined&&sl.year!==''&&sl.year!==null||sl.mint))return false;   // case sans critère : seulement les liens manuels
 if(sl.country&&it.country!==sl.country)return false;
 if(sl.type&&it.type!==sl.type)return false;
 if(sl.denom&&!ovn(it.denomination).includes(ovn(sl.denom)))return false;
 if(sl.year!==undefined&&sl.year!==''&&sl.year!==null){if(!hasYear(it)||+it.year!==+sl.year)return false}
 if(sl.mint&&!ovn(it.mint).includes(ovn(sl.mint)))return false;
 return true;
}
function ruleMatches(r,it){
 if(it.status==='wish')return false;
 if(r.mint&&!ovn(it.mint).includes(ovn(r.mint)))return false;
 return matchItem(it,{status:'owned',type:r.type,country:r.country,metal:r.metal,tag:r.tag,yearMin:r.yearMin,yearMax:r.yearMax,q:r.q});
}
/* progression pure : fonctionne sur l'état courant comme sur un instantané du journal */
function seriesProgress(s,list){
 const copies=its=>its.reduce((n,i)=>n+qtyOf(i),0);
 if(s.mode==='rule'){
  const its=list.filter(i=>ruleMatches(s.rule||{},i)),goal=+(s.goal&&s.goal.count)||0;
  return{open:true,total:goal||null,owned:its.length,copies:copies(its),unid:0,missing:goal?Math.max(0,goal-its.length):null,pct:goal?Math.min(100,its.length/goal*100):null,items:its,slots:[]};
 }
 const slots=(s.slots||[]).map(sl=>{
  const its=list.filter(i=>slotMatches(sl,i));
  let st=!its.length?'missing':'owned';
  if(its.length&&(sl.unid||(sl.variant&&!its.some(i=>ovn(i.variety).includes(ovn(sl.variant))))))st='unid';
  return{slot:sl,state:st,items:its,copies:copies(its)};
 });
 const owned=slots.filter(x=>x.state==='owned').length,unid=slots.filter(x=>x.state==='unid').length,total=slots.length;
 return{open:false,total,owned,unid,missing:total-owned-unid,copies:slots.reduce((n,x)=>n+x.copies,0),pct:total?owned/total*100:0,slots,items:[...new Set(slots.flatMap(x=>x.items))]};
}
const seriesGoalTotal=(s,p)=>(s.goal&&+s.goal.count)||(p.open?null:p.total);

/* ---------- vue principale ---------- */
function viewSeries(){
 if(view.startsWith('series:')){const s=serOf(view.slice(7));if(s)return viewSerieDetail(s)}
 const l=state.series;
 return `<header class="head"><div><h1>Séries</h1><p class="sub">Suivez des ensembles de pièces : une <b>série à cases</b> (liste connue de millésimes ou de types, avec les manquantes grisées) ou une <b>série ouverte</b> définie par une règle (pays, période, métal…) et un objectif.</p></div><div class="actions"><button class="btn primary" data-act="serNew">${ic('plus')} Nouvelle série</button></div></header>
 ${l.length?`<div class="modgrid">${l.map(s=>{const p=seriesProgress(s,pool());return `<button class="mcard glass" data-act="nav" data-v="series:${s.id}" style="border-left:4px solid ${esc(s.color||SER_COLORS[0])}"><h3>${esc(s.name)}</h3><span class="meta">${s.mode==='rule'?'Série ouverte':'Série à cases'} · ${p.open?pl(p.owned,'entrée','entrées')+(p.total?` sur objectif ${p.total}`:''):`${p.owned} / ${p.total} identifiées${p.unid?` · ${p.unid} à identifier`:''}`}</span>${p.pct===null?'':`<div class="pbar"><i style="width:${p.pct}%"></i></div>`}</button>`}).join('')}</div>`
 :`<div class="empty glass"><b>Aucune série pour l’instant</b><p>Exemples : « Francs Semeuse 1898-1920 » (cases par millésime), « Toutes mes pièces romaines » (règle) ou « 2 € commémoratives » (règle + objectif).</p><div class="actions" style="justify-content:center"><button class="btn primary" data-act="serNew">${ic('plus')} Créer une série</button><button class="btn" data-act="serTpl" data-k="2eur">2 € commémoratives</button></div></div>`}`;
}
function viewSerieDetail(s){
 const p=seriesProgress(s,pool()),goal=seriesGoalTotal(s,p),left=goal?Math.max(0,goal-p.owned):null;
 let when='';
 if(s.goal&&s.goal.date&&left){const d=Math.ceil((new Date(s.goal.date)-new Date())/864e5);when=d>0?`${left} à trouver en ${pl(d,'jour','jours')} (environ ${(left/Math.max(1,d/30)).toFixed(1).replace('.',',')} par mois)`:'échéance dépassée'}
 const body=p.open?`<div class="grid" id="rlist">${p.items.sort(SORT.yearAsc).map(card).join('')||''}</div>${p.items.length?'':'<div class="empty glass"><b>Aucune entrée ne correspond</b><p>Modifiez la règle de la série.</p></div>'}`
  :`<div class="slots">${p.slots.map(x=>slotTile(x,s.id)).join('')||'<div class="empty glass" style="grid-column:1/-1"><b>Aucune case</b><p>Ajoutez des cases une par une ou générez-les (millésimes).</p></div>'}</div>
   <p class="muted small" style="margin-top:10px">Légende : <b>pleine</b> = possédée et identifiée · <b style="color:#b7791f">pointillés orangés</b> = possédée, variante à identifier · <b>grisée</b> = manquante. Un exemplaire en plus n’est jamais présenté comme inutile : à vous de décider.</p>
   ${serSuggestions(s,p)}`;
 return `<header class="head"><div><p class="muted small"><button class="btn sm" data-act="nav" data-v="series">← Séries</button> ${p.open?'Série ouverte':'Série à cases'}</p><h1>${esc(s.name)}</h1>${s.desc?`<p class="sub">${esc(s.desc)}</p>`:''}</div>
 <div class="actions"><button class="btn" data-act="serEdit" data-id="${s.id}">${ic('edit',16)} Modifier</button>${p.open?'':`<button class="btn" data-act="slotNew" data-id="${s.id}">${ic('plus',16)} Case</button>`}<button class="btn danger" data-act="serDel" data-id="${s.id}">${ic('trash',16)}</button></div></header>
 <div class="tm-kpis"><div class="kpi2 glass"><div><span class="kl">${p.open?'Entrées correspondantes':'Identifiées'}</span><b>${p.owned}${goal?` <span class="of">/ ${goal}</span>`:''}</b>${p.pct===null?'':`<div class="pbar"><i style="width:${p.pct}%"></i></div>`}</div></div>
 ${p.open?'':`<div class="kpi2 glass"><div><span class="kl">À identifier</span><b>${p.unid}</b></div></div><div class="kpi2 glass"><div><span class="kl">Manquantes</span><b>${p.missing}</b></div></div>`}
 <div class="kpi2 glass"><div><span class="kl">Exemplaires</span><b>${p.copies}</b></div></div>
 ${goal?`<div class="kpi2 glass"><div><span class="kl">Objectif${s.goal&&s.goal.date?' · '+esc(dateFR(s.goal.date)):''}</span><b>${left===0?'Atteint':'Reste '+left}</b><small>${esc(when)}</small></div></div>`:''}</div>
 ${body}`;
}
function slotTile(x,sid){
 const sl=x.slot,im=x.items.find(i=>i.cover),cls=x.state;
 const sil=cls==='missing'?`<span class="sil">${ic(sl.type==='note'?'note':'coin',24)}</span>`:(im?`<img src="${esc(im.cover)}" alt="">`:`<span class="sil" style="border-style:solid">${ic('coin',24)}</span>`);
 return `<button class="slot ${cls}" data-act="slotOpen" data-s="${sid}" data-id="${sl.id}" title="${esc(sl.label)}">${cls==='unid'?`<span class="st">${ic('warn',14)}</span>`:''}${x.copies>1?`<span class="bx">×${x.copies}</span>`:''}${sil}<span class="sl">${esc(sl.label)}</span><span class="ss">${cls==='missing'?'manquante':cls==='unid'?'variante à identifier':''}</span></button>`;
}
/* suggestions à valider : entrées possédées qui ressemblent à une case manquante */
function serSuggestions(s,p){
 const used=new Set(p.items.map(i=>i.id)),cand=pool().filter(i=>i.status!=='wish'&&!used.has(i.id)),out=[];
 p.slots.filter(x=>x.state==='missing').forEach(x=>{
  const toks=ovn([x.slot.label,x.slot.denom].join(' ')).split(' ').filter(t=>t.length>1);if(!toks.length)return;
  cand.forEach(i=>{const hay=ovn([i.denomination,i.year,cname(i.country),i.mint].join(' '));if(toks.every(t=>hay.includes(t)))out.push([x.slot,i])});
 });
 if(!out.length)return'';
 return `<section class="panel glass" style="margin-top:16px"><h3>Associations possibles <span class="muted small">— à valider une par une</span></h3>${out.slice(0,12).map(([sl,i])=>`<div class="exrow"><span class="mini">${thumb(i,18)}</span><span><b>${esc(i.denomination)}</b> <span class="muted small">${esc(subtitle(i))}</span><br><span class="muted small">pourrait correspondre à la case « ${esc(sl.label)} »</span></span><button class="btn sm" data-act="slotLink" data-sid="${s.id}" data-slot="${sl.id}" data-item="${i.id}">Associer</button></div>`).join('')}</section>`;
}

/* ---------- création / édition ---------- */
const SERD={kind:'years'};
function serForm(s,kind){
 const k=s?(s.mode==='rule'?'rule':'free'):(kind||'years'),r=(s&&s.rule)||{},g=(s&&s.goal)||{};
 const cty=`<option value="">—</option>${COUNTRIES.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}`;
 promptModal(s?'Modifier la série':'Nouvelle série',`<div class="fgrid">
 <div class="fld wide"><label>Nom</label><input id="se_n" value="${esc(s?s.name:'')}" required placeholder="ex. Francs Semeuse, Monnaies romaines, 2 € commémoratives"></div>
 ${s?'':`<div class="fld wide"><label>Type de série</label><select id="se_k" data-ch="serKind"><option value="years" ${k==='years'?'selected':''}>À cases — millésimes d’un type de monnaie</option><option value="free" ${k==='free'?'selected':''}>À cases — liste libre</option><option value="rule" ${k==='rule'?'selected':''}>Ouverte — règle de recherche (total inconnu)</option></select></div>`}
 <div class="fld wide"><label>Description</label><textarea id="se_d" rows="2">${esc(s?s.desc||'':'')}</textarea></div>
 <div class="fld"><label>Objectif (nombre d’entrées)</label><input id="se_g" type="number" min="0" value="${g.count||''}" placeholder="facultatif"></div>
 <div class="fld"><label>Échéance de l’objectif</label><input id="se_gd" type="date" value="${esc(g.date||'')}"></div>
 <div id="se_years" class="fgrid wide" style="grid-column:1/-1" ${k==='years'&&!s?'':'hidden'}>
  <div class="fld"><label>Dénomination</label><input id="sy_d" placeholder="1 franc, 5 francs…"></div>
  <div class="fld"><label>Pays</label><select id="sy_c">${cty}</select></div>
  <div class="fld"><label>Année de début</label><input id="sy_a" type="number"></div><div class="fld"><label>Année de fin</label><input id="sy_b" type="number"></div>
  <div class="fld wide"><label>Ateliers (facultatif, séparés par des virgules → une case par atelier et par année)</label><input id="sy_m" placeholder="A, B, D"></div></div>
 <div id="se_free" class="fld wide" ${k==='free'&&!s?'':'hidden'}><label>Une case par ligne (« libellé » ou « libellé | année »)</label><textarea id="sf_l" rows="6" placeholder="Denier de Charlemagne&#10;Franc germinal | 1803"></textarea></div>
 <div id="se_rule" class="fgrid wide" style="grid-column:1/-1" ${k==='rule'?'':'hidden'}>
  <div class="fld"><label>Pays</label><select id="sr_c">${cty.replace(`value="${r.country||'∅'}"`,`value="${r.country}" selected`)}</select></div>
  <div class="fld"><label>Type</label><select id="sr_t"><option value="">Pièces et billets</option><option value="coin" ${r.type==='coin'?'selected':''}>Pièces</option><option value="note" ${r.type==='note'?'selected':''}>Billets</option></select></div>
  <div class="fld"><label>Année de … à …</label><div class="pair"><input id="sr_a" type="number" value="${esc(r.yearMin??'')}"><input id="sr_b" type="number" value="${esc(r.yearMax??'')}"></div></div>
  <div class="fld"><label>Métal contient</label><input id="sr_m" value="${esc(r.metal||'')}" placeholder="argent, or…"></div>
  <div class="fld"><label>Atelier contient</label><input id="sr_ma" value="${esc(r.mint||'')}"></div>
  <div class="fld"><label>Étiquette</label><input id="sr_tg" value="${esc(r.tag||'')}" list="dl_tags"></div>
  <div class="fld wide"><label>Recherche libre (même syntaxe que la barre de recherche)</label><input id="sr_q" value="${esc(r.q||'')}" placeholder='nom:"2 euro" tag:commemorative'></div></div>
 </div>`,'serOk','Enregistrer',s?`data-id="${s.id}"`:'');
 if(s&&s.mode==='rule'){const c=$('#sr_c');if(c&&r.country)c.value=r.country}
}
Object.assign(CH,{serKind:t=>{const k=t.value;$('#se_years').hidden=k!=='years';$('#se_free').hidden=k!=='free';$('#se_rule').hidden=k!=='rule'}});
SUBMIT.serOk=f=>{
 const name=$('#se_n').value.trim();if(!name)return;
 const goal={count:Math.max(0,parseInt($('#se_g').value)||0)||undefined,date:$('#se_gd').value||undefined};
 let s=f.dataset.id?serOf(f.dataset.id):null;
 const kind=s?(s.mode==='rule'?'rule':'free'):$('#se_k').value;
 if(!s){s={id:uid(),name,mode:kind==='rule'?'rule':'slots',color:SER_COLORS[state.series.length%SER_COLORS.length],slots:[]};state.series.push(s)}
 s.name=name;s.desc=$('#se_d').value.trim();s.goal=goal;
 if(kind==='rule'){s.rule={country:$('#sr_c').value||undefined,type:$('#sr_t').value||undefined,yearMin:$('#sr_a').value===''?undefined:+$('#sr_a').value,yearMax:$('#sr_b').value===''?undefined:+$('#sr_b').value,metal:$('#sr_m').value.trim()||undefined,mint:$('#sr_ma').value.trim()||undefined,tag:$('#sr_tg').value.trim()||undefined,q:$('#sr_q').value.trim()||undefined}}
 else if(!f.dataset.id&&kind==='years'){
  const d=$('#sy_d').value.trim(),a=parseInt($('#sy_a').value),b=parseInt($('#sy_b').value),ms=$('#sy_m').value.split(',').map(x=>x.trim()).filter(Boolean),c=$('#sy_c').value;
  if(!d||isNaN(a)||isNaN(b)||b<a||b-a>600){toast('Indiquez une dénomination et une période valide');state.series.pop();return}
  for(let y=a;y<=b;y++)(ms.length?ms:['']).forEach(m=>s.slots.push({id:uid(),label:`${d} ${y}${m?' '+m:''}`,denom:d,year:y,country:c||undefined,mint:m||undefined}));
 }else if(!f.dataset.id&&kind==='free'){
  $('#sf_l').value.split('\n').map(x=>x.trim()).filter(Boolean).forEach(line=>{const[l,y]=line.split('|').map(x=>x.trim());s.slots.push({id:uid(),label:l,year:y&&!isNaN(+y)?+y:undefined})});
 }
 savePrefs();closeModal();go('series:'+s.id);toast('Série enregistrée');
};
Object.assign(ACT,{
 serNew:()=>serForm(null),
 serTpl:t=>{
  if(t.dataset.k==='2eur'){const s={id:uid(),name:'2 € commémoratives',mode:'rule',color:SER_COLORS[0],desc:'Règle : dénomination « 2 euro » portant l’étiquette « commémorative ». Fixez un objectif : la liste officielle n’est pas embarquée.',slots:[],rule:{q:'nom:"2 euro" tag:commemorative'},goal:{}};state.series.push(s);savePrefs();go('series:'+s.id)}
 },
 serEdit:t=>{const s=serOf(t.dataset.id);if(s)serForm(s)},
 serDel:t=>{const s=serOf(t.dataset.id);if(!s||!confirm(`Supprimer la série « ${s.name} » ? Vos pièces ne sont pas touchées.`))return;state.series=state.series.filter(x=>x!==s);savePrefs();go('series')},
 slotNew:t=>slotForm(serOf(t.dataset.id),null),
 slotLink:t=>{const s=serOf(t.dataset.sid),sl=s&&s.slots.find(x=>x.id===t.dataset.slot);if(!sl)return;(sl.items=sl.items||[]).push(t.dataset.item);savePrefs();render();toast('Association enregistrée')},
 slotOpen:t=>{const s=serOf(t.dataset.s),sl=s&&s.slots.find(x=>x.id===t.dataset.id);if(!sl)return;slotModal(s,sl)},
 slotUnid:t=>{const s=serOf(t.dataset.s),sl=s.slots.find(x=>x.id===t.dataset.id);sl.unid=!sl.unid;if(!sl.unid)delete sl.unid;savePrefs();closeModal();render()},
 slotDel:t=>{const s=serOf(t.dataset.s);if(!confirm('Supprimer cette case ?'))return;s.slots=s.slots.filter(x=>x.id!==t.dataset.id);savePrefs();closeModal();render()},
 slotEdit:t=>{const s=serOf(t.dataset.s);slotForm(s,s.slots.find(x=>x.id===t.dataset.id))},
 slotAdd:t=>{const s=serOf(t.dataset.s),sl=s.slots.find(x=>x.id===t.dataset.id);closeModal();openForm(null,{status:t.dataset.st,denomination:sl.denom||sl.label,country:sl.country,year:sl.year,mint:sl.mint,type:sl.type||'coin',catalog:sl.ref,numista:sl.numista})},
 slotDetach:t=>{const s=serOf(t.dataset.s),sl=s.slots.find(x=>x.id===t.dataset.id);sl.items=(sl.items||[]).filter(i=>i!==t.dataset.item);savePrefs();closeModal();render()},
});
function slotModal(s,sl){
 const x=seriesProgress({...s,slots:[sl]},pool()).slots[0],wish=state.items.filter(i=>i.status==='wish'&&slotMatches({...sl,items:[]},{...i,status:'owned'}));
 openModal(`<div class="mhead"><div><h2>${esc(sl.label)}</h2><p class="muted">${x.state==='missing'?'Manquante':x.state==='unid'?'Possédée — variante à identifier':'Possédée'}${sl.variant?' · variante attendue : '+esc(sl.variant):''}</p></div><button class="x" data-act="close" aria-label="Fermer">${ic('x',22)}</button></div>
 ${sl.ref||sl.numista?`<p class="small">${sl.ref?'Référence : <b>'+esc(sl.ref)+'</b> ':''}${sl.numista&&/\d/.test(sl.numista)?`<a class="btn sm" target="_blank" rel="noopener noreferrer" href="https://fr.numista.com/catalogue/pieces${String(sl.numista).replace(/\D/g,'')}.html">Fiche Numista</a>`:''}</p>`:''}
 ${x.items.length?`<div class="rows glass">${x.items.map(i=>`<div class="row" data-act="open" data-id="${i.id}"><span class="mini">${thumb(i,20)}</span><b>${esc(i.denomination)}</b><span class="muted">${esc(subtitle(i))}</span><span>${esc(i.grade||'')}${qtyOf(i)>1?' ×'+qtyOf(i):''}</span><span class="r">${(sl.items||[]).includes(i.id)?`<button class="btn sm" data-act="slotDetach" data-s="${s.id}" data-id="${sl.id}" data-item="${i.id}" title="Retirer le lien manuel">Délier</button>`:''}</span></div>`).join('')}</div>`:''}
 ${wish.length?`<p class="small muted">Déjà dans la wishlist : ${wish.map(w=>esc(w.denomination)).join(', ')}.</p>`:''}
 <div class="actions end" style="flex-wrap:wrap">
  ${x.items.length?`<button class="btn" data-act="slotUnid" data-s="${s.id}" data-id="${sl.id}">${sl.unid?'Variante identifiée':'Marquer « variante à identifier »'}</button>`:`<button class="btn" data-act="slotAdd" data-s="${s.id}" data-id="${sl.id}" data-st="wish">${ic('star',16)} Ajouter aux souhaits</button><button class="btn primary" data-act="slotAdd" data-s="${s.id}" data-id="${sl.id}" data-st="owned">${ic('plus',16)} Je l’ai : ajouter</button>`}
  <button class="btn" data-act="slotEdit" data-s="${s.id}" data-id="${sl.id}">${ic('edit',16)} Modifier la case</button><button class="btn danger" data-act="slotDel" data-s="${s.id}" data-id="${sl.id}">${ic('trash',16)}</button></div>`);
}
function slotForm(s,sl){
 promptModal(sl?'Modifier la case':'Nouvelle case',`<div class="fgrid">
 <div class="fld wide"><label>Libellé</label><input id="sl_l" required value="${esc(sl?sl.label:'')}"></div>
 <div class="fld"><label>Dénomination (critère)</label><input id="sl_d" value="${esc(sl&&sl.denom||'')}"></div>
 <div class="fld"><label>Année (critère)</label><input id="sl_y" type="number" value="${esc(sl&&sl.year!==undefined?sl.year:'')}"></div>
 <div class="fld"><label>Pays (critère)</label><select id="sl_c"><option value="">—</option>${COUNTRIES.map(c=>`<option value="${c.id}" ${sl&&sl.country===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
 <div class="fld"><label>Atelier (critère)</label><input id="sl_m" value="${esc(sl&&sl.mint||'')}"></div>
 <div class="fld"><label>Variante attendue</label><input id="sl_v" value="${esc(sl&&sl.variant||'')}" placeholder="comparée au champ « Variété » des fiches"></div>
 <div class="fld"><label>Référence de catalogue</label><input id="sl_r" value="${esc(sl&&sl.ref||'')}" placeholder="KM# 123"></div>
 <div class="fld"><label>N° Numista</label><input id="sl_n" value="${esc(sl&&sl.numista||'')}"></div></div>
 <p class="muted small">Sans critère, la case n’est liée qu’aux pièces que vous lui associez à la main.</p>`,'slotOk','Enregistrer',`data-s="${s.id}" ${sl?`data-id="${sl.id}"`:''}`);
}
SUBMIT.slotOk=f=>{
 const s=serOf(f.dataset.s);if(!s)return;
 const v=id=>$(id).value.trim(),d={label:v('#sl_l'),denom:v('#sl_d')||undefined,year:v('#sl_y')===''?undefined:+v('#sl_y'),country:$('#sl_c').value||undefined,mint:v('#sl_m')||undefined,variant:v('#sl_v')||undefined,ref:v('#sl_r')||undefined,numista:v('#sl_n')||undefined};
 if(!d.label)return;
 if(f.dataset.id)Object.assign(s.slots.find(x=>x.id===f.dataset.id),d);else s.slots.push({id:uid(),...d});
 savePrefs();closeModal();render();
};
/* appartenance dans la fiche */
EXT.detail.push(it=>{
 if(vit()||!state.series.length)return'';
 const l=state.series.filter(s=>seriesProgress(s,[it]).items.length);
 return l.length?`<section class="vhist"><h3>Séries</h3><div class="chips" style="margin-top:6px">${l.map(s=>`<button class="chip acc" data-act="navClose" data-v="series:${s.id}">${esc(s.name)}</button>`).join('')}</div></section>`:'';
});

ACT.navClose=t=>{closeModal();go(t.dataset.v)};
