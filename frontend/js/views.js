'use strict';
/* ---------- vue Chronologie ---------- */
function tlItems(){return pool().filter(i=>(ui.tl.wish||i.status!=='wish')&&(!ui.tl.type||i.type===ui.tl.type)&&hasYear(i))}
function viewTimeline(){return `<header class="head"><div><h1>Chronologie</h1><p class="sub">Explorez par époque. La carte situe l’origine actuelle des pièces et billets de la période (pas de frontières historiques : l’émetteur d’époque est indiqué dans la liste).</p></div></header><div id="tlbody"></div>`}
function renderTL(){
 const body=$('#tlbody');if(!body)return;
 const its=tlItems();
 const ctl=`<div class="actions" style="margin-bottom:10px"><div class="seg">${[['','Tout'],['coin','Pièces'],['note','Billets']].map(([v,l])=>`<button data-act="tltype" data-v="${v}" class="${ui.tl.type===v?'on':''}">${l}</button>`).join('')}</div>${vit()?'':`<label class="btn"><input type="checkbox" data-ch="tlWish" ${ui.tl.wish?'checked':''}> Inclure la wishlist</label>`}</div>`;
 if(!its.length){body.innerHTML=ctl+`<div class="empty glass"><b>Rien à placer sur la frise</b><p>Renseignez l’année de vos entrées (valeur négative pour avant J.-C.). L’outil de conversion des calendriers se trouve dans « Outils ».</p></div>`;return}
 const ys=its.map(i=>+i.year),gmin=Math.min(...ys),gmax=Math.max(...ys);
 let from=ui.tl.from??gmin,to=ui.tl.to??gmax;if(from>to)[from,to]=[to,from];
 const span=gmax-gmin+1,step=[1,2,5,10,20,25,50,100,200,250,500,1000].find(n=>n>=span/48)||1000;
 const start=Math.floor(gmin/step)*step,n=Math.floor((gmax-start)/step)+1,cnt=new Array(n).fill(0);
 its.forEach(i=>cnt[Math.floor((+i.year-start)/step)]++);const mx=Math.max(...cnt);
 const bars=cnt.map((c,i)=>{const a=start+i*step,b=a+step-1,on=b>=from&&a<=to;return `<button class="hbar ${on?'on':''}" style="--h:${c?Math.max(6,c/mx*100):0}%" data-act="tlbar" data-a="${a}" data-b="${b}" title="${esc(fmtYear(a))} – ${esc(fmtYear(b))} : ${c}"></button>`}).join('');
 const P=[['Tout','',''],...PERIODS.map(p=>[p[1].replace(/\s*\(.*\)/,''),p[2]??'',p[3]??''])];
 const yEnd=i=>(!isEmpty(i.yearEnd)&&!isNaN(+i.yearEnd)&&+i.yearEnd>=+i.year)?+i.yearEnd:+i.year;   // plage d'incertitude : l'entrée est visible si sa plage rencontre la période
 const inR=its.filter(i=>yEnd(i)>=from&&+i.year<=to).sort((a,b)=>+a.year-+b.year);
 const shown=ui.tl.country?inR.filter(i=>i.country===ui.tl.country):inR;
 const by={};inR.forEach(i=>{if(!i.country)return;const o=by[i.country]||(by[i.country]={code:i.country,count:0,min:null,max:null});o.count++;const y=+i.year,y2=yEnd(i);o.min=o.min===null?y:Math.min(o.min,y);o.max=o.max===null?y2:Math.max(o.max,y2)});
 body.innerHTML=ctl+`<div class="panel glass" style="margin-bottom:16px">
  <div class="hist">${bars}</div><div class="haxis"><span>${esc(fmtYear(start))}</span><span>${esc(fmtYear(start+step*n-1))}</span></div>
  <div class="presets">${P.map(p=>`<button class="chip" data-act="tlpreset" data-a="${p[1]}" data-b="${p[2]}">${p[0]}</button>`).join('')}</div>
  <div class="sliders"><div><label>Début <output id="tlFv">${esc(fmtYear(from))}</output></label><input type="range" min="${gmin}" max="${gmax}" value="${from}" data-in="tlfrom" data-ch="tlFrom"></div>
  <div><label>Fin <output id="tlTv">${esc(fmtYear(to))}</output></label><input type="range" min="${gmin}" max="${gmax}" value="${to}" data-in="tlto" data-ch="tlTo"></div></div></div>
  <div class="agrid"><div class="map glass" id="tlmap"></div><aside class="panel glass"><h2>${pl(shown.length,'entrée','entrées')}</h2>
  <p class="muted">${esc(fmtYear(from))} à ${esc(fmtYear(to))}${ui.tl.country?` — ${esc(cname(ui.tl.country))} <button class="btn sm" data-act="tlcountry">Tous les pays</button>`:''}</p>
  <div class="plist" style="max-height:48vh">${shown.slice(0,300).map(i=>`<div class="row" data-act="open" data-id="${i.id}" tabindex="0"><span class="mini">${thumb(i,18)}</span><span><b>${esc(i.denomination)}</b><br><small class="muted">${esc([i.issuer||cname(i.country),yearSpan(i)].filter(Boolean).join(', '))}</small></span><span class="muted">${i.status==='wish'?'souhait':''}</span></div>`).join('')||'<p class="muted" style="padding:8px">Rien sur cette période.</p>'}</div></aside></div>
  <h2 style="margin:26px 0 10px">Frise</h2><div>${shown.slice(0,300).map(i=>`<div class="tlrow"><time>${esc(yearSpan(i))}</time><div class="rail"></div><div class="tlcard glass" data-act="open" data-id="${i.id}" tabindex="0"><span><b>${esc(i.denomination)}</b> <span class="muted">${esc([i.issuer,cname(i.country),i.attribution].filter(Boolean).join(', '))}</span>${yEnd(i)>+i.year?`<i class="tolbar" title="Datation incertaine : ${esc(yearSpan(i))}" style="margin-left:${((+i.year-gmin)/Math.max(1,gmax-gmin)*100).toFixed(1)}%;width:${Math.max(1.5,(yEnd(i)-+i.year)/Math.max(1,gmax-gmin)*100).toFixed(1)}%"></i>`:''}</span><span class="muted">${i.status==='wish'?'souhait':esc(i.grade||'')}</span></div></div>`).join('')}</div>`;
 mountMap($('#tlmap'),{info:c=>by[c],points:Object.values(by),tip:(c,o)=>`<b>${esc(cname(c))}</b><br>${pl(o.count,'entrée','entrées')}<br>${esc(o.min===o.max?fmtYear(o.min):fmtYear(o.min)+' à '+fmtYear(o.max))}`,selected:()=>ui.tl.country,onClick:c=>{ui.tl.country=ui.tl.country===c?null:c;renderTL()}});
}

