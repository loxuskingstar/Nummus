'use strict';
/* ---------- modales ---------- */
function openModal(html,wide){const m=$('#modal');m.innerHTML=`<div class="modal glass ${wide?'wide':''}" role="dialog" aria-modal="true">${html}</div>`;m.hidden=false;document.body.style.overflow='hidden'}
function closeModal(){const m=$('#modal');m.hidden=true;m.innerHTML='';if(formDraft)(formDraft.imgs||[]).forEach(x=>{if(DRAFT.has(x.id))forgetImg(x.id)});formDraft=null;if($('#modal2').hidden)document.body.style.overflow=''}
function openModal2(html,wide){const m=$('#modal2');m.innerHTML=`<div class="modal glass ${wide?'wide':''}" role="dialog" aria-modal="true">${html}</div>`;m.hidden=false;document.body.style.overflow='hidden'}
function closeModal2(){const m=$('#modal2');m.hidden=true;m.innerHTML='';if($('#modal').hidden)document.body.style.overflow=''}
function promptModal(title,body,okAct,okLabel='Valider',data=''){openModal(`<form data-submit="${okAct}" ${data}><div class="mhead"><h2>${title}</h2><button type="button" class="x" data-act="close" aria-label="Fermer">${ic('x',22)}</button></div>${body}<div class="actions end"><button type="button" class="btn" data-act="close">Annuler</button><button class="btn primary" type="submit">${okLabel}</button></div></form>`);setTimeout(()=>{const i=$('#modal input:not([type=hidden]),#modal select');i&&i.focus()},30)}

