'use strict';
/* =====================================================================
   CARTE DES ATELIERS MONÉTAIRES
   Vue spécialisée (l'Atlas général reste centré sur les pays). Les ateliers sont déduits du champ « Atelier
   monétaire » des fiches, puis placés grâce à un petit répertoire embarqué de villes de frappe connues.
   Réserves assumées :
   - les coordonnées embarquées sont celles de la ville, donc APPROXIMATIVES (pointillés sur la carte) ;
   - les ateliers inconnus du répertoire sont listés à part : vous les placez vous-même (lat./long.) ;
   - les territoires historiques (provinces, empires) ne sont pas dessinés : aucun fond de carte historique n'est embarqué.
   ===================================================================== */
addModule('mints','Ateliers monétaires','pin','Carte des ateliers de frappe présents dans la collection, filtrable par période.',{after:'atlas',view:()=>viewMints(),after_:()=>afterMints()});
/* [nom, alias…, lat, lon] — villes de frappe courantes, positions approximatives */
const MINT_DB=[
 ['Paris','monnaie de paris',48.857,2.352],['Lyon','lugdunum',45.764,4.836],['Bordeaux','pessac',44.806,-0.631],['Marseille','',43.296,5.370],['Rouen','',49.443,1.099],['Lille','',50.629,3.057],['Strasbourg','',48.573,7.752],['Toulouse','',43.605,1.444],['Nantes','',47.218,-1.554],['Limoges','',45.834,1.262],['Tours','',47.394,0.684],['Arles','arelate',43.677,4.628],['Trèves','trier|treveris',49.750,6.637],
 ['Rome','roma',41.903,12.496],['Milan','mediolanum',45.464,9.190],['Venise','venezia|venice',45.440,12.316],['Naples','napoli|naples',40.852,14.268],['Florence','firenze',43.770,11.255],['Gênes','genova|genoa',44.407,8.934],['Turin','torino',45.070,7.687],['Aquilée','aquileia',45.768,13.367],
 ['Londres','london|royal mint',51.507,-0.128],['Llantrisant','',51.540,-3.380],['Birmingham','heaton',52.486,-1.890],
 ['Madrid','',40.417,-3.704],['Séville','sevilla|seville',37.389,-5.984],['Barcelone','barcelona',41.385,2.173],['Ségovie','segovia',40.949,-4.118],['Potosí','potosi',-19.589,-65.753],['Mexico','mexico city|ciudad de mexico',19.433,-99.133],['Lima','',-12.046,-77.043],['Lisbonne','lisboa|lisbon',38.722,-9.139],
 ['Berlin','',52.520,13.405],['Munich','muenchen|münchen',48.135,11.582],['Stuttgart','',48.776,9.183],['Karlsruhe','',49.007,8.404],['Hambourg','hamburg',53.551,9.994],['Dresde','dresden',51.050,13.738],['Vienne','wien|vienna',48.208,16.374],['Kremnica','kremnitz',48.706,18.914],['Prague','praha',50.075,14.438],['Budapest','',47.498,19.040],
 ['Utrecht','',52.090,5.122],['Bruxelles','brussels',50.850,4.352],['Berne','bern|swissmint',46.948,7.447],['Athènes','athens|athenes',37.984,23.728],['Constantinople','istanbul|byzance',41.008,28.978],['Alexandrie','alexandria',31.200,29.919],['Carthage','',36.853,10.323],['Antioche','antioch',36.202,36.160],['Thessalonique','thessalonica',40.640,22.944],['Nicomédie','nicomedia',40.760,29.920],['Siscia','',45.490,16.370],
 ['Philadelphie','philadelphia',39.952,-75.165],['Denver','',39.739,-104.990],['San Francisco','',37.775,-122.419],['West Point','',41.391,-73.956],['La Nouvelle-Orléans','new orleans',29.951,-90.072],['Carson City','',39.164,-119.767],['Ottawa','',45.421,-75.690],['Winnipeg','',49.900,-97.139],
 ['Pretoria','',-25.747,28.188],['Perth','',-31.950,115.860],['Melbourne','',-37.814,144.963],['Sydney','',-33.869,151.209],['Calcutta','kolkata',22.573,88.364],['Bombay','mumbai',18.975,72.826],['Osaka','',34.693,135.502],['Tokyo','',35.676,139.650],['Pékin','beijing|peking',39.904,116.407],['Shanghai','',31.230,121.474],
 ['Kongsberg','',59.667,9.650],['Stockholm','',59.329,18.069],['Copenhague','copenhagen|kobenhavn',55.676,12.568],['Saint-Pétersbourg','st petersburg|saint petersburg',59.934,30.336],['Moscou','moscow',55.756,37.617],['Varsovie','warsaw|warszawa',52.230,21.012]
].map(([name,al,lat,lon])=>({name,aliases:[name,...String(al).split('|')].filter(Boolean).map(ovn),lat,lon,approx:true,builtin:true}));
const mintFilter={era:'',min:'',max:''};
function mintPlace(mint){
 const m=ovn(mint);if(!m)return null;
 const hit=list=>list.find(p=>p.aliases.some(a=>a&&(m===a||(' '+m+' ').includes(' '+a+' '))));
 const custom=state.mints.map(c=>({...c,aliases:[c.name,...(c.aliases||[])].map(ovn),custom:true}));
 return hit(custom)||hit(MINT_DB)||null;
}
function mintData(){
 const ymin=mintFilter.min===''?null:+mintFilter.min,ymax=mintFilter.max===''?null:+mintFilter.max;
 const placed=new Map(),unknown=new Map();let none=0;
 pool().filter(i=>i.status!=='wish').forEach(i=>{
  if(ymin!==null||ymax!==null){if(!hasYear(i))return;if(ymin!==null&&+i.year<ymin)return;if(ymax!==null&&+i.year>ymax)return}
  if(!String(i.mint||'').trim()){none++;return}
  const p=mintPlace(i.mint);
  if(p){const k=p.custom?'c:'+p.id:'b:'+p.name,o=placed.get(k)||placed.set(k,{key:k,name:p.name,lat:p.lat,lon:p.lon,unc:!!(p.approx||p.uncertain),custom:!!p.custom,note:p.note||'',items:[],count:0}).get(k);o.items.push(i);o.count++}
  else{const k=ovn(i.mint),o=unknown.get(k)||unknown.set(k,{label:String(i.mint).trim(),items:[]}).get(k);o.items.push(i)}
 });
 return{placed:[...placed.values()],unknown:[...unknown.values()],none};
}
function viewMints(){
 const d=mintData(),era=(PERIODS.find(p=>String(mintFilter.min)===String(p[2]??'')&&String(mintFilter.max)===String(p[3]??''))||[''])[0];
 return `<header class="head"><div><h1>Ateliers monétaires</h1><p class="sub">Les villes de frappe présentes dans votre collection, d’après le champ « Atelier monétaire ». Les positions fournies sont celles de la ville (approximatives : points en pointillés).</p></div>
 <div class="actions"><select data-ch="mintEra" aria-label="Période"><option value="">Toutes les époques</option>${opt(PERIODS.map(p=>[p[0],p[1]]),era)}</select></div></header>
 <div class="agrid"><div class="map glass" id="mintmap"></div><aside class="panel glass" id="mpanel"></aside></div>
 <p class="muted small" style="margin-top:10px">Pas de fond de carte historique : les empires et provinces anciens ne sont pas dessinés. ${d.none?`${pl(d.none,'entrée sans atelier renseigné','entrées sans atelier renseigné')} (non affichée${d.none>1?'s':''}).`:''}</p>`;
}
function afterMints(){
 const d=mintData();renderMintPanel(d);
 mountMap($('#mintmap'),{geo:d.placed,geoTip:p=>`<b>${esc(p.name)}</b><br>${pl(p.count,'entrée','entrées')}${p.unc?'<br><span style="opacity:.7">position approximative</span>':''}`,geoSel:()=>ui.mintSel,geoClick:k=>{ui.mintSel=k;renderMintPanel(d);afterMintsRedraw(d)}});
}
function afterMintsRedraw(d){const m=$('#mintmap');if(!m)return;mountMap(m,{geo:d.placed,geoTip:p=>`<b>${esc(p.name)}</b><br>${pl(p.count,'entrée','entrées')}${p.unc?'<br><span style="opacity:.7">position approximative</span>':''}`,geoSel:()=>ui.mintSel,geoClick:k=>{ui.mintSel=k;renderMintPanel(d);afterMintsRedraw(d)}})}
function renderMintPanel(d){
 const el=$('#mpanel');if(!el)return;const sel=d.placed.find(p=>p.key===ui.mintSel);
 if(sel){
  el.innerHTML=`<div class="mhead" style="margin-bottom:6px"><h2>${esc(sel.name)}</h2><button class="x" data-act="mintClear" aria-label="Retour">${ic('x',20)}</button></div>${sel.unc?`<p class="notice warn">${ic('warn',16)}<span>Position approximative de la ville.</span></p>`:''}<div class="plist">${sel.items.sort(SORT.yearAsc).map(i=>`<div class="row" data-act="open" data-id="${i.id}" tabindex="0"><span class="mini">${thumb(i,18)}</span><span><b>${esc(i.denomination)}</b><br><small class="muted">${esc([cname(i.country),fmtYear(i.year)].filter(Boolean).join(', '))}</small></span><span class="muted">${esc(i.mint||'')}</span></div>`).join('')}</div>`;return;
 }
 el.innerHTML=`<h2>Ateliers</h2><p class="muted">${pl(d.placed.length,'atelier localisé','ateliers localisés')}</p><div class="plist">${d.placed.sort((a,b)=>b.count-a.count).map(p=>`<div class="row" data-act="mintSel" data-k="${esc(p.key)}" tabindex="0" style="grid-template-columns:1fr auto"><b>${esc(p.name)}${p.unc?' <span class="muted small">≈</span>':''}</b><span class="muted">${p.count}</span></div>`).join('')}</div>
 ${d.unknown.length?`<h3 style="margin-top:16px">À localiser (${d.unknown.length})</h3><p class="muted small">Ces ateliers ne figurent pas dans le répertoire. Indiquez leur position pour les voir sur la carte.</p>${d.unknown.map((u,i)=>`<div class="row" style="grid-template-columns:1fr auto"><span>${esc(u.label)} <span class="muted small">(${u.items.length})</span></span><button class="btn sm" data-act="mintLocate" data-l="${esc(u.label)}">Placer</button></div>`).join('')}`:''}
 ${state.mints.length?`<h3 style="margin-top:16px">Vos positions</h3>${state.mints.map(c=>`<div class="row" style="grid-template-columns:1fr auto"><span>${esc(c.name)} <span class="muted small">${c.uncertain?'(incertain)':''}</span></span><button class="btn sm danger" data-act="mintDel" data-id="${c.id}" aria-label="Supprimer">${ic('x',14)}</button></div>`).join('')}`:''}`;
}
Object.assign(ACT,{
 mintClear:()=>{ui.mintSel=null;EXT.after.mints()},
 mintSel:t=>{ui.mintSel=t.dataset.k;EXT.after.mints()},
 mintDel:t=>{state.mints=state.mints.filter(c=>c.id!==t.dataset.id);savePrefs();EXT.after.mints()},
 mintLocate:t=>promptModal('Placer un atelier',`<div class="fgrid"><div class="fld wide"><label>Nom (tel qu’écrit dans vos fiches)</label><input id="mt_n" required value="${esc(t.dataset.l)}"></div><div class="fld"><label>Latitude</label><input id="mt_la" type="number" step="any" min="-90" max="90" required placeholder="48.857"></div><div class="fld"><label>Longitude</label><input id="mt_lo" type="number" step="any" min="-180" max="180" required placeholder="2.352"></div>
 <div class="fld wide"><label class="chk"><input type="checkbox" id="mt_u" checked> Localisation incertaine (affichée en pointillés)</label></div><div class="fld wide"><label>Note</label><input id="mt_x" placeholder="source de la position, hypothèse…"></div></div>`,'mintOk','Placer'),
});
SUBMIT.mintOk=()=>{const la=+$('#mt_la').value,lo=+$('#mt_lo').value,n=$('#mt_n').value.trim();if(!n||isNaN(la)||isNaN(lo)||Math.abs(la)>90||Math.abs(lo)>180)return;
 state.mints.push({id:uid(),name:n,lat:la,lon:lo,uncertain:$('#mt_u').checked,note:$('#mt_x').value.trim()});savePrefs();closeModal();render()};
Object.assign(CH,{mintEra:t=>{const p=PERIODS.find(x=>x[0]===t.value);mintFilter.min=p?(p[2]??''):'';mintFilter.max=p?(p[3]??''):'';render()}});
