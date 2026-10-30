'use strict';
/* =====================================================================
   OUTILS DE RÉFÉRENCE (page Outils)
   1. Convertisseur de poids anciens. Valeurs d'étalons « usuels » : les poids réels varient selon la ville, l'époque
      et l'atelier, d'où le signe ≈ partout. À employer pour situer un ordre de grandeur, pas pour authentifier.
   2. Poinçons et contremarques : petite base de départ, volontairement prudente, que vous complétez vous-même.
   3. Symboles et différents : puces qui filtrent la collection sur le champ « Symboles et marques ».
   ===================================================================== */
const WEIGHTS=[
 ['g','Gramme',1,'Système métrique'],['ct','Carat métrique',.2,'Pierres, perles'],
 ['ozt','Once troy',31.1035,'Métaux précieux (cours de l’or)'],['grt','Grain troy',.06480,'1/480 d’once troy'],['oz','Once avoirdupois',28.3495,'Commerce anglo-saxon'],['lb','Livre avoirdupois',453.592,''],
 ['lp','Livre de Paris (poids de marc)',489.5,'Ancien Régime, France'],['marc','Marc de Paris',244.75,'½ livre : poids des monnaies et de l’orfèvrerie'],['once','Once de Paris',30.59,'1/8 de marc'],['gros','Gros',3.824,'1/8 d’once'],['dp','Denier de poids',1.275,'1/3 de gros'],['gr','Grain de poids',.0531,'1/24 de denier'],
 ['libra','Libra romaine',327.45,'Rome, étalon usuel'],['unc','Uncia romaine',27.29,'1/12 de libra'],['scr','Scrupulum romain',1.137,'1/288 de libra'],['den','Denier romain (poids théorique)',3.9,'≈ 1/84 de libra, République tardive'],
 ['dra','Drachme attique',4.3,'Étalon attique ; autres cités : valeurs différentes'],['obo','Obole attique',.717,'1/6 de drachme'],
 ['lcar','Livre carolingienne',408,'≈ 408 g, Charlemagne (variable selon les sources)'],['scar','Sou carolingien',20.4,'1/20 de livre'],['dcar','Denier carolingien',1.7,'1/240 de livre (≈ 1,7 g)'],
];
const wFmt=g=>g>=100?g.toFixed(1):g>=1?g.toFixed(2):g.toFixed(4);
function weightsOut(){
 const v=parseFloat($('#wt_v')?.value),u=WEIGHTS.find(w=>w[0]===($('#wt_u')?.value||'g'));
 if(!u||!isFinite(v)||v<=0)return '—';
 const g=v*u[2];
 return `<b>≈ ${wFmt(g).replace('.',',')} g</b><div class="small muted" style="margin-top:6px">${WEIGHTS.filter(w=>w!==u&&w[0]!=='g').map(w=>`${(g/w[2]>=100?(g/w[2]).toFixed(0):(g/w[2]).toFixed(2)).replace('.',',')} ${w[1].toLowerCase()}`).slice(0,8).join(' · ')}</div>`;
}
document.addEventListener('input',e=>{if(e.target.id==='wt_v'||e.target.id==='wt_u')$('#wt_r').innerHTML=weightsOut()});
document.addEventListener('change',e=>{if(e.target.id==='wt_u')$('#wt_r').innerHTML=weightsOut()});

