'use strict';
/* ---------- vues : collection, wishlist, dossiers ---------- */
const SORT={
 recent:(a,b)=>(b.created||0)-(a.created||0),
 country:(a,b)=>cname(a.country).localeCompare(cname(b.country),'fr')||(+a.year||0)-(+b.year||0),
 yearAsc:(a,b)=>(hasYear(a)?+a.year:1e9)-(hasYear(b)?+b.year:1e9),
 yearDesc:(a,b)=>(hasYear(b)?+b.year:-1e9)-(hasYear(a)?+a.year:-1e9),
 value:(a,b)=>(+b.value||0)-(+a.value||0),
 denom:(a,b)=>String(a.denomination).localeCompare(String(b.denomination),'fr',{numeric:true}),
 prio:(a,b)=>(+b.priority||0)-(+a.priority||0)||(b.created||0)-(a.created||0)
};
const opt=(arr,cur)=>arr.map(([v,l])=>`<option value="${esc(v)}" ${String(cur)===String(v)?'selected':''}>${esc(l)}</option>`).join('');
function viewList(){
 const st=listStatus(),isW=st==='wish',folder=view.startsWith('folder:')?folderOf(view):null;
 const base=viewBase();
 const countries=uniq(base.map(i=>i.country)).map(c=>[c,cname(c)]).sort((a,b)=>a[1].localeCompare(b[1],'fr'));
 const sorts=[['recent','Ajout récent'],['country','Pays'],['yearAsc','Année ↑'],['yearDesc','Année ↓'],['value','Valeur'],['denom','Dénomination']];
 if(isW||st==='all')sorts.unshift(['prio','Priorité']);
 const cat=view.startsWith('cat:')?catOf(view):null;
 const title=cat?esc(cat.name):folder?esc(folder.name):view==='favorites'?'Favoris':(isW?'Wishlist':'Collection');
 const nf=activeFilterCount();
 const acts=vit()?`<button class="btn" data-act="print">${ic('print',16)} Imprimer / PDF</button>`
  :`${folder?`<button class="btn sm" data-act="folderRename">Renommer</button><button class="btn sm danger" data-act="folderDel">Supprimer le dossier</button>`:''}
   <button class="btn ${ui.selecting?'on':''}" data-act="selmode">${ic('select',16)} Sélection</button>
   <button class="btn" data-act="print">${ic('print',16)} PDF</button>
   ${cat?`<button class="btn" data-act="catPick">${ic('check',16)} Gérer le contenu</button><button class="btn sm" data-act="catEdit">Modifier</button><button class="btn sm danger" data-act="catDel">Supprimer</button>`:''}
   <button class="btn primary" data-act="add" data-status="${isW?'wish':'owned'}">${ic('plus')} ${isW?'Ajouter un souhait':'Ajouter'}</button>`;
 const mobFolders=(!vit()&&state.folders.length)?`<select class="mobile-only" data-ch="gofolder" aria-label="Dossiers"><option value="">Dossiers…</option>${state.folders.map(f=>`<option value="${f.id}" ${view==='folder:'+f.id?'selected':''}>${esc(f.name)}</option>`).join('')}</select>`:'';
 return `<header class="head"><div>${cat?`<p class="muted small">${ic('book',14)} ${cat.kind==='coffret'?'Coffret / série':'Catalogue'}</p>`:''}${folder?`<p class="muted small">${ic('folder',14)} Dossier intelligent · ${({owned:'collection',wish:'wishlist',all:'collection et wishlist'})[folder.status||'owned']}</p>`:''}<h1>${title}</h1><p class="sub" id="count"></p>${cat?catInfo(cat):''}</div><div class="actions">${acts}</div></header>
 ${base.length?`<div class="toolbar"><label class="search">${ic('search')}<input data-in="f" data-k="q" placeholder="Rechercher une pièce, un pays, une année…" value="${esc(ui.filters.q)}"><button type="button" class="x" data-act="searchHelp" title="Aide sur la recherche" aria-label="Aide sur la recherche">?</button></label>
  <select data-ch="f" data-k="type" aria-label="Type">${opt([['','Pièces et billets'],['coin','Pièces'],['note','Billets']],ui.filters.type)}</select>
  <select data-ch="f" data-k="country" aria-label="Pays">${opt([['','Tous les pays'],...countries],ui.filters.country)}</select>
  <select data-ch="sort" aria-label="Tri">${opt(sorts,ui.sort)}</select>
  <button class="btn ${ui.showFilters?'on':''}" data-act="toggleFilters">${ic('filter',16)} Filtres <span class="badge" id="fbadge" ${nf?'':'hidden'}>${nf}</span></button>
  <div class="seg"><button data-act="viewmode" data-m="grid" class="${state.settings.view==='grid'?'on':''}" title="Grille" aria-label="Grille">${ic('grid',16)}</button><button data-act="viewmode" data-m="list" class="${state.settings.view==='list'?'on':''}" title="Liste" aria-label="Liste">${ic('list',16)}</button></div>${mobFolders}</div>
  ${ui.showFilters?filterPanel(st,folder):''}`:''}
 ${isW&&typeof wishPanel==='function'?wishPanel(base):''}
 <div id="results"></div>`;
}
function filterPanel(st,folder){
 const f=ui.filters,eraSel=(PERIODS.find(p=>String(f.yearMin)===String(p[2]??'')&&String(f.yearMax)===String(p[3]??''))||[''])[0];
 return `<div class="panel glass fpanel"><div class="fgrid">
  <div class="fld"><label>Métal</label><input data-in="f" data-k="metal" list="dl_metals" value="${esc(f.metal)}" placeholder="Argent, or…"></div>
  <div class="fld"><label>État / grade</label><select data-ch="f" data-k="grade"><option value="">Tous</option>${opt(lists.grades().map(g=>[g,g]),f.grade)}</select></div>
  <div class="fld"><label>Époque</label><select data-ch="era"><option value="">Toutes / personnalisée</option>${opt(PERIODS.map(p=>[p[0],p[1]]),eraSel)}</select></div>
  <div class="fld"><label>Année de … à …</label><div class="pair"><input type="number" data-in="f" data-k="yearMin" value="${esc(f.yearMin)}" placeholder="min"><input type="number" data-in="f" data-k="yearMax" value="${esc(f.yearMax)}" placeholder="max"></div></div>
  ${hideVals()?'':`<div class="fld"><label>${st==='wish'?'Prix cible':'Valeur'} de … à …</label><div class="pair"><input type="number" step="any" data-in="f" data-k="valueMin" value="${esc(f.valueMin)}" placeholder="min"><input type="number" step="any" data-in="f" data-k="valueMax" value="${esc(f.valueMax)}" placeholder="max"></div></div>`}
  <div class="fld"><label>Tag</label><input data-in="f" data-k="tag" list="dl_tags" value="${esc(f.tag)}"></div>
  ${st!=='wish'&&!vit()?`<div class="fld"><label>Emplacement (et sous-niveaux)</label><input data-in="f" data-k="storage" list="dl_storages" value="${esc(f.storage)}"></div>
  <div class="fld"><label class="chk" style="margin-top:26px"><input type="checkbox" data-ch="fchk" data-k="trade" ${f.trade?'checked':''}> À échanger uniquement</label>${f.nostorage?`<label class="chk"><input type="checkbox" data-ch="fchk" data-k="nostorage" checked> Non rangés uniquement</label>`:''}</div>`:''}
 </div><div class="actions end"><button class="btn sm" data-act="fReset">Réinitialiser</button>${vit()?'':(folder?`<button class="btn sm" data-act="folderUpdate">Mettre à jour le dossier</button>`:'')+`<button class="btn sm primary" data-act="folderNew">${ic('folder',15)} Enregistrer comme dossier</button>`}</div>
 ${datalists(['metals','tags','storages'])}</div>`;
}
const thumbSrc=it=>it.cover||'';
function thumb(it,s=36){const src=thumbSrc(it);return src?`<img src="${esc(src)}" alt="" loading="lazy">`:`<span class="ph">${ic(it.type==='note'?'note':'coin',s)}</span>`}
function subtitle(it){return[cname(it.country)||it.issuer,yearSpan(it),it.attribution].filter(Boolean).join(', ')}
const prioLabel=p=>({3:'Priorité haute',2:'Priorité moyenne',1:'Priorité basse'})[+p]||'';
function priceOf(it){if(hideVals())return'';const w=it.status==='wish';return w?(!isEmpty(it.target)?'Cible '+fmtMoney(it.target):''):(!isEmpty(it.value)?fmtMoney(it.value):'')}
function card(it){
 const w=it.status==='wish',q=qtyOf(it),p=ui.picked.has(it.id);
 return `<article class="card glass ${p?'picked':''}" data-act="open" data-id="${it.id}" tabindex="0">${ui.selecting?`<span class="pick">${p?ic('check',14):''}</span>`:''}<div class="th ${it.type}">${thumb(it)}${(!w&&q>1)?`<b class="qty">×${q}</b>`:''}${vit()?'':`<button class="favbtn ${it.fav?'on':''}" data-act="fav" data-id="${it.id}" title="${it.fav?'Retirer des favoris':'Ajouter aux favoris'}" aria-label="Favori">${ic(it.fav?'heartf':'heart',16)}</button>`}${it.rarity&&it.rarity!=='C'?`<span class="rar r-${esc(it.rarity)}" title="Rareté">${esc(it.rarity)}</span>`:''}</div>
 <div class="cb"><h3>${esc(it.denomination)}</h3><p>${esc(subtitle(it))}</p>
 <div class="chips">${it.grade?`<span class="chip acc">${esc(it.grade)}</span>`:''}${w?`<span class="chip">souhait</span>`:''}${w&&it.priority?`<span class="chip acc">${prioLabel(it.priority)}</span>`:''}${w&&it.wishStatus&&it.wishStatus!=='search'?`<span class="chip">${esc(WISH_ST[it.wishStatus]||'')}</span>`:''}${it.trade&&!vit()?`<span class="chip">à échanger</span>`:''}${it.issuer&&cname(it.country)?`<span class="chip">${esc(it.issuer)}</span>`:''}</div>
 <div class="price">${priceOf(it)}</div></div></article>`;
}
function rowOf(it){
 const w=it.status==='wish',p=ui.picked.has(it.id),sel=ui.selecting&&isListView();
 const price=hideVals()?'':(w?fmtMoney(it.target):fmtMoney(it.value));
 return `<div class="row ${p&&sel?'picked':''}" data-act="open" data-id="${it.id}" tabindex="0">${sel?`<span class="pick">${p?ic('check',13):''}</span>`:`<span class="mini">${thumb(it,20)}</span>`}<b>${it.fav?`<span class="favi">${ic('heartf',12)}</span> `:''}${esc(it.denomination)}</b><span class="muted">${esc(cname(it.country)||it.issuer||'')}</span><span>${esc(yearSpan(it))}</span><span>${w?'<span class="muted">souhait</span>':esc(it.grade||'')}${it.rarity&&it.rarity!=='C'?` <span class="rar r-${esc(it.rarity)}">${esc(it.rarity)}</span>`:''}</span><span class="r">${price}</span></div>`;
}
function renderResults(){
 const el=$('#results');if(!el)return;
 const st=listStatus(),isW=st==='wish';
 const base=viewBase();
 const l=base.filter(i=>matchItem(i,ui.filters)).sort(SORT[ui.sort]||SORT.recent);
 ui.lastResults=l.map(i=>i.id);
 const c=$('#count');
 if(c){const ex=l.reduce((s,i)=>s+(i.status==='wish'?1:qtyOf(i)),0);const val=hideVals()?0:l.reduce((s,i)=>s+(i.status==='wish'?(+i.target||0):(+i.value||0)*qtyOf(i)),0);
  c.textContent=base.length?`${pl(ex,isW?'souhait':'exemplaire',isW?'souhaits':'exemplaires')}${l.length<base.length?` (sur ${base.length} entrées)`:''}${val?` — ${isW?'budget cible':'valeur estimée'} ${fmtMoney(val)}`:''}`:'';}
 const b=$('#fbadge');if(b){const n=activeFilterCount();b.textContent=n;b.hidden=!n}
 if(!base.length){
  el.innerHTML=vit()?`<div class="empty glass"><b>Rien à exposer pour l’instant</b><p>${state.settings.vitrine.scope==='public'?'Cochez « Visible en mode vitrine » sur les fiches à présenter.':'La collection est vide.'}</p></div>`
  :`<div class="empty glass"><b>${isW?'Votre wishlist est vide':view.startsWith('folder:')?'Ce dossier est vide':'Votre collection commence ici'}</b><p>${isW?'Notez les pièces et billets que vous voulez acheter plus tard.':'Ajoutez une première pièce ou un premier billet, ou chargez quelques exemples pour explorer l’app.'}</p>
  <div class="actions" style="justify-content:center"><button class="btn primary" data-act="add" data-status="${isW?'wish':'owned'}">${ic('plus')} ${isW?'Ajouter un souhait':'Ajouter une pièce ou un billet'}</button>${isW?'':`<button class="btn" data-act="demo">Charger des exemples</button>`}</div></div>`;
  renderBatch();return}
 if(!l.length){el.innerHTML=`<div class="empty glass"><b>Aucun résultat</b><p>Modifiez la recherche ou les filtres.</p><button class="btn sm" data-act="fReset">Réinitialiser les filtres</button></div>`;renderBatch();return}
 const asList=state.settings.view==='list',fn=asList?rowOf:card;
 el.innerHTML=asList?'<div class="rows glass" id="rlist"></div>':'<div class="grid" id="rlist"></div>';
 const box=$('#rlist'),sent=document.createElement('div');let shown=0;sent.className='sentinel';
 const more=()=>{const chunk=l.slice(shown,shown+PAGE);shown+=chunk.length;box.insertAdjacentHTML('beforeend',chunk.map(fn).join(''));if(shown>=l.length){if(moreObs)moreObs.disconnect();sent.remove()}};
 if(moreObs)moreObs.disconnect();more();
 if(shown<l.length){if('IntersectionObserver'in window){el.appendChild(sent);moreObs=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting))more()},{rootMargin:'800px'});moreObs.observe(sent)}else while(shown<l.length)more()}
 renderBatch();
}
const PAGE=60;let moreObs=null;
function syncPicked(){$$('#results [data-act=open][data-id]').forEach(el=>{const on=ui.picked.has(el.dataset.id);el.classList.toggle('picked',on);const pk=$('.pick',el);if(pk)pk.innerHTML=on?ic('check',14):''});renderBatch()}

