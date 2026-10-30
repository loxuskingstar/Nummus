'use strict';
/* =====================================================================
   PIÈCES JOINTES (factures, certificats, expertises) : PDF ou images, rattachés à la fiche (it.docs).
   Les fichiers vivent dans le même magasin binaire que les photos, donc dans les sauvegardes et l'export JSON.
   Jamais visibles en mode vitrine.
   ===================================================================== */
const DOC_MAX=15*1024*1024,DOC_OK=/^(application\/pdf|image\/(jpeg|png|webp|gif|avif))$/;
const docIcon=d=>/pdf/i.test(d.type||'')||/\.pdf$/i.test(d.name||'')?'file':'camera';
EXT.detail.push(it=>{
 if(vit())return'';
 const l=it.docs||[];
 return `<section class="docs" style="margin-top:14px"><h3 style="font-size:.95rem;margin:0 0 6px">Documents joints</h3>
 ${l.map(d=>`<div class="exrow"><span>${ic(docIcon(d),16)} <b>${esc(d.name)}</b> <span class="muted small">${d.size?Math.max(1,Math.round(d.size/1024))+' Ko':''}</span></span><span><button class="btn sm" data-act="docOpen" data-doc="${d.id}">Ouvrir</button> <button class="btn sm danger" data-act="docDel" data-id="${it.id}" data-doc="${d.id}" aria-label="Retirer">${ic('x',14)}</button></span></div>`).join('')||'<p class="muted small" style="margin:0 0 6px">Facture d’achat, certificat d’authenticité, expertise : utiles pour la provenance et l’assurance.</p>'}
 <label class="btn sm" style="cursor:pointer">${ic('plus',14)} Joindre un PDF ou une image<input type="file" accept="application/pdf,image/*" hidden multiple data-ch="docAdd" data-id="${it.id}"></label></section>`;
});
CH.docAdd=async t=>{
 const it=state.items.find(i=>i.id===t.dataset.id);if(!it)return;let n=0;const docs=[...(it.docs||[])];
 for(const f of t.files){
  if(!DOC_OK.test(f.type)){toast(`« ${f.name} » : seuls les PDF et les images sont acceptés`);continue}
  if(f.size>DOC_MAX){toast(`« ${f.name} » dépasse 15 Mo`);continue}
  const id='d_'+uid();try{await Store.images.put(state.userId,id,f);docs.push({id,name:f.name.slice(0,120),type:f.type,size:f.size,added:Date.now()});n++}catch(e){toast('Envoi impossible : '+(e.message||e))}
 }
 t.value='';if(n){await putItems([{...it,docs,updated:Date.now()}]);toast(pl(n,'document joint','documents joints'));openDetail(it.id)}
};
Object.assign(ACT,{
 docOpen:async t=>{const u=await imgURL(t.dataset.doc);if(u)window.open(u,'_blank','noopener');else toast('Fichier introuvable')},
 docDel:async t=>{
  const it=state.items.find(i=>i.id===t.dataset.id);if(!it||!confirm('Retirer ce document de la fiche ?'))return;
  await putItems([{...it,docs:(it.docs||[]).filter(d=>d.id!==t.dataset.doc),updated:Date.now()}]);forgetImg(t.dataset.doc);
  Store.images.bulkDelete(state.userId,[t.dataset.doc]).catch(()=>{});openDetail(it.id);
 },
});
