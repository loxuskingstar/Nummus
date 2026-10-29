'use strict';
/* =====================================================================
   PISTES (variétés et anomalies) ET INDICATEURS DE DIVERSITÉ
   Pistes : comparaison de vos fiches ENTRE ELLES (pas de base de référence externe). Chaque résultat est une
   piste à examiner (pesée, mesure ou saisie à revérifier), jamais une preuve d'authenticité, de rareté ou
   d'erreur de frappe. Chaque piste peut être écartée ; ce choix est conservé.
   Diversité : indicateurs descriptifs (effectifs, répartitions, évolution). Aucune note de qualité.
   ===================================================================== */
addModule('insights','Pistes et diversité','compare','Comparer deux exemplaires, repérer des écarts à vérifier, mesurer la diversité de la collection.',{after:'stats'});
const INS_TABS=[['diversity','Diversité'],['leads','Pistes à examiner'],['compare','Comparer deux exemplaires'],['goals','Objectifs de diversité']];
const insTab=()=>ui.insTab||'diversity';
EXT.views.insights=function viewInsights(){
 const t=insTab();
 return `<header class="head"><div><h1>Pistes et diversité</h1><p class="sub">Des indicateurs descriptifs et des pistes à vérifier. Rien ici n’est une note de qualité, une expertise ou une preuve.</p></div><div class="actions"><div class="seg">${INS_TABS.map(([k,l])=>`<button data-act="insTab" data-v="${k}" class="${t===k?'on':''}">${l}</button>`).join('')}</div></div></header>
 ${t==='diversity'?viewDiversity():t==='leads'?viewLeads():t==='compare'?viewCompare():viewGoals()}`;
};
EXT.after.insights=()=>{if(insTab()==='compare')drawCompare()};
ACT.insTab=t=>{ui.insTab=t.dataset.v;render()};

