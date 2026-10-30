'use strict';
/* ---------- export / import CSV ---------- */
function csvCell(s){s=String(s??'');return /[";\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
function exportCSV(){
 const fs=getFields();const head=['Statut',...fs.map(f=>f.label)];
 const rows=state.items.map(i=>[i.status==='wish'?'souhait':'collection',...fs.map(f=>{const v=i[f.key];if(isEmpty(v))return'';
  if(f.key==='type')return v==='note'?'Billet':'Pièce';if(f.type==='country')return cname(v);if(f.type==='checkbox')return v?'oui':'';
  if(f.type==='select'){const o=optionsOf(f).find(x=>String(x[0])===String(v));return o?o[1]:v}return v})]);
 download(`nummus-${slug(userName())}-${today()}.csv`,'\ufeff'+[head,...rows].map(r=>r.map(csvCell).join(';')).join('\r\n'),'text/csv;charset=utf-8');
}
function parseCSV(t){
 t=t.replace(/^\ufeff/,'');const first=t.split(/\r?\n/)[0]||'';const nc=c=>(first.match(new RegExp(c==='\t'?'\t':'\\'+c,'g'))||[]).length,d=nc('\t')>Math.max(nc(';'),nc(','))?'\t':nc(';')>=nc(',')?';':',';
 const rows=[];let r=[],c='',q=false;
 for(let i=0;i<t.length;i++){const ch=t[i];
  if(q){if(ch==='"'){if(t[i+1]==='"'){c+='"';i++}else q=false}else c+=ch}
  else if(ch==='"')q=true;else if(ch===d){r.push(c);c=''}
  else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&t[i+1]==='\n')i++;r.push(c);c='';if(r.some(x=>x!==''))rows.push(r);r=[]}
  else c+=ch}
 r.push(c);if(r.some(x=>x!==''))rows.push(r);return rows;
}
/* convertit une cellule texte en valeur typée du champ k (partagé par l'import CSV/Excel et la saisie en lot) */
function applyCell(it,fs,k,s){
 if(!k||!s)return;
 if(k==='_status'){it.status=/souhait|wish/i.test(s)?'wish':'owned';return}
 const f=fs.find(x=>x.key===k);if(!f)return;
 if(f.type==='number'||f.type==='money'){const v=parseFloat(s.replace(/\s/g,'').replace(',','.'));if(!isNaN(v))it[k]=v}
 else if(f.type==='checkbox')it[k]=/^(1|oui|true|x|yes)$/i.test(s);
 else if(f.type==='country'){const c=COUNTRIES.find(c=>norm(c.name)===norm(s)||c.id===s);if(c)it[k]=c.id}
 else if(f.key==='type')it[k]=/billet|note/i.test(s)?'note':'coin';
 else if(f.type==='select'){const o=optionsOf(f).find(x=>norm(x[1])===norm(s)||String(x[0])===s);it[k]=o?o[0]:s}
 else if(f.type==='path')it[k]=normPath(s);
 else it[k]=s;
}
function importCSV(text){
 const rows=parseCSV(text);if(rows.length<2){toast('CSV vide ou illisible');return}
 const fs=getFields(),head=rows[0].map(norm);
 const col=head.map(h=>h==='statut'||h==='status'?'_status':(fs.find(f=>norm(f.key)===h||norm(f.label)===h)||fs.find(f=>norm(f.label).startsWith(h+' '))||{}).key);
 const out=[];
 rows.slice(1).forEach((r,n)=>{
  const it={id:uid(),type:'coin',status:'owned',created:Date.now()+n};
  r.forEach((raw,i)=>applyCell(it,fs,col[i],String(raw||'').trim()));
  if(it.denomination)out.push(it);
 });
 const dups=findDups(out);
 if(!dups.length){commitCSV(out);return}
 pendingCSV={out,skip:new Set(dups.map(x=>x[0].id))};
 openModal(`<div class="mhead"><h2>Importer ${pl(out.length,'ligne','lignes')}</h2><button class="x" data-act="close" aria-label="Fermer">${ic('x',22)}</button></div>${dupBlock(dups,'csv_skip')}<div class="actions end"><button class="btn" data-act="close">Annuler</button><button class="btn primary" data-act="csvGo">Importer</button></div>`);
}
let pendingImport=null,pendingCSV=null;
const dupKey=i=>[i.country||'',norm(i.denomination),hasYear(i)?+i.year:'',norm(i.catalog)].join('|');
function findDups(list){
 const idx=new Map();state.items.forEach(i=>{const k=dupKey(i);if(!idx.has(k))idx.set(k,i)});
 return list.filter(i=>norm(i.denomination)).map(i=>[i,idx.get(dupKey(i))]).filter(([i,ex])=>ex&&ex.id!==i.id);
}
function dupBlock(dups,id){
 if(!dups.length)return'';
 return `<fieldset><legend>${ic('shield',14)} ${pl(dups.length,'doublon potentiel','doublons potentiels')}</legend><p class="muted small">Même pays, dénomination, année et référence qu’une entrée déjà présente :</p><ul class="small">${dups.slice(0,6).map(([a])=>`<li>${esc(a.denomination)} <span class="muted">${esc([cname(a.country),fmtYear(a.year)].filter(Boolean).join(', '))}</span></li>`).join('')}${dups.length>6?`<li class="muted">… et ${dups.length-6} autres</li>`:''}</ul><label class="chk"><input type="checkbox" id="${id}" checked> Ignorer ces doublons</label></fieldset>`;
}
function commitCSV(list){list.forEach(it=>EXT.beforeSave.forEach(fn=>{try{fn(it,true)}catch(e){console.error(e)}}));putItems(list);closeModal();render();toast(pl(list.length,'entrée importée','entrées importées'))}
async function exportJSON(){
 let data;try{data=await DataIO.export(state.userId)}catch(e){data={format:'nummus',schema:2,exportedAt:new Date().toISOString(),user:{id:state.userId,name:userName()},items:state.items,prefs:prefsOf()}}
 download(`nummus-${slug(userName())}-${today()}.json`,JSON.stringify(data,null,1),'application/json');
 state.settings.backup.last=Date.now();state.settings.backup.snoozeUntil=null;savePrefs();checkBackup();
 if(view==='settings')render();
}

