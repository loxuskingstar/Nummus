'use strict';
/* ---------- accueil : tableau de bord ---------- */
function kpi(icn,label,val,sub){return `<div class="kpi2 glass"><span class="ki">${ic(icn,18)}</span><div><span class="kl">${label}</span><b>${val}</b>${sub?`<small>${sub}</small>`:''}</div></div>`}
function dcard(title,icn,body,link){return `<section class="dcard glass"><h3 class="wh"><span>${ic(icn,14)} ${title}</span>${link||''}</h3>${body}</section>`}
const moreLink=(v,t='Voir tout')=>`<button class="lnk" data-act="nav" data-v="${v}">${t} ${ic('chev',13)}</button>`;
function viewHome(){
 if(!FX.init){FX.init=true;FX.to=state.settings.currencyCode;FX.from=FX.to==='USD'?'EUR':'USD'}
 const v=vit(),hv=hideVals(),L=pool().filter(i=>i.status!=='wish'),tot=L.reduce((s,i)=>s+qtyOf(i),0);
 const nc=new Set(L.map(i=>i.country).filter(Boolean)).size,wish=pool().filter(i=>i.status==='wish').length;
 const val=L.reduce((s,i)=>s+(+i.value||0)*qtyOf(i),0),paid=L.reduce((s,i)=>s+(+i.paid||0),0),mp=metalPortfolio(L),pr=state.settings.prices;
 const date=new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
 const k=[kpi('coin','Exemplaires',tot,pl(L.length,'entrée','entrées'))];
 if(!hv)k.push(kpi('chart','Valeur estimée',fmtMoney(val),(!v&&paid)?`${val>=paid?'+':''}${Math.round((val-paid)/paid*100)} % vs investi`:''));
 k.push(kpi('globe','Pays',`${nc} <small class="of">/ 195</small>`,`<span class="pbar"><i style="width:${Math.min(100,nc/195*100)}%"></i></span>`));
 k.push(kpi('layers','Métal fin',`${nf1(mp.r.gold.g+mp.r.silver.g)} <small class="of">g</small>`,`${nf1(mp.r.gold.g)} g or · ${nf1(mp.r.silver.g)} g argent`));
 const top=Object.entries(L.reduce((m,i)=>{if(i.country)m[i.country]=(m[i.country]||0)+qtyOf(i);return m},{})).sort((a,b)=>b[1]-a[1]).slice(0,5),mx=top.length?top[0][1]:1;
 const bars=top.length?top.map(([c,n])=>`<div class="bar"><span title="${esc(cname(c))}">${esc(cname(c))}</span><i><b style="width:${n/mx*100}%"></b></i><em>${n}</em></div>`).join(''):'<p class="muted small">Aucune entrée.</p>';
 const rec=L.slice().sort(SORT.recent).slice(0,5);
 const recent=rec.length?`<div class="wl">${rec.map(i=>`<div class="row" data-act="open" data-id="${i.id}" tabindex="0"><span class="mini">${thumb(i,16)}</span><span class="rt"><b>${esc(i.denomination)}</b><small class="muted">${esc(subtitle(i))}</small></span><span class="muted small">${hv?'':fmtMoney(i.value)}</span></div>`).join('')}</div>`:`<p class="muted small" style="margin-bottom:12px">Votre collection est vide. Ajoutez une première pièce ou explorez l’application avec quelques exemples.</p>${v?'':`<div class="actions"><button class="btn primary" data-act="add">${ic('plus',16)} Ajouter</button><button class="btn" data-act="demo">Charger des exemples</button></div>`}`;
 const cats=visCats(),f=featured();
 const catsBody=`<div class="cat-tiles">${cats.length?cats.slice(0,4).map(c=>catTile(c)).join(''):'<p class="muted small">Regroupez vos entrées en catalogues libres ou en coffrets.</p>'}</div>`;
 const codes=lists.currencies(),mrows=METAL_CLASSES.filter(([k])=>mp.r[k].g>0).map(([k,l])=>{const g=mp.r[k].g,p=+pr[k];return `<div class="mrow"><span>${l}</span><span class="muted">${nf1(g)} g</span><b>${p?fmtMoney(g/31.1035*p):'<span class="muted">cours ?</span>'}</b></div>`}).join('');
 const fx=`<div class="fx"><div class="fxb"><label>De</label><input type="number" step="any" min="0" value="${FX.amt}" data-in="fxamt" aria-label="Montant"><select data-ch="fxfrom" aria-label="Devise source">${codes.map(c=>`<option ${c===FX.from?'selected':''}>${c}</option>`).join('')}</select></div><button class="fxs" data-act="fxswap" aria-label="Inverser">${ic('repeat',16)}</button><div class="fxb"><label>Vers</label><div class="out" id="fx_out">—</div><select data-ch="fxto" aria-label="Devise cible">${codes.map(c=>`<option ${c===FX.to?'selected':''}>${c}</option>`).join('')}</select></div></div><p class="muted small" id="fx_note" style="margin-top:8px"></p>`;
 const H={v,hv,L,tot,nc,wish,val,paid,mp,pr,bars,recent,catsBody,mrows,fx,f,rec};
 const edit=!!ui.homeEdit&&!v;
 return `<header class="head"><div><p class="eyebrow">${esc(date)}</p><h1>${esc(userName())}</h1></div><div class="actions">${v?'':`<button class="btn ${edit?'primary':''}" data-act="homeEdit">${ic(edit?'check':'sliders',16)} ${edit?'Terminé':'Personnaliser'}</button><button class="btn" data-act="nav" data-v="wishlist">${ic('star',16)} ${pl(wish,'souhait','souhaits')}</button><button class="btn primary" data-act="add">${ic('plus',16)} Ajouter</button>`}</div></header>
 <div class="kpis2">${k.join('')}</div>
 ${(v||homeHidden('daily'))?'':EXT.home.map(fn=>{try{return fn()}catch(e){console.error(e);return''}}).join('')}
 ${edit?homeTray(H):''}
 ${homeDash(H,edit)}`;
}
/* ---------- tableau de bord à widgets : ordre et visibilité mémorisés dans les réglages (settings.dash) ---------- */
const HOME_W=[];                                   // {id,title,icon,span,rows,link,when,body,off}
function homeWidget(d){if(!HOME_W.some(w=>w.id===d.id))HOME_W.push({span:4,...d})}
const homeHidden=id=>{const d=state.settings.dash,w=HOME_W.find(x=>x.id===id);return(d.hidden||[]).includes(id)||(w&&w.off&&!(d.shown||[]).includes(id))};
function homeLayout(){
 const d=state.settings.dash,saved=(d.order||[]).filter(id=>HOME_W.some(w=>w.id===id));
 return[...saved,...HOME_W.map(w=>w.id).filter(id=>!saved.includes(id))].map(id=>HOME_W.find(w=>w.id===id));
}
function homeDash(H,edit){
 const cards=homeLayout().filter(w=>!homeHidden(w.id)&&(!w.when||w.when(H))).map(w=>{
  let body='';try{body=w.body(H)}catch(e){console.error(e);body='<p class="muted small">Widget indisponible.</p>'}
  const ctl=edit?`<span class="hwctl"><button class="x" data-act="hwMove" data-id="${w.id}" data-d="-1" aria-label="Monter">${ic('up',14)}</button><button class="x" data-act="hwMove" data-id="${w.id}" data-d="1" aria-label="Descendre">${ic('down',14)}</button><button class="x" data-act="hwHide" data-id="${w.id}" aria-label="Masquer">${ic('x',14)}</button></span>`:'';
  const head=`<h3 class="wh"><span>${edit?`<span class="hwgrip" title="Glisser pour déplacer">${ic('drag',14)}</span> `:''}${ic(w.icon,14)} ${w.title}</span>${edit?ctl:(w.link?w.link():'')}</h3>`;
  return `<section class="dcard glass hw ${w.cls||''}" data-w="${w.id}" ${edit?'draggable="true"':''} style="--sp:${w.span};--rw:${w.rows||1}">${head}${body}</section>`;
 }).join('');
 return `<div class="dash ${edit?'editing':''}" id="dash">${cards}</div>`;
}
function homeTray(H){
 const hid=HOME_W.filter(w=>homeHidden(w.id)&&(!w.when||w.when(H)||w.off)),daily=homeHidden('daily');
 return `<section class="panel glass" style="margin-bottom:14px"><h3>Widgets disponibles</h3><p class="muted small" style="margin-bottom:8px">Glissez les cartes pour les réordonner (ou utilisez les flèches), masquez avec la croix, ajoutez ci-dessous.</p>
 <div class="chips">${hid.map(w=>`<button class="chip" data-act="hwShow" data-id="${w.id}">${ic('plus',12)} ${w.title}</button>`).join('')||'<span class="muted small">Tous les widgets sont affichés.</span>'}${daily?`<button class="chip" data-act="hwShow" data-id="daily">${ic('plus',12)} Pièce du jour</button>`:`<button class="chip" data-act="hwHide" data-id="daily">${ic('x',12)} Masquer la pièce du jour</button>`}</div>
 <div class="actions" style="margin-top:8px"><button class="btn sm" data-act="hwReset">Rétablir la disposition d’origine</button></div></section>`;
}
function hwSave(){savePrefs();render()}
/* glisser-déposer natif (ordinateur) ; sur mobile, les flèches font la même chose */
let HW_DRAG=null;
document.addEventListener('dragstart',e=>{const c=e.target.closest&&e.target.closest('.hw[draggable=true]');if(!c)return;HW_DRAG=c.dataset.w;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',HW_DRAG);c.classList.add('hwdrag')});
document.addEventListener('dragover',e=>{const c=e.target.closest&&e.target.closest('.hw');if(c&&HW_DRAG){e.preventDefault();$$('.hwover').forEach(x=>x.classList.remove('hwover'));if(c.dataset.w!==HW_DRAG)c.classList.add('hwover')}});
document.addEventListener('dragend',()=>{HW_DRAG=null;$$('.hwdrag,.hwover').forEach(x=>x.classList.remove('hwdrag','hwover'))});
document.addEventListener('drop',e=>{
 const c=e.target.closest&&e.target.closest('.hw');if(!c||!HW_DRAG)return;e.preventDefault();
 const ids=homeLayout().map(w=>w.id),from=ids.indexOf(HW_DRAG),to=ids.indexOf(c.dataset.w);
 if(from>=0&&to>=0&&from!==to){ids.splice(to,0,ids.splice(from,1)[0]);state.settings.dash.order=ids;HW_DRAG=null;hwSave()}
});

/* widgets d'origine */
homeWidget({id:'map',title:'Atlas',icon:'globe',span:8,rows:2,cls:'d-map',link:()=>moreLink('atlas','Ouvrir'),body:()=>'<div class="map mini" id="homemap"></div>'});
homeWidget({id:'recent',title:'Derniers ajouts',icon:'clock',link:()=>moreLink('collection'),body:H=>H.recent});
homeWidget({id:'countries',title:'Pays les mieux représentés',icon:'chart',link:()=>moreLink('stats','Stats'),body:H=>H.bars});
homeWidget({id:'cats',title:'Catalogues',icon:'book',link:()=>moreLink('catalogs'),body:H=>H.catsBody});
homeWidget({id:'metals',title:'Métaux précieux',icon:'coin',link:()=>moreLink('stats','Détails'),when:H=>!H.hv&&!!H.mrows,body:H=>`<div class="mlist">${H.mrows}</div>`});
homeWidget({id:'fx',title:'Convertisseur',icon:'refresh',body:H=>H.fx});
homeWidget({id:'feat',title:'À l’honneur',icon:'star',when:H=>!!H.f,cls:'d-feat',body:H=>{const f=H.f;return `<button class="feat" data-act="open" data-id="${f.id}"><img src="${esc(f.cover)}" alt=""><span><b>${esc(f.denomination)}</b><small class="muted">${esc(subtitle(f))}</small></span></button>`}});
function afterHome(){if($('#homemap')){const data=atlasData();mountMap($('#homemap'),{info:c=>data[c],tip:tipHTML,onClick:()=>go('atlas')})}if($('#fx_out'))fxLoad();}
async function fxLoad(){
 if(!$('#fx_out'))return;FX.rate=null;FX.err=false;fxPaint();
 if(FX.from===FX.to){FX.rate=1;fxPaint();return}
 try{const r=await fetch(`https://api.frankfurter.app/latest?from=${encodeURIComponent(FX.from)}&to=${encodeURIComponent(FX.to)}`);if(!r.ok)throw new Error('HTTP');const j=await r.json();FX.rate=j.rates&&j.rates[FX.to]||null;FX.err=!FX.rate}catch(e){FX.rate=null;FX.err=true}
 fxPaint();
}
function fxPaint(){const o=$('#fx_out'),n=$('#fx_note');if(!o)return;o.textContent=FX.rate?new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(FX.amt*FX.rate):'—';n.textContent=FX.rate?`1 ${FX.from} ≈ ${FX.rate} ${FX.to}`:(FX.err?'Cours indisponible (hors ligne)':'')}
function openSheet(){
 const items=NAV.filter(navAllowed).filter(n=>!['home','collection','stats'].includes(n[0])),cats=visCats();
 openModal2(`<div class="mhead"><h2>Menu</h2><button class="x" data-act="close2" aria-label="Fermer">${ic('x',22)}</button></div><div class="sheetgrid">${items.map(n=>`<button data-act="sheetnav" data-v="${n[0]}">${ic(n[2],22)}<span>${n[1]}</span></button>`).join('')}</div>
 ${cats.length?`<div class="menuh">Catalogues</div><div class="sheetlist">${cats.map(c=>`<button class="btn" data-act="sheetnav" data-v="cat:${c.id}" style="justify-content:flex-start">${ic('book',15)} ${esc(c.name)}</button>`).join('')}</div>`:''}
 ${!vit()&&state.folders.length?`<div class="menuh">Dossiers intelligents</div><div class="sheetlist">${state.folders.map(f=>`<button class="btn" data-act="sheetnav" data-v="folder:${f.id}" style="justify-content:flex-start">${ic('filter',15)} ${esc(f.name)}</button>`).join('')}</div>`:''}
 <div class="actions end">${vit()?`<button class="btn" data-act="vitOff">${ic('x',16)} Quitter la vitrine</button>`:`<button class="btn" data-act="vitOn">${ic('eye',16)} Mode vitrine</button>`}</div>`);
 $('#modal2').classList.add('sheetmode');
}
function render(){
 if(view.startsWith('folder:')&&(!folderOf(view)||vit()))view='collection';
 if(view.startsWith('cat:')&&!catOf(view))view='collection';
 const cur=NAV.find(n=>n[0]===view);if(cur&&!navAllowed(cur))view='collection';
 applyTheme();
 const al=NAV.filter(navAllowed),prim=al.filter(n=>PRIMARY.includes(n[0])),v=vit();
 const act=v?`<button class="btn" data-act="vitOff">${ic('x',16)}<span class="lbl">Quitter la vitrine</span></button>`
  :`<button class="btn" data-act="vitOn" title="Mode vitrine" aria-label="Mode vitrine">${ic('eye',16)}<span class="lbl">Vitrine</span></button><button class="btn primary" data-act="add" aria-label="Ajouter">${ic('plus',16)}<span class="lbl">Ajouter</span></button><button class="btn prof" data-act="nav" data-v="settings" title="Profil et réglages" aria-label="Réglages">${ic('user',16)}<span>${esc(userName())}</span></button>`;
 const rail='';
 const bn=[['home','Accueil','home','nav'],['collection','Collection','grid','nav'],['search','Recherche','search','mobSearch'],['stats','Stats','chart','nav'],['more','Plus','more','sheet']].filter(b=>!['tools','stats'].includes(b[0])||al.some(n=>n[0]===b[0]));
 const bnHTML=bn.map(b=>`<button class="${b[0]===view||(b[0]==='more'&&!['home','collection','stats'].includes(view))?'on':''}" data-act="${b[3]}" data-v="${b[0]}">${ic(b[2],22)}<span>${b[1]}</span></button>`).join('');
 const foot=`<footer class="pfoot muted small"><span id="pstate">${persistent?(Store.kind==='rest'?'Synchronisé avec le serveur':'Enregistré dans ce navigateur'):'Mode temporaire'}</span></footer>`;
 const views={home:viewHome,collection:viewList,wishlist:viewList,catalogs:viewCatalogs,atlas:viewAtlas,timeline:viewTimeline,stats:viewStats,doubles:viewDoubles,storage:viewStorage,tools:viewTools,settings:viewSettings,favorites:viewList,...EXT.views};
 const fn=(view.startsWith('folder:')||view.startsWith('cat:'))?viewList:(views[view]||EXT.views[view.split(':')[0]]||viewList);
 $('#app').innerHTML=`<header class="topbar glass"><div class="brand"><i></i><span>Nummus</span></div><nav class="pillnav" aria-label="Navigation">${prim.map(navBtn).join('')}<div class="menuwrap">${moreWrap()}</div></nav><div class="topact">${act}</div></header>
 <div class="page ${rail?'':'norail'}"><main class="main">${fn()}${foot}</main>${rail}</div>
 <nav class="bottomnav glass" aria-label="Navigation mobile">${bnHTML}</nav>${v?'':`<button class="fab" data-act="add" data-status="${view==='wishlist'?'wish':'owned'}" aria-label="Ajouter">${ic('plus',26)}</button>`}`;
 if(isListView())renderResults();
 if(view==='atlas')afterAtlas();
 if(view==='timeline')renderTL();
 if(view==='tools'){calcCal();filterGloss()}
 if(view==='home')afterHome();
 if(EXT.after[view])EXT.after[view]();
 if(view==='settings'&&EXT.after.settings)EXT.after.settings();
 renderBatch();checkBackup();
}
function viewCatalogs(){
 const cats=visCats();
 return `<header class="head"><div><h1>Catalogues</h1><p class="sub">Collections numériques : regroupez librement vos pièces et billets, ou composez des coffrets et séries complètes. Une entrée peut appartenir à plusieurs catalogues, sans quitter votre collection.</p></div><div class="actions">${vit()?'':`<button class="btn primary" data-act="catNew">${ic('plus')} Nouveau catalogue</button>`}</div></header>
 ${cats.length?`<div class="cat-grid">${cats.map(c=>catTile(c,true)).join('')}</div>`:`<div class="empty glass"><b>Aucun catalogue pour l’instant</b><p>Créez par exemple « Pièces romaines », « Série Euro BU 2002 » ou « Coffret FDC 1999 ».</p>${vit()?'':`<button class="btn primary" data-act="catNew">${ic('plus')} Créer un catalogue</button>`}</div>`}`;
}
const CATP={id:null,q:''};
function drawCatList(){
 const c=state.catalogs.find(x=>x.id===CATP.id),el=$('#catlist');if(!c||!el)return;
 const f=CATP.q?compileQuery(CATP.q):()=>true,has=i=>(i.cats||[]).includes(c.id);
 const l=state.items.filter(f).sort((a,b)=>(has(b)-has(a))||(b.created||0)-(a.created||0)).slice(0,150);
 el.innerHTML=l.map(i=>`<label class="row" style="grid-template-columns:28px 40px 1fr auto"><input type="checkbox" data-ch="catToggle" data-id="${i.id}" ${has(i)?'checked':''}><span class="mini">${thumb(i,18)}</span><span><b>${esc(i.denomination)}</b> <span class="muted small">${esc(subtitle(i))}</span></span><span class="muted small">${i.status==='wish'?'souhait':''}</span></label>`).join('')||'<p class="muted" style="padding:10px">Aucune entrée.</p>';
}
function catForm(c){
 const col=(c&&c.color)||CAT_COLORS[0];
 promptModal(c?'Modifier le catalogue':'Nouveau catalogue',`<div class="fgrid"><div class="fld wide"><label>Nom</label><input id="ca_n" value="${esc(c?c.name:'')}" placeholder="ex. Pièces romaines, Série Euro BU 2002" required></div>
 <div class="fld"><label>Type</label><select id="ca_k"><option value="catalogue" ${!c||c.kind!=='coffret'?'selected':''}>Catalogue libre</option><option value="coffret" ${c&&c.kind==='coffret'?'selected':''}>Coffret / série complète</option></select></div>
 <div class="fld"><label>Nombre d’entrées attendues (série complète)</label><input id="ca_t" type="number" min="0" value="${c&&c.target?c.target:''}" placeholder="facultatif"></div>
 <div class="fld wide"><label>Description</label><textarea id="ca_d" rows="2">${esc(c?c.desc||'':'')}</textarea></div>
 <div class="fld wide"><label>Couleur</label><div class="swatches">${CAT_COLORS.map(x=>`<label class="sw" style="background:${x}"><input type="radio" name="cc" value="${x}" ${x===col?'checked':''} hidden></label>`).join('')}</div></div></div>`,'catOk','Enregistrer',c?`data-id="${c.id}"`:'');
}
