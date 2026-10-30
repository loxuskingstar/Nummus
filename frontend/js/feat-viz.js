'use strict';
/* =====================================================================
   EXPLORER : quatre manières de parcourir la collection autrement que par une liste
   · Dynasties : souverains regroupés par dynastie, avec les pièces possédées pour chaque règne
   · Réseau    : graphe des pièces qui partagent un graveur, un atelier, un trésor ou une surfrappe
   · Sunburst  : continent → pays → époque → souverain → dénomination, cliquable
   · Table     : feutrine de travail pour trier des pièces en lots par glisser-déposer, puis en faire une série
   ===================================================================== */
addModule('explore','Explorer','graph','Dynasties, réseau de relations, sunburst et table de travail pour trier en lots.',{after:'stats',view:()=>viewExplore(),after_:()=>afterExplore()});

const XP_TABS=[['dyn','Dynasties','tree'],['net','Réseau','graph'],['sun','Sunburst','circle'],['table','Table de travail','drag']];
const XP={net:{ged:true,types:{engraver:true,mint:true,hoard:true,over:true},alone:false},sunRoot:null,sel:new Set(),q:''};

/* ---------- continents (codes pays ISO 3166 numériques) ---------- */
const CONT={};
[['Europe','008 020 040 112 056 070 100 191 196 203 208 233 246 250 276 300 348 352 372 380 428 438 440 442 807 470 498 492 499 528 578 616 620 642 643 688 703 705 724 752 756 804 826 336 674 XK'],
 ['Afrique','012 024 204 072 854 108 120 132 140 148 174 178 180 384 262 818 232 748 231 266 270 288 324 624 226 404 426 430 434 450 454 466 478 480 504 508 516 562 566 646 678 686 690 694 706 729 728 834 768 788 800 894 716 732'],
 ['Asie','004 048 050 064 096 116 156 356 360 368 364 376 392 400 398 417 414 418 422 458 462 496 104 524 512 586 275 608 634 682 702 410 408 144 760 762 158 764 626 795 860 704 887 784 051 031 268 792'],
 ['Amériques','028 032 044 052 084 068 076 124 152 170 188 192 212 214 222 218 840 308 304 320 328 332 340 388 484 558 591 600 604 630 659 670 662 740 780 858 862 238'],
 ['Océanie','036 242 090 296 584 583 520 554 585 598 882 776 798 548 540']].forEach(([c,l])=>l.split(' ').forEach(id=>CONT[id]=c));
const contOf=it=>CONT[it.country]||'Autres ou inconnu';
const epochOf=it=>{if(!hasYear(it))return'Sans date';const y=+it.year;return y<476?'Antiquité':y<1492?'Moyen Âge':y<1789?'Temps modernes':'Époque contemporaine'};

function viewExplore(){
 const t=ui.xpTab||'dyn';
 return `<header class="head"><div><h1>Explorer</h1><p class="sub">Parcourir la collection par dynastie, par relations, par structure ou en la triant à la main.</p></div></header>
 <div class="seg" style="margin-bottom:14px">${XP_TABS.map(([k,l,i])=>`<button class="${t===k?'on':''}" data-act="xpTab" data-t="${k}">${ic(i,15)} ${l}</button>`).join('')}</div>
 ${t==='dyn'?viewDyn():t==='net'?viewNet():t==='sun'?viewSun():viewTable()}`;
}
const xpOwned=()=>pool().filter(i=>i.status!=='wish');
ACT.xpTab=t=>{ui.xpTab=t.dataset.t;render()};

