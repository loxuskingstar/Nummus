'use strict';
/* =====================================================================
   MISES EN PAGE D'IMPRESSION SUPPLÉMENTAIRES (fenêtre « Imprimer ou exporter en PDF »)
   · Dossier assurance / succession : une fiche par pièce avec photos, prix payé, valeur estimée, emplacement, documents
     joints, totaux et lignes de signature. Valeurs et emplacements y sont visibles : à ne pas diffuser.
   · Livre / catalogue d'art : page de garde, sommaire par pays et époque (liens internes), fiches grand format,
     index alphabétique et glossaire. Le PDF s'obtient par « Enregistrer au format PDF » dans la fenêtre d'impression.
   ===================================================================== */
PRINT_LAYOUTS.push(['dossier','Dossier assurance / succession'],['book','Livre / catalogue d’art']);
const PRINT_DESC={table:'Une ligne par pièce, avec photos réduites.',dossier:'Une fiche par pièce avec photos, prix payé, valeur, emplacement, documents joints, totaux et signatures. À conserver en lieu sûr.',book:'Page de garde, sommaire par pays et époque, fiches grand format avec photos, index alphabétique et glossaire.'};
CH.printLayout=t=>{
 const v=t.value,set=(id,on)=>{const e=$('#'+id);if(e&&!e.disabled)e.checked=on};
 $('#p_ld').textContent=PRINT_DESC[v]||'';
 if(v==='dossier'){['p_ph','p_va','p_pa','p_st'].forEach(i=>set(i,true));set('p_no',false);$('#p_t').value='Dossier d’assurance et de succession'}
 else if(v==='book'){set('p_ph',true);set('p_de',true);['p_va','p_pa','p_st','p_no'].forEach(i=>set(i,false));$('#p_t').value='Catalogue de collection'}
 else $('#p_t').value='Inventaire de collection numismatique';
};
const bkDate=()=>new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
async function hdOf(blob,max=1000){const u=URL.createObjectURL(blob);try{const im=await loadImage(u),c=scaled(toCanvas(im,max),max);return c.toDataURL('image/jpeg',.85)}finally{URL.revokeObjectURL(u)}}
async function printPrep(items,o){
 for(const i of items){
  const f=(i.imgs||[]).find(m=>m.role==='front'),b=(i.imgs||[]).find(m=>m.role==='back'),max=o.layout==='book'?1000:600;
  const g=async m=>m?Store.images.get(state.userId,m.id).then(x=>x&&hdOf(x,max)).catch(()=>''):'';
  i._f=(await g(f))||i.cover||'';i._b=await g(b);
 }
}
PRINT_PREP.dossier=PRINT_PREP.book=printPrep;
const bkFacts=i=>[i.metal,!isEmpty(i.fineness)?i.fineness+' ‰':'',!isEmpty(i.weight)?i.weight+' g':'',!isEmpty(i.diameter)?i.diameter+' mm':'',i.size?i.size+' mm':'',i.grade?'État : '+i.grade:'',i.mint,i.catalog,i.numista?'N# '+i.numista:'',i.certified,i.serial?'N° '+i.serial:'',i.variety].filter(x=>!isEmpty(x));

/* ---------- dossier assurance / succession ---------- */
PRINTERS.dossier=(items,o)=>{
 const own=items.filter(i=>i.status!=='wish'),ex=own.reduce((s,i)=>s+qtyOf(i),0),val=own.reduce((s,i)=>s+(+i.value||0)*qtyOf(i),0),paid=own.reduce((s,i)=>s+(+i.paid||0),0);
 const img=s=>s?`<img src="${esc(s)}" alt="">`:'';
 const blocks=own.map((i,k)=>`<section class="ds-item"><div class="ds-head"><b>${k+1}. ${esc(i.denomination)}</b><span>${esc([cname(i.country)||i.issuer,yearSpan(i)].filter(Boolean).join(', '))}${qtyOf(i)>1?` · ${qtyOf(i)} exemplaires`:''}</span></div>
  <div class="ds-body">${o.photos?`<div class="ds-ph">${img(i._f)}${img(i._b)}</div>`:''}<div class="ds-tx"><p>${esc(bkFacts(i).join(' · '))||'<i>Aucune caractéristique renseignée</i>'}</p>
  <table class="ds-t">${o.paid&&!isEmpty(i.paid)?`<tr><th>Prix payé</th><td>${fmtMoney(i.paid)}${i.acquired?' le '+esc(new Date(i.acquired).toLocaleDateString('fr-FR')):''}${i.source?', '+esc(i.source):''}</td></tr>`:''}${o.values&&!isEmpty(i.value)?`<tr><th>Valeur estimée</th><td>${fmtMoney(i.value)}${qtyOf(i)>1?' l’unité':''}</td></tr>`:''}${o.storage&&i.storage?`<tr><th>Emplacement</th><td>${esc(normPath(i.storage))}</td></tr>`:''}${(i.docs||[]).length?`<tr><th>Documents joints</th><td>${i.docs.map(d=>esc(d.name)).join(', ')}</td></tr>`:''}</table>${o.notes&&i.notes?`<p class="p-note">${md(i.notes)}</p>`:''}</div></div></section>`).join('');
 return `<h1>${esc(o.title)}</h1><p class="p-sub">${o.owner?esc(o.owner)+' — ':''}Établi le ${esc(bkDate())}</p>
 <table class="ds-sum"><tr><th>Entrées</th><td>${own.length}</td><th>Exemplaires</th><td>${ex}</td></tr><tr>${o.values?`<th>Valeur estimée totale</th><td>${fmtMoney(val)}</td>`:'<th></th><td></td>'}${o.paid?`<th>Total payé</th><td>${fmtMoney(paid)}</td>`:'<th></th><td></td>'}</tr></table>
 ${blocks}
 <div class="ds-sign"><div>Fait à ………………………………, le ………………………</div><div>Signature : <span class="line"></span></div></div>
 <p class="p-foot">Document généré par Nummus. Les valeurs sont des estimations personnelles du collectionneur et ne constituent pas une expertise. Conservez les originaux des factures et certificats mentionnés.</p>`;
};