/* ---------- actions en masse ---------- */
function renderBatch(){
 const b=$('#batch');if(!b)return;
 if(!ui.selecting||!isListView()||vit()){b.hidden=true;b.innerHTML='';return}
 const n=ui.picked.size,all=n>0&&ui.lastResults.every(id=>ui.picked.has(id)),dis=n?'':'disabled';
 b.hidden=false;
 b.innerHTML=`<b>${pl(n,'entrée sélectionnée','entrées sélectionnées')}</b><button class="btn sm" data-act="pickAll">${all?'Tout désélectionner':'Tout sélectionner'}</button><span class="sep"></span>
 <button class="btn sm" data-act="bMove" ${dis}>${ic('move',15)} Ranger</button><button class="btn sm" data-act="bCat" ${dis}>${ic('book',15)} Catalogue</button><button class="btn sm" data-act="bTrade" data-v="1" ${dis}>${ic('repeat',15)} À échanger</button><button class="btn sm" data-act="bTrade" data-v="0" ${dis}>Retirer de l’échange</button>
 <button class="btn sm" data-act="bTags" ${dis}>${ic('tag',15)} Tags</button><button class="btn sm" data-act="print" ${dis}>${ic('print',15)} PDF</button><button class="btn sm danger" data-act="bDel" ${dis}>${ic('trash',15)} Supprimer</button><span class="sep"></span><button class="btn sm" data-act="selmode">Terminer</button>`;
}
const picked=()=>state.items.filter(i=>ui.picked.has(i.id));
function batchApply(fn,msg){const l=picked().map(i=>{const c=clone(i);fn(c);c.updated=Date.now();return c});putItems(l);closeModal();renderResults();toast(msg(l.length))}