/* ---------- dynasties ---------- */
function viewDyn(){
 const q=norm(XP.q),L=xpOwned().filter(i=>(i.ruler||i.dynasty)&&(!q||norm([i.ruler,i.dynasty,i.denomination].join(' ')).includes(q)));
 const rest=xpOwned().filter(i=>!i.ruler&&!i.dynasty).length;
 const dyn=new Map();
 L.forEach(i=>{const d=(i.dynasty||'').trim()||'Sans dynastie renseignée',r=(i.ruler||'').trim()||'Souverain non renseigné';
  const D=dyn.get(d)||dyn.set(d,new Map()).get(d);(D.get(r)||D.set(r,[]).get(r)).push(i)});
 const yr=l=>{const y=l.filter(hasYear).map(i=>+i.year);return y.length?Math.min(...y):1e9};
 const dl=[...dyn].map(([d,m])=>({d,m,y:Math.min(...[...m.values()].map(yr))})).sort((a,b)=>a.y-b.y);
 const span=l=>{const y=l.filter(hasYear).map(i=>+i.year);return y.length?(Math.min(...y)===Math.max(...y)?fmtYear(y[0]):fmtYear(Math.min(...y))+' – '+fmtYear(Math.max(...y))):''};
 return `<div class="panel glass"><label class="search" style="max-width:360px">${ic('search')}<input data-ch="xpQ" value="${esc(XP.q)}" placeholder="Dynastie, souverain, dénomination"></label>
 <p class="muted small" style="margin:8px 0 0">Alimenté par les champs « Dynastie » et « Souverain » de vos fiches. ${rest?`${pl(rest,'fiche n’a','fiches n’ont')} ni l’un ni l’autre.`:''}</p></div>
 ${dl.length?dl.map(({d,m})=>{const all=[...m.values()].flat();return `<details class="panel glass dyn" open><summary><b>${esc(d)}</b> <span class="muted small">${pl(m.size,'souverain','souverains')} · ${pl(all.length,'pièce','pièces')}${span(all)?' · '+span(all):''}</span></summary>
  ${[...m].sort((a,b)=>yr(a[1])-yr(b[1])).map(([r,l])=>`<div class="dynr"><h4>${esc(r)} <span class="muted small">${span(l)}</span></h4><div class="dynit">${l.sort((a,b)=>(+a.year||0)-(+b.year||0)).map(i=>`<button class="dchip" data-act="open" data-id="${i.id}" title="${esc(i.denomination)}"><span class="mini">${thumb(i,16)}</span><span>${esc(i.denomination)}${hasYear(i)?' <small>'+fmtYear(i.year)+'</small>':''}</span></button>`).join('')}</div></div>`).join('')}</details>`}).join('')
 :`<div class="empty glass"><b>Aucune dynastie à afficher</b><p>Renseignez les champs « Dynastie » et « Souverain » dans vos fiches (par exemple Capétiens, Louis IX) pour construire l’arbre.</p></div>`}`;
}
CH.xpQ=t=>{XP.q=t.value;render();const i=$('[data-ch=xpQ]');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}};