/* ---------- poinçons et contremarques ---------- */
const HM_SEED=[
 {id:'s1',name:'Tête d’aigle',kind:'poinçon',metal:'Or',place:'France',period:'depuis 1838',desc:'Garantie de l’or au titre de 750 ‰ (18 carats).'},
 {id:'s2',name:'Minerve',kind:'poinçon',metal:'Argent',place:'France',period:'depuis 1838',desc:'Garantie de l’argent : 1er titre à 950 ‰, 2e titre à 800 ‰ (le chiffre 1 ou 2 figure dans le poinçon).'},
 {id:'s3',name:'Tête de chien',kind:'poinçon',metal:'Platine',place:'France',period:'depuis 1912',desc:'Garantie du platine à 950 ‰.'},
 {id:'s4',name:'Lion passant',kind:'poinçon',metal:'Argent',place:'Royaume-Uni',period:'depuis le XVIe s.',desc:'Argent sterling (925 ‰), associé à la marque de la ville d’essai et à une lettre-date.'},
 {id:'s5',name:'Tête de léopard couronnée',kind:'poinçon',metal:'Or, argent',place:'Londres',period:'depuis le Moyen Âge',desc:'Marque de la ville d’essai de Londres (Goldsmiths’ Hall).'},
 {id:'s6',name:'Petite tête de George III',kind:'contremarque',metal:'Argent',place:'Royaume-Uni',period:'1797',desc:'Contremarque apposée sur des dollars espagnols pour les faire circuler comme monnaie de la Banque d’Angleterre.'},
];
const hmAll=()=>[...HM_SEED.map(h=>({...h,seed:1})),...(state.hallmarks||[])];
const HMQ={q:'',k:''};
function hmList(){
 const q=norm(HMQ.q);
 return hmAll().filter(h=>(!HMQ.k||h.kind===HMQ.k)&&(!q||norm([h.name,h.metal,h.place,h.period,h.desc].join(' ')).includes(q)));
}
function hmRows(){return hmList().map(h=>`<div class="exrow"><span><b>${esc(h.name)}</b> <span class="chip sm">${esc(h.kind)}</span><br><span class="muted small">${esc([h.metal,h.place,h.period].filter(Boolean).join(' · '))}</span><br>${esc(h.desc||'')}</span>${h.seed?'<span></span>':`<span><button class="btn sm" data-act="hmEdit" data-id="${h.id}" aria-label="Modifier">${ic('pen',14)}</button> <button class="btn sm danger" data-act="hmDel" data-id="${h.id}" aria-label="Supprimer">${ic('trash',14)}</button></span>`}</div>`).join('')||'<p class="muted">Aucune entrée.</p>'}
const hmPanel=()=>`<section class="panel glass" id="hmTool"><div class="mhead" style="margin-bottom:6px"><h2>Poinçons et contremarques</h2><button class="btn sm" data-act="hmAdd">${ic('plus',14)} Ajouter</button></div>
 <p class="muted small" style="margin-bottom:10px">Base de départ volontairement courte : à vérifier dans une référence spécialisée avant toute attribution. Vos propres entrées sont conservées avec vos données.</p>
 <div class="actions" style="margin-bottom:8px"><label class="search" style="max-width:320px">${ic('search')}<input id="hm_q" placeholder="Nom, métal, pays…" value="${esc(HMQ.q)}"></label>
 <select id="hm_k"><option value="">Tous types</option><option value="poinçon" ${HMQ.k==='poinçon'?'selected':''}>Poinçons</option><option value="contremarque" ${HMQ.k==='contremarque'?'selected':''}>Contremarques</option></select></div>
 <div id="hm_list">${hmRows()}</div></section>`;
document.addEventListener('input',e=>{if(e.target.id==='hm_q'){HMQ.q=e.target.value;$('#hm_list').innerHTML=hmRows()}});
document.addEventListener('change',e=>{if(e.target.id==='hm_k'){HMQ.k=e.target.value;$('#hm_list').innerHTML=hmRows()}});
function hmForm(h){
 h=h||{};
 promptModal(h.id?'Modifier l’entrée':'Nouvelle entrée',`<input type="hidden" id="hm_id" value="${esc(h.id||'')}"><div class="fgrid">
  <div class="fld wide"><label>Nom du poinçon ou de la contremarque</label><input id="hm_n" value="${esc(h.name||'')}" required></div>
  <div class="fld"><label>Type</label><select id="hm_t"><option ${h.kind==='contremarque'?'':'selected'}>poinçon</option><option ${h.kind==='contremarque'?'selected':''}>contremarque</option></select></div>
  <div class="fld"><label>Métal</label><input id="hm_m" value="${esc(h.metal||'')}"></div>
  <div class="fld"><label>Lieu</label><input id="hm_p" value="${esc(h.place||'')}"></div><div class="fld"><label>Période</label><input id="hm_d" value="${esc(h.period||'')}"></div>
  <div class="fld wide"><label>Description</label><textarea id="hm_e" rows="3">${esc(h.desc||'')}</textarea></div></div>`,'hmOk','Enregistrer');
}
SUBMIT.hmOk=()=>{
 const id=$('#hm_id').value,h={id:id||uid(),name:$('#hm_n').value.trim(),kind:$('#hm_t').value,metal:$('#hm_m').value.trim(),place:$('#hm_p').value.trim(),period:$('#hm_d').value.trim(),desc:$('#hm_e').value.trim()};
 if(!h.name)return;state.hallmarks=state.hallmarks||[];
 const i=state.hallmarks.findIndex(x=>x.id===id);if(i>=0)state.hallmarks[i]=h;else state.hallmarks.push(h);
 savePrefs();closeModal();render();
};
Object.assign(ACT,{hmAdd:()=>hmForm(),hmEdit:t=>hmForm((state.hallmarks||[]).find(h=>h.id===t.dataset.id)),
 hmDel:t=>{state.hallmarks=(state.hallmarks||[]).filter(h=>h.id!==t.dataset.id);savePrefs();render()}});

