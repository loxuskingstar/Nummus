'use strict';
/* ---------- carte du monde (d3 + topojson) ---------- */
let WORLD=null,worldP=null;
const codeOf=f=>{const id=f.id;if(isEmpty(id))return(f.properties&&f.properties.name==='Kosovo')?'XK':'';return String(id).padStart(3,'0')};
function loadWorld(){
 if(WORLD)return Promise.resolve(WORLD);if(worldP)return worldP;
 const urls=['vendor/countries-110m.json'];
 worldP=(async()=>{
  if(!window.d3||!window.topojson)throw new Error('libs');
  for(const u of urls){try{const r=await fetch(u);if(!r.ok)continue;const j=await r.json();
   WORLD=topojson.feature(j,j.objects.countries).features.filter(f=>f.properties.name!=='Antarctica');WORLD.forEach(f=>f.code=codeOf(f));return WORLD}catch(e){}}
  worldP=null;throw new Error('map');
 })();
 return worldP;
}
function bestCentroid(f){const g=f.geometry;if(g.type!=='MultiPolygon')return d3.geoCentroid(f);let best=null,ba=-1;g.coordinates.forEach(c=>{const p={type:'Polygon',coordinates:c},a=d3.geoArea(p);if(a>ba){ba=a;best=p}});return d3.geoCentroid(best)}
async function mountMap(el,o){
 if(!el)return;el.innerHTML='<div class="map-loading">Chargement de la carte…</div>';
 let feats;
 try{feats=await loadWorld()}catch(e){if(el.isConnected)el.innerHTML=`<div class="empty"><b>Carte indisponible</b><p>Les contours du monde n’ont pas pu être chargés. Le fichier <code>vendor/countries-110m.json</code> est introuvable.</p></div>`;return}
 if(!el.isConnected)return;
 const w=el.clientWidth||900,h=el.clientHeight||500;
 const proj=d3.geoMercator().fitExtent([[4,4],[w-4,h-4]],{type:'MultiPoint',coordinates:[[-180,76],[180,-57]]}),path=d3.geoPath(proj);

 el.innerHTML='';
 const svg=d3.select(el).append('svg').attr('width',w).attr('height',h).attr('viewBox',`0 0 ${w} ${h}`);
 const g=svg.append('g');
 g.append('path').datum(d3.geoGraticule().step([30,30]).extent([[-180,-60],[180,80]])()).attr('class','grat').attr('d',path);
 const tip=d3.select(el).append('div').attr('class','tip').style('display','none');
 const showTip=(e,html)=>{const r=el.getBoundingClientRect();tip.html(html).style('display','block');const tw=tip.node().offsetWidth;let x=e.clientX-r.left+14;if(x+tw>r.width-6)x=e.clientX-r.left-tw-14;tip.style('left',x+'px').style('top',Math.max(4,e.clientY-r.top-10)+'px')};
 const hideTip=()=>tip.style('display','none');
 const sel=()=>g.selectAll('path.c').classed('sel',d=>!!o.selected&&d.code&&d.code===o.selected());
 g.selectAll('path.c').data(feats).join('path').attr('d',path)
  .attr('class',d=>'c'+(o.info&&o.info(d.code)?' has':''))
  .style('fill',d=>{const i=o.info&&o.info(d.code);if(!i)return null;const p=Math.round(55+Math.min(45,Math.log2(i.count+1)*13));return`color-mix(in srgb,var(--accent) ${p}%,var(--map-empty))`})
  .on('mousemove',(e,d)=>{const i=o.info&&o.info(d.code);if(i)showTip(e,o.tip(d.code,i));else hideTip()})
  .on('mouseleave',hideTip)
  .on('click',(e,d)=>{if(o.info&&o.info(d.code)&&o.onClick){o.onClick(d.code);sel()}});
 sel();
 if(o.info){const small=feats.filter(f=>o.info(f.code)&&path.area(f)<26);
  g.append('g').selectAll('circle').data(small).join('circle').attr('class','pin').attr('r',4.5).attr('cx',f=>proj(bestCentroid(f))[0]).attr('cy',f=>proj(bestCentroid(f))[1])
   .on('mousemove',(e,d)=>showTip(e,o.tip(d.code,o.info(d.code)))).on('mouseleave',hideTip).on('click',(e,d)=>{o.onClick&&o.onClick(d.code);sel()})}
 if(o.points){
  const byCode=Object.fromEntries(feats.map(f=>[f.code,f]));
  const pts=o.points.map(p=>{const f=byCode[p.code];if(!f)return null;const xy=proj(bestCentroid(f));return xy?{...p,x:xy[0],y:xy[1]}:null}).filter(Boolean);
  g.append('g').selectAll('circle').data(pts).join('circle').attr('class','pt').attr('cx',d=>d.x).attr('cy',d=>d.y).attr('r',d=>4+Math.sqrt(d.count)*2.2)
   .on('mousemove',(e,d)=>showTip(e,o.tip(d.code,d))).on('mouseleave',hideTip).on('click',(e,d)=>o.onClick&&o.onClick(d.code));
 }
 if(o.geo){ // points géographiques (lat/lon) : ateliers monétaires
  const pts=o.geo.map(p=>{const xy=proj([p.lon,p.lat]);return xy?{...p,x:xy[0],y:xy[1]}:null}).filter(Boolean);
  g.append('g').selectAll('circle').data(pts).join('circle').attr('class',d=>'pt geo'+(d.unc?' unc':'')+(o.geoSel&&o.geoSel()===d.key?' sel':'')).attr('cx',d=>d.x).attr('cy',d=>d.y).attr('r',d=>6+Math.sqrt(d.count)*2.6)
   .on('mousemove',(e,d)=>showTip(e,o.geoTip(d))).on('mouseleave',hideTip).on('click',(e,d)=>o.geoClick&&o.geoClick(d.key));
 }
 const zoom=d3.zoom().scaleExtent([1,14]).translateExtent([[0,0],[w,h]]).on('zoom',e=>g.attr('transform',e.transform));
 svg.call(zoom);
 d3.select(el).append('div').attr('class','mapctl').html('<button type="button" data-z="1" aria-label="Zoom avant">+</button><button type="button" data-z="-1" aria-label="Zoom arrière">−</button><button type="button" data-z="0" aria-label="Réinitialiser" style="font-size:15px">⟲</button>')
  .selectAll('button').on('click',function(){const z=+this.dataset.z;z===0?svg.transition().duration(350).call(zoom.transform,d3.zoomIdentity):svg.transition().duration(250).call(zoom.scaleBy,z>0?1.6:1/1.6)});
 if(o.info)d3.select(el).append('div').attr('class','maplegend').html('<span>Peu</span><i></i><span>Beaucoup</span>');
}