/* ---------- réseau ---------- */
function netData(){
 const T=XP.net.types,items=xpOwned().slice(0,300),links=[],key=(a,b,t)=>a.id<b.id?a.id+b.id+t:b.id+a.id+t,seen=new Set();
 const group=(t,get)=>{const g=new Map();items.forEach(i=>{const v=norm(get(i)||'').trim();if(v)(g.get(v)||g.set(v,[]).get(v)).push(i)});
  g.forEach((l,v)=>{if(l.length<2)return;l.sort((a,b)=>(+a.year||0)-(+b.year||0));
   const add=(a,b)=>{const k=key(a,b,t);if(!seen.has(k)){seen.add(k);links.push({source:a.id,target:b.id,t,v})}};
   if(l.length<=6)for(let i=0;i<l.length;i++)for(let j=i+1;j<l.length;j++)add(l[i],l[j]);else for(let i=1;i<l.length;i++)add(l[i-1],l[i])})};
 if(T.engraver)group('engraver',i=>i.engraver);if(T.mint)group('mint',i=>i.mint);if(T.hoard)group('hoard',i=>i.hoard);if(T.over)group('over',i=>i.overstruck);
 const used=new Set(links.flatMap(l=>[l.source,l.target]));
 return{nodes:items.filter(i=>XP.net.alone||used.has(i.id)).map(i=>({id:i.id,it:i})),links,total:items.length};
}
const NET_COL={engraver:'#e0803a',mint:'#4b8bd6',hoard:'#b45fb0',over:'#d9534f'},NET_LAB={engraver:'même graveur',mint:'même atelier',hoard:'même trésor',over:'même surfrappe'};
function viewNet(){
 const T=XP.net.types,ck=k=>`<label class="chk"><input type="checkbox" data-ch="netT" data-k="${k}" ${T[k]?'checked':''}> <i class="dot" style="background:${NET_COL[k]}"></i> ${NET_LAB[k][0].toUpperCase()+NET_LAB[k].slice(1)}</label>`;
 return `<div class="panel glass"><div class="actions" style="gap:16px">${Object.keys(NET_COL).map(ck).join('')}<label class="chk"><input type="checkbox" data-ch="netAlone" ${XP.net.alone?'checked':''}> Pièces sans lien</label></div>
 <p class="muted small" id="netInfo" style="margin-top:6px"></p></div><div class="panel glass" style="padding:0"><div id="netBox" style="height:min(72vh,640px)"></div></div>`;
}
CH.netT=t=>{XP.net.types[t.dataset.k]=t.checked;render()};CH.netAlone=t=>{XP.net.alone=t.checked;render()};
function netDraw(){
 const box=$('#netBox');if(!box)return;const{nodes,links,total}=netData();
 $('#netInfo').textContent=nodes.length?`${pl(nodes.length,'pièce reliée','pièces reliées')} sur ${total} · ${pl(links.length,'lien','liens')}. Remplissez les champs Graveur, Atelier, Trésor et Surfrappe pour enrichir le réseau.`:'Aucune relation trouvée : renseignez les champs Graveur, Atelier, Trésor ou Surfrappe dans vos fiches.';
 if(!nodes.length){box.innerHTML='';return}
 const W=box.clientWidth||800,H=box.clientHeight||560;
 box.innerHTML='';const svg=d3.select(box).append('svg').attr('viewBox',`0 0 ${W} ${H}`).attr('width','100%').attr('height','100%').style('touch-action','none');
 const g=svg.append('g');svg.call(d3.zoom().scaleExtent([.3,6]).on('zoom',e=>g.attr('transform',e.transform)));
 const sim=d3.forceSimulation(nodes).force('link',d3.forceLink(links).id(d=>d.id).distance(34).strength(.5)).force('charge',d3.forceManyBody().strength(-60)).force('center',d3.forceCenter(W/2,H/2)).force('x',d3.forceX(W/2).strength(.04)).force('y',d3.forceY(H/2).strength(.04));
 const L=g.append('g').selectAll('line').data(links).join('line').attr('stroke',d=>NET_COL[d.t]).attr('stroke-opacity',.55).attr('stroke-width',1.4);
 const N=g.append('g').selectAll('g').data(nodes).join('g').style('cursor','pointer').on('click',(e,d)=>{if(!e.defaultPrevented)openDetail(d.id)})
  .call(d3.drag().on('start',(e,d)=>{if(!e.active)sim.alphaTarget(.3).restart();d.fx=d.x;d.fy=d.y}).on('drag',(e,d)=>{d.fx=e.x;d.fy=e.y}).on('end',(e,d)=>{if(!e.active)sim.alphaTarget(0);d.fx=d.fy=null}));
 N.append('circle').attr('r',9).attr('fill','var(--surface-solid)').attr('stroke','var(--text)').attr('stroke-opacity',.5);
 N.append('image').attr('href',d=>thumbSrc(d.it)||'').attr('x',-8).attr('y',-8).attr('width',16).attr('height',16).attr('clip-path','circle(8px at 8px 8px)').attr('transform','translate(0,0)').style('display',d=>thumbSrc(d.it)?null:'none');
 N.append('title').text(d=>`${d.it.denomination}${hasYear(d.it)?' '+fmtYear(d.it.year):''}`);
 N.append('text').text(d=>d.it.denomination.slice(0,16)).attr('y',20).attr('text-anchor','middle').attr('font-size',9).attr('fill','currentColor').attr('opacity',.8);
 sim.on('tick',()=>{L.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y).attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);N.attr('transform',d=>`translate(${d.x},${d.y})`)});
}

/* ---------- sunburst ---------- */
function sunTree(){
 const root={name:'Collection',children:[]},get=(p,n)=>p.children.find(c=>c.name===n)||(p.children.push({name:n,children:[]}),p.children[p.children.length-1]);
 xpOwned().forEach(it=>{
  const path=[contOf(it),cname(it.country)||it.issuer||'Pays inconnu',epochOf(it),(it.ruler||'').trim()||'Souverain non renseigné'];
  let p=root;path.forEach(n=>{p=get(p,n)});
  p.children.push({name:it.denomination||'Sans nom',value:qtyOf(it),id:it.id,country:it.country});
 });
 return root;
}
function viewSun(){return `<div class="panel glass"><p class="muted small">Du centre vers l’extérieur : continent, pays, époque, souverain, dénomination. Cliquez un secteur pour zoomer, le centre pour remonter.</p><div class="actions" id="sunCtl" style="margin-top:6px"></div></div>
 <div class="panel glass" style="padding:8px"><div id="sunBox" style="display:flex;justify-content:center"></div></div>`}
