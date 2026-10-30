'use strict';
/* =====================================================================
   SAISIE ET IMPORT : saisie en lot (tableau, collage depuis un tableur, photos), import CSV / TSV / Excel (.xlsx)
   avec correspondance des colonnes, et alerte de doublon à l'enregistrement d'une fiche.
   Les conversions de cellules sont celles de l'import CSV historique (applyCell) : aucune règle en double.
   Pas de reconnaissance automatique d'image : une photo crée une ligne avec sa vignette, que l'on complète à la main.
   ===================================================================== */
const ENT={tab:'grid',rows:[],n:8,imp:null};
const ENT_COLS=['denomination','country','year','metal','grade','qty','value','paid','storage'];
const entCols=()=>ENT_COLS.map(k=>getFields().find(f=>f.key===k)).filter(f=>f&&f.enabled);
const entRow=()=>({v:{},img:null,thumb:''});
const entFilled=r=>Object.values(r.v).some(x=>String(x||'').trim())||r.img;
function entEnsure(){while(ENT.rows.length<ENT.n)ENT.rows.push(entRow())}
function entItems(){
 const fs=getFields(),out=[];
 ENT.rows.forEach((r,n)=>{
  if(!entFilled(r))return;
  const it={id:uid(),type:'coin',status:ENT.status==='wish'?'wish':'owned',created:Date.now()+n,qty:1};
  Object.entries(r.v).forEach(([k,s])=>applyCell(it,fs,k,String(s||'').trim()));
  it._row=r;out.push(it);
 });
 return out;
}
addModule('entry','Saisie et import','plus','Saisie en lot dans un tableau, collage depuis un tableur, photos, import CSV / Excel avec correspondance des colonnes.',{after:'wishlist',view:()=>viewEntry()});
function viewEntry(){
 entEnsure();
 const tabs=[['grid','Tableau'],['import','Importer un fichier']];
 return `<header class="head"><div><h1>Saisie et import</h1><p class="sub">Ajoutez beaucoup de fiches d’un coup, sans ouvrir le formulaire pour chacune.</p></div></header>
 <div class="seg" style="margin-bottom:14px">${tabs.map(t=>`<button class="${ENT.tab===t[0]?'on':''}" data-act="entTab" data-t="${t[0]}">${t[1]}</button>`).join('')}</div>${ENT.tab==='grid'?entGrid():entImport()}`;
}
function entGrid(){
 const cols=entCols(),dl=`<datalist id="ent_c">${COUNTRIES.map(c=>`<option value="${esc(c.name)}">`).join('')}</datalist><datalist id="ent_m">${lists.metals().map(m=>`<option value="${esc(m)}">`).join('')}</datalist>`;
 const w=k=>({denomination:'180px',country:'150px',year:'80px',metal:'120px',grade:'90px',qty:'60px',value:'90px',paid:'90px',storage:'160px'})[k]||'110px';
 const list=k=>k==='country'?'ent_c':k==='metal'?'ent_m':'';
 return `<section class="panel glass"><p class="muted" style="margin-bottom:10px">Collez directement des lignes copiées depuis Excel ou Sheets dans une cellule : elles se répartissent sur les lignes et colonnes suivantes. Pays : nom français (ou code). Les lignes vides sont ignorées.</p>
 <div class="actions" style="margin-bottom:10px;flex-wrap:wrap"><label class="chk" style="display:inline-flex;margin:0">Statut <select data-ch="entStatus" style="margin-left:6px"><option value="owned">Collection</option><option value="wish" ${ENT.status==='wish'?'selected':''}>Wishlist</option></select></label>
 <label class="btn" style="cursor:pointer">${ic('camera',16)} Ajouter des photos<input type="file" accept="image/*" multiple hidden data-ch="entPhotos"></label>
 <button class="btn" data-act="entMore">${ic('plus',16)} 8 lignes</button><button class="btn" data-act="entClear">Vider</button></div>
 <div style="overflow:auto;max-width:100%"><table class="enttbl" style="border-collapse:collapse;width:100%">${dl}<thead><tr><th></th>${cols.map(f=>`<th style="text-align:left;font-size:12px;padding:4px">${esc(f.label.split(' (')[0])}</th>`).join('')}<th></th></tr></thead>
 <tbody>${ENT.rows.map((r,i)=>`<tr data-r="${i}"><td style="padding:2px 6px;color:var(--muted);font-size:12px">${r.thumb?`<img src="${r.thumb}" alt="" style="width:34px;height:34px;object-fit:cover;border-radius:6px;display:block">`:i+1}</td>${cols.map(f=>`<td style="padding:2px"><input data-ent="${f.key}" data-r="${i}" value="${esc(r.v[f.key]||'')}" ${list(f.key)?`list="${list(f.key)}"`:''} inputmode="${['year','qty','value','paid'].includes(f.key)?'decimal':'text'}" style="width:${w(f.key)};min-width:100%"></td>`).join('')}<td style="padding:2px"><label class="btn sm" style="cursor:pointer" title="Photo de l’avers">${ic('camera',14)}<input type="file" accept="image/*" capture="environment" hidden data-ch="entRowPhoto" data-r="${i}"></label></td></tr>`).join('')}</tbody></table></div>
 <div class="actions end" style="margin-top:12px"><span class="muted small" id="entCount"></span><button class="btn primary" data-act="entSave">${ic('check',16)} Enregistrer les fiches</button></div></section>`;
}
const entCount=()=>{const el=$('#entCount');if(el)el.textContent=pl(ENT.rows.filter(r=>r.v.denomination&&String(r.v.denomination).trim()).length,'fiche prête','fiches prêtes')};
document.addEventListener('input',e=>{
 const t=e.target;if(t.dataset&&t.dataset.ent!==undefined){const r=ENT.rows[+t.dataset.r];if(r){r.v[t.dataset.ent]=t.value;entCount()}}
});
document.addEventListener('paste',e=>{
 const t=e.target;if(!t.dataset||t.dataset.ent===undefined)return;
 const txt=(e.clipboardData||window.clipboardData).getData('text');if(!/[\t\n]/.test(txt.trim()))return;
 e.preventDefault();
 const cols=entCols().map(f=>f.key),r0=+t.dataset.r,c0=cols.indexOf(t.dataset.ent),lines=txt.replace(/\r/g,'').replace(/\n+$/,'').split('\n');
 ENT.n=Math.max(ENT.n,r0+lines.length);entEnsure();
 lines.forEach((ln,i)=>ln.split('\t').forEach((c,j)=>{const k=cols[c0+j];if(k)ENT.rows[r0+i].v[k]=c.trim()}));
 render();toast(pl(lines.length,'ligne collée','lignes collées'));
});
async function entThumb(file){try{const u=URL.createObjectURL(file);const im=await loadImage(u);const c=scaled(toCanvas(im,160),80);URL.revokeObjectURL(u);return c.toDataURL('image/jpeg',.7)}catch(e){return''}}
Object.assign(CH,{
 entStatus:t=>{ENT.status=t.value},
 entPhotos:async t=>{
  const fs=[...t.files];t.value='';let n=0;
  for(const f of fs){let i=ENT.rows.findIndex(r=>!entFilled(r));if(i<0){ENT.rows.push(entRow());ENT.n=ENT.rows.length;i=ENT.rows.length-1}
   ENT.rows[i].img=f;ENT.rows[i].thumb=await entThumb(f);n++}
  render();toast(pl(n,'photo ajoutée','photos ajoutées')+' : complétez la dénomination de chaque ligne');
 },
 entRowPhoto:async t=>{const f=t.files[0],r=ENT.rows[+t.dataset.r];t.value='';if(!f||!r)return;r.img=f;r.thumb=await entThumb(f);render()}
});
Object.assign(ACT,{
 entTab:t=>{ENT.tab=t.dataset.t;render()},
 entMore:()=>{ENT.n=ENT.rows.length+8;entEnsure();render()},
 entClear:()=>{if(ENT.rows.some(entFilled)&&!confirm('Vider le tableau ?'))return;ENT.rows=[];ENT.n=8;render()},
 entSave:async()=>{
  const items=entItems(),bad=items.filter(i=>!String(i.denomination||'').trim());
  if(!items.length){toast('Rien à enregistrer');return}
  if(bad.length){toast(`${pl(bad.length,'ligne','lignes')} sans dénomination : complétez-la${bad.length>1?'s':''} ou videz-la${bad.length>1?'s':''}`);return}
  const dups=findDups(items),seen=new Map(),inner=[];
  items.forEach(i=>{const k=dupKey(i);if(seen.has(k))inner.push([i,seen.get(k)]);else seen.set(k,i)});
  const go=async skip=>{
   const list=items.filter(i=>!skip.has(i.id));
   for(const it of list){
    const r=it._row;delete it._row;
    if(r&&r.img){const id='im_'+uid();try{await Store.images.put(state.userId,id,r.img);it.imgs=[{id,role:'front'}];it.cover=await coverOf(r.img)}catch(e){console.warn(e)}}
    EXT.beforeSave.forEach(fn=>{try{fn(it,true)}catch(e){console.error(e)}});
   }
   await putItems(list);ENT.rows=[];ENT.n=8;closeModal();render();toast(pl(list.length,'fiche enregistrée','fiches enregistrées'));
  };
  const all=[...dups,...inner];
  if(!all.length){await go(new Set());return}
  window._entGo=go;window._entSkip=new Set(all.map(x=>x[0].id));
  openModal(`<div class="mhead"><h2>Doublons possibles</h2><button class="x" data-act="close" aria-label="Fermer">${ic('x',22)}</button></div><p class="muted">${pl(all.length,'ligne ressemble','lignes ressemblent')} à une fiche déjà présente ou à une autre ligne du tableau (même pays, dénomination, année, référence).</p><ul class="small">${all.slice(0,8).map(([a])=>`<li>${esc(a.denomination)} <span class="muted">${esc([cname(a.country),fmtYear(a.year)].filter(Boolean).join(', '))}</span></li>`).join('')}</ul><div class="actions end"><button class="btn" data-act="close">Annuler</button><button class="btn" data-act="entGoAll">Tout enregistrer</button><button class="btn primary" data-act="entGoSkip">Ignorer les doublons</button></div>`);
 },
 entGoAll:()=>window._entGo(new Set()),
 entGoSkip:()=>window._entGo(window._entSkip)
});