/* ---------- vue Statistiques (dont portefeuille métaux) ---------- */
function tally(list,fn,w=()=>1){const m=new Map();list.forEach(i=>{const k=fn(i);if(isEmpty(k))return;m.set(k,(m.get(k)||0)+w(i))});return[...m]}
const byVal=e=>e.sort((a,b)=>b[1]-a[1]);
function bars(entries,max=10){const m=Math.max(1,...entries.map(e=>e[1]));return entries.slice(0,max).map(([k,v])=>`<div class="bar"><span>${esc(k)}</span><span class="bt"><i style="width:${v/m*100}%"></i></span><span class="bv">${v}</span></div>`).join('')||'<p class="muted">Pas encore de données.</p>'}
const METAL_CLASSES=[['gold','Or'],['silver','Argent'],['platinum','Platine'],['palladium','Palladium']];
function metalClass(i){const m=norm(i.metal);if(!m||/plaque|dore|plated|electrum/.test(m))return null;
 if(/\b(or|gold|au)\b/.test(m))return'gold';if(/argent|silver|\bag\b|billon/.test(m))return'silver';if(/platine|platinum/.test(m))return'platinum';if(/palladium/.test(m))return'palladium';return null}
function fineOf(i){if(!isEmpty(i.fineness)&&+i.fineness>0)return +i.fineness;const m=String(i.metal||'');let r=m.match(/(\d{3,4})\s*‰/);if(r)return Math.min(1000,+r[1]);r=m.match(/\b0[.,](\d{3,4})\b/);if(r)return Math.round(+('0.'+r[1])*1000);return null}
function metalPortfolio(L){
 const r=Object.fromEntries(METAL_CLASSES.map(([k])=>[k,{g:0,n:0}])),missing=[];
 L.forEach(i=>{if(i.type==='note')return;const c=metalClass(i);if(!c)return;const w=+i.weight,f=fineOf(i);if(!w||!f){missing.push(i);return}r[c].g+=w*qtyOf(i)*f/1000;r[c].n+=qtyOf(i)});
 return{r,missing};
}
function viewStats(){
 const L=pool().filter(i=>i.status!=='wish');
 if(!L.length)return `<header class="head"><h1>Statistiques</h1></header><div class="empty glass"><b>Pas encore de statistiques</b><p>Ajoutez des entrées à votre collection pour les voir apparaître ici.</p></div>`;
 const tot=L.reduce((s,i)=>s+qtyOf(i),0),paid=L.reduce((s,i)=>s+(+i.paid||0),0),val=L.reduce((s,i)=>s+(+i.value||0)*qtyOf(i),0);
 const gain=paid?Math.round((val-paid)/paid*100):null,hv=hideVals(),v=vit();
 const cent=tally(L.filter(hasYear),i=>Math.sign(+i.year||1)*Math.ceil(Math.abs(+i.year)/100||1),qtyOf).sort((a,b)=>a[0]-b[0]).map(([c,n])=>[century(c*100-(c<0?-50:50)),n]);
 const prime=L.slice().sort(SORT.value).filter(i=>+i.value>0).slice(0,5);
 const mp=metalPortfolio(L),pr=state.settings.prices,f2=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}),f3=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:3});
 let metalTotal=0;
 const mrows=METAL_CLASSES.filter(([k])=>mp.r[k].g>0||k==='gold'||k==='silver').map(([k,l])=>{const g=mp.r[k].g,oz=g/31.1035,p=+pr[k];const val=p?oz*p:null;if(val)metalTotal+=val;
  return `<tr><th>${l}</th><td class="r">${mp.r[k].n}</td><td class="r">${f3.format(g)} g</td><td class="r">${f3.format(oz)}</td>${hv?'':`<td class="r"><input type="number" step="any" data-ch="price" data-k="${k}" value="${esc(pr[k])}" placeholder="cours / oz" aria-label="Cours ${l}"></td><td class="r">${val?fmtMoney(val):'—'}</td>`}</tr>`}).join('');
 return `<header class="head"><h1>Statistiques</h1></header>
 <div class="kpis"><div class="kpi glass"><b>${tot}</b><span>exemplaires (${L.length} entrées)</span></div><div class="kpi glass"><b>${new Set(L.map(i=>i.country).filter(Boolean)).size}</b><span>pays</span></div>
 ${v?'':`<div class="kpi glass"><b>${fmtMoney(paid)}</b><span>investi</span></div>`}${hv?'':`<div class="kpi glass"><b>${fmtMoney(val)}</b><span>valeur estimée${gain!==null&&!v?` (${gain>0?'+':''}${gain} %)`:''}</span></div>`}</div>
 <section class="panel glass" style="margin-bottom:16px"><h2>Portefeuille métaux précieux</h2>
  <p class="muted small">Calcul automatique sur toutes les pièces dont le métal, le poids et le titre sont renseignés (le titre peut aussi être lu dans le champ métal, ex. « Argent 900‰ »).</p>
  <div class="formula">${tex('m_{\\text{fin}} = \\sum_i \\left( m_i \\times q_i \\times \\frac{t_i}{1000} \\right)',true)}<span class="small">avec ${tex('m_i')} le poids en grammes, ${tex('q_i')} la quantité et ${tex('t_i')} le titre en ‰ ; une once troy vaut ${tex('31{,}1035\\ \\text{g}')}.</span></div>
  <div style="overflow-x:auto;margin-top:10px"><table class="ref"><tr><th>Métal</th><th class="r">Exemplaires</th><th class="r">Poids fin</th><th class="r">Onces troy</th>${hv?'':`<th class="r">Cours (${esc(state.settings.currency)}/oz)</th><th class="r">Valeur métal</th>`}</tr>${mrows}
  ${hv||!metalTotal?'':`<tr><th colspan="5">Total valeur métal</th><td class="r"><b>${fmtMoney(metalTotal)}</b></td></tr>`}</table></div>
  ${mp.missing.length?`<p class="muted small" style="margin-top:8px">${pl(mp.missing.length,'pièce en métal précieux ignorée','pièces en métal précieux ignorées')} faute de poids ou de titre : ${mp.missing.slice(0,6).map(i=>`<a class="link" href="#" data-act="open" data-id="${i.id}">${esc(i.denomination)}</a>`).join(', ')}${mp.missing.length>6?'…':''}</p>`:''}
  ${hv?'':`<div class="actions" style="margin-top:10px">${Integrations.prices.available()?`<button class="btn sm" data-act="pricesFetch">${ic('refresh',14)} Actualiser les cours</button>`:'<span class="muted small">Cours saisis manuellement. L’actualisation automatique sera branchée sur le backend (route /api/prices).</span>'}</div>`}
 </section>
 <div class="cols">
 <section class="panel glass"><h2>Pièces et billets</h2>${bars(byVal(tally(L,i=>i.type==='note'?'Billets':'Pièces',qtyOf)))}</section>
 <section class="panel glass"><h2>Pays les mieux représentés</h2>${bars(byVal(tally(L,i=>cname(i.country),qtyOf)),10)}</section>
 <section class="panel glass"><h2>Par siècle</h2>${bars(cent,14)}</section>
 <section class="panel glass"><h2>Par état</h2>${bars(byVal(tally(L,i=>i.grade,qtyOf)))}</section>
 <section class="panel glass"><h2>Par métal</h2>${bars(byVal(tally(L.filter(i=>i.type!=='note'),i=>i.metal,qtyOf)))}</section>
 ${hv?'':`<section class="panel glass"><h2>Pièces les plus précieuses</h2>${prime.map(i=>`<div class="bar" style="grid-template-columns:1fr auto;cursor:pointer" data-act="open" data-id="${i.id}"><span>${esc(i.denomination)} <span class="muted">${esc(subtitle(i))}</span></span><b>${fmtMoney(i.value)}</b></div>`).join('')||'<p class="muted">Renseignez des valeurs estimées.</p>'}</section>`}
 </div>`;
}

