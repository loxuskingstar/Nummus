'use strict';
/* =====================================================================
   STATISTIQUES À WIDGETS
   Même principe que l'accueil : chaque graphique est un widget qu'on masque, ajoute ou réordonne (glisser-déposer
   ou flèches). La disposition est mémorisée dans les réglages (settings.dash.stats). Graphiques en SVG maison,
   sans bibliothèque, donc imprimables et lisibles hors ligne.
   ===================================================================== */
const ST_W=[];
const stWidget=d=>{if(!ST_W.some(w=>w.id===d.id))ST_W.push({span:4,...d})};
const sd=()=>state.settings.dash.stats||(state.settings.dash.stats={order:[],hidden:[],shown:[]});
const stHidden=id=>{const d=sd(),w=ST_W.find(x=>x.id===id);return(d.hidden||[]).includes(id)||(w&&w.off&&!(d.shown||[]).includes(id))};
function stLayout(){const d=sd(),saved=(d.order||[]).filter(id=>ST_W.some(w=>w.id===id));return[...saved,...ST_W.map(w=>w.id).filter(id=>!saved.includes(id))].map(id=>ST_W.find(w=>w.id===id))}
const stSave=()=>{savePrefs();render()};

/* ---------- graphiques ---------- */
const PAL=['#2f8a78','#e0803a','#4b8bd6','#b45fb0','#d9534f','#c9a227','#6aa84f','#8e7cc3','#e06666','#76a5af'];
const nfr=n=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1}).format(n);
const short=(s,n)=>{s=String(s);return s.length>n?s.slice(0,n-1)+'…':s};
function topN(entries,n){const e=entries.slice(0,n),rest=entries.slice(n).reduce((s,x)=>s+x[1],0);return rest?[...e,['Autres',rest]]:e}
function donut(entries,{unit='',n=7}={}){
 entries=topN(entries.filter(e=>e[1]>0),n);const tot=entries.reduce((s,e)=>s+e[1],0);if(!tot)return'<p class="muted small">Pas encore de données.</p>';
 const R=44,C=2*Math.PI*R;let cum=0;
 const arcs=entries.map(([k,v],i)=>{const len=v/tot*C,a=`<circle r="${R}" cx="60" cy="60" fill="none" stroke="${PAL[i%PAL.length]}" stroke-width="22" stroke-dasharray="${len} ${C-len}" stroke-dashoffset="${-cum}" transform="rotate(-90 60 60)"><title>${esc(k)} : ${nfr(v)}${unit}</title></circle>`;cum+=len;return a}).join('');
 return `<div class="donut"><svg viewBox="0 0 120 120" role="img" aria-label="Répartition">${arcs}<text x="60" y="58" text-anchor="middle" font-size="16" font-weight="700" fill="currentColor">${nfr(tot)}</text><text x="60" y="72" text-anchor="middle" font-size="8" fill="currentColor" opacity=".6">${unit.trim()||'total'}</text></svg>
 <ul class="legend">${entries.map(([k,v],i)=>`<li><i style="background:${PAL[i%PAL.length]}"></i><span title="${esc(k)}">${esc(short(k,22))}</span><b>${nfr(v)}</b><small>${Math.round(v/tot*100)} %</small></li>`).join('')}</ul></div>`;
}
function columns(entries,{h=130,color='var(--accent)',unit=''}={}){
 if(!entries.length)return'<p class="muted small">Pas encore de données.</p>';
 const n=entries.length,bw=Math.max(18,Math.min(40,300/n)),W=n*bw+10,mx=Math.max(1,...entries.map(e=>e[1]));
 return `<div class="scrollx"><svg viewBox="0 0 ${W} ${h+34}" style="width:100%;max-width:${Math.round(W*1.7)}px;min-width:${Math.min(W,n*22)}px" role="img" aria-label="Histogramme">${entries.map(([k,v],i)=>{const bh=v/mx*h,x=5+i*bw;
  return `<g><rect x="${x+2}" y="${h-bh+14}" width="${bw-4}" height="${Math.max(1,bh)}" rx="3" fill="${color}"><title>${esc(k)} : ${nfr(v)}${unit}</title></rect>${n<=24?`<text x="${x+bw/2}" y="${h+10}" text-anchor="middle" font-size="8" fill="currentColor" opacity=".8">${nfr(v)}</text>`:''}<text x="${x+bw/2}" y="${h+26}" text-anchor="middle" font-size="8" fill="currentColor" opacity=".7" transform="rotate(${n>10?-30:0} ${x+bw/2} ${h+26})">${esc(short(k,9))}</text></g>`}).join('')}</svg></div>`;
}
function groupedColumns(rows,names){            // rows : [label,a,b]
 if(!rows.length)return'<p class="muted small">Pas encore de données.</p>';
 const n=rows.length,bw=46,W=n*bw+10,h=120,mx=Math.max(1,...rows.flatMap(r=>[r[1],r[2]]));
 return `<div class="scrollx"><svg viewBox="0 0 ${W} ${h+34}" style="width:100%;max-width:${Math.round(W*1.7)}px;min-width:${n*40}px">${rows.map(([k,a,b],i)=>{const x=5+i*bw,ha=a/mx*h,hb=b/mx*h;
  return `<g><rect x="${x+3}" y="${h-ha+10}" width="18" height="${Math.max(1,ha)}" rx="3" fill="${PAL[2]}"><title>${esc(k)} — ${names[0]} : ${fmtMoney(a)}</title></rect><rect x="${x+23}" y="${h-hb+10}" width="18" height="${Math.max(1,hb)}" rx="3" fill="${PAL[1]}"><title>${esc(k)} — ${names[1]} : ${fmtMoney(b)}</title></rect><text x="${x+bw/2}" y="${h+24}" text-anchor="middle" font-size="8" fill="currentColor" opacity=".75">${esc(short(k,8))}</text></g>`}).join('')}</svg></div>
 <p class="small muted"><i class="dot" style="background:${PAL[2]}"></i> ${names[0]} &nbsp; <i class="dot" style="background:${PAL[1]}"></i> ${names[1]}</p>`;
}
function lineChart(pts,{unit=''}={}){           // pts : [label,valeur]
 if(pts.length<2)return'<p class="muted small">Il faut au moins deux dates différentes. Renseignez la date d’acquisition dans vos fiches.</p>';
 const W=320,H=120,mx=Math.max(...pts.map(p=>p[1]),1),x=i=>8+i/(pts.length-1)*(W-16),y=v=>H-8-v/mx*(H-24);
 const d=pts.map((p,i)=>`${i?'L':'M'}${x(i).toFixed(1)} ${y(p[1]).toFixed(1)}`).join('');
 return `<svg viewBox="0 0 ${W} ${H+16}" style="width:100%;max-height:230px" role="img" aria-label="Évolution"><path d="${d}L${x(pts.length-1)} ${H-8}L${x(0)} ${H-8}Z" fill="var(--accent)" opacity=".18"/><path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>
 ${pts.map((p,i)=>pts.length<=40?`<circle cx="${x(i)}" cy="${y(p[1])}" r="2.5" fill="var(--accent)"><title>${esc(p[0])} : ${nfr(p[1])}${unit}</title></circle>`:'').join('')}
 <text x="8" y="${H+10}" font-size="8" fill="currentColor" opacity=".7">${esc(pts[0][0])}</text><text x="${W-8}" y="${H+10}" text-anchor="end" font-size="8" fill="currentColor" opacity=".7">${esc(pts[pts.length-1][0])}</text><text x="${W-8}" y="10" text-anchor="end" font-size="9" fill="currentColor" opacity=".8">${nfr(mx)}${unit}</text></svg>`;
}
function scatter(pts,{xl,yl}){
 if(pts.length<2)return'<p class="muted small">Il faut des pièces avec poids et diamètre renseignés.</p>';
 const W=320,H=190,xs=pts.map(p=>p.x),ys=pts.map(p=>p.y),x0=Math.min(...xs),x1=Math.max(...xs)||1,y0=Math.min(...ys),y1=Math.max(...ys)||1;
 const X=v=>34+(v-x0)/((x1-x0)||1)*(W-44),Y=v=>H-26-(v-y0)/((y1-y0)||1)*(H-40),cols=[...new Set(pts.map(p=>p.c))];
 return `<svg viewBox="0 0 ${W} ${H+4}" style="width:100%;max-height:260px" role="img" aria-label="Nuage de points"><line x1="34" y1="${H-26}" x2="${W-8}" y2="${H-26}" stroke="currentColor" opacity=".3"/><line x1="34" y1="10" x2="34" y2="${H-26}" stroke="currentColor" opacity=".3"/>
 <text x="${W/2}" y="${H}" text-anchor="middle" font-size="9" fill="currentColor" opacity=".7">${xl} (${nfr(x0)} – ${nfr(x1)})</text><text x="8" y="${H/2}" font-size="9" fill="currentColor" opacity=".7" transform="rotate(-90 8 ${H/2})" text-anchor="middle">${yl} (${nfr(y0)} – ${nfr(y1)})</text>
 ${pts.map(p=>`<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="4" fill="${PAL[cols.indexOf(p.c)%PAL.length]}" opacity=".75" data-act="open" data-id="${p.id}" style="cursor:pointer"><title>${esc(p.t)}</title></circle>`).join('')}</svg>
 <p class="small muted">${cols.map(c=>`<i class="dot" style="background:${PAL[cols.indexOf(c)%PAL.length]}"></i> ${esc(c)}`).join(' &nbsp; ')}</p>`;
}
function heat(rowL,colL,m){
 const mx=Math.max(1,...m.flat());
 return `<div class="scrollx"><table class="heat"><tr><th></th>${colL.map(c=>`<th>${esc(c)}</th>`).join('')}</tr>${rowL.map((r,i)=>`<tr><th>${esc(short(r,16))}</th>${m[i].map(v=>`<td style="background:color-mix(in srgb,var(--accent) ${v?15+v/mx*80:0}%,transparent)" title="${esc(r)} · ${nfr(v)}">${v||''}</td>`).join('')}</tr>`).join('')}</table></div>`;
}