function sunDraw(){
 const box=$('#sunBox');if(!box)return;
 const data=sunTree();if(!data.children.length){box.innerHTML='<div class="empty"><b>Rien à afficher</b><p>Ajoutez des pièces à la collection.</p></div>';return}
 const S=Math.min(box.parentElement.clientWidth-20,720),R=S/2;
 const h=d3.hierarchy(data).sum(d=>d.value||0).sort((a,b)=>b.value-a.value);
 d3.partition().size([2*Math.PI,h.height+1])(h);h.each(d=>d.cur=d);
 const col=d3.scaleOrdinal(d3.schemeTableau10).domain(h.children.map(c=>c.data.name)),arc=d3.arc().startAngle(d=>d.x0).endAngle(d=>d.x1).padAngle(d=>Math.min((d.x1-d.x0)/2,.005)).padRadius(R/2).innerRadius(d=>d.y0*R/(h.height+1)).outerRadius(d=>Math.max(d.y0*R/(h.height+1),d.y1*R/(h.height+1)-1));
 box.innerHTML='';const svg=d3.select(box).append('svg').attr('viewBox',[-R,-R,S,S]).attr('width',S).attr('height',S).style('font','11px system-ui,sans-serif');
 const top=d=>d.ancestors().reverse()[1],fill=d=>d.depth?d3.color(col(top(d).data.name)).brighter(d.depth*.25):'transparent';
 const path=svg.append('g').selectAll('path').data(h.descendants().slice(1)).join('path').attr('fill',fill).attr('fill-opacity',d=>vis(d.cur)?1:0).attr('d',d=>arc(d.cur)).style('cursor','pointer').on('click',(e,d)=>clk(d));
 path.append('title').text(d=>`${d.ancestors().map(x=>x.data.name).reverse().slice(1).join(' › ')}\n${pl(d.value,'exemplaire','exemplaires')}`);
 const lab=svg.append('g').attr('pointer-events','none').attr('text-anchor','middle').selectAll('text').data(h.descendants().slice(1)).join('text').attr('fill','#fff').attr('fill-opacity',d=>+lv(d.cur)).attr('transform',d=>tr(d.cur)).text(d=>d.data.name.length>16?d.data.name.slice(0,15)+'…':d.data.name);
 const ctr=svg.append('circle').datum(h).attr('r',R/(h.height+1)).attr('fill','none').attr('pointer-events','all').style('cursor','pointer').on('click',(e,d)=>clk(d.cur.parent||h));
 const info=svg.append('text').attr('text-anchor','middle').attr('fill','currentColor').attr('font-size',13).attr('pointer-events','none');
 function setInfo(n){info.selectAll('tspan').remove();info.append('tspan').attr('x',0).attr('dy','-.2em').attr('font-weight',700).text(n.data.name.slice(0,22));info.append('tspan').attr('x',0).attr('dy','1.3em').attr('opacity',.7).text(pl(n.value,'exemplaire','exemplaires'))}
 setInfo(h);
 function ctl(n){const c=$('#sunCtl');if(!c)return;const cty=n.ancestors().find(x=>x.depth===2);
  c.innerHTML=cty&&cty.data.children?`<button class="btn sm" data-act="sunShow" data-c="${esc(cty.children[0].children?.[0]?.children?.[0]?.data.country||cty.leaves()[0].data.country||'')}">${ic('search',14)} Voir ${esc(cty.data.name)} dans la collection</button>`:''}
 function vis(d){return d.y1<=3+h.height&&d.y0>=1&&d.x1>d.x0}
 function lv(d){return d.y1<=h.height+1&&d.y0>=1&&(d.y1-d.y0)*(d.x1-d.x0)>.03}
 function tr(d){const x=(d.x0+d.x1)/2*180/Math.PI,y=(d.y0+d.y1)/2*R/(h.height+1);return`rotate(${x-90}) translate(${y},0) rotate(${x<180?0:180})`}
 function clk(p){
  ctr.datum(p);setInfo(p);ctl(p);
  h.each(d=>d.target={x0:Math.max(0,Math.min(1,(d.x0-p.x0)/(p.x1-p.x0)))*2*Math.PI,x1:Math.max(0,Math.min(1,(d.x1-p.x0)/(p.x1-p.x0)))*2*Math.PI,y0:Math.max(0,d.y0-p.depth),y1:Math.max(0,d.y1-p.depth)});
  const t=svg.transition().duration(600);
  path.transition(t).tween('data',d=>{const i=d3.interpolate(d.cur,d.target);return u=>d.cur=i(u)}).attr('fill-opacity',d=>d.target.y1<=3&&d.target.y0>=1&&d.target.x1>d.target.x0?1:0).attrTween('d',d=>()=>arc(d.cur));
  lab.transition(t).attr('fill-opacity',d=>+(d.target.y1<=3&&d.target.y0>=1&&(d.target.y1-d.target.y0)*(d.target.x1-d.target.x0)>.03)).attrTween('transform',d=>()=>tr(d.cur));
 }
 ctl(h);
}
ACT.sunShow=t=>{if(t.dataset.c)go('collection',{filters:{country:t.dataset.c}})};

