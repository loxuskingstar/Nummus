'use strict';
/* =====================================================================
   AUDIT DE LA COLLECTION et RAPPORT MENSUEL
   · Audit : contrôles de qualité des fiches (champs manquants, valeurs incohérentes, références orphelines), score de
     complétude, et en mode serveur contrôle d'intégrité de la base. Complète le widget « À vérifier » de l'accueil.
   · Rapport : bilan d'un mois (acquisitions, retraits, valeur, nouveaux pays, séries) à partir du journal d'opérations,
     imprimable en PDF ou exportable en HTML. Le dossier d'assurance est la mise en page « Dossier assurance »
     de l'impression, ouverte ici en un clic.
   ===================================================================== */
const PRECIOUS=/^(or|argent|platine|palladium)/i;
const AUDIT=[
 ['nophoto','Sans photo','Fiches sans aucune image.',L=>L.filter(i=>!(i.imgs||[]).length)],
 ['nocountry','Sans pays','Absentes de l’atlas et des statistiques par pays.',L=>L.filter(i=>!i.country)],
 ['noyear','Sans année','Pièces et billets sans date (hors datation en fourchette).',L=>L.filter(i=>!hasYear(i)&&!i.attribution)],
 ['badyear','Année improbable','Après l’année en cours ou avant -3500.',L=>L.filter(i=>hasYear(i)&&(+i.year>new Date().getFullYear()||+i.year<-3500))],
 ['noval','Sans valeur estimée','Exclues de la valeur totale.',L=>L.filter(i=>i.status!=='wish'&&isEmpty(i.value))],
 ['nostor','Sans emplacement','Ni chemin de rangement, ni case dans un plan.',L=>L.filter(i=>i.status!=='wish'&&!normPath(i.storage)&&!(placedMap().get(i.id)||[]).length)],
 ['nowt','Métal précieux sans poids','Le métal fin ne peut pas être calculé.',L=>L.filter(i=>i.status!=='wish'&&PRECIOUS.test(i.metal||'')&&isEmpty(i.weight))],
 ['badwt','Poids ou diamètre aberrant','Poids ≤ 0 ou > 2 kg, diamètre ≤ 0 ou > 200 mm.',L=>L.filter(i=>(!isEmpty(i.weight)&&(+i.weight<=0||+i.weight>2000))||(!isEmpty(i.diameter)&&(+i.diameter<=0||+i.diameter>200)))],
 ['badqty','Quantité invalide','Quantité nulle, négative ou décimale.',L=>L.filter(i=>i.status!=='wish'&&!isEmpty(i.qty)&&(!Number.isInteger(+i.qty)||+i.qty<1))],
 ['badcat','Catalogue supprimé','La fiche référence un catalogue qui n’existe plus.',L=>L.filter(i=>(i.cats||[]).some(id=>!state.catalogs.some(c=>c.id===id)))],
 ['paidgt','Prix payé très supérieur à la valeur','Payé plus de 5 fois la valeur estimée : erreur de saisie possible.',L=>L.filter(i=>!isEmpty(i.paid)&&!isEmpty(i.value)&&+i.value>0&&+i.paid>5*+i.value*qtyOf(i))]
];
function auditRun(){
 const L=pool(),res=AUDIT.map(([k,t,d,fn])=>({k,t,d,items:fn(L)}));
 const ids=new Set(state.items.map(i=>i.id)),orph=[];
 state.containers.forEach(c=>[...Object.values(c.occ||{}),...Object.values(c.more||{}).flat()].forEach(id=>{if(id&&!ids.has(id))orph.push({id:c.id+':'+id,denomination:c.name+' : case vers une fiche supprimée'})}));
 res.push({k:'orphplan',t:'Cases de plan orphelines',d:'Une case d’un plan de rangement pointe vers une fiche supprimée.',items:orph,plain:true});
 const dd=typeof ddClusters==='function'?ddClusters():[];
 res.push({k:'dups',t:'Doublons probables',d:'Fiches très proches, à fusionner ou à confirmer.',items:dd.flatMap(c=>c.items.slice(1)),link:'doubles'});
 const checks=AUDIT.length*L.length,bad=res.slice(0,AUDIT.length).reduce((n,r)=>n+r.items.length,0);
 return{res,score:L.length?Math.max(0,Math.round(100*(1-bad/Math.max(1,checks)))):100,n:L.length};
}
addModule('audit','Audit de la collection','shield','Fiches incomplètes, valeurs incohérentes, références orphelines, intégrité de la base.',{after:'trash',view:()=>viewAudit()});
const AU={open:null,srv:null};
function viewAudit(){
 const{res,score,n}=auditRun(),bad=res.filter(r=>r.items.length);
 const rows=r=>r.plain?`<ul class="small">${r.items.slice(0,30).map(x=>`<li>${esc(x.denomination)}</li>`).join('')}</ul>`:`<div class="rows">${r.items.slice(0,30).map(rowOf).join('')}</div>${r.items.length>30?`<p class="muted small">… et ${r.items.length-30} autres : utilisez la liste ci-dessus pour les traiter par lots.</p>`:''}`;
 return `<header class="head"><div><h1>Audit de la collection</h1><p class="sub">${pl(n,'fiche contrôlée','fiches contrôlées')} · ${bad.length?pl(bad.length,'point à vérifier','points à vérifier'):'aucun problème détecté'}</p></div><div class="tile glass" style="min-width:150px;display:flex;flex-direction:column;align-items:flex-start;gap:3px;padding:12px 14px"><span class="tl">Complétude</span><b style="font-size:1.5rem;white-space:nowrap">${score} %</b><div class="pbar"><i style="width:${score}%"></i></div></div></header>
 <div class="stack">${res.map(r=>`<section class="panel glass"><div class="actions" style="justify-content:space-between"><div><h2 style="font-size:1.05rem;margin:0">${r.t} <span class="muted">· ${r.items.length}</span></h2><p class="muted small">${r.d}</p></div>${r.items.length?`<span class="actions">${r.link?`<button class="btn sm" data-act="nav" data-v="${r.link}">Ouvrir</button>`:''}<button class="btn sm" data-act="auOpen" data-k="${r.k}">${AU.open===r.k?'Masquer':'Voir'}</button></span>`:`<span class="muted small">${ic('check',14)} OK</span>`}</div>${AU.open===r.k&&r.items.length?`<div style="margin-top:10px">${rows(r)}</div>`:''}</section>`).join('')}
 ${Store.kind==='rest'?`<section class="panel glass"><h2 style="font-size:1.05rem;margin:0">Intégrité de la base (serveur)</h2><p class="muted small" id="auSrv">${AU.srv?esc(AU.srv):'Vérifie le fichier SQLite et les images non référencées.'}</p><div class="actions"><button class="btn sm" data-act="auSrv">${ic('shield',14)} Lancer la vérification</button></div></section>`:''}</div>`;
}
Object.assign(ACT,{
 auOpen:t=>{AU.open=AU.open===t.dataset.k?null:t.dataset.k;render()},
 auSrv:async()=>{const base=(CONFIG.api&&CONFIG.api.baseUrl)||'/api';try{const j=await (await fetch(base+'/integrity')).json();AU.srv=j.sqlite==='ok'?`Base saine. ${pl(j.orphan_images,'image orpheline','images orphelines')}, ${pl(j.missing_images,'image manquante','images manquantes')}.`:'Base endommagée : '+j.sqlite}catch(e){AU.srv='Vérification impossible'}render()}
});
homeWidget({id:'audit',title:'Complétude des fiches',icon:'shield',off:true,when:()=>!vit(),link:()=>moreLink('audit','Audit'),body:()=>{const{score,res}=auditRun();const n=res.filter(r=>r.items.length).length;return `<div class="tile" style="padding:0"><b style="font-size:1.6rem">${score} %</b> <span class="muted small">· ${pl(n,'point à vérifier','points à vérifier')}</span><div class="pbar"><i style="width:${score}%"></i></div></div>`}});