/* ---------- données ---------- */
const stOwned=()=>pool().filter(i=>i.status!=='wish');
const stBucket=(L,fn)=>byVal(tally(L,fn,qtyOf));
const stDate=i=>{const d=i.acquired?new Date(i.acquired):new Date(i.created||0);return isNaN(+d)?null:d};
const stMetalOf=i=>{const m=metalBase(i);return m?m[0].toUpperCase()+m.slice(1):''};

/* ---------- widgets ---------- */
stWidget({id:'portfolio',title:'Portefeuille métaux précieux',icon:'coin',span:12,body:S=>statsMetals(S.L,S.hv).replace(/^\s*<section[^>]*>\s*<h2>[^<]*<\/h2>/,'').replace(/<\/section>\s*$/,''),when:S=>!S.v||!S.hv});
stWidget({id:'types',title:'Pièces et billets',icon:'coin',body:S=>donut(stBucket(S.L,i=>i.type==='note'?'Billets':'Pièces'))});
stWidget({id:'countries',title:'Pays les mieux représentés',icon:'globe',body:S=>bars(stBucket(S.L,i=>cname(i.country)),10)});
stWidget({id:'continents',title:'Continents',icon:'globe',body:S=>donut(stBucket(S.L,i=>contOf(i)))});
stWidget({id:'centuries',title:'Par siècle',icon:'clock',span:8,body:S=>{
 const m=tally(S.L.filter(hasYear),i=>Math.sign(+i.year||1)*Math.ceil(Math.abs(+i.year)/100||1),qtyOf).sort((a,b)=>a[0]-b[0]);
 return columns(m.map(([c,n])=>[(c<0?'−':'')+Math.abs(c)+'e s.',n]))}});