/* ---------- table de travail ---------- */
function lotOf(id){return(state.lots||[]).find(l=>l.id===id)}
const lotAssigned=()=>new Set((state.lots||[]).flatMap(l=>l.items));
function viewTable(){
 const lots=state.lots||[],asg=lotAssigned(),q=norm(XP.q);
 const free=xpOwned().filter(i=>!asg.has(i.id)&&(!q||norm([i.denomination,i.country&&cname(i.country),i.year,i.metal].join(' ')).includes(q)));
 const tile=i=>`<div class="tile ${XP.sel.has(i.id)?'sel':''}" draggable="true" data-id="${i.id}" data-act="tileSel" title="${esc(i.denomination)}">${thumb(i,22)}<span>${esc(i.denomination.slice(0,22))}${hasYear(i)?'<small>'+fmtYear(i.year)+'</small>':''}</span></div>`;
 return `<div class="panel glass"><div class="actions" style="gap:12px"><label class="search" style="max-width:300px">${ic('search')}<input data-ch="xpQ2" value="${esc(XP.q)}" placeholder="Filtrer les pièces libres"></label>
  <button class="btn" data-act="lotNew">${ic('plus',15)} Nouveau lot</button>${XP.sel.size?`<span class="muted small">${pl(XP.sel.size,'pièce sélectionnée','pièces sélectionnées')}</span><button class="btn sm" data-act="tileClear">Désélectionner</button>`:''}</div>
  <p class="muted small" style="margin-top:6px">Glissez les pièces dans un lot (ou sélectionnez-les d’un clic, puis « Déposer »). Un lot devient une série ou reçoit une étiquette en un clic.</p></div>
 <div class="feutre"><div class="pile" data-drop="">${free.length?`<h4>Pièces libres <span class="muted small">${free.length}</span></h4><div class="tiles">${free.slice(0,150).map(tile).join('')}</div>${free.length>150?`<p class="small">… affinez avec le filtre (${free.length-150} masquées)</p>`:''}`:'<p class="muted small">Toutes les pièces sont dans un lot.</p>'}</div>
 <div class="lots">${lots.map(l=>{const its=l.items.map(itemById).filter(Boolean);return `<div class="lot" data-drop="${l.id}"><div class="lothead"><input data-ch="lotName" data-id="${l.id}" value="${esc(l.name)}" aria-label="Nom du lot"><span class="muted small">${its.length}</span></div>
  <div class="tiles">${its.map(tile).join('')||'<span class="muted small">Déposez des pièces ici</span>'}</div>
  <div class="actions" style="flex-wrap:wrap;gap:6px">${XP.sel.size?`<button class="btn sm primary" data-act="lotPut" data-id="${l.id}">Déposer ici</button>`:''}${its.length?`<button class="btn sm" data-act="lotSeries" data-id="${l.id}">${ic('album',14)} En série</button><button class="btn sm" data-act="lotTag" data-id="${l.id}">${ic('tag',14)} Étiqueter</button><button class="btn sm" data-act="lotEmpty" data-id="${l.id}">Vider</button>`:''}<button class="btn sm danger" data-act="lotDel" data-id="${l.id}" aria-label="Supprimer le lot">${ic('trash',14)}</button></div></div>`}).join('')||'<div class="lot ghostlot"><p class="muted">Créez un lot pour commencer à trier.</p></div>'}</div></div>`;
}
CH.xpQ2=t=>{XP.q=t.value;render();const i=$('[data-ch=xpQ2]');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}};
CH.lotName=t=>{const l=lotOf(t.dataset.id);if(l){l.name=t.value.trim()||'Lot';savePrefs()}};
const lotMove=(ids,to)=>{(state.lots||[]).forEach(l=>{l.items=l.items.filter(x=>!ids.includes(x))});const l=to&&lotOf(to);if(l)l.items.push(...ids.filter(x=>!l.items.includes(x)));savePrefs();XP.sel.clear();render()};
Object.assign(ACT,{
 tileSel:t=>{const id=t.dataset.id;XP.sel.has(id)?XP.sel.delete(id):XP.sel.add(id);render()},
 tileClear:()=>{XP.sel.clear();render()},
 lotNew:()=>{(state.lots=state.lots||[]).push({id:uid(),name:'Lot '+(state.lots.length+1),items:[]});savePrefs();render()},
 lotPut:t=>lotMove([...XP.sel],t.dataset.id),
 lotEmpty:t=>lotMove([...lotOf(t.dataset.id).items],''),
 lotDel:t=>{const l=lotOf(t.dataset.id);if(l&&(!l.items.length||confirm(`Supprimer « ${l.name} » ? Les pièces restent dans la collection.`))){state.lots=state.lots.filter(x=>x!==l);savePrefs();render()}},
 lotTag:t=>{const l=lotOf(t.dataset.id);promptModal('Étiqueter le lot',`<div class="fld"><label>Étiquette à ajouter aux ${l.items.length} fiches</label><input id="lt_t" value="${esc(l.name)}" required></div><input type="hidden" id="lt_l" value="${l.id}">`,'lotTagOk','Étiqueter')},
 lotSeries:t=>{const l=lotOf(t.dataset.id);promptModal('Créer une série',`<div class="fld"><label>Nom de la série</label><input id="ls_n" value="${esc(l.name)}" required></div><p class="muted small">Une case est créée pour chaque pièce du lot, liée à la fiche. Vous pourrez ajouter les cases manquantes ensuite.</p><input type="hidden" id="ls_l" value="${l.id}">`,'lotSeriesOk','Créer')},
});
SUBMIT.lotTagOk=()=>{const l=lotOf($('#lt_l').value),tg=$('#lt_t').value.trim();if(!l||!tg)return;
 const ch=l.items.map(itemById).filter(i=>i&&!tagsOf(i).includes(tg)).map(i=>({...i,tags:[...tagsOf(i),tg],updated:Date.now()}));
 if(ch.length)putItems(ch);closeModal();render();toast(`Étiquette « ${tg} » ajoutée à ${pl(ch.length,'fiche','fiches')}`)};