/* ---------- vue Doublons et échanges ---------- */
function viewDoubles(){
 const L=pool().filter(i=>i.status!=='wish');
 const multi=L.filter(i=>qtyOf(i)>1),trade=L.filter(i=>i.trade);
 const g={};L.forEach(i=>{const k=[i.country,norm(i.denomination),i.year,norm(i.catalog),norm(i.variety)].join('|');(g[k]=g[k]||[]).push(i)});
 const dup=Object.values(g).filter(a=>a.length>1);
 const box=(t,sub,list)=>`<section class="panel glass"><h2>${t}</h2><p class="muted" style="margin-bottom:8px">${sub}</p>${list||'<p class="muted">Rien pour le moment.</p>'}</section>`;
 const rows=l=>l.length?`<div class="rows">${l.map(rowOf).join('')}</div>`:'';
 return `<header class="head"><h1>Doublons et échanges</h1></header><div class="stack">
 ${box('À échanger',`Entrées cochées « Disponible à l’échange » (${trade.length}).`,rows(trade))}
 ${box('Exemplaires multiples',`Entrées avec une quantité supérieure à 1 (${multi.length}).`,rows(multi))}
 ${box('Doublons probables',`Même pays, dénomination, année, référence et variété saisis dans plusieurs entrées (${dup.length}).`,dup.map(a=>`<div style="margin-bottom:10px">${rows(a)}</div>`).join(''))}</div>`;
}