/* ---------- code PIN haché (SHA-256) ---------- */
function sha256js(str){
 const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
 const b=Array.from(new TextEncoder().encode(str)),l=b.length*8;b.push(0x80);while(b.length%64!==56)b.push(0);
 for(let i=7;i>=0;i--)b.push(i>3?0:(l>>>(i*8))&255);
 let H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];const r=(x,n)=>(x>>>n)|(x<<(32-n));
 for(let o=0;o<b.length;o+=64){const w=[];for(let i=0;i<16;i++)w[i]=(b[o+i*4]<<24)|(b[o+i*4+1]<<16)|(b[o+i*4+2]<<8)|b[o+i*4+3];
  for(let i=16;i<64;i++){const s0=r(w[i-15],7)^r(w[i-15],18)^(w[i-15]>>>3),s1=r(w[i-2],17)^r(w[i-2],19)^(w[i-2]>>>10);w[i]=(w[i-16]+s0+w[i-7]+s1)|0}
  let[A,B,C,D,E,F,G,Q]=H;
  for(let i=0;i<64;i++){const S1=r(E,6)^r(E,11)^r(E,25),ch=(E&F)^(~E&G),t1=(Q+S1+ch+K[i]+w[i])|0,S0=r(A,2)^r(A,13)^r(A,22),mj=(A&B)^(A&C)^(B&C),t2=(S0+mj)|0;Q=G;G=F;F=E;E=(D+t1)|0;D=C;C=B;B=A;A=(t1+t2)|0}
  H=[(H[0]+A)|0,(H[1]+B)|0,(H[2]+C)|0,(H[3]+D)|0,(H[4]+E)|0,(H[5]+F)|0,(H[6]+G)|0,(H[7]+Q)|0]}
 return H.map(x=>(x>>>0).toString(16).padStart(8,'0')).join('');
}
async function sha256(str){
 try{if(window.crypto&&crypto.subtle){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(str));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}}catch(e){}
 return sha256js(str);
}
const hasPin=()=>{const v=state.settings.vitrine;return!!(v.pinHash||v.pin)};
async function setPin(p){const v=state.settings.vitrine;v.pin='';if(!p){v.pinHash='';v.pinSalt=''}else{v.pinSalt=uid();v.pinHash=await sha256(v.pinSalt+':'+p)}savePrefs()}
async function checkPin(p){const v=state.settings.vitrine;if(v.pinHash)return(await sha256(v.pinSalt+':'+p))===v.pinHash;if(v.pin){const ok=p===v.pin;if(ok)await setPin(p);return ok}return true}