/* ---------- livre / catalogue d'art ---------- */
const bkEra=i=>{if(!hasYear(i))return'Sans date';const y=+i.year;return y<476?'Antiquité':y<1492?'Moyen Âge':y<1789?'Temps modernes':y<1914?'XIXe siècle':'XXe siècle et après'};
PRINTERS.book=(items,o)=>{
 const own=items.filter(i=>i.status!=='wish'),img=s=>s?`<img src="${esc(s)}" alt="">`:'';
 const by=new Map();own.forEach(i=>{const c=cname(i.country)||i.issuer||'Origine inconnue';(by.get(c)||by.set(c,[]).get(c)).push(i)});
 const sections=[...by].sort((a,b)=>a[0].localeCompare(b[0],'fr'));
 const slug=s=>'bk-'+norm(s).replace(/[^a-z0-9]+/g,'-');
 const cover=own.find(i=>i._f);
 const toc=sections.map(([c,l])=>{const eras=[...new Set(l.sort((a,b)=>(+a.year||0)-(+b.year||0)).map(bkEra))];return `<li><a href="#${slug(c)}">${esc(c)}</a> <span class="bk-dots"></span> <small>${pl(l.length,'pièce','pièces')} · ${esc(eras.join(', '))}</small></li>`}).join('');
 const card=i=>`<article class="bk-card"><div class="bk-ph">${img(i._f)}${img(i._b)}</div><div class="bk-tx"><h3>${esc(i.denomination)}</h3><p class="bk-sub">${esc([yearSpan(i),i.attribution,i.issuer].filter(Boolean).join(' · '))}</p><p>${esc(bkFacts(i).join(' · '))}</p>${o.desc&&i.obverse?`<p><b>Avers.</b> ${esc(i.obverse)}</p>`:''}${o.desc&&i.reverse?`<p><b>Revers.</b> ${esc(i.reverse)}</p>`:''}${i.ruler?`<p><b>Souverain.</b> ${esc(i.ruler)}${i.dynasty?' ('+esc(i.dynasty)+')':''}</p>`:''}${o.notes&&i.notes?`<p class="p-note">${md(i.notes)}</p>`:''}</div></article>`;
 const body=sections.map(([c,l])=>`<section class="bk-sec" id="${slug(c)}"><h2>${esc(c)}</h2>${l.sort((a,b)=>(+a.year||0)-(+b.year||0)).map(card).join('')}</section>`).join('');
 const idx=[...own].sort((a,b)=>String(a.denomination).localeCompare(String(b.denomination),'fr',{numeric:true})).map(i=>`<li>${esc(i.denomination)} <span class="muted">${esc([cname(i.country)||i.issuer,yearSpan(i)].filter(Boolean).join(', '))}</span></li>`).join('');
 const txt=norm(own.map(i=>[i.denomination,i.metal,i.grade,i.mint,i.obverse,i.reverse,i.variety,i.notes].join(' ')).join(' '));
 const gl=GLOSS.filter(g=>txt.includes(norm(g[0]))).sort((a,b)=>a[0].localeCompare(b[0],'fr'));
 return `<section class="bk-cover"><div>${cover?`<div class="bk-cimg">${img(cover._f)}</div>`:''}<h1>${esc(o.title)}</h1>${o.owner?`<p class="bk-owner">${esc(o.owner)}</p>`:''}<p class="p-sub">${pl(own.length,'pièce','pièces')} · ${pl(sections.length,'pays ou origine','pays ou origines')} · ${esc(bkDate())}</p></div></section>
 <section class="bk-sec"><h2>Sommaire</h2><ol class="bk-toc">${toc}</ol></section>${body}
 <section class="bk-sec"><h2>Index</h2><ul class="bk-idx">${idx}</ul></section>
 ${gl.length?`<section class="bk-sec"><h2>Glossaire</h2><dl class="bk-gl">${gl.map(([a,b])=>`<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl></section>`:''}`;
};