/* ---------- alerte de doublon à l'enregistrement d'une fiche (appelée par saveItem) ---------- */
function dupAsk(ex,it){
 window._dupIt=it;
 openModal2(`<div class="mhead"><h2>Cette pièce existe peut-être déjà</h2><button class="x" data-act="close2" aria-label="Fermer">${ic('x',22)}</button></div>
 <p>« <b>${esc(ex.denomination)}</b> » ${esc([cname(ex.country),fmtYear(ex.year)].filter(Boolean).join(', '))} est déjà dans ${ex.status==='wish'?'la wishlist':'la collection'} (quantité ${qtyOf(ex)}).</p>
 <div class="actions end" style="flex-wrap:wrap"><button class="btn" data-act="dupOpen" data-id="${ex.id}">Voir la fiche existante</button><button class="btn" data-act="dupAdd" data-id="${ex.id}">${ic('plus',15)} Ajouter ${qtyOf(it)} à la quantité existante</button><button class="btn primary" data-act="dupKeep">Créer quand même</button></div>`);
}
Object.assign(ACT,{
 dupKeep:()=>{if(window._dupIt)window._dupIt._dupOk=true;closeModal2();saveItem()},
 dupOpen:t=>{closeModal2();closeModal();openDetail(t.dataset.id)},
 dupAdd:async t=>{const ex=state.items.find(i=>i.id===t.dataset.id),it=window._dupIt;if(!ex)return;await putItems([{...ex,qty:qtyOf(ex)+qtyOf(it),updated:Date.now()}]);(it.imgs||[]).forEach(m=>forgetImg(m.id));closeModal2();closeModal();render();toast('Quantité mise à jour sur la fiche existante')}
});