/* ================= diversité ================= */
const periodOf=i=>{if(!hasYear(i))return null;const y=+i.year;return(PERIODS.find(p=>(p[2]===null||y>=p[2])&&(p[3]===null||y<=p[3]))||[])[0]||null};
const DIMS={country:['Pays',i=>i.country?cname(i.country):null],period:['Époque',i=>{const p=PERIODS.find(x=>x[0]===periodOf(i));return p?p[1]:null}],metal:['Métal',i=>i.metal?String(i.metal).split(/[\s(]/)[0].toLowerCase().replace(/^./,c=>c.toUpperCase()):null],mint:['Atelier',i=>i.mint?String(i.mint).trim():null],issuer:['Autorité émettrice',i=>i.issuer?String(i.issuer).trim():null],type:['Pièces / billets',i=>i.type==='note'?'Billets':'Pièces'],axis:['Frappe (axe des coins)',i=>i.axis?({'12':'Médaille (↑↑)','6':'Monnaie (↑↓)',other:'Autre / irrégulière'})[i.axis]||null:null]};
function tallyBy(list,fn){const m=new Map();let none=0;list.forEach(i=>{const k=fn(i);if(k===null||k===undefined||k==='')none++;else m.set(k,(m.get(k)||0)+1)});return{rows:[...m.entries()].sort((a,b)=>b[1]-a[1]),none}}
function distBars(title,list,fn,top=10){
 const t=tallyBy(list,fn);if(!t.rows.length)return `<section class="panel glass"><h3>${esc(title)}</h3><p class="muted small">Aucune donnée renseignée.</p></section>`;
 const max=t.rows[0][1];
 return `<section class="panel glass"><h3>${esc(title)} <span class="muted small">· ${pl(t.rows.length,'valeur distincte','valeurs distinctes')}</span></h3><div class="dbars" style="margin-top:8px">${t.rows.slice(0,top).map(([k,n])=>`<div class="dbar"><span title="${esc(k)}">${esc(k)}</span><i style="width:${Math.max(2,n/max*100)}%"></i><b>${n}</b></div>`).join('')}</div>${t.rows.length>top?`<p class="muted small">+ ${t.rows.length-top} autres</p>`:''}${t.none?`<p class="muted small">${pl(t.none,'entrée sans cette donnée','entrées sans cette donnée')}.</p>`:''}</section>`;
}
function viewDiversity(){
 const own=pool().filter(i=>i.status!=='wish');if(!own.length)return `<div class="empty glass"><b>Pas encore de données</b><p>Ajoutez des entrées pour voir leurs répartitions.</p></div>`;
 const d=k=>tallyBy(own,DIMS[k][1]).rows.length;
 return `<div class="tm-kpis"><div class="kpi2 glass"><div><span class="kl">Entrées</span><b>${own.length}</b></div></div><div class="kpi2 glass"><div><span class="kl">Pays</span><b>${d('country')}</b></div></div><div class="kpi2 glass"><div><span class="kl">Époques</span><b>${d('period')}</b></div></div><div class="kpi2 glass"><div><span class="kl">Ateliers</span><b>${d('mint')}</b></div></div><div class="kpi2 glass"><div><span class="kl">Autorités émettrices</span><b>${d('issuer')}</b></div></div></div>
 <div class="dgrid2">${distBars('Pays',own,DIMS.country[1])}${distBars('Époques',own,DIMS.period[1],8)}${distBars('Métaux',own,DIMS.metal[1])}${distBars('Ateliers',own,DIMS.mint[1])}${distBars('Autorités émettrices',own,DIMS.issuer[1])}${distBars('Frappe (axe des coins)',own,DIMS.axis[1])}</div>
 <section class="panel glass" style="margin-top:16px"><h3>Évolution dans le temps <span class="muted small">· d’après le journal, à partir du ${esc(dateFR(historyStart()||Date.now()))}</span></h3>${diversityOverTime()}</section>
 ${seriesOverTime()}
 <p class="muted small" style="margin-top:12px">Ces chiffres décrivent la collection telle qu’elle est saisie ; ils dépendent des champs renseignés et ne jugent pas sa valeur ni sa qualité.</p>`;
}
function dailyStates(){ // [{date, items:[snapshots possédés]}] un point par jour d'activité + aujourd'hui
 const m=new Map(),out=[];let day=null;
 const flush=()=>out.push({date:day,items:[...m.entries()].filter(([,s])=>s.status!=='wish').map(([id,s])=>({id,...s}))});
 for(const e of state.events){const d=isoDay(e.t);if(day!==null&&d!==day)flush();day=d;if(e.kind==='put')m.set(e.id,e.snap);else if(e.kind==='del')m.delete(e.id)}
 if(day!==null)flush();return out;
}
function diversityOverTime(){
 const st=dailyStates();if(st.length<2)return '<p class="muted small" style="margin-top:6px">Le journal ne couvre qu’un jour pour l’instant : les courbes apparaîtront avec le temps.</p>';
 const line=(label,fn)=>`<div><h4 style="margin:10px 0 2px">${label}</h4><div class="chartbox">${histChart(st.map(s=>({date:s.date,value:new Set(s.items.map(fn).filter(Boolean)).size})))}</div></div>`;
 return `<div class="dgrid2">${line('Pays distincts',i=>i.country)}${line('Époques distinctes',periodOf)}${line('Ateliers distincts',i=>ovn(i.mint))}</div>`;
}
function seriesOverTime(){
 if(!state.series.length)return'';const st=dailyStates();if(st.length<2)return'';
 return `<section class="panel glass" style="margin-top:16px"><h3>Progression des séries dans le temps</h3><div class="dgrid2">${state.series.map(s=>`<div><h4 style="margin:10px 0 2px">${esc(s.name)}</h4><div class="chartbox">${histChart(st.map(x=>({date:x.date,value:seriesProgress(s,x.items).owned})))}</div></div>`).join('')}</div></section>`;
}

/* ================= objectifs de diversité ================= */
function goalCount(g){const own=pool().filter(i=>i.status!=='wish');return own.filter(i=>{const v=DIMS[g.dim][1](i);return v!==null&&norm(v)===norm(g.value)}).length}
function viewGoals(){
 const l=state.goals.map(g=>({g,n:goalCount(g)})).sort((a,b)=>(b.g.target-b.n)-(a.g.target-a.n));
 return `<div class="actions" style="margin-bottom:12px"><button class="btn primary" data-act="goalNew">${ic('plus')} Nouvel objectif</button></div>
 ${l.length?`<section class="panel glass"><h3>Objectifs et effectifs actuels</h3>${l.map(({g,n})=>{const gap=Math.max(0,g.target-n);return `<div class="dbar" style="grid-template-columns:minmax(120px,240px) 1fr 90px 32px;margin:8px 0"><span>${esc(DIMS[g.dim][0])} : <b>${esc(g.value)}</b></span><div class="pbar" style="margin:0"><i style="width:${Math.min(100,n/(g.target||1)*100)}%"></i></div><span>${n} / ${g.target}${gap?` <span class="muted small">(−${gap})</span>`:''}</span><button class="x" data-act="goalDel" data-id="${g.id}" aria-label="Supprimer">${ic('x',14)}</button></div>`}).join('')}<p class="muted small" style="margin-top:8px">Classés des plus sous-représentés (par rapport à vos objectifs) aux plus avancés.</p></section>`
 :`<div class="empty glass"><b>Aucun objectif</b><p>Exemples : « Pays : Italie → 10 » ou « Époque : Antiquité → 15 ». Les écarts apparaissent ici, sans jugement.</p></div>`}`;
}
ACT.goalNew=()=>promptModal('Nouvel objectif de diversité',`<div class="fgrid"><div class="fld"><label>Dimension</label><select id="go_d" data-ch="goalDim">${opt(['country','period','metal','mint','issuer','type'].map(k=>[k,DIMS[k][0]]),'country')}</select></div><div class="fld"><label>Valeur</label><input id="go_v" list="go_list" required placeholder="ex. Italie" autocomplete="off"><datalist id="go_list">${goalValues('country')}</datalist></div><div class="fld"><label>Objectif (nombre d’entrées)</label><input id="go_t" type="number" min="1" required></div></div>`,'goalOk','Ajouter');
const goalValues=k=>tallyBy(pool().filter(i=>i.status!=='wish'),DIMS[k][1]).rows.map(r=>`<option value="${esc(r[0])}">`).join('')+(k==='period'?PERIODS.map(p=>`<option value="${esc(p[1])}">`).join(''):'');
CH.goalDim=t=>{const dl=$('#go_list');if(dl)dl.innerHTML=goalValues(t.value)};
SUBMIT.goalOk=()=>{const v=$('#go_v').value.trim(),n=parseInt($('#go_t').value);if(!v||!(n>0))return;state.goals.push({id:uid(),dim:$('#go_d').value,value:v,target:n});savePrefs();closeModal();render()};
ACT.goalDel=t=>{state.goals=state.goals.filter(g=>g.id!==t.dataset.id);savePrefs();render()};

/* ================= pistes ================= */
const median=a=>{const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};
const leadId=(...p)=>'L'+hash(p.join('|')).toString(36);
function computeLeads(){
 const own=pool().filter(i=>i.status!=='wish'),A=state.settings.anomaly,leads=[];
 const group=(keyFn)=>{const m=new Map();own.forEach(i=>{const k=keyFn(i);if(k)(m.get(k)||m.set(k,[]).get(k)).push(i)});return m};
 // 1) poids / diamètre inhabituels : écart à la médiane des fiches de même dénomination, pays et métal
 group(i=>i.denomination&&i.country?[i.type,i.country,ovn(i.denomination),ovn(i.metal)].join('|'):null).forEach(g=>{
  if(g.length<3)return;
  [['weight','Poids','g',A.weight],['diameter','Diamètre','mm',A.diameter]].forEach(([f,lab,u,th])=>{
   const vals=g.filter(i=>!isEmpty(i[f])&&+i[f]>0);if(vals.length<3)return;const med=median(vals.map(i=>+i[f]));
   vals.forEach(i=>{const dev=(+i[f]-med)/med*100;if(Math.abs(dev)>th)leads.push({id:leadId(f,i.id),kind:f,a:i,b:vals.find(x=>x!==i&&Math.abs((+x[f]-med)/med*100)<=th)||null,title:`${lab} inhabituel : ${i[f]} ${u}`,why:`Médiane de ${vals.length} fiches comparables : ${(+med.toFixed(2))} ${u} (écart ${dev>0?'+':''}${dev.toFixed(1).replace('.',',')} %, seuil ${th} %). Peut venir d’une pesée, d’une usure, d’une saisie ou d’un type différent.`})});
  });
 });
 // 2) métal ou titre différent entre fiches de même dénomination, pays et millésime
 group(i=>i.denomination&&i.country&&hasYear(i)?[i.type,i.country,ovn(i.denomination),i.year].join('|'):null).forEach(g=>{
  if(g.length<2)return;
  const metals=new Set(g.filter(i=>i.metal).map(i=>ovn(i.metal))),fin=new Set(g.filter(i=>!isEmpty(i.fineness)).map(i=>+i.fineness));
  if(metals.size>1||fin.size>1)leads.push({id:leadId('metal',...g.map(i=>i.id).sort()),kind:'metal',a:g[0],b:g[1],title:`Métal ou titre différent pour un même millésime (${g[0].denomination} ${fmtYear(g[0].year)})`,why:`Valeurs saisies : ${[...new Set(g.map(i=>[i.metal,isEmpty(i.fineness)?'':i.fineness+'‰'].filter(Boolean).join(' ')))].filter(Boolean).join(' / ')}. Une des saisies est peut-être à corriger — ou il existe deux émissions.`});
  // 3) variétés / légendes documentées différemment
  const vs=g.filter(i=>i.variety||i.obverse||i.reverse);
  const vset=new Set(g.map(i=>ovn(i.variety)).filter(Boolean));
  if(vset.size>1)leads.push({id:leadId('variety',...g.map(i=>i.id).sort()),kind:'variety',a:g.find(i=>i.variety),b:g.find(i=>i.variety&&ovn(i.variety)!==ovn(g.find(x=>x.variety).variety)),title:`Variétés différentes notées pour un même millésime`,why:`Variétés saisies : ${[...vset].join(' / ')}. À confronter à un catalogue de référence.`});
 });
 // 4) atelier différent de la majorité pour un même type et millésime
 group(i=>i.denomination&&i.country&&hasYear(i)&&i.mint?[i.type,i.country,ovn(i.denomination),i.year].join('|'):null).forEach(g=>{
  if(g.length<4)return;const c=new Map();g.forEach(i=>c.set(ovn(i.mint),(c.get(ovn(i.mint))||0)+1));const [top,n]=[...c.entries()].sort((a,b)=>b[1]-a[1])[0];if(n/g.length<.7)return;
  g.filter(i=>ovn(i.mint)!==top).forEach(i=>leads.push({id:leadId('mint',i.id),kind:'mint',a:i,b:g.find(x=>ovn(x.mint)===top),title:`Atelier minoritaire : ${i.mint}`,why:`${n} fiches sur ${g.length} indiquent « ${g.find(x=>ovn(x.mint)===top).mint} » pour ce millésime. Vérifiez la lecture de la marque d’atelier.`}));
 });
 return leads.filter(l=>!state.dismissed[l.id]);
}
function viewLeads(){
 const l=computeLeads(),A=state.settings.anomaly;
 return `<div class="notice warn">${ic('warn',18)}<span><b>À lire d’abord.</b> Ces pistes comparent vos fiches entre elles ; il n’y a pas de base de référence externe. Elles signalent des écarts à examiner, <b>jamais</b> une preuve de faux, de rareté ou d’erreur de frappe.</span></div>
 <div class="fgrid" style="max-width:520px;margin-bottom:14px"><div class="fld"><label>Seuil d’écart de poids (%)</label><input type="number" min="0.5" step="0.5" data-ch="anW" value="${A.weight}"></div><div class="fld"><label>Seuil d’écart de diamètre (%)</label><input type="number" min="0.5" step="0.5" data-ch="anD" value="${A.diameter}"></div></div>
 ${l.length?l.map(x=>`<div class="lead glass"><div><b>${esc(x.title)}</b><div class="why">${esc(x.why)}</div><div class="small muted" style="margin-top:4px">Fiche : ${esc(x.a.denomination)} ${esc(fmtYear(x.a.year))}</div></div><div class="actions" style="flex-wrap:wrap"><button class="btn sm" data-act="open" data-id="${x.a.id}">Fiche</button>${x.b?`<button class="btn sm" data-act="insCmp" data-a="${x.a.id}" data-b="${x.b.id}">${ic('compare',14)} Comparer</button>`:''}<button class="btn sm" data-act="leadDismiss" data-id="${x.id}">Écarter</button></div></div>`).join(''):`<div class="empty glass"><b>Aucune piste</b><p>Rien à signaler avec les seuils actuels. Les comparaisons demandent au moins 3 fiches de même dénomination, pays et métal (poids, diamètre) ou 2 fiches du même millésime.</p></div>`}
 ${Object.keys(state.dismissed).length?`<p style="margin-top:12px"><button class="btn sm" data-act="leadReset">Réafficher les pistes écartées (${Object.keys(state.dismissed).length})</button></p>`:''}`;
}
Object.assign(ACT,{
 leadDismiss:t=>{state.dismissed[t.dataset.id]=1;savePrefs();render()},
 leadReset:()=>{state.dismissed={};savePrefs();render()},
 insCmp:t=>{CMP.a=t.dataset.a;CMP.b=t.dataset.b;ui.insTab='compare';if(view!=='insights')go('insights');else render()},
});
Object.assign(CH,{anW:t=>{state.settings.anomaly.weight=Math.max(.5,+t.value||3);savePrefs();render()},anD:t=>{state.settings.anomaly.diameter=Math.max(.5,+t.value||2);savePrefs();render()}});

/* ================= comparaison visuelle ================= */
const CMP={a:'',b:'',mode:'side',op:50};
const CMP_F=['year','mint','metal','fineness','weight','diameter','edge','axis','grade','variety','rarity','obverse','reverse'];
function viewCompare(){
 const own=state.items.filter(i=>i.status!=='wish').sort((a,b)=>String(a.denomination).localeCompare(String(b.denomination),'fr',{numeric:true}));
 const sel=(id,cur)=>`<select data-ch="${id}" aria-label="Exemplaire"><option value="">— choisir —</option>${own.map(i=>`<option value="${i.id}" ${i.id===cur?'selected':''}>${esc(i.denomination)} ${esc(fmtYear(i.year))}${i.mint?' ('+esc(i.mint)+')':''}</option>`).join('')}</select>`;
 return `<div class="toolbar">${sel('cmpA',CMP.a)}${sel('cmpB',CMP.b)}<div class="seg"><button data-act="cmpMode" data-v="side" class="${CMP.mode==='side'?'on':''}">Côte à côte</button><button data-act="cmpMode" data-v="overlay" class="${CMP.mode==='overlay'?'on':''}">Superposition</button></div></div><div id="cmpbox"></div>`;
}
Object.assign(CH,{cmpA:t=>{CMP.a=t.value;drawCompare()},cmpB:t=>{CMP.b=t.value;drawCompare()}});
ACT.cmpMode=t=>{CMP.mode=t.dataset.v;render()};
async function cmpImgs(it){
 const out={front:'',back:''};if(!it)return out;
 for(const m of it.imgs||[]){if(m.role!=='front'&&m.role!=='back')continue;if(out[m.role])continue;try{const b=await Store.images.get(state.userId,m.id);if(b)out[m.role]=await blobToData(b)}catch(e){}}
 if(!out.front&&it.cover)out.front=it.cover;return out;
}
async function drawCompare(){
 const box=$('#cmpbox');if(!box)return;const a=state.items.find(i=>i.id===CMP.a),b=state.items.find(i=>i.id===CMP.b);
 if(!a||!b){box.innerHTML='<div class="empty glass"><b>Choisissez deux exemplaires</b><p>Idéalement du même type (même dénomination et millésime) pour repérer des différences visuelles.</p></div>';return}
 const [ia,ib]=await Promise.all([cmpImgs(a),cmpImgs(b)]);if(!$('#cmpbox'))return;
 const img=(s,al)=>s?`<img src="${esc(s)}" alt="${esc(al)}">`:`<div class="ph" style="height:160px;display:grid;place-items:center">${ic('coin',40)}</div>`;
 const rows=CMP_F.map(k=>{const f=BUILTIN.find(x=>x.key===k),va=a[k],vb=b[k];if(isEmpty(va)&&isEmpty(vb))return'';const diff=String(va??'')!==String(vb??'');return `<tr><th>${esc(f?f.label:k)}</th><td class="${diff?'d':''}">${esc(String(va??'—'))}</td><td class="${diff?'d':''}">${esc(String(vb??'—'))}</td></tr>`}).join('');
 const vis=CMP.mode==='overlay'?`<div class="cmp" style="grid-template-columns:1fr"><div class="side glass"><div class="ovl">${img(ia.front,a.denomination)}<div style="position:absolute;inset:0;opacity:${CMP.op/100}">${ib.front?`<img src="${esc(ib.front)}" alt="${esc(b.denomination)}" style="width:100%;height:100%;object-fit:contain">`:''}</div></div><input type="range" min="0" max="100" value="${CMP.op}" data-in="cmpOp" aria-label="Opacité du second exemplaire" style="width:min(100%,320px)"><p class="muted small">Faites glisser pour fondre le second exemplaire sur le premier. Les images doivent être cadrées de façon comparable.</p></div></div>`
  :`<div class="cmp">${[[a,ia],[b,ib]].map(([it,im])=>`<div class="side glass"><b>${esc(it.denomination)}</b> <span class="muted small">${esc(subtitle(it))}</span><div style="margin-top:8px">${img(im.front,it.denomination)}</div>${im.back?`<div style="margin-top:8px">${img(im.back,it.denomination+' (revers)')}</div>`:''}</div>`).join('')}</div>`;
 box.innerHTML=`${vis}<table class="glass panel" style="margin-top:14px;display:table"><thead><tr><th></th><th>Exemplaire A</th><th>Exemplaire B</th></tr></thead><tbody>${rows||'<tr><td colspan="3" class="muted">Aucune donnée à comparer.</td></tr>'}</tbody></table><p class="muted small" style="margin-top:8px">Les cases surlignées signalent une différence de saisie, pas une conclusion.</p>`;
}
document.addEventListener('input',e=>{const t=e.target;if(t.dataset&&t.dataset.in==='cmpOp'){CMP.op=+t.value;const w=$('.ovl>div');if(w)w.style.opacity=CMP.op/100}});
