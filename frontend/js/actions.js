'use strict';
/* ---------- actions (clics) ---------- */
const ACT={
 nav:t=>go(t.dataset.v),
 davPush:()=>davPush(),davPull:()=>davPull(),
 menu:t=>{ui.menu=ui.menu===t.dataset.g?false:t.dataset.g;const w=$('.navgroups');if(w)w.innerHTML=moreWrap()},
 sheet:()=>openSheet(),
 sheetnav:t=>{closeModal2();go(t.dataset.v)},
 mobSearch:()=>{if(view!=='collection'&&view!=='wishlist')go('collection');setTimeout(()=>{const i=$('input[data-k=q]');if(i){i.scrollIntoView({block:'center',behavior:'smooth'});i.focus()}},60)},
 fxswap:()=>{[FX.from,FX.to]=[FX.to,FX.from];const a=$('[data-ch=fxfrom]'),b=$('[data-ch=fxto]');if(a)a.value=FX.from;if(b)b.value=FX.to;fxLoad()},
 catNew:()=>catForm(null),
 catEdit:()=>{const c=catOf(view);if(c)catForm(c)},
 catDel:()=>{const c=catOf(view);if(!c||!confirm(`Supprimer le catalogue « ${c.name} » ? Les entrées sont conservées.`))return;const its=state.items.filter(i=>(i.cats||[]).includes(c.id));its.forEach(i=>{i.cats=i.cats.filter(x=>x!==c.id)});if(its.length)putItems(its);state.catalogs=state.catalogs.filter(x=>x.id!==c.id);savePrefs();go('catalogs');toast('Catalogue supprimé')},
 catPick:()=>{const c=catOf(view);if(!c)return;CATP.id=c.id;CATP.q='';openModal(`<div class="mhead"><h2>Contenu de « ${esc(c.name)} »</h2><button class="x" data-act="close" aria-label="Fermer">${ic('x',22)}</button></div><label class="search" style="margin-bottom:10px">${ic('search')}<input id="catq" placeholder="Filtrer les entrées…"></label><div id="catlist" class="sheetlist" style="max-height:55vh;overflow:auto"></div><div class="actions end"><button class="btn primary" data-act="catPickDone">Terminé</button></div>`);drawCatList()},
 catPickDone:()=>{closeModal();CATP.id=null;render()},
 bCat:()=>{const n=ui.picked.size;if(!n)return;if(!state.catalogs.length){toast('Créez d’abord un catalogue');return}promptModal(`Ajouter ${pl(n,'entrée','entrées')} à un catalogue`,`<div class="fld"><label>Catalogue</label><select id="bc_c">${state.catalogs.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>`,'bCatOk','Ajouter')},
 add:t=>openForm(null,{status:t.dataset.status||(view==='wishlist'?'wish':'owned'),country:t.dataset.country}),
 open:(t,e)=>{if(e&&e.preventDefault&&t.tagName==='A')e.preventDefault();if(ui.selecting&&isListView()&&t.closest('#results')){const id=t.dataset.id;ui.picked.has(id)?ui.picked.delete(id):ui.picked.add(id);syncPicked();return}openDetail(t.dataset.id)},
 edit:t=>openForm(t.dataset.id),
 acquire:t=>openForm(t.dataset.id,{status:'owned',acquired:today(),qty:1}),
 dup:t=>{const o=state.items.find(i=>i.id===t.dataset.id);if(!o)return;const c=clone(o);c.id=uid();c.created=Date.now();putItems([c]);closeModal();render();toast('Entrée dupliquée')},
 del:t=>{const o=state.items.find(i=>i.id===t.dataset.id);if(o){closeModal();trashWithUndo([o.id],`« ${o.denomination} » déplacée dans la corbeille.`);render()}},
 close:()=>closeModal(),close2:()=>closeModal2(),
 /* images */
 rmphoto:t=>{collectForm();formDraft.imgs.splice(+t.dataset.i,1);renderForm()},
 imgMain:t=>{collectForm();const a=formDraft.imgs,i=+t.dataset.i;a.forEach((m,j)=>{if(j!==i&&m.role==='front')m.role='other'});a[i].role='front';a.unshift(a.splice(i,1)[0]);renderForm()},
 recrop:async t=>{collectForm();const i=+t.dataset.i,m=formDraft.imgs[i];try{openCropper(i,toCanvas(await loadImage(imgSync(m.id))))}catch(e){toast('Image illisible')}},
 shDl:async()=>{const it=state.items.find(i=>i.id===SHARE.id),b=await canvasBlob($('#shcv'),'image/png');if(it&&b)downloadBlob(`nummus-${slug(it.denomination)}.png`,b)},
 shSend:async()=>{const it=state.items.find(i=>i.id===SHARE.id),b=await canvasBlob($('#shcv'),'image/png');if(!it||!b)return;const file=new File([b],`nummus-${slug(it.denomination)}.png`,{type:'image/png'});
  try{if(navigator.canShare({files:[file]}))await navigator.share({files:[file],title:it.denomination});else toast('Partage non pris en charge ici : téléchargez l’image')}catch(e){if(e.name!=='AbortError')toast('Partage impossible')}},
 lightbox:t=>openLightbox(t.dataset.id,t.dataset.m),
 lbclose:()=>closeLB(),
 lbnav:t=>{if(!LB)return;const n=LB.imgs.length;LB.i=(LB.i+(+t.dataset.d)+n)%n;lbShow()},
 lbz:t=>lbZoom(+t.dataset.d),
 lbreal:()=>LB&&lbZoom(1/LB.s),
 lbfit:()=>lbFit(),
 share:t=>openShare(t.dataset.id),
 cropShape:t=>{crop.shape=t.dataset.v;crop.zoom=1;crop.ox=crop.oy=0;const z=$('#cropz');if(z)z.value=1;drawCrop()},
 cropRot:t=>{crop.rot=(crop.rot+(+t.dataset.d)+360)%360;crop.ox=crop.oy=0;drawCrop()},
 cropApply:async()=>{const r=await exportCrop();pushDraftImage(r,crop.idx);closeModal2();renderForm()},
 /* affichage */
 viewmode:t=>{state.settings.view=t.dataset.m;savePrefs();render()},
 toggleFilters:()=>{ui.showFilters=!ui.showFilters;render()},
 fReset:()=>{const q=ui.filters.q;ui.filters=emptyFilters();if(view.startsWith('folder:')){const f=folderOf(view);if(f)Object.assign(ui.filters,clone(f.filters))}else ui.filters.q=q;if(view.startsWith('cat:'))ui.filters.cat=view.slice(4);render()},
 /* dossiers intelligents */
 folderNew:()=>promptModal('Enregistrer comme dossier intelligent',`<div class="fgrid"><div class="fld"><label>Nom du dossier</label><input id="fo_n" placeholder="ex. Pièces romaines en argent" required></div><div class="fld"><label>Portée</label><select id="fo_s">${opt([['owned','Collection'],['wish','Wishlist'],['all','Collection et wishlist']],listStatus())}</select></div></div><p class="muted small" style="margin-top:10px">Le dossier mémorise la recherche, les filtres et le tri actuels, et se met à jour tout seul quand vous ajoutez des entrées.</p>`,'folderNewOk','Enregistrer'),
 folderUpdate:()=>{const f=folderOf(view);if(!f)return;f.filters=clone(ui.filters);f.sort=ui.sort;savePrefs();toast('Dossier mis à jour')},
 folderRename:()=>{const f=folderOf(view);if(!f)return;promptModal('Renommer le dossier',`<div class="fld"><label>Nom</label><input id="fo_n" value="${esc(f.name)}" required></div>`,'folderRenameOk')},
 folderDel:()=>{const f=folderOf(view);if(f&&confirm(`Supprimer le dossier « ${f.name} » ? Les entrées ne sont pas supprimées.`)){state.folders=state.folders.filter(x=>x!==f);savePrefs();go('collection')}},
 /* sélection et actions en masse */
 csvGo:()=>{const p=pendingCSV;if(!p)return;const sk=$('#csv_skip');pendingCSV=null;commitCSV(sk&&sk.checked?p.out.filter(i=>!p.skip.has(i.id)):p.out)},
 searchHelp:()=>openModal(`<div class="mhead"><h2>Syntaxe de recherche</h2><button class="x" data-act="close" aria-label="Fermer">${ic('x',22)}</button></div><table class="ref">${[['argent 1920','tous les mots (ET implicite)'],['"franc semeuse"','expression exacte'],['or OR argent','l’un ou l’autre'],['NOT souvenir  ·  -souvenir','exclure un mot'],['metal:or  pays:france  etat:ttb','recherche dans un champ'],['poids:>10  valeur:<=50  qte:>1','comparaisons numériques'],['annee:1900..1950','intervalle'],['tag:romain  emplacement:tiroir  catalogue:japon','étiquettes, rangement, catalogues'],['is:echange  is:souhait  is:doublon','états particuliers']].map(r=>`<tr><td><code>${esc(r[0])}</code></td><td>${r[1]}</td></tr>`).join('')}</table><p class="muted small" style="margin-top:10px">Champs : nom, metal, pays, emetteur, etat, type, rarete, atelier, ref, numista, certif, notes, tag, emplacement, catalogue, poids, diametre, titre, annee, valeur, paye, qte.</p>`),
 selmode:()=>{ui.selecting=!ui.selecting;ui.picked.clear();render()},
 pickAll:()=>{const all=ui.lastResults.every(id=>ui.picked.has(id));if(all)ui.picked.clear();else ui.lastResults.forEach(id=>ui.picked.add(id));syncPicked()},
 bMove:()=>promptModal(`Ranger ${pl(ui.picked.size,'entrée','entrées')}`,`<div class="fld"><label>Nouvel emplacement</label><div class="pair"><input id="bm_p" list="dl_storages" placeholder="Meuble > Tiroir 2 > Classeur bleu > Page 4"><button type="button" class="btn sm" data-act="stPick" data-t="bm_p">${ic('folder',15)} Parcourir</button></div></div>${datalists(['storages'])}<p class="muted small" style="margin-top:8px">Laissez vide pour retirer l’emplacement.</p>`,'bMoveOk','Ranger'),
 bTrade:t=>batchApply(i=>{i.trade=t.dataset.v==='1'},n=>`${pl(n,'entrée mise à jour','entrées mises à jour')}`),
 bTags:()=>promptModal(`Tags de ${pl(ui.picked.size,'entrée','entrées')}`,`<div class="fgrid"><div class="fld"><label>Ajouter (séparés par des virgules)</label><input id="bt_a" list="dl_tags"></div><div class="fld"><label>Retirer</label><input id="bt_r" list="dl_tags"></div></div>${datalists(['tags'])}`,'bTagsOk','Appliquer'),
 bDel:()=>{const n=ui.picked.size;if(n){trashWithUndo([...ui.picked],pl(n,'entrée déplacée','entrées déplacées')+' dans la corbeille.');ui.picked.clear();renderResults()}},
 /* historique de valeur */
 histAdd:t=>{const it=state.items.find(i=>i.id===t.dataset.id);const d=$('#h_d').value,v=parseFloat($('#h_v').value);if(!it||!d||isNaN(v)){toast('Indiquez une date et une valeur');return}
  const c=clone(it);addHist(c,d,v);const last=c.valueHistory[c.valueHistory.length-1];if(last.date===d)c.value=v;c.updated=Date.now();putItems([c]);openDetail(c.id);if(isListView())renderResults()},
 histDel:t=>{const it=state.items.find(i=>i.id===t.dataset.id);if(!it)return;const c=clone(it);c.valueHistory.splice(+t.dataset.i,1);putItems([c]);openDetail(c.id)},
 /* Numista */
 numista:async()=>{collectForm();const it=formDraft;
  if(!Integrations.numista.ready()){toast('Ajoutez votre clé API Numista dans Réglages > Intégrations');return}
  toast('Interrogation de Numista…');
  try{const n=String(it.numista||'').replace(/\D/g,'');
   if(n){applyNumista(await Integrations.numista.getType(n));return}
   const res=await Integrations.numista.lookup(it);
   if(!res.length){toast('Aucun résultat sur Numista');return}
   if(res.length===1){applyNumista(await Integrations.numista.getType(res[0].id));return}
   openModal2(`<div class="mhead"><h2>Résultats Numista</h2><button class="x" data-act="close2" aria-label="Fermer">${ic('x',22)}</button></div><div class="rows">${res.map(r=>`<div class="row" style="grid-template-columns:1fr auto" data-act="numistaPick" data-id="${esc(r.id)}"><span><b>${esc(r.title)}</b><br><small class="muted">${esc([r.issuer&&r.issuer.name,r.min_year&&r.max_year&&r.min_year!==r.max_year?r.min_year+'–'+r.max_year:r.min_year].filter(Boolean).join(', '))}</small></span><span class="muted">N# ${esc(r.id)}</span></div>`).join('')}</div>`);
  }catch(e){toast('Numista indisponible ('+e.message+')')}},
 fetchRate:async()=>{collectForm();const it=formDraft,cur=String(it.paidCur||'').toUpperCase().trim(),ref=state.settings.currencyCode;
  if(!cur||cur===ref){toast('Indiquez une devise d’achat différente de '+ref);return}
  const d=/^\d{4}-\d{2}-\d{2}$/.test(it.acquired||'')?it.acquired:'latest';
  try{const r=await fetch(`https://api.frankfurter.app/${d}?from=${encodeURIComponent(cur)}&to=${encodeURIComponent(ref)}`);if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();const rate=j.rates&&j.rates[ref];if(!rate)throw new Error('taux absent');
   it.paidRate=rate;if(it.paidAmount>0)it.paid=Math.round(it.paidAmount*rate*100)/100;renderForm();toast(`1 ${cur} = ${rate} ${ref} (${j.date})`)}
  catch(e){toast('Cours indisponible ('+e.message+') : saisissez le taux à la main')}},
 numistaPick:async t=>{try{applyNumista(await Integrations.numista.getType(t.dataset.id));closeModal2()}catch(e){toast('Numista indisponible ('+e.message+')')}},
 /* outils */
 glLetter:t=>{ui.gloss.letter=ui.gloss.letter===t.dataset.v?'':t.dataset.v;filterGloss()},
 pricesFetch:async()=>{try{const p=await Integrations.prices.fetch();Object.assign(state.settings.prices,p);savePrefs();render();toast('Cours actualisés')}catch(e){toast('Cours indisponibles')}},
 /* rangement */
 stPick:t=>{STP.t=t.dataset.t||null;const inp=STP.t?$('#'+STP.t):$('#itemForm [name=storage]');const cur=normPath(inp&&inp.value);STP.p=cur?cur.split(' > '):[];drawStorePicker()},
 stDown:t=>{STP.p.push(t.dataset.k);drawStorePicker()},
 stUp:t=>{STP.p=STP.p.slice(0,+t.dataset.n);drawStorePicker()},
 stAdd:()=>{const v=$('#st_new').value.replace(/>/g,'›').trim();if(!v)return;STP.p.push(v);drawStorePicker()},
 stUse:()=>{const inp=STP.t?$('#'+STP.t):$('#itemForm [name=storage]');if(inp){inp.value=STP.p.join(' > ');const h=$('#pathHint');if(h)h.innerHTML=pathHint(inp.value)}closeModal2()},
 stFix:t=>{const inp=$('#itemForm [name=storage]');if(inp){inp.value=t.dataset.p;$('#pathHint').innerHTML=pathHint(t.dataset.p)}},
 stgo:(t,e)=>{e&&e.preventDefault();go('collection',{filters:{storage:t.dataset.p}})},
 stnone:()=>go('collection',{filters:{nostorage:true}}),
 strename:(t,e)=>{e&&e.preventDefault();const p=t.dataset.p;promptModal('Renommer ce niveau',`<div class="fld"><label>Nouveau nom pour « ${esc(p.split(' > ').pop())} »</label><input id="srn" value="${esc(p.split(' > ').pop())}" required></div><p class="muted small" style="margin-top:8px">Toutes les entrées rangées dans <code>${esc(p)}</code> et ses sous-niveaux seront mises à jour.</p>`,'strenameOk','Renommer',`data-p="${esc(p)}"`)},
 /* atlas / chronologie */
 attype:t=>{ui.atlas.type=t.dataset.v;render()},
 atsel:t=>{ui.atlas.sel=t.dataset.id;afterAtlas()},
 atclear:()=>{ui.atlas.sel=null;afterAtlas()},
 tltype:t=>{ui.tl.type=t.dataset.v;ui.tl.from=ui.tl.to=null;renderTL()},
 tlbar:t=>{ui.tl.from=+t.dataset.a;ui.tl.to=+t.dataset.b;renderTL()},
 tlpreset:t=>{const a=t.dataset.a,b=t.dataset.b;ui.tl.from=a===''?null:+a;ui.tl.to=b===''?null:+b;renderTL()},
 tlcountry:()=>{ui.tl.country=null;renderTL()},
 /* réglages */
 theme:t=>{state.settings.theme=t.dataset.v;savePrefs();render()},
 accent:t=>{state.settings.accent=t.dataset.v;savePrefs();render()},
 delfield:t=>{if(confirm('Supprimer ce champ ? Les valeurs déjà saisies restent dans l’export JSON.')){state.customFields=state.customFields.filter(f=>f.key!==t.dataset.k);savePrefs();render()}},
 addfield:()=>{const label=$('#nf_l').value.trim();if(!label){toast('Donnez un nom au champ');return}
  const type=$('#nf_t').value,f={key:'c_'+uid(),label,type,applies:$('#nf_a').value,private:$('#nf_p').checked};
  if(type==='select')f.options=$('#nf_o').value.split(',').map(s=>s.trim()).filter(Boolean);
  state.customFields.push(f);savePrefs();render();toast('Champ ajouté')},
 userNew:()=>promptModal('Nouveau profil','<div class="fld"><label>Nom du profil</label><input id="un" placeholder="ex. Collection de Paul" required></div>','userNewOk','Créer'),
 userRename:()=>promptModal('Renommer le profil',`<div class="fld"><label>Nom</label><input id="un" value="${esc(userName())}" required></div>`,'userRenameOk'),
 userDel:async()=>{if(session.users.length<2)return;if(!confirm(`Supprimer le profil « ${userName()} » et toute sa collection ? Exportez-la d’abord si besoin.`))return;
  try{await Store.users.delete(state.userId)}catch(e){fail(e)}session.users=session.users.filter(u=>u.id!==state.userId);await loadUser(session.users[0].id);go('settings')},
 vitOn:()=>{state.settings.vitrine.active=true;savePrefsNow();toast('Mode vitrine activé');go('collection')},
 vitOff:()=>{if(hasPin()){promptModal('Quitter le mode vitrine','<div class="fld"><label>Code</label><input type="password" id="pin_i" inputmode="numeric" autocomplete="off" required></div>','pinOk','Quitter');return}exitVitrine()},
 backupNow:()=>exportJSON(),
 backupLater:()=>{state.settings.backup.snoozeUntil=Date.now()+864e5;savePrefs();checkBackup()},
 expcsv:exportCSV,
 print:()=>openPrint(),
 doPrint:async()=>{
  const src=($('input[name=psrc]:checked')||{}).value||'all';
  const o={photos:$('#p_ph').checked,desc:$('#p_de').checked,values:$('#p_va').checked,paid:$('#p_pa').checked,storage:$('#p_st').checked,notes:$('#p_no').checked,title:$('#p_t').value.trim()||'Inventaire',owner:$('#p_o').value.trim()};
  o.layout=($('#p_l')||{}).value||'table';
  if(o.owner!==state.settings.owner&&!vit()){state.settings.owner=o.owner;savePrefs()}
  const allowed=new Set(pool().map(i=>i.id));
  let items=src==='selection'?state.items.filter(i=>ui.picked.has(i.id)):src==='filtered'?ui.lastResults.map(id=>state.items.find(i=>i.id===id)).filter(Boolean):pool().filter(i=>i.status!=='wish').sort(SORT.country);
  items=items.filter(i=>allowed.has(i.id)).map(i=>({...i}));
  if(PRINT_PREP[o.layout])await PRINT_PREP[o.layout](items,o);
  if(o.photos)for(const i of items){const b=(i.imgs||[]).find(m=>m.role==='back');i._pb=b?await Store.images.get(state.userId,b.id).then(coverOf).catch(()=>''):''}
  if(vit()){o.paid=o.storage=o.notes=false;if(hideVals())o.values=false}
  const p=$('#print');p.innerHTML=(PRINTERS[o.layout]||printHTML)(items,o);closeModal();
  await Promise.all($$('img',p).map(im=>im.decode?im.decode().catch(()=>{}):null));
  window.print();
 },
 demo:()=>{if(state.items.length&&!confirm('Ajouter les exemples à vos données existantes ?'))return;putItems(demoItems());render();toast('Exemples ajoutés')},
 wipe:async()=>{if(!confirm(`Effacer TOUTES les données du profil « ${userName()} » ? Cette action est définitive.`))return;
  try{await Store.items.clear(state.userId);await Store.images.clear(state.userId);await Store.events.clear(state.userId);IMGURL.forEach((u,id)=>forgetImg(id));await Store.meta.put(state.userId,'prefs',DEFAULT_PREFS())}catch(e){fail(e)}await loadUser(state.userId);go('collection')},
 impmerge:async()=>{const p=pendingImport;if(!p)return;try{const sk=$('#imp_skip');const skip=sk&&sk.checked?new Set(findDups(DataIO.parse(p).items).map(x=>x[0].id)):null;const n=await DataIO.import(state.userId,p,'merge',{skip});pendingImport=null;await loadUser(state.userId);closeModal();render();toast(pl(n,'entrée fusionnée','entrées fusionnées'))}catch(e){toast('Import impossible');console.error(e)}},
 impreplace:async()=>{const p=pendingImport;if(!p)return;if(!confirm('Remplacer toute la collection et les réglages de ce profil ?'))return;try{await DataIO.import(state.userId,p,'replace');pendingImport=null;await loadUser(state.userId);closeModal();render();toast('Données remplacées')}catch(e){toast('Import impossible');console.error(e)}}
};
function applyNumista(type){
 const m=Integrations.numista.map(type);let n=0;
 Object.entries(m).forEach(([k,v])=>{if(isEmpty(v))return;if(isEmpty(formDraft[k])){formDraft[k]=v;n++}});
 if(type.category==='banknote'&&!state.items.some(i=>i.id===formDraft.id))formDraft.type='note';
 renderForm();toast(n?`${pl(n,'champ complété','champs complétés')} depuis Numista`:'Tous les champs étaient déjà remplis');
}
function exitVitrine(){state.settings.vitrine.active=false;savePrefsNow();closeModal();render();toast('Mode vitrine désactivé')}
/* validations des petites modales (formulaires data-submit) */
const SUBMIT={
 catOk:f=>{const name=$('#ca_n').value.trim();if(!name)return;const col=(f.querySelector('input[name=cc]:checked')||{}).value||CAT_COLORS[0];
  const data={name,kind:$('#ca_k').value,desc:$('#ca_d').value.trim(),target:Math.max(0,parseInt($('#ca_t').value)||0),color:col};
  if(f.dataset.id){const c=state.catalogs.find(x=>x.id===f.dataset.id);if(c)Object.assign(c,data);savePrefs();closeModal();render();toast('Catalogue modifié')}
  else{const c={id:uid(),...data};state.catalogs.push(c);savePrefs();closeModal();go('cat:'+c.id);toast('Catalogue créé')}},
 bCatOk:()=>{const id=$('#bc_c').value;batchApply(i=>{i.cats=uniq([...(i.cats||[]),id])},n=>`${pl(n,'entrée ajoutée','entrées ajoutées')} au catalogue « ${catName(id)} »`)},
 folderNewOk:()=>{const name=$('#fo_n').value.trim();if(!name)return;const f={id:uid(),name,status:$('#fo_s').value,filters:clone(ui.filters),sort:ui.sort};state.folders.push(f);savePrefs();closeModal();go('folder:'+f.id);toast('Dossier enregistré')},
 folderRenameOk:()=>{const f=folderOf(view),name=$('#fo_n').value.trim();if(!f||!name)return;f.name=name;savePrefs();closeModal();render()},
 bMoveOk:()=>{const p=normPath($('#bm_p').value);batchApply(i=>{i.storage=p},n=>p?`${pl(n,'entrée rangée','entrées rangées')} dans ${p}`:`Emplacement retiré de ${pl(n,'entrée','entrées')}`)},
 bTagsOk:()=>{const add=$('#bt_a').value.split(',').map(s=>s.trim()).filter(Boolean),rm=new Set($('#bt_r').value.split(',').map(s=>norm(s)).filter(Boolean));
  batchApply(i=>{i.tags=uniq([...tagsOf(i).filter(t=>!rm.has(norm(t))),...add]).join(', ')},n=>`Tags mis à jour sur ${pl(n,'entrée','entrées')}`)},
 strenameOk:f=>{const p=f.dataset.p,v=$('#srn').value.trim().replace(/>/g,'›');if(!v)return;const parts=p.split(' > ');parts[parts.length-1]=v;const np=parts.join(' > ');
  const ch=state.items.filter(i=>{const s=normPath(i.storage);return s===p||s.startsWith(p+' > ')}).map(i=>({...i,storage:np+normPath(i.storage).slice(p.length),updated:Date.now()}));
  putItems(ch);closeModal();render();toast(`${pl(ch.length,'entrée déplacée','entrées déplacées')}`)},
 userNewOk:async()=>{const name=$('#un').value.trim();if(!name)return;const u={id:'u_'+uid(),name,created:Date.now()};try{await Store.users.put(u)}catch(e){fail(e)}session.users.push(u);closeModal();await loadUser(u.id);go('collection');toast('Profil créé')},
 userRenameOk:async()=>{const name=$('#un').value.trim();if(!name)return;const u=session.users.find(x=>x.id===state.userId);if(!u)return;u.name=name;try{await Store.users.put(u)}catch(e){fail(e)}closeModal();render()},
 pinOk:async()=>{if(await checkPin($('#pin_i').value))exitVitrine();else{toast('Code incorrect');$('#pin_i').select()}}
};

/* ---------- écouteurs ---------- */
let lp=null,lpFired=false;
document.addEventListener('pointerdown',e=>{
 if(e.pointerType==='mouse'||vit()||!state)return;
 const t=e.target.closest('#results [data-act=open][data-id]');if(!t||!isListView())return;
 const x0=e.clientX,y0=e.clientY;clearTimeout(lp&&lp.timer);
 lp={x0,y0,timer:setTimeout(()=>{lpFired=true;if(navigator.vibrate)navigator.vibrate(20);if(!ui.selecting){ui.selecting=true;renderResults();const b=$('[data-act=selmode]');if(b)b.classList.add('on')}ui.picked.add(t.dataset.id);syncPicked()},480)};
});
const lpCancel=()=>{if(lp)clearTimeout(lp.timer);lp=null;if(lpFired)setTimeout(()=>{lpFired=false},400)};
document.addEventListener('pointerup',lpCancel);document.addEventListener('pointercancel',lpCancel);
document.addEventListener('pointermove',e=>{if(lp&&Math.hypot(e.clientX-lp.x0,e.clientY-lp.y0)>10)lpCancel()});
document.addEventListener('contextmenu',e=>{if(e.target.closest('#results [data-id]')&&matchMedia('(pointer:coarse)').matches)e.preventDefault()});
document.addEventListener('click',e=>{
 if(ui.menu&&!e.target.closest('.menu')&&!e.target.closest('[data-act=menu]')){ui.menu=false;const w=$('.navgroups');if(w)w.innerHTML=moreWrap()}
 if(lpFired){lpFired=false;e.preventDefault();return}
 if(e.target.id==='modal'){if(!formDraft)closeModal();return}
 if(e.target.id==='modal2'){closeModal2();return}
 const t=e.target.closest('[data-act]');if(!t||t.tagName==='LABEL')return;
 const f=ACT[t.dataset.act];if(f)f(t,e);
});
document.addEventListener('keydown',e=>{
 if(LB){if(e.key==='Escape')closeLB();else if(e.key==='ArrowLeft')ACT.lbnav({dataset:{d:-1}});else if(e.key==='ArrowRight')ACT.lbnav({dataset:{d:1}});else if(e.key==='+')lbZoom(1.4);else if(e.key==='-')lbZoom(.71);return}
 if(e.key==='Escape'){if(!$('#modal2').hidden){closeModal2();return}if(!$('#modal').hidden){closeModal();return}if(ui.selecting){ui.selecting=false;ui.picked.clear();render()}}
 if(e.key==='Enter'){const t=e.target.closest&&e.target.closest('[data-act][tabindex]');if(t){e.preventDefault();ACT[t.dataset.act]&&ACT[t.dataset.act](t,e)}}
});
document.addEventListener('submit',e=>{
 e.preventDefault();const f=e.target;
 if(f.id==='itemForm'){saveItem();return}
 const k=f.dataset.submit;if(k&&SUBMIT[k])SUBMIT[k](f);
});
document.addEventListener('input',e=>{
 const t=e.target;
 if(t.dataset.in==='blur'){state.settings.blur=+t.value;savePrefs();applyTheme()}
 else if(t.dataset.in==='fxamt'){FX.amt=+t.value||0;fxPaint()}
 else if(t.id==='catq'){CATP.q=t.value;drawCatList()}
 else if(t.dataset.in==='f'){ui.filters[t.dataset.k]=t.value;renderResults()}
 else if(t.dataset.in==='cropzoom'){crop.zoom=+t.value;drawCrop()}
 else if(t.dataset.in==='tlfrom')$('#tlFv').textContent=fmtYear(t.value);
 else if(t.dataset.in==='tlto')$('#tlTv').textContent=fmtYear(t.value);
 else if(t.dataset.md){const p=t.nextElementSibling;if(p)p.innerHTML=md(t.value)}
 else if(t.name==='storage'&&t.closest('#itemForm')){const h=$('#pathHint');if(h)h.innerHTML=pathHint(t.value)}
 else if((t.name==='paidAmount'||t.name==='paidRate')&&t.closest('#itemForm'))convertPaid();
 else if(t.name==='certified'&&t.closest('#itemForm')){const h=$('#certHint');if(h)h.innerHTML=certHint(t.value)}
 else if(t.closest('#calTools'))calcCal();
 else if(t.id==='gl_q'){ui.gloss.q=t.value;filterGloss()}
 else if(t.closest('#metalCalc')){const w=+$('#mc_w').value,f=+$('#mc_f').value,p=+$('#mc_p').value;const pure=w*f/1000;$('#mc_r').textContent=(w&&f)?`${pure.toLocaleString('fr-FR',{maximumFractionDigits:3})} g de métal fin`+(p?` — ${fmtMoney(pure/31.1035*p)}`:''):'—'}
 else if(t.id==='rm_i'){const v=t.value.trim();let r='—';if(/^\d+$/.test(v)){const n=+v;r=n>0&&n<4000?toRoman(n):'Hors limites (1 à 3999)'}else if(v){const n=fromRoman(v);r=isNaN(n)?'Chiffre romain invalide':String(n)}$('#rm_r').textContent=r}
});
const CH={
 f:t=>{ui.filters[t.dataset.k]=t.value;renderResults()},
 fchk:t=>{ui.filters[t.dataset.k]=t.checked;renderResults()},
 era:t=>{const p=PERIODS.find(x=>x[0]===t.value);ui.filters.yearMin=p?(p[2]??''):'';ui.filters.yearMax=p?(p[3]??''):'';const a=$('[data-k=yearMin]'),b=$('[data-k=yearMax]');if(a)a.value=ui.filters.yearMin;if(b)b.value=ui.filters.yearMax;renderResults()},
 sort:t=>{ui.sort=t.value;renderResults()},
 gofolder:t=>{if(t.value)go('folder:'+t.value)},
 formrefresh:()=>{collectForm();renderForm()},
 photo:async t=>{const fs=[...t.files];t.value='';if(!fs.length)return;collectForm();
  if(fs.length===1){try{openCropper(null,await fileToCanvas(fs[0]))}catch(e){toast('Image illisible')}return}
  await addImageFiles(fs)},
 imgRole:t=>{collectForm();const a=formDraft.imgs,i=+t.dataset.i,r=t.value;if(r!=='other')a.forEach((m,j)=>{if(j!==i&&m.role===r)m.role='other'});a[i].role=r;renderForm()},
 imgCap:t=>{formDraft.imgs[+t.dataset.i].cap=t.value},
 shFmt:t=>{SHARE.fmt=t.value;renderShare()},
 shTheme:t=>{SHARE.theme=t.value;renderShare()},
 shStyle:t=>{SHARE.style=t.value;renderShare()},
 shValue:t=>{SHARE.value=t.checked;renderShare()},
 atWish:t=>{ui.atlas.wish=t.checked;render()},
 tlWish:t=>{ui.tl.wish=t.checked;ui.tl.from=ui.tl.to=null;renderTL()},
 tlFrom:t=>{ui.tl.from=+t.value;if(ui.tl.to===null)ui.tl.to=+$('[data-in=tlto]').value;renderTL()},
 tlTo:t=>{ui.tl.to=+t.value;if(ui.tl.from===null)ui.tl.from=+$('[data-in=tlfrom]').value;renderTL()},
 module:t=>{state.modules[t.dataset.k]=t.checked;savePrefs();render()},
 fenable:t=>{const c=state.customFields.find(f=>f.key===t.dataset.k);if(c)c.enabled=t.checked;else(state.fieldPrefs[t.dataset.k]=state.fieldPrefs[t.dataset.k]||{}).enabled=t.checked;savePrefs()},
 fpriv:t=>{const c=state.customFields.find(f=>f.key===t.dataset.k);if(c)c.private=t.checked;else(state.fieldPrefs[t.dataset.k]=state.fieldPrefs[t.dataset.k]||{}).private=t.checked;savePrefs()},
 flabel:t=>{const k=t.dataset.k,v=t.value.trim();const c=state.customFields.find(f=>f.key===k);if(c){if(v)c.label=v}else{(state.fieldPrefs[k]=state.fieldPrefs[k]||{}).label=v||undefined}savePrefs()},
 accentInput:t=>{state.settings.accent=t.value;savePrefs();render()},
 currency:t=>{state.settings.currency=t.value||'€';savePrefs();toast('Symbole mis à jour')},
 glass:t=>{state.settings.glass=t.checked;savePrefs();applyTheme()},
 contrast:t=>{state.settings.contrast=t.checked;savePrefs();applyTheme()},
 currencyCode:t=>{const v=t.value.trim().toUpperCase();if(/^[A-Z]{3}$/.test(v)){state.settings.currencyCode=v;FX.init=false;savePrefs()}else t.value=state.settings.currencyCode},
 fxfrom:t=>{FX.from=t.value;fxLoad()},fxto:t=>{FX.to=t.value;fxLoad()},
 catToggle:t=>{const it=state.items.find(i=>i.id===t.dataset.id);if(!it||!CATP.id)return;const s=new Set(it.cats||[]);t.checked?s.add(CATP.id):s.delete(CATP.id);it.cats=[...s];putItems([it])},
 ambient:t=>{state.settings.ambient=t.checked;savePrefs();applyTheme()},
 backupInt:t=>{state.settings.backup.intervalDays=+t.value;savePrefs();checkBackup()},
 vitScope:t=>{state.settings.vitrine.scope=t.value;savePrefs()},
 vitHide:t=>{state.settings.vitrine.hideValues=t.checked;savePrefs()},
 vitPin:t=>{setPin(t.value).then(()=>{if(t.value){t.value='';t.placeholder='Code défini (saisir pour changer)'}})},
 davUrl:t=>{state.settings.webdav.url=t.value.trim();savePrefs()},davUser:t=>{state.settings.webdav.user=t.value;savePrefs()},davPass:t=>{state.settings.webdav.pass=t.value;savePrefs()},
 nmKey:t=>{state.settings.numista.key=t.value.trim();savePrefs()},
 nmBase:t=>{state.settings.numista.baseUrl=t.value.trim()||CONFIG.numista.baseUrl;Integrations.numista._cats=null;savePrefs()},
 price:t=>{state.settings.prices[t.dataset.k]=t.value===''?'':+t.value;savePrefs();render()},
 userSwitch:async t=>{await loadUser(t.value);go('settings');toast(`Profil « ${userName()} »`)},
 impjson:t=>{const f=t.files[0];t.value='';if(!f)return;f.text().then(offerImport)},
 impcsv:t=>{const f=t.files[0];t.value='';if(!f)return;f.text().then(importCSV)}
};
document.addEventListener('change',e=>{const t=e.target,c=t.dataset.ch;if(c&&CH[c])CH[c](t,e)});

function offerImport(x){let j,d;try{j=typeof x==='string'?JSON.parse(x):x;if(j&&j.format==='nummus-enc')return importEncrypted(j);d=DataIO.parse(j)}catch(e){toast('Fichier JSON non reconnu');return}
   pendingImport=j;const dups=findDups(d.items);
   openModal(`<div class="mhead"><h2>Importer ${pl(d.items.length,'entrée','entrées')}</h2><button class="x" data-act="close" aria-label="Fermer">${ic('x',22)}</button></div><p class="muted">Fusionner ajoute ces entrées au profil « ${esc(userName())} » (les identifiants identiques sont mis à jour). Remplacer écrase tout, y compris les réglages.</p>${dupBlock(dups,'imp_skip')}<div class="actions end"><button class="btn" data-act="impmerge">Fusionner</button><button class="btn danger" data-act="impreplace">Remplacer tout</button></div>`)}