/* ---------- rapport mensuel ---------- */
const RP={month:null};
const rpMonths=()=>{const d=new Date();return[...Array(12)].map((_,k)=>{const x=new Date(d.getFullYear(),d.getMonth()-k,1);return[x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0'),MONTHS[x.getMonth()]+' '+x.getFullYear()]})};
function rpData(ym){
 const[y,m]=ym.split('-').map(Number),t0=new Date(y,m-1,1).getTime(),t1=new Date(y,m,1).getTime()-1,key=ym;
 const j0=historyStart(),okStart=j0!==null&&t0>=j0,okEnd=j0!==null&&t1>=j0;
 const tot=T=>{let v=0,n=0;stateAt(T).forEach(s=>{if(s.status==='wish')return;const q=+s.qty||1;n+=q;v+=(+s.value||0)*q});return{v,n}};
 const A=okStart?tot(t0-1):null,B=okEnd?tot(Math.min(t1,Date.now())):null;
 const L=state.items.filter(i=>i.status!=='wish');
 const acq=L.filter(i=>(i.acquired?String(i.acquired).slice(0,7):new Date(i.created||0).toISOString().slice(0,7))===key);
 const paid=acq.reduce((s,i)=>s+(+i.paid||0),0);
 const out=state.events.filter(e=>e.kind==='del'&&e.t>=t0&&e.t<=t1&&(e.snap||{}).status!=='wish');
 const cs=T=>{const s=new Set();stateAt(T).forEach(x=>{if(x.status!=='wish'&&x.country)s.add(x.country)});return s};
 const newC=okStart&&okEnd?[...cs(Math.min(t1,Date.now()))].filter(c=>!cs(t0-1).has(c)):[];
 const top=[...acq].sort((a,b)=>(+b.value||0)*qtyOf(b)-(+a.value||0)*qtyOf(a)).slice(0,3);
 const ser=state.series.map(s=>({s,p:seriesProgress(s,pool())})).filter(x=>x.p.pct!==null&&x.p.pct<100).sort((a,b)=>b.p.pct-a.p.pct).slice(0,4);
 return{ym,label:(MONTHS[m-1]+' '+y),A,B,acq,acqN:acq.reduce((n,i)=>n+qtyOf(i),0),paid,out,newC,top,ser,okStart,okEnd};
}
function rpHTML(d){
 const dl=(a,b)=>a&&b?(b.v-a.v):null,delta=dl(d.A,d.B);
 const kpi=(l,v,s)=>`<div class="tile glass" style="display:flex;flex-direction:column;align-items:flex-start;gap:3px;padding:12px 14px"><span class="tl">${l}</span><b style="font-size:1.5rem">${v}</b>${s?`<div class="muted small">${s}</div>`:''}</div>`;
 return `<div class="rp"><div class="grid4" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:14px 0">
 ${kpi('Acquisitions',d.acqN,d.paid?fmtMoney(d.paid)+' dépensés':'')}${kpi('Retraits',d.out.length,'fiches supprimées ou cédées')}
 ${kpi('Valeur estimée',d.B?fmtMoney(d.B.v):'—',delta===null?'journal insuffisant':(delta>=0?'+':'')+fmtMoney(delta)+' sur le mois')}${kpi('Exemplaires',d.B?d.B.n:'—',d.A&&d.B?((d.B.n-d.A.n>=0?'+':'')+(d.B.n-d.A.n)+' sur le mois'):'')}</div>
 ${d.acq.length?`<h3>Acquisitions du mois</h3><div class="rows">${d.acq.slice(0,25).map(rowOf).join('')}</div>${d.acq.length>25?`<p class="muted small">… et ${d.acq.length-25} autres.</p>`:''}`:'<p class="muted">Aucune acquisition ce mois-ci.</p>'}
 ${d.top.length>1?`<h3>Plus belles pièces entrées</h3><ol class="small">${d.top.map(i=>`<li>${esc(i.denomination)} <span class="muted">${esc([cname(i.country),fmtYear(i.year)].filter(Boolean).join(', '))}</span> — ${fmtMoney((+i.value||0)*qtyOf(i))}</li>`).join('')}</ol>`:''}
 ${d.newC.length?`<h3>Nouveaux pays</h3><p>${d.newC.map(c=>esc(cname(c))).join(', ')}</p>`:''}
 ${d.out.length?`<h3>Fiches retirées</h3><ul class="small">${d.out.slice(0,15).map(e=>`<li>${esc((e.snap||{}).denomination||'?')} <span class="muted">${esc(dateFR(e.t))}</span></li>`).join('')}</ul>`:''}
 ${d.ser.length?`<h3>Séries les plus avancées</h3><ul class="small">${d.ser.map(x=>`<li>${esc(x.s.name)} : ${Math.round(x.p.pct)} % (${x.p.owned}${x.p.total?' / '+x.p.total:''})</li>`).join('')}</ul>`:''}
 ${!d.okStart?'<p class="muted small">Le journal d’opérations commence après le début de ce mois : variations de valeur indisponibles (le journal n’invente jamais un passé inconnu).</p>':''}</div>`;
}
addModule('report','Rapport mensuel','calendar','Bilan d’un mois : acquisitions, retraits, valeur, nouveaux pays, séries. Dossier d’assurance en un clic.',{after:'stats',view:()=>viewReport()});
function viewReport(){
 RP.month=RP.month||rpMonths()[0][0];const d=rpData(RP.month);
 return `<header class="head"><div><h1>Rapport mensuel</h1><p class="sub">${esc(d.label)}</p></div><div class="actions"><select data-ch="rpMonth">${rpMonths().map(([k,l])=>`<option value="${k}" ${k===RP.month?'selected':''}>${l}</option>`).join('')}</select>
 <button class="btn" data-act="rpPrint">${ic('print',16)} Imprimer / PDF</button><button class="btn" data-act="rpHtml">${ic('download',16)} HTML</button><button class="btn" data-act="insPrint">${ic('shield',16)} Dossier d’assurance</button></div></header>
 <section class="panel glass">${rpHTML(d)}</section>
 <p class="muted small" style="margin-top:10px">Le dossier d’assurance reprend toutes les pièces avec photos, prix payé, valeur, emplacement et documents joints (mise en page « Dossier assurance / succession »). Le rapport est calculé à la demande depuis le journal d’opérations.</p>`;
}
CH.rpMonth=t=>{RP.month=t.value;render()};
const rpPlain=d=>`<h1>Rapport — ${esc(d.label)}</h1><p class="p-sub">${esc(userName())} · établi le ${esc(bkDate())}</p>${rpHTML(d).replace(/data-act="[^"]*"/g,'').replace(/class="row[^"]*"/g,'class="row"')}`;
Object.assign(ACT,{
 rpPrint:async()=>{const p=$('#print');p.innerHTML=rpPlain(rpData(RP.month||rpMonths()[0][0]));await Promise.all($$('img',p).map(im=>im.decode?im.decode().catch(()=>{}):null));window.print()},
 rpHtml:()=>{const d=rpData(RP.month||rpMonths()[0][0]);download(`rapport-${d.ym}.html`,`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rapport ${esc(d.label)}</title><style>body{font:16px/1.5 system-ui,sans-serif;max-width:820px;margin:2rem auto;padding:0 1rem;color:#222}.tile{border:1px solid #ddd;border-radius:10px;padding:10px 14px}.tl{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#777;display:block}b{font-size:1.4rem}.muted{color:#777}.row{display:flex;gap:10px;padding:4px 0;border-bottom:1px solid #eee}.mini{display:none}.small{font-size:.9rem}</style><body>${rpPlain(d)}</body></html>`,'text/html')},
 insPrint:()=>{openPrint();const l=$('#p_l');if(l){l.value='dossier';CH.printLayout(l)}}
});
homeWidget({id:'monthly',title:'Bilan du mois',icon:'calendar',off:true,when:()=>!vit(),link:()=>moreLink('report','Rapport'),body:()=>{const d=rpData(rpMonths()[0][0]);return `<div class="mlist"><div class="mrow"><span>Acquisitions</span><span></span><b>${d.acqN}</b></div><div class="mrow"><span>Valeur estimée</span><span></span><b>${d.B?fmtMoney(d.B.v):'—'}</b></div><div class="mrow"><span>Retraits</span><span></span><b>${d.out.length}</b></div></div>`}});