/* ---------- synchronisation WebDAV ---------- */
const davURL=()=>{const w=state.settings.webdav;let u=(w.url||'').trim();if(!u)return'';if(!/\/$/.test(u))u+='/';return u+`nummus-${slug(userName())}.json`};
const davHdr=()=>{const w=state.settings.webdav,h={};if(w.user)h.Authorization='Basic '+btoa(unescape(encodeURIComponent(w.user+':'+(w.pass||''))));return h};
async function davPush(){
 const u=davURL();if(!u){toast('Renseignez l’adresse WebDAV');return}
 try{const data=await DataIO.export(state.userId);const r=await fetch(u,{method:'PUT',headers:{...davHdr(),'Content-Type':'application/json'},body:await sealForUpload(data)});
  if(!r.ok)throw new Error('HTTP '+r.status);state.settings.webdav.last=Date.now();savePrefs();toast('Sauvegarde envoyée sur le serveur WebDAV');if(view==='settings')render()}
 catch(e){toast('Envoi WebDAV impossible ('+(e.message||'réseau / CORS')+')')}
}
async function davPull(){
 const u=davURL();if(!u){toast('Renseignez l’adresse WebDAV');return}
 try{const r=await fetch(u,{headers:davHdr()});if(!r.ok)throw new Error(r.status===404?'fichier introuvable':'HTTP '+r.status);offerImport(await r.text())}
 catch(e){toast('Lecture WebDAV impossible ('+(e.message||'réseau / CORS')+')')}
}

/* ---------- rappel de sauvegarde ---------- */
function checkBackup(){
 const b=$('#banner');if(!b||!state)return;const bk=state.settings.backup,days=+bk.intervalDays,ref=bk.last||bk.since||Date.now(),now=Date.now();
 const due=days>0&&state.items.length>0&&!vit()&&now-ref>=days*864e5&&(!bk.snoozeUntil||now>bk.snoozeUntil);
 if(!due){b.hidden=true;b.innerHTML='';return}
 b.hidden=false;
 b.innerHTML=`${ic('download',18)}<span>${bk.last?`Dernière sauvegarde il y a ${pl(Math.floor((now-bk.last)/864e5),'jour','jours')}.`:'Aucune sauvegarde téléchargée pour l’instant.'} Téléchargez une copie complète de votre collection.</span><button class="btn sm primary" data-act="backupNow">Sauvegarder</button><button class="btn sm" data-act="backupLater">Plus tard</button>`;
}