/* ---------- vue Atlas ---------- */
function atlasData(){
 const d={};
 pool().forEach(i=>{
  if(!i.country)return;if(i.status==='wish'&&!ui.atlas.wish)return;if(ui.atlas.type&&i.type!==ui.atlas.type)return;
  const o=d[i.country]||(d[i.country]={code:i.country,coins:0,notes:0,wish:0,min:null,max:null,value:0,items:[],count:0});
  o.count++;o.items.push(i);
  if(i.status==='wish')o.wish++;else if(i.type==='note')o.notes++;else o.coins++;
  if(hasYear(i)){const y=+i.year;o.min=o.min===null?y:Math.min(o.min,y);o.max=o.max===null?y:Math.max(o.max,y)}
  if(i.status!=='wish')o.value+=(+i.value||0)*qtyOf(i);
 });
 return d;
}
function tipHTML(code,o){
 const p=[];if(o.coins)p.push(pl(o.coins,'pièce','pièces'));if(o.notes)p.push(pl(o.notes,'billet','billets'));if(o.wish)p.push(pl(o.wish,'souhait','souhaits'));
 const yrs=o.min!==null?(o.min===o.max?fmtYear(o.min):`${fmtYear(o.min)} à ${fmtYear(o.max)}`):'';
 return `<b>${esc(cname(code))}</b><br>${p.join(', ')}${yrs?`<br>${esc(yrs)}`:''}${o.value&&!hideVals()?`<br>Valeur estimée : ${esc(fmtMoney(o.value))}`:''}<br><span style="opacity:.7">Cliquer pour ouvrir</span>`;
}
function viewAtlas(){
 const seg=(cur,arr,ch)=>`<div class="seg">${arr.map(([v,l])=>`<button data-act="${ch}" data-v="${v}" class="${cur===v?'on':''}">${l}</button>`).join('')}</div>`;
 return `<header class="head"><div><h1>Atlas</h1><p class="sub">Les pays de votre collection sont colorés. Plus la teinte est intense, plus il y a d’entrées.</p></div>
 <div class="actions">${seg(ui.atlas.type,[['','Tout'],['coin','Pièces'],['note','Billets']],'attype')}${vit()?'':`<label class="btn"><input type="checkbox" data-ch="atWish" ${ui.atlas.wish?'checked':''}> Inclure la wishlist</label>`}</div></header>
 <div class="agrid"><div class="map glass" id="map"></div><aside class="panel glass" id="apanel"></aside></div>`;
}
function afterAtlas(){const data=atlasData();renderAtlasPanel(data);mountMap($('#map'),{info:c=>data[c],tip:tipHTML,selected:()=>ui.atlas.sel,onClick:c=>{ui.atlas.sel=c;renderAtlasPanel(data)}})}
function renderAtlasPanel(data){
 const el=$('#apanel');if(!el)return;const sel=ui.atlas.sel&&data[ui.atlas.sel];
 if(sel){
  const items=sel.items.slice().sort(SORT.yearAsc);
  el.innerHTML=`<div class="mhead" style="margin-bottom:6px"><h2>${esc(cname(sel.code))}</h2><button class="x" data-act="atclear" aria-label="Retour">${ic('x',20)}</button></div>
  <p class="muted">${tipHTML(sel.code,sel).split('<br>').slice(1,-1).map(s=>s.replace(/<[^>]+>/g,'')).join(' — ')}</p>
  <div class="plist">${items.map(i=>`<div class="row" data-act="open" data-id="${i.id}" tabindex="0"><span class="mini">${thumb(i,18)}</span><span><b>${esc(i.denomination)}</b><br><small class="muted">${esc([i.issuer,fmtYear(i.year)].filter(Boolean).join(', '))}</small></span><span class="muted">${i.status==='wish'?'souhait':esc(i.grade||'')}</span></div>`).join('')}</div>
  ${vit()?'':`<button class="btn sm" style="margin-top:12px" data-act="add" data-country="${sel.code}">${ic('plus',15)} Ajouter pour ce pays</button>`}`;
 }else{
  const list=Object.values(data).sort((a,b)=>b.count-a.count);
  el.innerHTML=`<h2>Pays</h2><p class="muted">${list.length?pl(list.length,'pays représenté','pays représentés'):'Aucun pays pour l’instant.'}</p>
  ${list.length?`<div class="plist">${list.map(o=>`<div class="row" data-act="atsel" data-id="${o.code}" tabindex="0" style="grid-template-columns:1fr auto"><b>${esc(cname(o.code))}</b><span class="muted">${o.count}</span></div>`).join('')}</div>`:`<p class="muted" style="margin-top:8px">Renseignez le champ « Pays actuel » d’une entrée pour la voir apparaître sur la carte.</p>`}`;
 }
}