/* ---------- vue Rangement (arborescence) ---------- */
function storageTree(items){
 const root={children:new Map()};let none=0;
 items.forEach(i=>{const p=normPath(i.storage);if(!p){none+=qtyOf(i);return}let n=root;const acc=[];
  p.split(' > ').forEach(part=>{acc.push(part);if(!n.children.has(part))n.children.set(part,{name:part,path:acc.join(' > '),count:0,children:new Map(),items:[]});n=n.children.get(part);n.count+=qtyOf(i)});n.items.push(i)});
 return{root,none};
}
function treeHTML(n,depth){
 return[...n.children.values()].sort((a,b)=>a.name.localeCompare(b.name,'fr',{numeric:true})).map(c=>`<details ${depth<1?'open':''}><summary><span>${ic(c.children.size?'folder':'layers',16)} ${esc(c.name)}</span><span class="muted small">${pl(c.count,'exemplaire','exemplaires')}</span><button class="btn sm" data-act="stgo" data-p="${esc(c.path)}">Voir</button><button class="btn sm" data-act="strename" data-p="${esc(c.path)}">Renommer</button></summary>${treeHTML(c,depth+1)}${c.items.length?`<div class="rows tleaf">${c.items.map(rowOf).join('')}</div>`:''}</details>`).join('');
}
function viewStorage(noHead){
 const L=pool().filter(i=>i.status!=='wish'),{root,none}=storageTree(L);
 return `${noHead?'<p class="muted" style="margin-bottom:12px">Emplacements saisis sous la forme <code>Meuble &gt; Tiroir 2 &gt; Classeur bleu &gt; Page 4</code>. Renommer un niveau met à jour toutes les entrées qu’il contient.</p>':'<header class="head"><div><h1>Rangement</h1><p class="sub">Arborescence de vos emplacements.</p></div></header>'}
 ${root.children.size?`<div class="panel glass tree">${treeHTML(root,0)}</div>`:`<div class="empty glass"><b>Aucun emplacement renseigné</b><p>Indiquez l’emplacement dans les fiches, ou rangez plusieurs entrées d’un coup avec le mode Sélection de la collection.</p></div>`}
 ${none?`<p class="muted" style="margin-top:14px">${pl(none,'exemplaire non rangé','exemplaires non rangés')}. <button class="btn sm" data-act="stnone">Les afficher</button></p>`:''}`;
}