/* ---------- impression / PDF ---------- */
/* mises en page d'impression : feat-book.js en ajoute (dossier, livre) */
const PRINTERS={},PRINT_PREP={},PRINT_LAYOUTS=[['table','Inventaire en tableau']];
function openPrint(){
 const canF=isListView()&&ui.lastResults.length>0,canS=ui.picked.size>0,v=vit(),hv=hideVals();
 const nAll=pool().filter(i=>i.status!=='wish').length;
 const src=canS?'selection':canF?'filtered':'all';
 const ck=(id,l,on,dis)=>`<label class="chk"><input type="checkbox" id="${id}" ${on&&!dis?'checked':''} ${dis?'disabled':''}> ${l}</label>`;
 openModal(`<div class="mhead"><div><h2>Imprimer ou exporter en PDF</h2><p class="muted small">Planches d’inventaire pour l’assurance ou une succession. Dans la fenêtre d’impression, choisissez « Enregistrer au format PDF ».</p></div><button class="x" data-act="close" aria-label="Fermer">${ic('x',22)}</button></div>
 <fieldset><legend>Contenu</legend><div class="stack" style="gap:6px">
  <label class="chk"><input type="radio" name="psrc" value="all" ${src==='all'?'checked':''}> Toute la collection (${nAll})</label>
  ${canF?`<label class="chk"><input type="radio" name="psrc" value="filtered" ${src==='filtered'?'checked':''}> Résultats affichés (${ui.lastResults.length})</label>`:''}
  ${canS?`<label class="chk"><input type="radio" name="psrc" value="selection" ${src==='selection'?'checked':''}> Sélection (${ui.picked.size})</label>`:''}</div></fieldset>
 <fieldset><legend>Mise en page</legend><select id="p_l" data-ch="printLayout">${PRINT_LAYOUTS.map(l=>`<option value="${l[0]}">${l[1]}</option>`).join('')}</select><p class="muted small" id="p_ld" style="margin-top:6px"></p></fieldset>
 <fieldset><legend>Informations</legend><div class="fgrid">${ck('p_ph','Photos',true)}${ck('p_de','Descriptions avers / revers',false)}${ck('p_va','Valeurs estimées',true,hv)}${ck('p_pa','Prix payés et dates d’achat',!v,v)}${ck('p_st','Emplacements',false,v)}${ck('p_no','Notes personnelles',false,v)}</div>
 <div class="fgrid" style="margin-top:12px"><div class="fld"><label>Titre</label><input id="p_t" value="Inventaire de collection numismatique"></div><div class="fld"><label>Propriétaire</label><input id="p_o" value="${esc(state.settings.owner)}" placeholder="Nom (facultatif)"></div></div></fieldset>
 <div class="actions end"><button class="btn" data-act="close">Annuler</button><button class="btn primary" data-act="doPrint">${ic('print',16)} Générer</button></div>`,true);
}
function printHTML(items,o){
 const ex=items.reduce((s,i)=>s+(i.status==='wish'?0:qtyOf(i)),0),val=items.reduce((s,i)=>s+(i.status==='wish'?0:(+i.value||0)*qtyOf(i)),0),paid=items.reduce((s,i)=>s+(+i.paid||0),0);
 const date=new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
 const img=src=>src?`<img src="${esc(src)}" alt="">`:'';
 const rows=items.map(i=>{
  const ch=[i.metal,!isEmpty(i.fineness)?i.fineness+' ‰':'',!isEmpty(i.weight)?i.weight+' g':'',!isEmpty(i.diameter)?i.diameter+' mm':'',i.size?i.size+' mm':'',i.grade?'État : '+i.grade:'',i.catalog,i.numista?'N# '+i.numista:'',i.certified,i.serial?'N° '+i.serial:'',i.variety].filter(x=>!isEmpty(x));
  const extra=[o.desc&&i.obverse?`<div class="p-note">Avers : ${esc(i.obverse)}</div>`:'',o.desc&&i.reverse?`<div class="p-note">Revers : ${esc(i.reverse)}</div>`:'',o.storage&&i.storage?`<div class="p-note">Emplacement : ${esc(normPath(i.storage))}</div>`:'',o.notes&&i.notes?`<div class="p-note">${esc(i.notes).replace(/\n/g,'<br>')}</div>`:''].join('');
  return `<tr>${o.photos?`<td class="p-img">${img(i.cover)}${img(i._pb)}</td>`:''}<td><b>${esc(i.denomination)}</b><br>${esc([cname(i.country),fmtYear(i.year)].filter(Boolean).join(', '))}${i.issuer?`<br>${esc(i.issuer)}`:''}${i.status==='wish'?'<br><i>Souhait</i>':`<br>Quantité : ${qtyOf(i)}`}</td><td>${esc(ch.join(' · '))}${extra}</td>${o.values||o.paid?`<td class="r">${o.values&&!isEmpty(i.value)?fmtMoney(i.value):''}${o.paid&&!isEmpty(i.paid)?`<br><small>payé ${fmtMoney(i.paid)}${i.acquired?' le '+esc(new Date(i.acquired).toLocaleDateString('fr-FR')):''}</small>`:''}</td>`:''}</tr>`}).join('');
 const nc=(o.photos?1:0)+2;
 return `<h1>${esc(o.title)}</h1><p class="p-sub">${o.owner?esc(o.owner)+' — ':''}Inventaire établi le ${esc(date)}</p><p class="p-sub">${pl(items.length,'entrée','entrées')}, ${pl(ex,'exemplaire','exemplaires')}${o.values?` — valeur estimée totale ${fmtMoney(val)}`:''}${o.paid?` — montant investi ${fmtMoney(paid)}`:''}</p>
 <table><thead><tr>${o.photos?'<th>Photos</th>':''}<th>Désignation</th><th>Caractéristiques</th>${o.values||o.paid?'<th class="r">Valeur</th>':''}</tr></thead><tbody>${rows}</tbody>
 ${o.values?`<tfoot><tr><td colspan="${nc}">Total (valeur unitaire × quantité)</td><td class="r">${fmtMoney(val)}</td></tr></tfoot>`:''}</table>
 <p class="p-foot">Document généré par Nummus. Les valeurs indiquées sont des estimations personnelles du collectionneur et ne constituent pas une expertise.</p>`;
}