/* ---------- fiche détaillée ---------- */
function fmtField(f,it){
 const v=it[f.key];
 switch(f.type){
  case'country':return esc(cname(v));
  case'money':return fmtMoney(v);
  case'checkbox':return v?'Oui':'';
  case'select':{const o=optionsOf(f).find(x=>String(x[0])===String(v));return esc(o?o[1]:v)}
  case'number':return isEmpty(v)?'':esc(new Intl.NumberFormat('fr-FR',{maximumFractionDigits:4}).format(v));
  case'date':return v?esc(new Date(v).toLocaleDateString('fr-FR')):'';
  case'url':return /^https?:\/\//.test(v)?`<a class="link" href="${esc(v)}" target="_blank" rel="noopener noreferrer">${esc(v)}</a>`:esc(v);
  case'textarea':return esc(v).replace(/\n/g,'<br>');
  case'path':return esc(normPath(v)).replace(/ &gt; /g,' › ');
  case'catalogs':return esc(catsOf(it).map(catName).join(', '));
  default:{if(f.key==='certified'){const c=certInfo(v);return esc(v)+(c&&c.url?` <a class="btn sm" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${ic('shield',14)} Vérifier (${c.svc})</a>`:'')}
   if(f.key==='numista'&&/\d/.test(v||'')){const n=String(v).replace(/\D/g,'');return `<a class="link" href="https://fr.numista.com/catalogue/${it.type==='note'?'note':'pieces'}${n}.html" target="_blank" rel="noopener noreferrer">N# ${esc(n)}</a>`}
   return esc(v)}
 }
}
function niceStep(range){const p=Math.pow(10,Math.floor(Math.log10(range||1)));return p}
function histChart(h){
 if(!h||!h.length)return'';
 const W=560,H=160,P={l:52,r:14,t:14,b:26};
 const xs=h.map(p=>new Date(p.date).getTime()),ys=h.map(p=>+p.value);
 let x0=Math.min(...xs),x1=Math.max(...xs);if(x0===x1){x0-=864e5*20;x1+=864e5*20}
 let y0=Math.min(...ys),y1=Math.max(...ys);const pad=(y1-y0)*.15||Math.max(1,y1*.1);y0=Math.max(0,y0-pad);y1+=pad;
 const X=t=>P.l+(t-x0)/(x1-x0)*(W-P.l-P.r),Y=v=>H-P.b-(v-y0)/(y1-y0)*(H-P.t-P.b);
 const pts=h.map((p,i)=>[X(xs[i]),Y(ys[i])]);
 const d=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
 const area=d+` L${pts[pts.length-1][0].toFixed(1)} ${H-P.b} L${pts[0][0].toFixed(1)} ${H-P.b} Z`;
 const f0=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0});
 return `<svg viewBox="0 0 ${W} ${H}" class="hchart" role="img" aria-label="Évolution de la valeur estimée">
 <line x1="${P.l}" x2="${W-P.r}" y1="${H-P.b}" y2="${H-P.b}" class="ax"/><line x1="${P.l}" x2="${W-P.r}" y1="${P.t}" y2="${P.t}" class="ax" stroke-dasharray="3 4"/>
 <text x="${P.l-8}" y="${P.t+4}" text-anchor="end">${f0.format(y1)}</text><text x="${P.l-8}" y="${H-P.b+4}" text-anchor="end">${f0.format(y0)}</text>
 <text x="${P.l}" y="${H-6}">${esc(dateFR(x0))}</text><text x="${W-P.r}" y="${H-6}" text-anchor="end">${esc(dateFR(x1))}</text>
 ${pts.length>1?`<path d="${area}" class="ar"/><path d="${d}" class="ln"/>`:''}${pts.map((p,i)=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4" class="dt"><title>${esc(dateFR(xs[i]))} : ${esc(fmtMoney(ys[i]))}</title></circle>`).join('')}</svg>`;
}
function addHist(it,date,value){it.valueHistory=(it.valueHistory||[]).filter(p=>p.date!==date);it.valueHistory.push({date,value});it.valueHistory.sort((a,b)=>a.date.localeCompare(b.date))}
const zoomImg=(id,alt,itemId)=>`<div class="zoomwrap" data-act="lightbox" data-id="${itemId}" data-m="${id}" title="Survolez pour la loupe, cliquez pour le plein écran"><img src="${esc(imgSync(id))}" alt="${alt}"><div class="lens"></div></div>`;
async function openDetail(id){
 const it=state.items.find(i=>i.id===id);if(!it)return;
 if(!vit()&&typeof noteView==='function')noteView(id);
 const imgs=it.imgs||[];await preload(imgs.map(m=>m.id));
 const mFront=imgs.find(m=>m.role==='front')||imgs[0],mBack=imgs.find(m=>m.role==='back'&&m!==mFront),mRest=imgs.filter(m=>m!==mFront&&m!==mBack);
 const skip=new Set(['denomination','notes','tags','link','type','country','public']);
 const rows=visibleFields(it,true).filter(f=>!skip.has(f.key)&&f.type!=='markdown'&&!isEmpty(it[f.key])&&it[f.key]!==false).map(f=>[f.label,fmtField(f,it)]).filter(r=>r[1]);
 const tags=tagsOf(it),w=it.status==='wish',v=vit();
 const showNotes=!v||!privateKeys().has('notes');
 const mdFields=visibleFields(it,true).filter(f=>f.type==='markdown'&&f.key!=='notes'&&it[f.key]);
 const hist=it.valueHistory||[];
 const histHTML=(w||hideVals())?'':`<section class="vhist"><h3>Historique de la valeur estimée</h3>${hist.length?histChart(hist):'<p class="muted small" style="margin-top:6px">Aucun point pour l’instant. Chaque modification de la valeur estimée en ajoute un automatiquement.</p>'}
  ${v?'':`<div class="hadd"><input type="date" id="h_d" value="${today()}" aria-label="Date"><input type="number" step="any" id="h_v" placeholder="Valeur (${esc(state.settings.currency)})" aria-label="Valeur"><button class="btn sm" data-act="histAdd" data-id="${it.id}">${ic('plus',14)} Point</button></div>
  ${hist.length?`<details style="margin-top:8px"><summary class="muted small">Gérer les points (${hist.length})</summary>${hist.map((p,i)=>`<div class="hrow"><span>${esc(dateFR(p.date))}</span><b>${fmtMoney(p.value)}</b><button class="x" data-act="histDel" data-id="${it.id}" data-i="${i}" aria-label="Supprimer">${ic('trash',15)}</button></div>`).join('')}</details>`:''}`}</section>`;
 openModal(`<div class="mhead"><div><h2>${esc(it.denomination)}</h2><p class="muted">${esc([it.type==='note'?'Billet':'Pièce',cname(it.country),yearSpan(it),it.attribution].filter(Boolean).join(', '))}${w?' — dans la wishlist':''}</p></div><div class="actions">${v?'':`<button class="x favx ${it.fav?'on':''}" data-act="fav" data-id="${it.id}" title="Favori" aria-label="Favori">${ic(it.fav?'heartf':'heart',20)}</button>`}<button class="x" data-act="share" data-id="${it.id}" title="Partager en image" aria-label="Partager">${ic('share',20)}</button><button class="x" data-act="close" aria-label="Fermer">${ic('x',22)}</button></div></div>
 <div class="dgrid"><div class="dimgs">${mFront?zoomImg(mFront.id,roleLabel(it,mFront.role==='front'?'front':'other'),it.id):`<div class="ph">${ic(it.type==='note'?'note':'coin',56)}</div>`}${mBack?zoomImg(mBack.id,roleLabel(it,'back'),it.id):''}${mRest.length?`<div class="thumbs">${mRest.map(m=>`<button class="tbtn" data-act="lightbox" data-id="${it.id}" data-m="${m.id}"><img src="${esc(imgSync(m.id))}" alt=""><small>${esc(m.cap||roleLabel(it,m.role))}</small></button>`).join('')}</div>`:''}${imgs.length?'<p class="muted small">Survolez pour la loupe · cliquez pour le plein écran</p>':''}</div>
 <div>${tags.length?`<div class="chips">${tags.map(t=>`<span class="chip acc">${esc(t)}</span>`).join('')}</div>`:''}
 <dl class="facts">${rows.map(r=>`<dt>${esc(r[0])}</dt><dd>${r[1]}</dd>`).join('')}</dl>
 ${it.link?`<p><a class="btn sm" href="${esc(it.link)}" target="_blank" rel="noopener noreferrer">${ic('link',15)} Ouvrir le lien</a></p>`:''}
 ${it.notes&&showNotes?`<div class="md" style="margin-top:12px">${md(it.notes)}</div>`:''}
 ${mdFields.map(f=>`<h3 style="margin-top:14px">${esc(f.label)}</h3><div class="md">${md(it[f.key])}</div>`).join('')}
 ${histHTML}${EXT.detail.map(f=>{try{return f(it)||''}catch(e){console.error(e);return''}}).join('')}</div></div>
 ${v?'':`<div class="actions end">
  ${w?`<button class="btn primary" data-act="acquire" data-id="${it.id}">${ic('check',16)} Marquer comme acquis</button>`:''}
  <button class="btn" data-act="edit" data-id="${it.id}">${ic('edit',16)} Modifier</button>
  <button class="btn" data-act="dup" data-id="${it.id}">${ic('copy',16)} Dupliquer</button>
  <button class="btn danger" data-act="del" data-id="${it.id}">${ic('trash',16)} Supprimer</button></div>`}`,true);
 attachMagnifiers($('#modal'));
}
function attachMagnifiers(root){
 $$('.zoomwrap',root).forEach(w=>{
  const img=$('img',w),lens=$('.lens',w),L=170;let z=2.5;
  lens.style.width=lens.style.height=L+'px';lens.style.backgroundImage=`url("${img.src}")`;
  const move=e=>{const r=img.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
   if(x<0||y<0||x>r.width||y>r.height){lens.style.display='none';return}
   lens.style.display='block';lens.style.left=(x-L/2)+'px';lens.style.top=(y-L/2)+'px';
   lens.style.backgroundSize=`${r.width*z}px ${r.height*z}px`;lens.style.backgroundPosition=`${-(x*z-L/2)}px ${-(y*z-L/2)}px`};
  w.addEventListener('pointermove',move);w.addEventListener('pointerdown',move);
  w.addEventListener('pointerleave',()=>lens.style.display='none');w.addEventListener('pointerup',e=>{if(e.pointerType==='touch')lens.style.display='none'});
  w.addEventListener('wheel',e=>{e.preventDefault();z=Math.min(8,Math.max(1.5,z*(e.deltaY<0?1.15:1/1.15)));move(e)},{passive:false});
 });
}
