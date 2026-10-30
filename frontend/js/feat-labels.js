'use strict';
/* =====================================================================
   ÉTIQUETTES ET MINICARTES (QR code)
   Un seul module pour : étiquettes d'alvéole ou de médaillier, minicartes à glisser sous un étui (CR80, carton
   2×2 pouces), étiquette de contenant. Chaque étiquette porte un QR code qui ouvre la fiche dans l'application,
   ou la page publique si une adresse de site est renseignée. Jamais de prix ni de valeur sur une étiquette.
   ===================================================================== */
addModule('labels','Étiquettes et QR','qr','Étiquettes d’alvéole, minicartes d’étui et QR codes imprimables, renvoyant à la fiche.',{after:'storage',view:()=>viewLabels()});

const LBL_FORMATS={
 cr80:{name:'Minicarte CR80 (85,6 × 54 mm), 10 par page',w:85.6,h:54,cols:2,rows:5,gx:4,gy:3,size:'l'},
 sq2:{name:'Carton 2 × 2 pouces (50 × 50 mm), 15 par page',w:50,h:50,cols:3,rows:5,gx:4,gy:4,size:'m'},
 lab70:{name:'Étiquette 70 × 35 mm, 16 par page',w:70,h:35,cols:2,rows:8,gx:2,gy:2,size:'m'},
 lab38:{name:'Petite étiquette 38 × 21 mm (alvéole), 65 par page',w:38,h:21,cols:5,rows:13,gx:1,gy:1,size:'s'}
};
const LBL={src:'all',ctr:'',fmt:'cr80',target:'app',cut:true,qr:true,
 f:{year:true,place:true,metal:true,grade:true,ref:true,slot:true}};
let LBL_MERGED=0;