SUBMIT.lotSeriesOk=()=>{const l=lotOf($('#ls_l').value);if(!l)return;
 const its=l.items.map(itemById).filter(Boolean).sort((a,b)=>(+a.year||0)-(+b.year||0));
 const s={id:uid(),name:$('#ls_n').value.trim()||l.name,mode:'slots',color:'#2f8a78',slots:its.map(i=>({id:uid(),label:`${i.denomination}${hasYear(i)?' '+fmtYear(i.year):''}`,items:[i.id]}))};
 state.series.push(s);savePrefs();closeModal();toast('Série créée');go('series:'+s.id)};
/* glisser-déposer natif */
document.addEventListener('dragstart',e=>{const t=e.target.closest&&e.target.closest('.tile');if(!t)return;
 const id=t.dataset.id,ids=XP.sel.has(id)?[...XP.sel]:[id];e.dataTransfer.setData('text/nummus-tiles',JSON.stringify(ids));e.dataTransfer.effectAllowed='move'});
document.addEventListener('dragover',e=>{if(e.target.closest&&e.target.closest('[data-drop]')&&[...e.dataTransfer.types].includes('text/nummus-tiles')){e.preventDefault();e.target.closest('[data-drop]').classList.add('over')}});
document.addEventListener('dragleave',e=>{const d=e.target.closest&&e.target.closest('[data-drop]');if(d)d.classList.remove('over')});
document.addEventListener('drop',e=>{const d=e.target.closest&&e.target.closest('[data-drop]');if(!d)return;const raw=e.dataTransfer.getData('text/nummus-tiles');if(!raw)return;e.preventDefault();lotMove(JSON.parse(raw),d.dataset.drop)});

function afterExplore(){const t=ui.xpTab||'dyn';if(t==='net')netDraw();else if(t==='sun')sunDraw()}