/* ---------- données de démonstration ---------- */
function demoItems(){
 const D=o=>Object.assign({id:uid(),status:'owned',qty:1,public:true,created:Date.now()-Math.floor(Math.random()*1e7)},o);
 return[
 D({type:'coin',country:'250',issuer:'République française',denomination:'1 franc Semeuse',currency:'Franc',year:1920,metal:'Argent 835‰',fineness:835,weight:5,diameter:23,grade:'TTB',paid:3.5,value:6,storage:'Bureau > Tiroir 1 > Classeur bleu > Page 2',tags:'semeuse, IIIe République',notes:'Belle patine grise.\n\n- Achetée en brocante\n- À comparer avec la **1919**\n\nArgent fin : $5 \\times 0{,}835 = 4{,}175\\ \\text{g}$'}),
 D({type:'coin',country:'250',issuer:'République française',denomination:'5 francs Hercule',year:1873,metal:'Argent 900‰',fineness:900,diameter:37,weight:25,mint:'Paris (A)',grade:'TB',qty:2,trade:true,paid:28,value:35,storage:'Bureau > Tiroir 1 > Classeur bleu > Page 5',valueHistory:[{date:'2025-02-10',value:30},{date:'2026-04-02',value:35}]}),
 D({type:'coin',country:'250',issuer:'Second Empire',denomination:'20 francs Napoléon III tête laurée',year:1866,metal:'Or 900‰',fineness:900,weight:6.45,diameter:21,mint:'Paris (A)',grade:'SUP',certified:'NGC MS62 2134567-004',paid:380,value:420,storage:'Coffre > Boîte A',tags:'or, napoléon',public:false,valueHistory:[{date:'2024-01-15',value:360},{date:'2025-03-01',value:395},{date:'2026-06-10',value:420}]}),
 D({type:'coin',country:'380',issuer:'Empire romain',denomination:'Denier d’Auguste',year:-19,metal:'Argent',weight:3.8,grade:'TB',paid:180,value:220,storage:'Coffre > Boîte antiques',tags:'antique, romain',link:'https://numista.com',notes:'## Contexte\nFrappe d’époque impériale.\n\n> À faire authentifier un jour.'}),
 D({type:'coin',country:'840',issuer:'États-Unis',denomination:'1 dollar Morgan',year:1881,metal:'Argent 900‰',fineness:900,weight:26.73,diameter:38.1,mint:'Philadelphie',grade:'MS-63',certified:'PCGS MS63 12345678',paid:70,value:95,storage:'Bureau > Tiroir 2 > Capsules'}),
 D({type:'coin',country:'356',issuer:'Raj britannique',denomination:'1 roupie Victoria',year:1862,metal:'Argent 917‰',fineness:917,weight:11.66,grade:'TTB',paid:22,value:30,storage:'Bureau > Tiroir 2 > Capsules'}),
 D({type:'coin',country:'492',issuer:'Principauté de Monaco',denomination:'2 euros commémorative',year:2015,metal:'Bimétallique',grade:'FDC',paid:4,value:12}),
 D({type:'note',country:'392',issuer:'Banque du Japon',denomination:'1000 yens',year:2004,series:'Série E',grade:'UNC',paid:9,value:11,storage:'Bureau > Classeur billets A'}),
 D({type:'note',country:'716',issuer:'Reserve Bank of Zimbabwe',denomination:'100 000 milliards de dollars',year:2008,grade:'UNC',paid:6,value:8,tags:'hyperinflation',notes:'Un classique de l’**hyperinflation**.',storage:'Bureau > Classeur billets A'}),
 D({type:'coin',status:'wish',country:'300',issuer:'Grèce antique',denomination:'Tétradrachme athénien',year:-440,priority:'3',target:450,link:'https://numista.com',notes:'Cherche une chouette bien centrée.'}),
 D({type:'note',status:'wish',country:'826',issuer:'Royaume-Uni',denomination:'50 livres polymère',year:2021,priority:'1',target:70})
 ];
}