/* ---------- vue Outils ---------- */
const ERAS_JP=[['meiji','Meiji','明治',1868,45],['taisho','Taishō','大正',1912,15],['showa','Shōwa','昭和',1926,64],['heisei','Heisei','平成',1989,31],['reiwa','Reiwa','令和',2019,null]];
function kanjiNum(s){
 s=String(s||'').trim().replace(/[０-９]/g,d=>String.fromCharCode(d.charCodeAt(0)-0xFEE0)).replace(/年$/,'');
 if(/^\d+$/.test(s))return +s;if(s==='元')return 1;
 const d={'〇':0,'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9};let total=0,cur=0;
 for(const ch of s){if(ch in d)cur=d[ch];else if(ch==='十'){total+=(cur||1)*10;cur=0}else if(ch==='百'){total+=(cur||1)*100;cur=0}else return NaN}
 return total+cur;
}
function calcCal(){
 if(!$('#calTools'))return;
 const e=ERAS_JP.find(x=>x[0]===$('#jp_e').value),jv=$('#jp_y').value.trim(),n=kanjiNum(jv);let r='—';
 if(jv){if(isNaN(n)||n<1)r='Année invalide';else if(e[4]&&n>e[4])r=`L’ère ${e[1]} ne compte que ${e[4]} années`;else r=`${e[1]} ${n} = ${e[3]+n-1}`+(n===1?' (gannen 元年)':'')}
 $('#jp_r').textContent=r;
 const hv=$('#hj_y').value.trim(),mode=$('#hj_m').value;let hr='—';
 if(hv){const H=+hv;if(!(H>0))hr='Année invalide';else if(mode==='solar')hr=`${H+621}–${H+622} (de Norouz, 21 mars ${H+621}, à mars ${H+622})`;
  else{const simple=H-H/33+622,start=621.5643+0.970229*H,y0=Math.floor(start),y1=Math.floor(start+0.970229);hr=`${y0===y1?y0:y0+'–'+y1} — l’année commence vers ${MONTHS[Math.min(11,Math.floor((start-y0)*12))]} ${y0} (formule simple : ${simple.toFixed(1).replace('.',',')})`}}
 $('#hj_r').textContent=hr;
 const bv=$('#bu_y').value.trim();$('#bu_r').textContent=bv?(+bv>543?`${+bv-543}`:'Année invalide'):'—';
 const rv=$('#rp_y').value.trim();let rr='—';
 if(rv){const k=/^\d+$/.test(rv)?+rv:fromRoman(rv);if(!(k>=1&&k<=14))rr='Le calendrier républicain va de l’an I à l’an XIV';else rr=`An ${toRoman(k)} : `+(k===14?'23 septembre 1805 – 31 décembre 1805':`fin septembre ${1791+k} – fin septembre ${1792+k}`)}
 $('#rp_r').textContent=rr;
}
const GLOSS=[['Atelier','Lieu de frappe d’une monnaie, souvent signalé par une lettre ou un symbole.'],['Avers / revers','Face principale (souvent le portrait) et face opposée d’une pièce.'],['Billon','Alliage d’argent à faible teneur, très cuivreux.'],['BE / Proof','Belle épreuve : frappe soignée, champs miroir.'],['Champ','Surface plane de la pièce, entre les motifs et la légende.'],['Coin','Outil gravé en creux servant à frapper la monnaie.'],['Contremarque','Poinçon apposé après la frappe pour revalider ou réévaluer une pièce.'],['Denier, sesterce, as','Dénominations romaines courantes.'],['Différent','Petit symbole identifiant l’atelier, le directeur de la monnaie ou le graveur.'],['Essai / pattern','Frappe d’essai non émise.'],['Exergue','Espace sous le motif principal, souvent la date ou l’atelier.'],['FDC / BU','Fleur de coin : pièce neuve, jamais circulée.'],['Filigrane','Motif visible par transparence dans le papier d’un billet.'],['Flan','Disque de métal vierge avant la frappe.'],['Fourrée','Pièce d’époque à âme de métal vil recouverte d’une fine couche d’argent ou d’or.'],['Frappe monnaie / médaille','Orientation du revers par rapport à l’avers : retournée (monnaie) ou alignée (médaille).'],['Grènetis','Cordon de petits grains en bordure du motif.'],['KM#','Numéro du catalogue Krause–Mishler.'],['Légende','Inscription circulaire d’une pièce.'],['Listel','Bord surélevé protégeant le motif.'],['Module','Diamètre d’une pièce.'],['Patine','Couche naturelle d’oxydation, appréciée si harmonieuse.'],['Pick','Catalogue de référence des billets du monde (Albert Pick).'],['Recto / verso','Équivalents de l’avers et du revers pour un billet.'],['Remplacement (star note)','Billet de remplacement, repéré par un marqueur dans le numéro de série.'],['Specimen','Billet annulé servant de modèle, souvent surchargé.'],['Surfrappe','Frappe réalisée sur une pièce existante, dont les traces restent visibles.'],['Tirage','Nombre d’exemplaires frappés ou imprimés.'],['Titre','Proportion de métal fin dans l’alliage, exprimée en millièmes (‰).'],['Tranche','Bord de la pièce : lisse, cannelée, inscrite.']];
function filterGloss(){
 const q=norm(ui.gloss.q),L=ui.gloss.letter;
 $$('.gterm').forEach(d=>{const t=d.dataset.t,ok=(!q||norm(d.textContent).includes(q))&&(!L||norm(t).toUpperCase().startsWith(L));d.hidden=!ok});
 $$('.letters .chip').forEach(c=>c.classList.toggle('on',c.dataset.v===L));
 const n=$$('.gterm:not([hidden])').length,c=$('#glcount');if(c)c.textContent=pl(n,'terme','termes');
}
function viewTools(){
 const coin=[['B','G – VG','4–8','Très usée, légende partiellement lisible'],['TB','F','12–15','Usure importante, reliefs principaux visibles'],['TTB','VF','20–35','Usure légère sur les points hauts, détails nets'],['SUP','XF / EF','40–45','Traces très légères sur les points hauts'],['SPL','AU / MS-60 à 62','50–62','Quasi neuve, lustre partiel, frottements'],['FDC','MS','63–70','Jamais circulée, lustre d’origine'],['BE','Proof (PF)','60–70','Frappe épreuve, champs miroir']];
 const note=[['G / VG','Très usé, pliures, petites déchirures possibles'],['F','Circulé, plis multiples, papier encore souple'],['VF','Circulé, quelques plis, papier propre'],['XF','Deux ou trois plis légers, belle fraîcheur'],['AU','Un seul pli léger ou trace de comptage'],['UNC','Neuf, sans pli, papier craquant']];
 const letters=uniq(GLOSS.map(g=>norm(g[0])[0].toUpperCase())).sort();
 return `<header class="head"><h1>Outils et glossaire</h1></header><div class="stack">
 <section class="panel glass" id="calTools"><h2>Convertisseur de calendriers</h2><p class="muted" style="margin-bottom:12px">Convertit le millésime gravé ou imprimé en année grégorienne, à reporter dans le champ « Année ».</p>
 <div class="cols4">
  <div class="tool"><h3>Ères japonaises</h3><div class="calc"><div><label>Ère</label><select id="jp_e">${ERAS_JP.map(e=>`<option value="${e[0]}" ${e[0]==='showa'?'selected':''}>${e[1]} ${e[2]} (${e[3]})</option>`).join('')}</select></div><div><label>Année de l’ère</label><input id="jp_y" placeholder="32, 三十二, 元"></div></div><div class="res" id="jp_r">—</div><div class="formula">${tex('G = A_0 + n - 1')}</div></div>
  <div class="tool"><h3>Hégire</h3><div class="calc"><div><label>Calendrier</label><select id="hj_m"><option value="lunar">Lunaire (AH)</option><option value="solar">Solaire (SH : Iran, Afghanistan)</option></select></div><div><label>Année</label><input id="hj_y" type="number" placeholder="1400"></div></div><div class="res" id="hj_r">—</div><div class="formula">${tex('G \\approx H - \\frac{H}{33} + 622')} · SH : ${tex('G = S + 621')}</div></div>
  <div class="tool"><h3>Ère bouddhiste</h3><div class="calc"><div><label>Année (BE)</label><input id="bu_y" type="number" placeholder="2500"></div></div><div class="res" id="bu_r">—</div><div class="formula">${tex('G = B - 543')}<br><span class="small">Thaïlande, Laos. Certains pays (Sri Lanka, Birmanie) comptent un an d’écart.</span></div></div>
  <div class="tool"><h3>Calendrier républicain</h3><div class="calc"><div><label>An (I à XIV)</label><input id="rp_y" placeholder="VIII ou 8"></div></div><div class="res" id="rp_r">—</div><div class="formula"><span class="small">L’an I débute le 22 septembre 1792 : chaque an républicain chevauche deux années grégoriennes.</span></div></div>
 </div></section>
 <section class="panel glass" id="metalCalc"><h2>Valeur métal d’une pièce</h2><p class="muted" style="margin-bottom:10px">Saisissez le poids, le titre et le cours actuel du métal.</p>
  <div class="calc"><div><label>Poids (g)</label><input type="number" step="any" id="mc_w"></div><div><label>Titre (‰)</label><input type="number" step="any" id="mc_f" value="900"></div><div><label>Cours (par once troy)</label><input type="number" step="any" id="mc_p"></div></div>
  <div class="res" id="mc_r">—</div>
  <div class="formula">${tex('m_{\\text{fin}} = m \\times \\frac{t}{1000} \\qquad V = \\frac{m_{\\text{fin}}}{31{,}1035} \\times P',true)}</div></section>
 <section class="panel glass" id="romanCalc"><h2>Chiffres romains</h2><p class="muted" style="margin-bottom:10px">Conversion dans les deux sens : tapez MDCCCXX ou 1820.</p><div class="calc"><div><input id="rm_i" placeholder="MDCCCXX ou 1820"></div></div><div class="res" id="rm_r">—</div></section>
 ${EXT.tools.map(f=>f()).join('')}
 <div class="cols"><section class="panel glass"><h2>Grades des pièces</h2><div style="overflow-x:auto"><table class="ref"><tr><th>FR</th><th>US</th><th>Sheldon (1–70)</th><th>Description</th></tr>${coin.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</table></div><p class="muted small" style="margin-top:8px">Équivalences approximatives : l’appréciation varie selon les écoles.</p></section>
 <section class="panel glass"><h2>Grades des billets</h2><table class="ref">${note.map(r=>`<tr><th>${r[0]}</th><td>${r[1]}</td></tr>`).join('')}</table></section></div>
 <section class="panel glass"><div class="mhead" style="margin-bottom:6px"><h2>Glossaire</h2><span class="muted small" id="glcount"></span></div>
  <label class="search" style="max-width:none">${ic('search')}<input id="gl_q" placeholder="Rechercher un terme ou une définition" value="${esc(ui.gloss.q)}"></label>
  <div class="letters"><button class="chip" data-act="glLetter" data-v="">Tout</button>${letters.map(l=>`<button class="chip" data-act="glLetter" data-v="${l}">${l}</button>`).join('')}</div>
  <dl class="gloss">${GLOSS.map(([a,b])=>`<div class="gterm" data-t="${esc(a)}"><dt>${a}</dt><dd>${b}</dd></div>`).join('')}</dl></section></div>`;
}

/* ---------- vue Réglages ---------- */
function viewSettings(){
 const s=state.settings,seg=(cur,arr,act)=>`<div class="seg">${arr.map(([v,l])=>`<button data-act="${act}" data-v="${v}" class="${cur===v?'on':''}">${l}</button>`).join('')}</div>`;
 const acc=['#2f8a78','#b7791f','#3b6fd4','#8a4fbf','#c0453a','#5b6670'];
 const fr=getFields().map(f=>`<div class="frow"><input type="checkbox" data-ch="fenable" data-k="${esc(f.key)}" ${f.enabled?'checked':''} ${f.core?'disabled':''} title="Afficher ce champ"><input data-ch="flabel" data-k="${esc(f.key)}" value="${esc(f.label)}" aria-label="Nom du champ"><label class="chk small" title="Masqué en mode vitrine"><input type="checkbox" data-ch="fpriv" data-k="${esc(f.key)}" ${f.private?'checked':''}> privé</label><span class="muted g small">${esc(f.group)}${f.applies&&f.applies!=='both'?(f.applies==='coin'?', pièces':', billets'):''}${f.scope?(f.scope==='wish'?', wishlist':', collection'):''}</span>${f.custom?`<button class="x" data-act="delfield" data-k="${esc(f.key)}" title="Supprimer" aria-label="Supprimer">${ic('trash',16)}</button>`:'<span></span>'}</div>`).join('');
 const bk=s.backup,vi=s.vitrine;
 return `<header class="head"><h1>Réglages</h1></header><div class="stack">
 <section class="panel glass"><h2>Profil</h2><p class="muted" style="margin-bottom:10px">Chaque profil possède sa propre collection et ses propres réglages. Avec le backend Docker, un profil correspondra à un compte utilisateur.</p>
  <div class="actions"><select data-ch="userSwitch" aria-label="Profil actif">${session.users.map(u=>`<option value="${esc(u.id)}" ${u.id===state.userId?'selected':''}>${esc(u.name)}</option>`).join('')}</select><button class="btn sm" data-act="userNew">${ic('plus',14)} Nouveau profil</button><button class="btn sm" data-act="userRename">Renommer</button>${session.users.length>1?`<button class="btn sm danger" data-act="userDel">Supprimer ce profil</button>`:''}</div>
  <p class="muted small" style="margin-top:8px">Identifiant : <code>${esc(state.userId)}</code> · stockage : <code>${esc(Store.kind)}</code></p></section>
 <section class="panel glass"><h2>Apparence</h2><div class="actions" style="gap:22px">
  ${seg(s.theme,[['dark','Sombre (AMOLED)'],['light','Clair'],['auto','Automatique']],'theme')}
  <div class="swatches">${acc.map(c=>`<button class="sw ${s.accent===c?'on':''}" style="background:${c}" data-act="accent" data-v="${c}" aria-label="Couleur ${c}"></button>`).join('')}<input type="color" value="${s.accent}" data-ch="accentInput" aria-label="Couleur personnalisée"></div>
  <label class="chk">Symbole monétaire <input style="width:70px" data-ch="currency" value="${esc(s.currency)}"></label><label class="chk">Code devise (ISO) <input style="width:80px" data-ch="currencyCode" value="${esc(s.currencyCode)}" maxlength="3" placeholder="EUR"></label></div>
  <div class="actions" style="margin-top:14px;gap:22px"><label class="chk"><input type="checkbox" data-ch="glass" ${s.glass!==false?'checked':''}> Effet verre (flou d’arrière-plan)</label><label class="chk"><input type="checkbox" data-ch="ambient" ${s.ambient!==false?'checked':''}> Halo d’accent en arrière-plan</label><label class="chk"><input type="checkbox" data-ch="contrast" ${s.contrast?'checked':''}> Contraste renforcé</label><label class="chk">Intensité du flou <input type="range" min="0" max="30" step="1" value="${s.blur??14}" data-in="blur" style="width:140px" aria-label="Intensité du flou"></label></div>
  <p class="muted small" style="margin-top:8px">Sur fond noir pur, le flou n’a rien à flouter : le halo lui donne de la matière. Désactivez l’effet verre sur les machines modestes ou les grosses collections.</p></section>
 <section class="panel glass"><h2>Sauvegardes</h2><div class="actions"><label class="chk">Rappel de sauvegarde <select data-ch="backupInt">${opt([[0,'Jamais'],[1,'Chaque jour'],[3,'Tous les 3 jours'],[7,'Chaque semaine'],[14,'Toutes les 2 semaines'],[30,'Chaque mois']],bk.intervalDays)}</select></label><button class="btn sm primary" data-act="backupNow">${ic('download',14)} Sauvegarder maintenant</button></div>
  <p class="muted small" style="margin-top:8px">${bk.last?`Dernière sauvegarde : ${esc(new Date(bk.last).toLocaleString('fr-FR'))}.`:'Aucune sauvegarde téléchargée depuis ce navigateur.'} Le fichier JSON contient toutes les fiches, photos comprises.</p></section>
${CONFIG.storage==='rest'?`<section class="panel glass"><h2>Synchronisation WebDAV</h2><p class="muted">Avec le backend Docker, l’envoi vers WebDAV est fait <b>par le serveur</b> (variables <code>NUMMUS_WEBDAV_URL</code>, <code>NUMMUS_WEBDAV_USER</code>, <code>NUMMUS_WEBDAV_PASSWORD</code>) : aucun mot de passe n’est stocké dans le navigateur et CORS ne s’applique pas. État : <span id="davsrv">…</span></p></section>`:` <section class="panel glass"><h2>Synchronisation WebDAV</h2><p class="muted" style="margin-bottom:10px">Envoyez ou récupérez la sauvegarde complète du profil sur un serveur WebDAV personnel (Nextcloud, ownCloud…). Le serveur doit autoriser les requêtes depuis cette origine (CORS) ; avec le futur backend Docker, la synchronisation passera par le serveur. Le mot de passe est conservé dans les préférences de ce navigateur : utilisez un mot de passe d’application.</p>
  <div class="fgrid"><div class="fld wide"><label>Dossier WebDAV</label><input data-ch="davUrl" value="${esc(s.webdav.url)}" placeholder="https://cloud.exemple.fr/remote.php/dav/files/jean/Nummus/"></div>
  <div class="fld"><label>Identifiant</label><input data-ch="davUser" value="${esc(s.webdav.user)}" autocomplete="off"></div><div class="fld"><label>Mot de passe d’application</label><input type="password" data-ch="davPass" value="${esc(s.webdav.pass)}" autocomplete="new-password"></div></div>
  <div class="actions" style="margin-top:10px"><button class="btn primary" data-act="davPush">${ic('download',16)} Envoyer</button><button class="btn" data-act="davPull">Récupérer…</button><span class="muted small">${s.webdav.last?'Dernier envoi : '+esc(new Date(s.webdav.last).toLocaleString('fr-FR')):''}</span></div></section>`}
 <section class="panel glass"><h2>Mode vitrine</h2><p class="muted" style="margin-bottom:10px">Présentation en lecture seule : masque prix d’achat, provenance, emplacements, notes et tous les champs marqués « privé ». La wishlist et les outils de gestion disparaissent.</p>
  <div class="fgrid"><div class="fld"><label>Contenu exposé</label><select data-ch="vitScope">${opt([['all','Toute la collection'],['public','Seulement les entrées « Visible en mode vitrine »']],vi.scope)}</select></div>
  <div class="fld"><label class="chk" style="margin-top:26px"><input type="checkbox" data-ch="vitHide" ${vi.hideValues?'checked':''}> Masquer aussi les valeurs estimées</label></div>
  <div class="fld"><label>Code pour quitter (facultatif)</label><input type="password" data-ch="vitPin" value="" autocomplete="new-password" placeholder="${hasPin()?'Code défini (saisir pour changer, vider pour retirer)':'ex. 2468'}"></div></div>
  <p class="muted small" style="margin-top:8px">Le code évite une sortie accidentelle devant des visiteurs ; ce n’est pas une protection des données, qui restent lisibles dans le navigateur.</p>
  <div class="actions end"><button class="btn primary" data-act="vitOn">${ic('eye',16)} Activer le mode vitrine</button></div></section>
 <section class="panel glass"><h2>Modules</h2><p class="muted" style="margin-bottom:8px">Activez ou désactivez les parties dont vous vous servez. Vos données restent conservées.</p>
  ${Object.entries(MODULE_INFO).map(([k,[t,d]])=>`<label class="chk" style="padding:7px 0"><input type="checkbox" data-ch="module" data-k="${k}" ${isOn(k)?'checked':''}> <span><b>${t}</b> <span class="muted">${d}</span></span></label>`).join('')}</section>
 <section class="panel glass"><h2>Champs des fiches</h2><p class="muted" style="margin-bottom:8px">Masquez, renommez, marquez comme privés ou ajoutez vos propres champs. Les champs de base (type, pays, dénomination, année) restent toujours actifs.</p>
  <div class="frow h"><span></span><span>Nom</span><span>Vitrine</span><span class="g">Groupe</span><span></span></div>${fr}
  <div class="addf"><div><label class="muted small">Nom du nouveau champ</label><input id="nf_l" placeholder="ex. Lieu de trouvaille"></div>
  <div><label class="muted small">Type</label><select id="nf_t"><option value="text">Texte</option><option value="textarea">Texte long</option><option value="markdown">Markdown</option><option value="number">Nombre</option><option value="money">Montant</option><option value="date">Date</option><option value="url">Lien</option><option value="checkbox">Case à cocher</option><option value="select">Liste de choix</option></select></div>
  <div><label class="muted small">S’applique à</label><select id="nf_a"><option value="both">Pièces et billets</option><option value="coin">Pièces</option><option value="note">Billets</option></select></div>
  <div><label class="muted small">Choix (séparés par des virgules)</label><input id="nf_o" placeholder="pour une liste de choix"></div>
  <label class="chk"><input type="checkbox" id="nf_p"> Privé</label>
  <button class="btn primary" data-act="addfield">${ic('plus',16)} Ajouter</button></div></section>
 <section class="panel glass"><h2>Intégrations</h2><p class="muted" style="margin-bottom:10px">Numista permet de pré-remplir une fiche depuis son N#, une référence catalogue (KM#…) ou la dénomination. Une clé API personnelle s’obtient sur numista.com. Avec le backend, la clé restera côté serveur (route /api/numista).</p>
  <div class="fgrid"><div class="fld"><label>Clé API Numista</label><input type="password" data-ch="nmKey" value="${esc(s.numista.key)}" autocomplete="off" ${CONFIG.storage==='rest'?'disabled placeholder="Gérée par le serveur"':''}></div><div class="fld"><label>URL de l’API</label><input data-ch="nmBase" value="${esc(s.numista.baseUrl)}" ${CONFIG.storage==='rest'?'disabled':''}></div></div>
  <p class="muted small" style="margin-top:8px">En mode local, l’appel part directement du navigateur : il peut être bloqué par la politique CORS de Numista, auquel cas il faudra attendre le proxy du backend.</p></section>
 <section class="panel glass"><h2>Données</h2><p class="muted" style="margin-bottom:10px">${persistent?(Store.kind==='rest'?'Vos données sont stockées sur le serveur.':'Vos données sont enregistrées dans ce navigateur (IndexedDB). Exportez-les régulièrement.'):'Le stockage du navigateur est indisponible : vos données seront perdues à la fermeture. Exportez-les.'}</p>
  <div class="actions"><button class="btn" data-act="backupNow">Exporter (JSON complet)</button><button class="btn" data-act="expcsv">Exporter (CSV)</button><button class="btn" data-act="print">${ic('print',15)} Inventaire PDF</button>
  <label class="btn">Importer JSON<input type="file" accept=".json,application/json" hidden data-ch="impjson"></label><label class="btn">Importer CSV<input type="file" accept=".csv,text/csv" hidden data-ch="impcsv"></label>
  <button class="btn" data-act="demo">Charger des exemples</button><button class="btn danger" data-act="wipe">Effacer ce profil</button></div></section>${EXT.settings.map(f=>f()).join('')}</div>`;
}