/* ---------- formulaire d'édition ---------- */
let formDraft=null;
function lev(a,b){if(a===b)return 0;if(Math.abs(a.length-b.length)>2)return 9;const m=[...Array(b.length+1).keys()];for(let i=1;i<=a.length;i++){let prev=m[0];m[0]=i;for(let j=1;j<=b.length;j++){const t=m[j];m[j]=Math.min(m[j]+1,m[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=t}}return m[b.length]}
function pathHint(v){
 const p=normPath(v);if(!p)return'Séparez les niveaux par « > » ou choisissez dans l’arborescence avec Parcourir.';
 const all=lists.storages(),np=norm(p);if(all.some(x=>norm(x)===np))return`${ic('check',13)} Emplacement existant`;
 let best=null,bd=3;all.forEach(x=>{const d=lev(norm(x),np);if(d<bd){bd=d;best=x}});
 return best?`Nouvel emplacement. Vouliez-vous dire <button type="button" class="link" data-act="stFix" data-p="${esc(best)}">${esc(best)}</button> ?`:'Nouvel emplacement : il sera créé à l’enregistrement.';
}
const STP={p:[],t:null};
function drawStorePicker(){
 const base=STP.p.join(' > '),all=lists.storages(),depth=STP.p.length;
 const kids=all.filter(p=>{const a=p.split(' > ');return a.length===depth+1&&(!base||p.startsWith(base+' > '))});
 const cnt=p=>state.items.filter(i=>{const s=normPath(i.storage);return s===p||s.startsWith(p+' > ')}).reduce((n,i)=>n+qtyOf(i),0);
 openModal2(`<div class="mhead"><div><h2>Choisir un emplacement</h2><p class="muted small"><button type="button" class="link" data-act="stUp" data-n="0">Racine</button>${STP.p.map((s,i)=>` › <button type="button" class="link" data-act="stUp" data-n="${i+1}">${esc(s)}</button>`).join('')}</p></div><button class="x" data-act="close2" aria-label="Fermer">${ic('x',22)}</button></div>
 ${kids.length?`<div class="rows">${kids.map(p=>`<div class="row" style="grid-template-columns:1fr auto" data-act="stDown" data-k="${esc(p.split(' > ').pop())}" tabindex="0"><b>${ic('folder',15)} ${esc(p.split(' > ').pop())}</b><span class="muted small">${cnt(p)}</span></div>`).join('')}</div>`:'<p class="muted">Aucun sous-niveau existant ici.</p>'}
 <div class="pair" style="margin-top:12px"><input id="st_new" placeholder="Nouveau sous-niveau (ex. Tiroir 3)"><button type="button" class="btn" data-act="stAdd">${ic('plus',15)} Créer et entrer</button></div>
 <div class="actions end"><button class="btn" data-act="close2">Annuler</button><button class="btn primary" data-act="stUse" ${base?'':'disabled'}>Utiliser ce niveau</button></div>`);
}
function convertPaid(){const f=$('#itemForm');if(!f)return;const a=parseFloat(f.elements.paidAmount&&f.elements.paidAmount.value),r=parseFloat(f.elements.paidRate&&f.elements.paidRate.value),p=f.elements.paid;if(p&&a>0&&r>0)p.value=Math.round(a*r*100)/100}
async function openForm(id,preset){
 const p=Object.fromEntries(Object.entries(preset||{}).filter(([,v])=>v!==undefined));
 const src=id?state.items.find(i=>i.id===id):null;
 formDraft=src?Object.assign(clone(src),p):Object.assign({id:uid(),type:'coin',status:'owned',qty:1,imgs:[],created:Date.now()},p);
 formDraft.imgs=formDraft.imgs||[];
 formDraft._prevValue=src?src.value:undefined;
 formDraft._origImgs=(src?src.imgs||[]:[]).map(m=>m.id);
 const pm=src&&((src.imgs||[]).find(m=>m.role==='front')||(src.imgs||[])[0]);formDraft._origPrimary=pm?pm.id:null;
 await preload(formDraft.imgs.map(m=>m.id));
 renderForm(true);
}
function fieldHTML(f,it){
 const v=it[f.key],n=esc(f.key),wide=(f.type==='textarea'||f.type==='markdown'||f.type==='catalogs')?' wide':'';let inp;
 const ph=f.ph?` placeholder="${esc(f.ph)}"`:'';
 switch(f.type){
  case'select':inp=`<select name="${n}" ${f.key==='type'?'data-ch="formrefresh"':''}>${f.key==='type'?'':'<option value="">—</option>'}${optionsOf(f).map(([val,l])=>`<option value="${esc(val)}" ${String(v??'')===String(val)?'selected':''}>${esc(l)}</option>`).join('')}</select>`;break;
  case'country':inp=`<select name="country"><option value="">—</option>${COUNTRIES.map(c=>`<option value="${c.id}" ${v===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select>`;break;
  case'number':case'money':inp=`<input type="number" step="any" name="${n}" value="${esc(v??'')}"${ph}>`;break;
  case'checkbox':return `<div class="fld"><label class="chk" style="margin-top:24px"><input type="checkbox" name="${n}" ${v?'checked':''}> ${esc(f.label)}</label></div>`;
  case'textarea':inp=`<textarea name="${n}" rows="3">${esc(v??'')}</textarea>`;break;
  case'markdown':inp=`<textarea name="${n}" rows="6" data-md="1" placeholder="Markdown : **gras**, *italique*, listes, [liens](https://…), > citation, formules $Ag_{925}$">${esc(v??'')}</textarea><div class="mdp md">${v?md(v):''}</div>`;break;
  case'catalogs':inp=state.catalogs.length?`<div class="chips">${state.catalogs.map(c=>`<label class="chk chip ${(v||[]).includes(c.id)?'acc':''}"><input type="checkbox" name="cats" value="${c.id}" ${(v||[]).includes(c.id)?'checked':''}> ${esc(c.name)}${c.kind==='coffret'?' (coffret)':''}</label>`).join('')}</div>`:'<small class="hint">Aucun catalogue pour l’instant : créez-en depuis l’onglet Catalogues.</small>';break;
  case'date':inp=`<input type="date" name="${n}" value="${esc(v??'')}">`;break;
  case'url':inp=`<input type="url" name="${n}" value="${esc(v??'')}" placeholder="https://…">`;break;
  case'path':inp=`<div class="pair"><input type="text" name="${n}" value="${esc(normPath(v))}"${ph} list="dl_storages" autocomplete="off"><button type="button" class="btn sm" data-act="stPick">${ic('folder',15)} Parcourir</button></div><small class="hint" id="pathHint">${pathHint(v)}</small>`;break;
  default:inp=`<input type="text" name="${n}" value="${esc(v??'')}"${ph} ${f.list?`list="dl_${f.list}"`:''} autocomplete="off">`;
   if(f.key==='certified')inp+=`<small class="hint" id="certHint">${certHint(v)}</small>`;
 }
 if(f.key==='paidRate')inp+=`<button type="button" class="btn sm" style="margin-top:6px" data-act="fetchRate">${ic('refresh',14)} Obtenir le cours (date d’acquisition)</button>`;
 return `<div class="fld${wide}"><label>${esc(f.label)}</label>${inp}</div>`;
}
function renderForm(first){
 const it=formDraft,fs=visibleFields(it),old=$('#modal .modal');const sc=old?old.scrollTop:0;
 const secs=GROUPS.filter(g=>fs.some(f=>f.group===g)).map(g=>`<fieldset><legend>${g}</legend><div class="fgrid">${fs.filter(f=>f.group===g).map(f=>fieldHTML(f,it)).join('')}</div></fieldset>`).join('');
 const isNew=!state.items.some(i=>i.id===it.id);
 openModal(`<form id="itemForm" autocomplete="off"><div class="mhead"><h2>${isNew?'Nouvelle entrée':'Modifier l’entrée'}</h2><button type="button" class="x" data-act="close" aria-label="Fermer">${ic('x',22)}</button></div>
 <div class="actions" style="margin-bottom:14px;justify-content:space-between"><div class="fld" style="min-width:240px"><label>Cette entrée est</label><select name="_status" data-ch="formrefresh"><option value="owned" ${it.status!=='wish'?'selected':''}>Dans ma collection</option><option value="wish" ${it.status==='wish'?'selected':''}>Dans ma wishlist</option></select></div>
 <button type="button" class="btn sm" data-act="numista" title="Remplit les champs vides à partir du N# Numista, d’une référence catalogue ou de la dénomination">${ic('refresh',15)} Compléter depuis Numista</button></div>
 <div class="photos">${galleryHTML(it)}</div>
 ${secs}
 ${datalists(Object.keys(lists))}
 <div class="actions end"><button type="button" class="btn" data-act="close">Annuler</button><button class="btn primary" type="submit">Enregistrer</button></div></form>`,true);
 const m=$('#modal .modal');if(m&&!first)m.scrollTop=sc;
 if(first){const d=$('input[name=denomination]');d&&d.focus()}
}
function collectForm(){
 const form=$('#itemForm');if(!form||!formDraft)return;const it=formDraft;
 it.status=form.elements._status.value;
 visibleFields(it).forEach(f=>{
  if(f.type==='catalogs'){it.cats=$$('input[name=cats]:checked',form).map(x=>x.value);return}
  const el=form.elements[f.key];if(!el)return;let v;
  if(f.type==='checkbox')v=el.checked;
  else if(f.type==='number'||f.type==='money')v=el.value===''?null:parseFloat(el.value);
  else if(f.type==='path')v=normPath(el.value);
  else v=el.value;
  it[f.key]=v;
 });
}
async function saveItem(){
 collectForm();const it=formDraft;
 if(!String(it.denomination||'').trim()){toast('Indiquez une dénomination');return}
 if(it.status!=='wish'&&!it.qty)it.qty=1;
 if(it._dupOk)delete it._dupOk;
 else if(!state.items.some(x=>x.id===it.id)&&typeof dupAsk==='function'){const d=findDups([it]);if(d.length){dupAsk(d[0][1],it);return}}
 if(it.status!=='wish'&&!isEmpty(it.value)&&!isNaN(+it.value)&&(isEmpty(it._prevValue)||+it._prevValue!==+it.value))addHist(it,today(),+it.value);
 const ids=new Set((it.imgs||[]).map(m=>m.id));
 try{
  for(const m of it.imgs)if(DRAFT.has(m.id))await Store.images.put(state.userId,m.id,DRAFT.get(m.id));
  const gone=(it._origImgs||[]).filter(id=>!ids.has(id));if(gone.length){await Store.images.bulkDelete(state.userId,gone);gone.forEach(forgetImg)}
  const prim=it.imgs.find(m=>m.role==='front')||it.imgs[0];
  if(!prim)it.cover='';else if(prim._c)it.cover=prim._c;else if(prim.id!==it._origPrimary){const b=DRAFT.get(prim.id)||await Store.images.get(state.userId,prim.id);if(b)it.cover=await coverOf(b)}
 }catch(e){fail(e)}
 it.imgs.forEach(m=>{delete m._c;DRAFT.delete(m.id)});
 delete it._origImgs;delete it._origPrimary;delete it._prevValue;it.updated=Date.now();
 const fresh=!state.items.some(x=>x.id===it.id);
 EXT.beforeSave.forEach(fn=>{try{fn(it,fresh)}catch(e){console.error(e)}});
 putItems([it]);closeModal();render();toast('Enregistré');
 if(fresh&&it.status!=='wish'&&typeof offerWishMatch==='function')setTimeout(()=>offerWishMatch(it),250);
}

/* ---------- moteur image : chargement, recadrage, rotation, compression ---------- */
const IMG_FULL=1600,IMG_THUMB=420,IMG_SRC_MAX=2400;
const loadImage=src=>new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=src});
function toCanvas(im,max=IMG_SRC_MAX){const w=im.naturalWidth||im.width,h=im.naturalHeight||im.height,k=Math.min(1,max/Math.max(w,h));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*k));c.height=Math.max(1,Math.round(h*k));c.getContext('2d').drawImage(im,0,0,c.width,c.height);return c}
async function fileToCanvas(file){const url=URL.createObjectURL(file);try{return toCanvas(await loadImage(url))}finally{URL.revokeObjectURL(url)}}
function encode(c,alpha){if(alpha){const w=c.toDataURL('image/webp',.86);return w.startsWith('data:image/webp')?w:c.toDataURL('image/png')}
 const o=document.createElement('canvas');o.width=c.width;o.height=c.height;const x=o.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,o.width,o.height);x.drawImage(c,0,0);return o.toDataURL('image/jpeg',.85)}
function scaled(c,max){const k=Math.min(1,max/Math.max(c.width,c.height));if(k===1)return c;const o=document.createElement('canvas');o.width=Math.round(c.width*k);o.height=Math.round(c.height*k);const x=o.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(c,0,0,o.width,o.height);return o}
const crop={src:null,side:null,rot:0,shape:'none',zoom:1,ox:0,oy:0,drag:null};
function openCropper(side,srcCanvas){
 Object.assign(crop,{src:srcCanvas,idx:side,rot:0,shape:formDraft&&formDraft.type==='note'?'none':'circle',zoom:1,ox:0,oy:0,drag:null});
 openModal2(`<div class="mhead"><div><h2>Cadrer l’image</h2><p class="muted small">Faites glisser pour centrer la pièce, molette ou curseur pour zoomer.</p></div><button class="x" data-act="close2" aria-label="Fermer">${ic('x',22)}</button></div>
 <div class="cropwrap"><canvas id="cropc" width="840" height="840"></canvas></div>
 <div class="actions" style="justify-content:center;margin-top:14px"><div class="seg" id="cropShape">${[['none','Image entière'],['square','Carré'],['circle','Cercle']].map(([v,l])=>`<button data-act="cropShape" data-v="${v}" class="${crop.shape===v?'on':''}">${l}</button>`).join('')}</div>
 <button class="btn sm" data-act="cropRot" data-d="-90" title="Pivoter à gauche">${ic('rotl',16)}</button><button class="btn sm" data-act="cropRot" data-d="90" title="Pivoter à droite">${ic('rotr',16)}</button>
 <label class="chk small" style="min-width:180px">Zoom <input type="range" min="1" max="4" step="0.01" value="1" data-in="cropzoom" id="cropz"></label></div>
 <div class="actions end"><button class="btn" data-act="close2">Annuler</button><button class="btn primary" data-act="cropApply">${ic('check',16)} Appliquer</button></div>`);
 const c=$('#cropc');
 c.addEventListener('pointerdown',e=>{if(crop.shape==='none')return;c.setPointerCapture(e.pointerId);crop.drag={x:e.clientX,y:e.clientY,ox:crop.ox,oy:crop.oy}});
 c.addEventListener('pointermove',e=>{if(!crop.drag)return;const k=c.width/c.clientWidth;crop.ox=crop.drag.ox+(e.clientX-crop.drag.x)*k;crop.oy=crop.drag.oy+(e.clientY-crop.drag.y)*k;drawCrop()});
 c.addEventListener('pointerup',()=>crop.drag=null);c.addEventListener('pointercancel',()=>crop.drag=null);
 c.addEventListener('wheel',e=>{if(crop.shape==='none')return;e.preventDefault();crop.zoom=Math.min(4,Math.max(1,crop.zoom*(e.deltaY<0?1.08:1/1.08)));$('#cropz').value=crop.zoom;drawCrop()},{passive:false});
 drawCrop();
}
function cropGeom(S){
 const s=crop.src,rw=crop.rot%180?s.height:s.width,rh=crop.rot%180?s.width:s.height;
 const sc=crop.shape==='none'?Math.min(S/rw,S/rh):Math.max(S/rw,S/rh)*crop.zoom;
 if(crop.shape==='none'){crop.ox=0;crop.oy=0}else{const mx=Math.max(0,(rw*sc-S)/2),my=Math.max(0,(rh*sc-S)/2);crop.ox=Math.max(-mx,Math.min(mx,crop.ox));crop.oy=Math.max(-my,Math.min(my,crop.oy))}
 return{rw,rh,sc};
}
function paint(x,S,sc,f=1){x.save();x.translate(S/2+crop.ox*f,S/2+crop.oy*f);x.rotate(crop.rot*Math.PI/180);x.scale(sc,sc);x.drawImage(crop.src,-crop.src.width/2,-crop.src.height/2);x.restore()}
function drawCrop(){
 const c=$('#cropc');if(!c)return;const S=c.width,x=c.getContext('2d');x.clearRect(0,0,S,S);
 const{sc}=cropGeom(S);x.imageSmoothingQuality='high';paint(x,S,sc);
 if(crop.shape==='circle'){x.save();x.fillStyle='rgba(0,0,0,.6)';x.beginPath();x.rect(0,0,S,S);x.arc(S/2,S/2,S/2-3,0,Math.PI*2,true);x.fill('evenodd');x.strokeStyle='rgba(255,255,255,.85)';x.lineWidth=3;x.beginPath();x.arc(S/2,S/2,S/2-3,0,Math.PI*2);x.stroke();x.restore()}
 if(crop.shape!=='none'){x.save();x.strokeStyle='rgba(255,255,255,.25)';x.lineWidth=1;for(const t of[1/3,2/3]){x.beginPath();x.moveTo(S*t,0);x.lineTo(S*t,S);x.moveTo(0,S*t);x.lineTo(S,S*t);x.stroke()}x.restore()}
 $$('#cropShape button').forEach(b=>b.classList.toggle('on',b.dataset.v===crop.shape));
}
function exportCrop(){
 const S=$('#cropc').width,{rw,rh,sc}=cropGeom(S);const out=document.createElement('canvas'),x=out.getContext('2d');x.imageSmoothingQuality='high';
 if(crop.shape==='none'){const k=Math.min(1,IMG_FULL/Math.max(rw,rh));out.width=Math.round(rw*k);out.height=Math.round(rh*k);x.translate(out.width/2,out.height/2);x.rotate(crop.rot*Math.PI/180);x.scale(k,k);x.drawImage(crop.src,-crop.src.width/2,-crop.src.height/2)}
 else{const N=Math.max(64,Math.round(Math.min(IMG_FULL,S/sc)));out.width=out.height=N;const f=N/S;
  if(crop.shape==='circle'){x.beginPath();x.arc(N/2,N/2,N/2,0,Math.PI*2);x.clip()}
  paint(x,N,sc*f,f)}
  return packCanvas(out,crop.shape==='circle');
}
const canvasBlob=(c,type,q)=>new Promise(res=>c.toBlob(res,type,q));
async function packCanvas(c,alpha){
 const f=scaled(c,IMG_FULL);let src=f;
 if(!alpha){src=document.createElement('canvas');src.width=f.width;src.height=f.height;const x=src.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,src.width,src.height);x.drawImage(f,0,0)}
 let blob=await canvasBlob(src,alpha?'image/webp':'image/jpeg',.86);
 if(!blob||(alpha&&blob.type!=='image/webp'))blob=await canvasBlob(src,'image/png');
 return{blob,cover:coverEnc(scaled(f,COVER_MAX))};
}
const roleLabel=(it,r)=>r==='front'?(it.type==='note'?'Recto':'Avers'):r==='back'?(it.type==='note'?'Verso':'Revers'):'Autre';
function pushDraftImage(r,idx){
 const it=formDraft,id='im_'+uid();DRAFT.set(id,r.blob);IMGURL.set(id,URL.createObjectURL(r.blob));
 if(idx!=null&&it.imgs[idx]){it.imgs[idx]={...it.imgs[idx],id,_c:r.cover};return}
 const role=!it.imgs.some(m=>m.role==='front')?'front':!it.imgs.some(m=>m.role==='back')?'back':'other';
 it.imgs.push({id,role,_c:r.cover});
}
async function addImageFiles(files){
 collectForm();
 for(const f of files){try{pushDraftImage(await packCanvas(await fileToCanvas(f),false))}catch(e){toast('Image illisible : '+f.name)}}
 renderForm();
}
function galleryHTML(it){
 const imgs=it.imgs||[];
 return `<div class="gallery-ed">${imgs.map((m,i)=>`<div class="gslot"><img src="${esc(imgSync(m.id))}" alt=""><select data-ch="imgRole" data-i="${i}" aria-label="Rôle">${['front','back','other'].map(r=>`<option value="${r}" ${m.role===r?'selected':''}>${roleLabel(it,r)}</option>`).join('')}</select><input data-ch="imgCap" data-i="${i}" value="${esc(m.cap||'')}" placeholder="Légende (tranche, facture…)" aria-label="Légende"><div class="actions"><button type="button" class="btn sm" data-act="recrop" data-i="${i}" title="Cadrer / pivoter">${ic('crop',14)}</button><button type="button" class="btn sm" data-act="imgMain" data-i="${i}" title="Image principale">★</button><button type="button" class="btn sm danger" data-act="rmphoto" data-i="${i}" title="Retirer" aria-label="Retirer">${ic('trash',14)}</button></div></div>`).join('')}<label class="gslot add">${ic('plus',24)}<span>Ajouter des photos</span><input type="file" accept="image/*" multiple hidden data-ch="photo"></label></div>`;
}