stWidget({id:'grades',title:'Par état de conservation',icon:'shield',body:S=>donut(stBucket(S.L,i=>i.grade))});
stWidget({id:'metals',title:'Par métal',icon:'layers',body:S=>donut(stBucket(S.L.filter(i=>i.type!=='note'),stMetalOf))});
stWidget({id:'decades',title:'Par décennie',icon:'calendar',span:8,off:true,body:S=>{
 const m=tally(S.L.filter(hasYear),i=>Math.floor(+i.year/10)*10,qtyOf).sort((a,b)=>a[0]-b[0]);
 return columns(m.map(([d,n])=>[d+'s',n]))}});
stWidget({id:'growth',title:'Croissance de la collection',icon:'chart',span:8,when:S=>!S.v,body:S=>{
 const m=new Map();S.L.forEach(i=>{const d=stDate(i);if(!d||+d<1e11)return;const k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');m.set(k,(m.get(k)||0)+qtyOf(i))});
 let c=0;return lineChart([...m].sort((a,b)=>a[0].localeCompare(b[0])).map(([k,n])=>[k,c+=n]),{unit:' ex.'})+'<p class="muted small">Cumul des exemplaires, par date d’acquisition (à défaut, date de saisie).</p>'}});
stWidget({id:'acqyear',title:'Acquisitions par année',icon:'calendar',off:true,when:S=>!S.v,body:S=>{
 const m=tally(S.L,i=>{const d=stDate(i);return d&&+d>1e11?d.getFullYear():null},qtyOf).sort((a,b)=>a[0]-b[0]);return columns(m.map(([y,n])=>[String(y),n]))}});
stWidget({id:'precious',title:'Pièces les plus précieuses',icon:'star',when:S=>!S.hv,body:S=>{
 const p=S.L.slice().sort(SORT.value).filter(i=>+i.value>0).slice(0,6);
 return p.length?p.map(i=>`<div class="bar" style="grid-template-columns:1fr auto;cursor:pointer" data-act="open" data-id="${i.id}"><span>${esc(i.denomination)} <span class="muted">${esc(subtitle(i))}</span></span><b>${fmtMoney(i.value)}</b></div>`).join(''):'<p class="muted small">Renseignez des valeurs estimées.</p>'}});
stWidget({id:'paidvalue',title:'Investi et valeur, par pays',icon:'chart',span:8,off:true,when:S=>!S.hv&&!S.v,body:S=>{
 const m=new Map();S.L.forEach(i=>{const k=cname(i.country)||'?',o=m.get(k)||[k,0,0];o[1]+=+i.paid||0;o[2]+=(+i.value||0)*qtyOf(i);m.set(k,o)});
 return groupedColumns([...m.values()].filter(r=>r[1]||r[2]).sort((a,b)=>b[2]-a[2]).slice(0,10),['investi','valeur estimée'])}});
stWidget({id:'gains',title:'Plus fortes variations',icon:'chart',off:true,when:S=>!S.hv&&!S.v,body:S=>{
 const g=S.L.filter(i=>+i.paid>0&&+i.value>0).map(i=>({i,d:(+i.value*qtyOf(i)-(+i.paid))})).sort((a,b)=>b.d-a.d),pick=[...g.slice(0,3),...g.slice(-3).filter(x=>x.d<0)];
 return pick.length?pick.map(({i,d})=>`<div class="bar" style="grid-template-columns:1fr auto;cursor:pointer" data-act="open" data-id="${i.id}"><span>${esc(i.denomination)}</span><b style="color:${d>=0?'#6aa84f':'#d9534f'}">${d>=0?'+':''}${fmtMoney(d)}</b></div>`).join(''):'<p class="muted small">Il faut un prix payé et une valeur estimée.</p>'}});
stWidget({id:'scatter',title:'Poids et diamètre',icon:'scale',span:8,off:true,body:S=>scatter(S.L.filter(i=>i.type!=='note'&&+i.weight>0&&+i.diameter>0).map(i=>({x:+i.diameter,y:+i.weight,c:stMetalOf(i)||'Autre',id:i.id,t:`${i.denomination} ${yearSpan(i)} : ${i.weight} g, ${i.diameter} mm`})),{xl:'Diamètre mm',yl:'Poids g'})});
stWidget({id:'weights',title:'Répartition des poids',icon:'scale',off:true,body:S=>{
 const w=S.L.filter(i=>i.type!=='note'&&+i.weight>0).map(i=>+i.weight);if(w.length<2)return'<p class="muted small">Pas assez de poids renseignés.</p>';
 const lo=Math.min(...w),hi=Math.max(...w),k=Math.min(10,w.length),st=(hi-lo)/k||1,b=new Array(k).fill(0);w.forEach(x=>b[Math.min(k-1,Math.floor((x-lo)/st))]++);
 return columns(b.map((n,i)=>[nfr(lo+i*st)+' g',n]))}});
stWidget({id:'values',title:'Répartition des valeurs',icon:'chart',off:true,when:S=>!S.hv,body:S=>{
 const B=[[0,5,'< 5'],[5,20,'5–20'],[20,50,'20–50'],[50,100,'50–100'],[100,500,'100–500'],[500,1e12,'> 500']];
 return columns(B.map(([a,b,l])=>[l+' '+state.settings.currency,S.L.filter(i=>+i.value>0&&+i.value>=a&&+i.value<b).reduce((s,i)=>s+qtyOf(i),0)]))}});
stWidget({id:'mints',title:'Ateliers les plus fréquents',icon:'pin',off:true,body:S=>bars(stBucket(S.L,i=>i.mint),8)});
stWidget({id:'rulers',title:'Souverains et dynasties',icon:'tree',off:true,body:S=>{
 const r=stBucket(S.L,i=>i.ruler),d=stBucket(S.L,i=>i.dynasty);
 return r.length||d.length?`<h4 class="sh">Souverains</h4>${bars(r,5)}<h4 class="sh">Dynasties</h4>${bars(d,5)}`:'<p class="muted small">Renseignez les champs Souverain et Dynastie.</p>'}});
stWidget({id:'completeness',title:'Complétude des fiches',icon:'check',body:S=>{
 const n=S.L.length||1,rows=[['Photo',i=>(i.imgs||[]).length],['Année',hasYear],['Pays',i=>i.country],['Poids',i=>+i.weight>0],['Diamètre',i=>+i.diameter>0],['État',i=>i.grade],['Atelier',i=>i.mint],['Référence',i=>i.catalog||i.numista]];
 if(!S.v){rows.push(['Valeur',i=>+i.value>0],['Emplacement',i=>normPath(i.storage)||(placedMap().get(i.id)||[]).length])}
 return rows.map(([l,f])=>{const c=S.L.filter(f).length,p=Math.round(c/n*100);return `<div class="bar"><span>${l}</span><i><b style="width:${p}%"></b></i><em>${p} %</em></div>`}).join('')}});
stWidget({id:'heat',title:'Pays par siècle',icon:'globe',span:12,off:true,body:S=>{
 const top=stBucket(S.L,i=>cname(i.country)).slice(0,10).map(x=>x[0]),cs=[...new Set(S.L.filter(hasYear).map(i=>Math.ceil(+i.year/100)))].sort((a,b)=>a-b);
 if(!top.length||!cs.length)return'<p class="muted small">Pas encore de données.</p>';
 const m=top.map(c=>cs.map(k=>S.L.filter(i=>cname(i.country)===c&&hasYear(i)&&Math.ceil(+i.year/100)===k).reduce((s,i)=>s+qtyOf(i),0)));
 return heat(top,cs.map(k=>(k<0?'−':'')+Math.abs(k)+'e'),m)}});
stWidget({id:'tags',title:'Étiquettes',icon:'tag',off:true,body:S=>{
 const m=new Map();S.L.forEach(i=>tagsOf(i).forEach(x=>m.set(x,(m.get(x)||0)+1)));
 const e=[...m].sort((a,b)=>b[1]-a[1]).slice(0,30),mx=Math.max(1,...e.map(x=>x[1]));
 return e.length?`<div class="cloud">${e.map(([k,n])=>`<button class="chip" style="font-size:${.75+n/mx*.6}rem" data-act="stTag" data-v="${esc(k)}">${esc(k)} <span class="muted">${n}</span></button>`).join('')}</div>`:'<p class="muted small">Aucune étiquette utilisée.</p>'}});
stWidget({id:'copies',title:'Exemplaires uniques ou multiples',icon:'copy',off:true,body:S=>donut([['Exemplaire unique',S.L.filter(i=>qtyOf(i)===1).length],['Plusieurs exemplaires',S.L.filter(i=>qtyOf(i)>1).length]],{unit:' entrées'})});
stWidget({id:'storage',title:'Répartition par rangement',icon:'slots',off:true,when:S=>!S.v,body:S=>{
 const pm=placedMap();return donut(stBucket(S.L,i=>{const p=normPath(i.storage);return p?p.split(' > ')[0]:((pm.get(i.id)||[]).length?'Plans de rangement':'Non rangé')}))}});
stWidget({id:'wish',title:'Wishlist par priorité',icon:'star',off:true,when:S=>!S.v,body:S=>{
 const W=pool().filter(i=>i.status==='wish'),lab={3:'Haute',2:'Moyenne',1:'Basse'};if(!W.length)return'<p class="muted small">Aucun souhait.</p>';
 const tot=W.reduce((s,i)=>s+(+i.target||0),0);
 return donut(Object.entries(W.reduce((m,i)=>{const k=lab[+i.priority]||'Sans priorité';m[k]=(m[k]||0)+1;return m},{})),{unit:' souhaits'})+(S.hv||!tot?'':`<p class="small muted">Budget cible cumulé : <b>${fmtMoney(tot)}</b></p>`)}});
stWidget({id:'series',title:'Avancement des séries',icon:'target',off:true,when:()=>isOn('series'),body:()=>{
 const l=state.series.map(s=>({s,p:seriesProgress(s,pool())})).filter(x=>x.p.total);
 return l.length?l.slice(0,8).map(({s,p})=>`<div class="bar"><span title="${esc(s.name)}">${esc(short(s.name,22))}</span><i><b style="width:${p.pct||0}%"></b></i><em>${Math.round(p.pct||0)} %</em></div>`).join(''):'<p class="muted small">Aucune série à cases.</p>'}});
stWidget({id:'rarity',title:'Rareté déclarée',icon:'star',off:true,body:S=>donut(stBucket(S.L,i=>i.rarity))});

/* ---------- vue ---------- */
function viewStatsW(){
 const L=stOwned();
 if(!L.length)return `<header class="head"><h1>Statistiques</h1></header><div class="empty glass"><b>Pas encore de statistiques</b><p>Ajoutez des entrées à votre collection pour les voir apparaître ici.</p></div>`;
 const v=vit(),hv=hideVals(),tot=L.reduce((s,i)=>s+qtyOf(i),0),paid=L.reduce((s,i)=>s+(+i.paid||0),0),val=L.reduce((s,i)=>s+(+i.value||0)*qtyOf(i),0),gain=paid?Math.round((val-paid)/paid*100):null;
 const S={L,v,hv,tot};
 const edit=!!ui.statsEdit&&!v,vis=w=>!w.when||w.when(S);
 const cards=stLayout().filter(w=>!stHidden(w.id)&&vis(w)).map(w=>{
  let body='';try{body=w.body(S)}catch(e){console.error(w.id,e);body='<p class="muted small">Widget indisponible.</p>'}
  const ctl=edit?`<span class="hwctl"><button class="x" data-act="stMove" data-id="${w.id}" data-d="-1" aria-label="Monter">${ic('up',14)}</button><button class="x" data-act="stMove" data-id="${w.id}" data-d="1" aria-label="Descendre">${ic('down',14)}</button><button class="x" data-act="stHide" data-id="${w.id}" aria-label="Masquer">${ic('x',14)}</button></span>`:'';
  return `<section class="dcard glass sbw" data-w="${w.id}" ${edit?'draggable="true"':''} style="--sp:${w.span};--rw:1"><h3 class="wh"><span>${edit?`<span class="hwgrip">${ic('drag',14)}</span> `:''}${ic(w.icon,14)} ${w.title}</span>${ctl}</h3>${body}</section>`}).join('');
 const hid=ST_W.filter(w=>stHidden(w.id)&&vis(w));
 const tray=edit?`<section class="panel glass" style="margin-bottom:14px"><h3>Widgets disponibles</h3><p class="muted small" style="margin-bottom:8px">Glissez les cartes (ou utilisez les flèches) pour les réordonner, masquez avec la croix, ajoutez ci-dessous.</p><div class="chips">${hid.map(w=>`<button class="chip" data-act="stShow" data-id="${w.id}">${ic('plus',12)} ${w.title}</button>`).join('')||'<span class="muted small">Tous les widgets sont affichés.</span>'}</div><div class="actions" style="margin-top:8px"><button class="btn sm" data-act="stReset">Rétablir la disposition d’origine</button></div></section>`:'';
 return `<header class="head"><h1>Statistiques</h1><div class="actions">${v?'':`<button class="btn ${edit?'primary':''}" data-act="stEdit">${ic(edit?'check':'sliders',16)} ${edit?'Terminé':'Personnaliser'}</button>`}</div></header>
 <div class="kpis"><div class="kpi glass"><b>${tot}</b><span>exemplaires (${L.length} entrées)</span></div><div class="kpi glass"><b>${new Set(L.map(i=>i.country).filter(Boolean)).size}</b><span>pays</span></div>
 ${v?'':`<div class="kpi glass"><b>${fmtMoney(paid)}</b><span>investi</span></div>`}${hv?'':`<div class="kpi glass"><b>${fmtMoney(val)}</b><span>valeur estimée${gain!==null&&!v?` (${gain>0?'+':''}${gain} %)`:''}</span></div>`}</div>
 ${tray}<div class="dash ${edit?'editing':''}">${cards}</div>`;
}
EXT.views.stats=viewStatsW;

Object.assign(ACT,{
 stEdit:()=>{ui.statsEdit=!ui.statsEdit;render()},
 stHide:t=>{const d=sd();d.hidden=uniq([...(d.hidden||[]),t.dataset.id]);d.shown=(d.shown||[]).filter(x=>x!==t.dataset.id);stSave()},
 stShow:t=>{const d=sd();d.hidden=(d.hidden||[]).filter(x=>x!==t.dataset.id);d.shown=uniq([...(d.shown||[]),t.dataset.id]);stSave()},
 stMove:t=>{const d=sd(),ids=stLayout().map(w=>w.id),i=ids.indexOf(t.dataset.id),j=i+(+t.dataset.d);if(i<0||j<0||j>=ids.length)return;[ids[i],ids[j]]=[ids[j],ids[i]];d.order=ids;stSave()},
 stReset:()=>{state.settings.dash.stats={order:[],hidden:[],shown:[]};stSave()},
 stTag:t=>go('collection',{filters:{tag:t.dataset.v}}),
});
let ST_DRAG=null;
document.addEventListener('dragstart',e=>{const c=e.target.closest&&e.target.closest('.sbw[draggable=true]');if(!c)return;ST_DRAG=c.dataset.w;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',ST_DRAG);c.classList.add('hwdrag')});
document.addEventListener('dragover',e=>{const c=e.target.closest&&e.target.closest('.sbw');if(c&&ST_DRAG){e.preventDefault();$$('.hwover').forEach(x=>x.classList.remove('hwover'));if(c.dataset.w!==ST_DRAG)c.classList.add('hwover')}});
document.addEventListener('dragend',()=>{ST_DRAG=null;$$('.hwdrag,.hwover').forEach(x=>x.classList.remove('hwdrag','hwover'))});
document.addEventListener('drop',e=>{const c=e.target.closest&&e.target.closest('.sbw');if(!c||!ST_DRAG)return;e.preventDefault();
 const ids=stLayout().map(w=>w.id),from=ids.indexOf(ST_DRAG),to=ids.indexOf(c.dataset.w);
 if(from>=0&&to>=0&&from!==to){ids.splice(to,0,ids.splice(from,1)[0]);sd().order=ids;ST_DRAG=null;stSave()}});