/* ---------- import CSV / TSV / Excel avec correspondance des colonnes ---------- */
const ENT_SYN={country:['pays','country','nation'],year:['annee','année','millesime','millésime','date','year'],denomination:['denomination','dénomination','valeur faciale','nom','piece','pièce','coin','libelle','libellé'],metal:['metal','métal','composition','matiere','matière'],grade:['etat','état','grade','conservation'],qty:['qte','qté','quantite','quantité','nombre','qty'],value:['valeur','estimation','cote','prix actuel','value'],paid:['paye','payé','prix paye','prix payé','achat','prix achat','cout','coût'],storage:['emplacement','rangement','classeur','lieu'],weight:['poids','weight'],diameter:['diametre','diamètre'],catalog:['reference','référence','km','catalogue','ref'],notes:['notes','note','commentaire','remarque','observations'],mint:['atelier','mint'],issuer:['emetteur','émetteur','issuer'],_status:['statut','status']};
function entGuess(h,fs){
 const n=norm(h);if(!n)return'';
 for(const[k,syn]of Object.entries(ENT_SYN))if(syn.some(x=>norm(x)===n))return k;
 const f=fs.find(x=>norm(x.key)===n||norm(x.label)===n)||fs.find(x=>norm(x.label).startsWith(n+' '));return f?f.key:'';
}
function entImport(){
 const im=ENT.imp,fs=getFields().filter(f=>f.enabled);
 if(!im)return `<section class="panel glass"><p class="muted" style="margin-bottom:10px">Formats acceptés : CSV (séparateur ; , ou tabulation), TSV et Excel moderne (.xlsx, première feuille). La première ligne doit contenir les en-têtes. Vous choisirez ensuite à quel champ correspond chaque colonne.</p>
 <label class="btn primary" style="cursor:pointer">${ic('download',16)} Choisir un fichier<input type="file" accept=".csv,.tsv,.txt,.xlsx,text/csv" hidden data-ch="entFile"></label></section>`;
 const opt=cur=>`<option value="">— ignorer —</option><option value="_status" ${cur==='_status'?'selected':''}>Statut (collection / souhait)</option>${fs.map(f=>`<option value="${f.key}" ${cur===f.key?'selected':''}>${esc(f.label.split(' (')[0])}</option>`).join('')}`;
 const used=im.map.filter(Boolean),dupMap=used.filter((k,i)=>used.indexOf(k)!==i);
 return `<section class="panel glass"><h2>${esc(im.name)} <span class="muted small">· ${pl(im.rows.length-1,'ligne','lignes')}</span></h2>
 ${dupMap.length?`<p class="small" style="color:var(--danger,#c0453a)">Plusieurs colonnes visent le même champ : seule la dernière non vide sera retenue.</p>`:''}
 <div style="overflow:auto"><table style="border-collapse:collapse;width:100%"><thead><tr>${im.rows[0].map((h,i)=>`<th style="text-align:left;padding:4px;min-width:150px;vertical-align:top"><div class="muted small" style="margin-bottom:4px">${esc(h||'(sans titre)')}</div><select data-ch="entMap" data-i="${i}">${opt(im.map[i])}</select></th>`).join('')}</tr></thead>
 <tbody>${im.rows.slice(1,6).map(r=>`<tr>${im.rows[0].map((_,i)=>`<td class="small" style="padding:4px;border-top:1px solid var(--border)">${esc(String(r[i]??'').slice(0,40))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
 <div class="actions" style="margin-top:12px;flex-wrap:wrap"><label class="chk" style="display:inline-flex;margin:0">Statut par défaut <select data-ch="entStatus2" style="margin-left:6px"><option value="owned">Collection</option><option value="wish" ${im.status==='wish'?'selected':''}>Wishlist</option></select></label>
 <label class="chk" style="display:inline-flex;margin:0"><input type="checkbox" data-ch="entSkipDup" ${im.skip!==false?'checked':''}> Ignorer les doublons déjà présents</label>
 <span style="flex:1"></span><button class="btn" data-act="entImpCancel">Annuler</button><button class="btn primary" data-act="entImpGo" ${im.map.includes('denomination')?'':'disabled title="Associez une colonne à la dénomination"'}>Importer ${pl(im.rows.length-1,'ligne','lignes')}</button></div></section>`;
}
/* lecteur .xlsx minimal : zip (méthodes stockée/deflate) + sharedStrings + première feuille */
async function zipEntries(buf){
 const dv=new DataView(buf),u8=new Uint8Array(buf);let e=buf.byteLength-22;
 while(e>=0&&dv.getUint32(e,true)!==0x06054b50)e--;if(e<0)throw new Error('zip');
 const n=dv.getUint16(e+10,true);let p=dv.getUint32(e+16,true);const out={};
 for(let i=0;i<n;i++){
  const method=dv.getUint16(p+10,true),csize=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),el=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),off=dv.getUint32(p+42,true);
  const name=new TextDecoder().decode(u8.subarray(p+46,p+46+nl));p+=46+nl+el+cl;
  const lo=off+30+dv.getUint16(off+26,true)+dv.getUint16(off+28,true),data=u8.subarray(lo,lo+csize);
  out[name]=async()=>{if(method===0)return data;const ds=new DecompressionStream('deflate-raw'),w=ds.writable.getWriter();w.write(data);w.close();return new Uint8Array(await new Response(ds.readable).arrayBuffer())};
 }
 return out;
}
async function parseXLSX(buf){
 const z=await zipEntries(buf),txt=async n=>z[n]?new TextDecoder().decode(await z[n]()):'',dom=s=>new DOMParser().parseFromString(s,'application/xml');
 const ss=[...dom(await txt('xl/sharedStrings.xml')).getElementsByTagName('si')].map(si=>[...si.getElementsByTagName('t')].map(t=>t.textContent).join(''));
 const sheet=Object.keys(z).filter(k=>/^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort((a,b)=>parseInt(a.match(/\d+/))-parseInt(b.match(/\d+/)))[0];
 if(!sheet)throw new Error('feuille introuvable');
 const rows=[];
 for(const r of dom(await txt(sheet)).getElementsByTagName('row')){
  const row=[];
  for(const c of r.getElementsByTagName('c')){
   const ref=c.getAttribute('r')||'',L=ref.replace(/\d+/g,''),ci=[...L].reduce((a,ch)=>a*26+ch.charCodeAt(0)-64,0)-1,t=c.getAttribute('t'),v=c.getElementsByTagName('v')[0];
   let val='';if(t==='s'&&v)val=ss[+v.textContent]||'';else if(t==='inlineStr')val=[...c.getElementsByTagName('t')].map(x=>x.textContent).join('');else if(v)val=v.textContent;
   row[ci]=val;
  }
  const full=[...row].map(x=>x===undefined?'':x);if(full.some(x=>x!==''))rows.push(full);
 }
 const w=Math.max(...rows.map(r=>r.length));return rows.map(r=>Array.from({length:w},(_,i)=>r[i]??''));
}
CH.entFile=async t=>{
 const f=t.files[0];t.value='';if(!f)return;let rows;
 try{rows=/\.xlsx$/i.test(f.name)?await parseXLSX(await f.arrayBuffer()):parseCSV(await f.text())}catch(e){toast('Fichier illisible : '+(e.message||e)+(/\.xls$/i.test(f.name)?' (ancien format .xls : enregistrez en .xlsx ou CSV)':''));return}
 if(/\.xls$/i.test(f.name)){toast('Ancien format .xls non pris en charge : enregistrez en .xlsx ou CSV');return}
 if(rows.length<2){toast('Fichier vide');return}
 const fs=getFields().filter(x=>x.enabled),map=rows[0].map(h=>entGuess(h,fs));
 ENT.imp={name:f.name,rows,map,status:'owned',skip:true};render();
};
Object.assign(CH,{
 entMap:t=>{ENT.imp.map[+t.dataset.i]=t.value;render()},
 entStatus2:t=>{ENT.imp.status=t.value},
 entSkipDup:t=>{ENT.imp.skip=t.checked}
});
Object.assign(ACT,{
 entImpCancel:()=>{ENT.imp=null;render()},
 entImpGo:()=>{
  const im=ENT.imp,fs=getFields(),out=[];
  im.rows.slice(1).forEach((r,n)=>{
   const it={id:uid(),type:'coin',status:im.status,created:Date.now()+n};
   r.forEach((raw,i)=>applyCell(it,fs,im.map[i],String(raw??'').trim()));
   if(String(it.denomination||'').trim())out.push(it);
  });
  const dups=findDups(out),skip=im.skip?new Set(dups.map(x=>x[0].id)):new Set(),list=out.filter(i=>!skip.has(i.id));
  if(!list.length){toast('Aucune ligne à importer'+(dups.length?' (toutes sont des doublons)':''));return}
  ENT.imp=null;commitCSV(list);
  if(skip.size)setTimeout(()=>toast(`${pl(list.length,'fiche importée','fiches importées')}, ${pl(skip.size,'doublon ignoré','doublons ignorés')}`),400);
 }
});
/* le bouton « Importer CSV » des réglages passe aussi par la correspondance des colonnes */
CH.impcsv=t=>{const f=t.files[0];if(!f)return;ENT.tab='import';go('entry');CH.entFile(t)};