/* ---------- liens et QR ---------- */
const appBase=()=>location.origin==='null'?location.href.split('#')[0]:location.origin+location.pathname;
function lblURL(id){
 if(LBL.target==='site'&&state.settings.siteUrl)return state.settings.siteUrl.replace(/#.*$/,'').replace(/\/?$/,'/')+'#'+encodeURIComponent(id);
 return appBase()+'#item='+encodeURIComponent(id);
}
function qrSVG(text,margin=1){
 const q=qrcode(0,'M');q.addData(encodeURI(text));q.make();
 const n=q.getModuleCount();let d='';
 for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(q.isDark(r,c))d+=`M${c} ${r}h1v1h-1z`;
 return `<svg class="qr" viewBox="${-margin} ${-margin} ${n+2*margin} ${n+2*margin}" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect x="${-margin}" y="${-margin}" width="${n+2*margin}" height="${n+2*margin}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
/* ouverture d'une fiche depuis le QR : #item=<id> */
function openFromHash(){
 const m=location.hash.match(/^#item=(.+)$/);if(!m)return;
 const id=decodeURIComponent(m[1]);
 if(state.items.some(i=>i.id===id))openDetail(id);else toast('Fiche introuvable dans ce profil');
 history.replaceState(null,'',location.pathname+location.search);
}
addEventListener('hashchange',()=>{if(state)openFromHash()});

/* ---------- sources ---------- */
function lblItems(){
 const l=lblItemsRaw();LBL_MERGED=0;
 if(LBL.f.year)return l;
 /* sans date : une seule étiquette par type (même pays, dénomination, métal, variété), tous millésimes confondus */
 const seen=new Map();
 l.forEach(x=>{const i=x.it,k=[i.type,i.country||norm(i.issuer),norm(i.denomination),norm(String(i.metal||'').replace(/[\d‰%.,\s]+/g,'')),norm(i.variety)].join('|');
  if(seen.has(k)){LBL_MERGED++;delete seen.get(k).n}else seen.set(k,x)});
 return[...seen.values()];
}
function lblItemsRaw(){
 if(LBL.src==='sel'&&ui.picked.size)return[...ui.picked].map(id=>state.items.find(i=>i.id===id)).filter(Boolean).map(it=>({it}));
 if(LBL.src==='filtered'&&ui.lastResults.length)return ui.lastResults.filter(i=>i.status!=='wish').map(it=>({it}));
 if(LBL.src==='ctr'){
  const c=ctrOf(LBL.ctr);if(!c)return[];
  return [...new Set([...Object.keys(c.occ||{}),...Object.keys(c.more||{})])].flatMap(n=>cellItems(c,n).map(it=>({n:+n,it,c}))).sort((a,b)=>a.n-b.n);
 }
 return pool().filter(i=>i.status!=='wish').sort((a,b)=>String(a.country).localeCompare(b.country)||(+a.year||0)-(+b.year||0)).map(it=>({it}));
}

/* ---------- une étiquette ---------- */
function lblHTML(x,fmt){
 const it=x.it,F=LBL.f,size=fmt.size;
 const facts=[];
 facts.push(esc([cname(it.country)||it.issuer,F.year?yearSpan(it):''].filter(Boolean).join(' · ')));
 if(F.metal)facts.push(esc([it.metal,!isEmpty(it.weight)?it.weight+' g':'',!isEmpty(it.diameter)?it.diameter+' mm':''].filter(Boolean).join(' · ')));
 if(F.grade&&it.grade)facts.push('État : '+esc(it.grade));
 if(F.ref&&(it.catalog||it.numista))facts.push(esc(it.catalog||'N# '+it.numista));
 if(F.place&&it.mint)facts.push(esc(it.mint));
 const keep=size==='s'?1:size==='m'?3:5;
 const slot=(F.slot&&x.n)?`<span class="ln">n° ${x.n}</span>`:'';
 return `<div class="lbl lbl-${size}"><div class="lqr">${LBL.qr?qrSVG(lblURL(it.id)):''}</div><div class="ltx"><b>${esc(it.denomination)}</b>${facts.filter(Boolean).slice(0,keep).map(f=>`<span>${f}</span>`).join('')}${slot}</div></div>`;
}
function lblSheet(list,fmt){
 const per=fmt.cols*fmt.rows,pages=[];
 for(let i=0;i<list.length;i+=per)pages.push(list.slice(i,i+per));
 const css=`--lw:${fmt.w}mm;--lh:${fmt.h}mm;--lc:${fmt.cols};--lgx:${fmt.gx}mm;--lgy:${fmt.gy}mm`;
 return pages.map(p=>`<section class="lblpage ${LBL.cut?'cut':''}" style="${css}">${p.map(x=>lblHTML(x,fmt)).join('')}</section>`).join('');
}

/* ---------- vue ---------- */
function viewLabels(){
 const fmt=LBL_FORMATS[LBL.fmt],list=lblItems(),per=fmt.cols*fmt.rows,v=vit();
 const srcs=[['all','Toute la collection'],['filtered','Résultats affichés dans la collection'],['sel','Sélection en cours'],['ctr','Un contenant (plan de rangement)']];
 const local=/^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname)||location.protocol==='file:';
 const ck=(k,l)=>`<label class="chk"><input type="checkbox" data-ch="lblF" data-k="${k}" ${LBL.f[k]?'checked':''}> ${l}</label>`;
 return `<header class="head"><div><h1>Étiquettes et QR</h1><p class="sub">Étiquettes d’alvéole et minicartes à glisser sous un étui. Le QR code ouvre la fiche ; aucun prix n’est jamais imprimé.</p></div>
 <div class="actions"><button class="btn primary" data-act="lblPrint" ${list.length?'':'disabled'}>${ic('print',16)} Imprimer ${list.length?pl(list.length,'étiquette','étiquettes'):''}</button></div></header>
 <div class="panel glass"><div class="fgrid">
  <div class="fld"><label>Modèle</label><select data-ch="lblFmt">${opt(Object.entries(LBL_FORMATS).map(([k,f])=>[k,f.name]),LBL.fmt)}</select></div>
  <div class="fld"><label>Contenu</label><select data-ch="lblSrc">${opt(srcs,LBL.src)}</select></div>
  ${LBL.src==='ctr'?`<div class="fld"><label>Contenant</label><select data-ch="lblCtr"><option value="">—</option>${opt(state.containers.map(c=>[c.id,c.name]),LBL.ctr)}</select></div>`:''}
  <div class="fld"><label>Le QR ouvre…</label><select data-ch="lblTarget">${opt([['app','la fiche dans l’application'],['site','la page de la vitrine publique']],LBL.target)}</select></div>
  ${LBL.target==='site'?`<div class="fld wide"><label>Adresse de la vitrine publique</label><input data-ch="siteUrl" value="${esc(state.settings.siteUrl||'')}" placeholder="https://monsite.fr/collection/"></div>`:''}
 </div>
 <div class="actions" style="margin-top:12px;gap:18px">${ck('year','Date')}${ck('metal','Métal, poids, diamètre')}${ck('grade','État')}${ck('ref','Référence')}${ck('place','Atelier')}${ck('slot','N° d’emplacement (contenant)')}
  <label class="chk"><input type="checkbox" data-ch="lblQr" ${LBL.qr?'checked':''}> QR code</label><label class="chk"><input type="checkbox" data-ch="lblCut" ${LBL.cut?'checked':''}> Traits de découpe</label></div>
 ${LBL.f.year?'':`<p class="muted small" style="margin-top:8px">Sans date, une seule étiquette est imprimée par type (même pays, dénomination, métal et variété)${LBL_MERGED?` : ${pl(LBL_MERGED,'doublon regroupé','doublons regroupés')}`:''}. Le QR ouvre la fiche de la première pièce du groupe.</p>`}
 ${LBL.target==='app'&&local?`<p class="muted small" style="margin-top:8px">${ic('warn',14)} L’adresse actuelle (${esc(location.host||'fichier local')}) n’est joignable que depuis cet appareil ou ce réseau : le QR ne s’ouvrira pas ailleurs. Pour un QR utilisable partout, publiez l’application derrière un nom de domaine ou utilisez la vitrine publique.</p>`:''}</div>
 ${list.length?`<p class="muted small" style="margin:10px 0">Aperçu de la première page (${pl(Math.ceil(list.length/per),'page','pages')}, ${per} par page, à imprimer à 100 %, sans mise à l’échelle).</p><div class="lblprev">${lblSheet(list.slice(0,per),fmt)}</div>`
 :`<div class="empty glass"><b>Rien à imprimer</b><p>${LBL.src==='ctr'?'Choisissez un contenant dont des emplacements sont occupés.':LBL.src==='sel'?'Sélectionnez des pièces dans la collection (bouton Sélection) puis revenez ici.':'Ajoutez des pièces à la collection.'}</p></div>`}`;
}
function lblPrint(html){
 let el=$('#sheetprint');if(!el){el=document.createElement('div');el.id='sheetprint';document.body.appendChild(el)}
 el.innerHTML='<style>@page{size:A4;margin:8mm}</style>'+html;document.body.classList.add('printing-sheet');
 const done=()=>{document.body.classList.remove('printing-sheet');el.remove();removeEventListener('afterprint',done)};
 addEventListener('afterprint',done);setTimeout(()=>print(),80);
}
Object.assign(ACT,{
 lblPrint:()=>lblPrint(lblSheet(lblItems(),LBL_FORMATS[LBL.fmt])),
 lblOne:t=>{const it=state.items.find(i=>i.id===t.dataset.id);if(!it)return;
  const f=LBL_FORMATS[LBL.fmt];
  openModal2(`<div class="mhead"><h2>Étiquette</h2><button class="x" data-act="close2" aria-label="Fermer">${ic('x',22)}</button></div>
   <div class="lblprev" style="justify-content:center">${lblSheet([{it}],{...f,cols:1,rows:1})}</div>
   <p class="muted small" style="margin-top:8px;word-break:break-all">${esc(lblURL(it.id))}</p>
   <div class="actions end"><button class="btn" data-act="lblCopy" data-id="${it.id}">${ic('link',16)} Copier le lien</button><button class="btn primary" data-act="lblPrintOne" data-id="${it.id}">${ic('print',16)} Imprimer</button></div>`);},
 lblPrintOne:t=>{const it=state.items.find(i=>i.id===t.dataset.id);if(it)lblPrint(lblSheet([{it}],LBL_FORMATS[LBL.fmt]))},
 lblCopy:t=>{navigator.clipboard.writeText(lblURL(t.dataset.id)).then(()=>toast('Lien copié'),()=>toast('Copie impossible'))},
});
Object.assign(CH,{
 lblFmt:t=>{LBL.fmt=t.value;render()},lblSrc:t=>{LBL.src=t.value;render()},lblCtr:t=>{LBL.ctr=t.value;render()},
 lblTarget:t=>{LBL.target=t.value;render()},lblQr:t=>{LBL.qr=t.checked;render()},lblCut:t=>{LBL.cut=t.checked;render()},
 lblF:t=>{LBL.f[t.dataset.k]=t.checked;render()},
 siteUrl:t=>{state.settings.siteUrl=t.value.trim();savePrefs()},
});
/* bouton dans la fiche */
EXT.detail.push(it=>vit()?'':`<p style="margin-top:12px"><button class="btn sm" data-act="lblOne" data-id="${it.id}">${ic('qr',15)} Étiquette et QR</button></p>`);