/* ---------- symboles et différents ---------- */
const SYMS=[['☧','Chrisme'],['✝','Croix'],['★','Étoile'],['☪','Croissant'],['♛','Couronne'],['⚜','Fleur de lys'],['⚓','Ancre'],['☀','Soleil'],['🦅','Aigle'],['🦉','Chouette'],['🐢','Tortue'],['🐬','Dauphin'],['🦁','Lion'],['🌾','Épi de blé'],['🏛','Temple'],['⚔','Épées']];
function symPanel(){
 const cnt=new Map();state.items.forEach(it=>String(it.symbols||'').split(/[,;]+/).map(x=>x.trim()).filter(Boolean).forEach(x=>cnt.set(x,(cnt.get(x)||0)+1)));
 const mine=[...cnt].sort((a,b)=>b[1]-a[1]).slice(0,30);
 const n=w=>state.items.filter(i=>norm(String(i.symbols||'')).includes(norm(w))).length;
 return `<section class="panel glass" id="symTool"><h2>Symboles et différents</h2>
 <p class="muted small" style="margin-bottom:10px">Cliquez un symbole pour lister les pièces dont le champ « Symboles et marques » le mentionne (aigle, croix, monogramme, différent d’atelier…).</p>
 <div class="chips">${SYMS.map(([g,l])=>`<button class="chip" data-act="symFind" data-v="${esc(l)}" title="${esc(l)}">${g} ${esc(l)} <span class="muted">${n(l)}</span></button>`).join('')}</div>
 ${mine.length?`<h3 style="margin:14px 0 6px;font-size:.95rem">Dans votre collection</h3><div class="chips">${mine.map(([x,c])=>`<button class="chip" data-act="symFind" data-v="${esc(x)}">${esc(x)} <span class="muted">${c}</span></button>`).join('')}</div>`:'<p class="muted small" style="margin-top:10px">Renseignez le champ « Symboles et marques » dans vos fiches : vos propres symboles apparaîtront ici.</p>'}</section>`;
}
ACT.symFind=t=>go("collection",{filters:{q:`symbole:${/\s/.test(t.dataset.v)?`"${t.dataset.v}"`:t.dataset.v}`}});

/* ---------- convertisseur : panneau ---------- */
const wtPanel=()=>`<section class="panel glass" id="wtTool"><h2>Poids anciens</h2><p class="muted" style="margin-bottom:10px">Convertit une unité historique en grammes et dans les autres étalons. Valeurs approchées : le poids réel d’une unité dépend de la ville et de l’époque.</p>
 <div class="calc"><div><label>Quantité</label><input id="wt_v" type="number" step="any" min="0" placeholder="1"></div><div><label>Unité</label><select id="wt_u">${WEIGHTS.map(w=>`<option value="${w[0]}">${w[1]} (≈ ${wFmt(w[2]).replace('.',',')} g)</option>`).join('')}</select></div></div>
 <div class="res" id="wt_r">—</div></section>`;

EXT.tools.push(wtPanel,hmPanel,symPanel);
