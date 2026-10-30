'use strict';
/* =====================================================================
   MODE MUSÉE : EXPOSITIONS VIRTUELLES
   Une exposition = des salles ordonnées, chacune avec un texte et des pièces légendées.
   Export : un fichier HTML autonome (images incluses, aucun script) à ouvrir localement ou à transmettre.
   Confidentialité : l'export ne contient QUE les champs d'identification cochés (liste blanche).
   Prix, valeurs, provenance, emplacement, notes privées, dates d'achat n'en font jamais partie.
   Les textes que vous écrivez vous-même (introduction, salles, légendes) sont exportés tels quels.
   ===================================================================== */
addModule('expos','Expositions','frame','Salles, légendes et export HTML autonome sans prix ni informations privées.',{after:'journal',view:()=>viewExpos()});
const exOf=id=>state.expos.find(e=>e.id===id);
const EX_FIELDS=[['year','Année',1],['country','Pays',1],['metal','Métal',1],['weight','Poids',0],['diameter','Diamètre',0],['mint','Atelier',0],['grade','État',0],['rarity','Rareté',0]];
const exCount=e=>e.rooms.reduce((n,r)=>n+r.items.length,0);
function viewExpos(){
 if(view.startsWith('expos:')){const e=exOf(view.slice(6));if(e)return viewExpoEdit(e)}
 const l=state.expos;
 return `<header class="head"><div><h1>Expositions</h1><p class="sub">Composez des présentations thématiques : « L’évolution du franc », « Monnaies de mes voyages »… puis exportez-les en page HTML à consulter hors ligne.</p></div><div class="actions"><button class="btn primary" data-act="exNew">${ic('plus')} Nouvelle exposition</button></div></header>
 ${l.length?`<div class="modgrid">${l.map(e=>`<button class="mcard glass" data-act="nav" data-v="expos:${e.id}"><h3>${ic('frame',18)} ${esc(e.title)}</h3><span class="meta">${pl(e.rooms.length,'salle','salles')} · ${pl(exCount(e),'pièce','pièces')}</span>${e.intro?`<span class="small muted">${esc(e.intro.slice(0,110))}${e.intro.length>110?'…':''}</span>`:''}</button>`).join('')}</div>`
 :`<div class="empty glass"><b>Aucune exposition</b><p>Créez une exposition, ajoutez des salles puis les pièces à présenter.</p><button class="btn primary" data-act="exNew">${ic('plus')} Créer une exposition</button></div>`}`;
}
function viewExpoEdit(e){
 const o=e.opts||{};
 return `<header class="head"><div><p class="muted small"><button class="btn sm" data-act="nav" data-v="expos">← Expositions</button></p><h1>${esc(e.title)}</h1>${e.intro?`<p class="sub">${esc(e.intro)}</p>`:''}</div>
 <div class="actions"><button class="btn" data-act="exMeta" data-id="${e.id}">${ic('edit',16)} Titre et texte</button><button class="btn" data-act="exPreview" data-id="${e.id}">${ic('eye',16)} Aperçu</button><button class="btn primary" data-act="exExport" data-id="${e.id}">${ic('download',16)} Exporter en HTML</button><button class="btn danger" data-act="exDel" data-id="${e.id}">${ic('trash',16)}</button></div></header>
 <div class="notice">${ic('shield',18)}<span><b>Confidentialité de l’export.</b> Sont repris, si cochés : ${EX_FIELDS.map(f=>`<label class="chk" style="display:inline-flex;margin:0 8px 0 0"><input type="checkbox" data-ch="exOpt" data-id="${e.id}" data-k="${f[0]}" ${(o[f[0]]??f[2])?'checked':''}> ${f[1]}</label>`).join('')}<label class="chk" style="display:inline-flex;margin:0 8px 0 0"><input type="checkbox" data-ch="exOpt" data-id="${e.id}" data-k="back" ${o.back!==false?'checked':''}> Revers</label>. Jamais exportés : valeurs, prix payés, provenance, emplacement, notes, dates d’achat. Vos propres textes (salles, légendes) sont repris tels quels.</span></div>
 ${e.rooms.map((r,ri)=>`<section class="exroom glass"><div class="head" style="margin-bottom:8px"><div><h3>Salle ${ri+1} — ${esc(r.title)}</h3>${r.text?`<p class="sub small">${esc(r.text)}</p>`:''}</div><div class="actions"><button class="btn sm" data-act="exAddItems" data-id="${e.id}" data-r="${r.id}">${ic('plus',14)} Pièces</button><button class="btn sm" data-act="exRoomEdit" data-id="${e.id}" data-r="${r.id}">${ic('edit',14)}</button><button class="btn sm" data-act="exRoomUp" data-id="${e.id}" data-r="${r.id}" aria-label="Monter">${ic('up',14)}</button><button class="btn sm" data-act="exRoomDown" data-id="${e.id}" data-r="${r.id}" aria-label="Descendre">${ic('down',14)}</button><button class="btn sm danger" data-act="exRoomDel" data-id="${e.id}" data-r="${r.id}">${ic('trash',14)}</button></div></div>
  ${r.items.map((x,xi)=>{const it=state.items.find(i=>i.id===x.id);if(!it)return'';return `<div class="exrow"><span class="mini">${thumb(it,18)}</span><span><b>${esc(it.denomination)}</b> <span class="muted small">${esc(subtitle(it))}</span><br><input class="excap" data-ch="exCap" data-id="${e.id}" data-r="${r.id}" data-x="${xi}" value="${esc(x.caption||'')}" placeholder="Légende (facultative)" aria-label="Légende"></span><span><button class="btn sm" data-act="exItemUp" data-id="${e.id}" data-r="${r.id}" data-x="${xi}" aria-label="Monter">${ic('up',14)}</button><button class="btn sm" data-act="exItemDown" data-id="${e.id}" data-r="${r.id}" data-x="${xi}" aria-label="Descendre">${ic('down',14)}</button><button class="btn sm danger" data-act="exItemDel" data-id="${e.id}" data-r="${r.id}" data-x="${xi}" aria-label="Retirer">${ic('x',14)}</button></span></div>`}).join('')||'<p class="muted small">Salle vide.</p>'}</section>`).join('')}
 <button class="btn" data-act="exRoomNew" data-id="${e.id}">${ic('plus',16)} Ajouter une salle</button>`;
}
const move=(a,i,d)=>{const j=i+d;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]]};
const exRoom=(t)=>{const e=exOf(t.dataset.id);return[e,e&&e.rooms.find(r=>r.id===t.dataset.r)]};
Object.assign(ACT,{
 exNew:()=>promptModal('Nouvelle exposition',`<div class="fgrid"><div class="fld wide"><label>Titre</label><input id="ex_t" required placeholder="L’évolution du franc"></div><div class="fld wide"><label>Texte d’introduction</label><textarea id="ex_i" rows="4"></textarea></div></div>`,'exOk','Créer'),
 exMeta:t=>{const e=exOf(t.dataset.id);promptModal('Titre et introduction',`<div class="fgrid"><div class="fld wide"><label>Titre</label><input id="ex_t" required value="${esc(e.title)}"></div><div class="fld wide"><label>Texte d’introduction</label><textarea id="ex_i" rows="4">${esc(e.intro||'')}</textarea></div></div>`,'exOk','Enregistrer',`data-id="${e.id}"`)},
 exDel:t=>{const e=exOf(t.dataset.id);if(!e||!confirm(`Supprimer l’exposition « ${e.title} » ? Vos pièces ne sont pas touchées.`))return;state.expos=state.expos.filter(x=>x!==e);savePrefs();go('expos')},
 exRoomNew:t=>promptModal('Nouvelle salle',`<div class="fgrid"><div class="fld wide"><label>Titre</label><input id="er_t" required placeholder="La Révolution"></div><div class="fld wide"><label>Texte de la salle</label><textarea id="er_x" rows="4"></textarea></div></div>`,'roomOk','Ajouter',`data-id="${t.dataset.id}"`),
 exRoomEdit:t=>{const[e,r]=exRoom(t);promptModal('Modifier la salle',`<div class="fgrid"><div class="fld wide"><label>Titre</label><input id="er_t" required value="${esc(r.title)}"></div><div class="fld wide"><label>Texte de la salle</label><textarea id="er_x" rows="4">${esc(r.text||'')}</textarea></div></div>`,'roomOk','Enregistrer',`data-id="${e.id}" data-r="${r.id}"`)},
 exRoomDel:t=>{const[e,r]=exRoom(t);if(!confirm(`Supprimer la salle « ${r.title} » ?`))return;e.rooms=e.rooms.filter(x=>x!==r);savePrefs();render()},
 exRoomUp:t=>{const[e,r]=exRoom(t);move(e.rooms,e.rooms.indexOf(r),-1);savePrefs();render()},exRoomDown:t=>{const[e,r]=exRoom(t);move(e.rooms,e.rooms.indexOf(r),1);savePrefs();render()},
 exItemUp:t=>{const[e,r]=exRoom(t);move(r.items,+t.dataset.x,-1);savePrefs();render()},exItemDown:t=>{const[e,r]=exRoom(t);move(r.items,+t.dataset.x,1);savePrefs();render()},
 exItemDel:t=>{const[e,r]=exRoom(t);r.items.splice(+t.dataset.x,1);savePrefs();render()},
 exAddItems:t=>{const[e,r]=exRoom(t);EXP.e=e.id;EXP.r=r.id;EXP.q='';
  openModal(`<div class="mhead"><h2>Pièces de la salle « ${esc(r.title)} »</h2><button class="x" data-act="close" aria-label="Fermer">${ic('x',22)}</button></div><label class="search" style="margin-bottom:10px">${ic('search')}<input id="exp_q" placeholder="Rechercher…" autocomplete="off"></label><div id="exp_l" class="rows glass" style="max-height:50vh;overflow:auto"></div><div class="actions end"><button class="btn primary" data-act="exPickDone">Terminé</button></div>`,true);
  drawExPick();$('#exp_q').addEventListener('input',ev=>{EXP.q=ev.target.value;drawExPick()})},
 exPickDone:()=>{closeModal();render()},
 exPick:t=>{const e=exOf(EXP.e),r=e.rooms.find(x=>x.id===EXP.r),i=r.items.findIndex(x=>x.id===t.dataset.id);if(i>=0)r.items.splice(i,1);else r.items.push({id:t.dataset.id,caption:''});savePrefs();drawExPick()},
 exPreview:t=>{const e=exOf(t.dataset.id);buildExpo(e).then(h=>openModal(`<div class="mhead"><h2>Aperçu — ${esc(e.title)}</h2><button class="x" data-act="close" aria-label="Fermer">${ic('x',22)}</button></div><iframe sandbox title="Aperçu" style="width:100%;height:70vh;border:1px solid var(--border);border-radius:12px;background:#fff" srcdoc="${h.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"></iframe>`,true))},
 exExport:async t=>{const e=exOf(t.dataset.id);const h=await buildExpo(e);download(`exposition-${slug(e.title)}.html`,h,'text/html');toast('Exposition exportée : un fichier HTML autonome')},
});
const EXP={e:null,r:null,q:''};
function drawExPick(){
 const el=$('#exp_l');if(!el)return;const e=exOf(EXP.e),r=e.rooms.find(x=>x.id===EXP.r),f=EXP.q?compileQuery(EXP.q):()=>true,inR=new Set(r.items.map(x=>x.id));
 el.innerHTML=state.items.filter(i=>i.status!=='wish'&&f(i)).sort((a,b)=>inR.has(b.id)-inR.has(a.id)).slice(0,80).map(i=>`<label class="row" style="grid-template-columns:28px 40px 1fr"><input type="checkbox" data-act="exPick" data-id="${i.id}" ${inR.has(i.id)?'checked':''}><span class="mini">${thumb(i,16)}</span><span><b>${esc(i.denomination)}</b> <span class="muted small">${esc(subtitle(i))}</span></span></label>`).join('')||'<p class="muted" style="padding:10px">Aucun résultat.</p>';
}
Object.assign(CH,{
 exOpt:t=>{const e=exOf(t.dataset.id);(e.opts=e.opts||{})[t.dataset.k]=t.checked;savePrefs()},
 exCap:t=>{const[e,r]=exRoom(t);r.items[+t.dataset.x].caption=t.value;savePrefs()},
});
SUBMIT.exOk=f=>{const t=$('#ex_t').value.trim();if(!t)return;
 if(f.dataset.id){const e=exOf(f.dataset.id);e.title=t;e.intro=$('#ex_i').value.trim();savePrefs();closeModal();render();return}
 const e={id:uid(),title:t,intro:$('#ex_i').value.trim(),created:Date.now(),rooms:[],opts:{}};state.expos.push(e);savePrefs();closeModal();go('expos:'+e.id)};
SUBMIT.roomOk=f=>{const e=exOf(f.dataset.id),t=$('#er_t').value.trim();if(!e||!t)return;
 if(f.dataset.r){const r=e.rooms.find(x=>x.id===f.dataset.r);r.title=t;r.text=$('#er_x').value.trim()}else e.rooms.push({id:uid(),title:t,text:$('#er_x').value.trim(),items:[]});
 savePrefs();closeModal();render()};
/* ---------- génération du HTML autonome ---------- */
const exTxt=s=>String(s||'').split(/\n{2,}/).map(p=>`<p>${esc(p).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>')}</p>`).join('');
async function exImages(it,withBack){
 const ims=it.imgs||[],fr=ims.find(x=>x.role==='front')||ims[0],bk=withBack?ims.find(x=>x.role==='back'&&x!==fr):null;
 const one=async m=>{if(!m)return'';try{const b=await Store.images.get(state.userId,m.id);if(b&&b.size<1.5e6)return await blobToData(b)}catch(e){}return''};
 return{front:(await one(fr))||it.cover||'',back:await one(bk)};
}
async function buildExpo(e){
 const o=e.opts||{},on=k=>o[k]??EX_FIELDS.find(f=>f[0]===k)[2];
 const facts=it=>{const a=[];
  if(on('country')&&it.country)a.push(cname(it.country));if(on('year')&&hasYear(it))a.push(fmtYear(it.year));if(on('metal')&&it.metal)a.push(it.metal);
  if(on('weight')&&!isEmpty(it.weight))a.push(it.weight+' g');if(on('diameter')&&!isEmpty(it.diameter))a.push(it.diameter+' mm');if(on('mint')&&it.mint)a.push('atelier '+it.mint);
  if(on('grade')&&it.grade)a.push(it.grade);if(on('rarity')&&it.rarity)a.push('rareté '+it.rarity);return a.join(' · ')};
 let rooms='';
 for(const r of e.rooms){
  let figs='';
  for(const x of r.items){const it=state.items.find(i=>i.id===x.id);if(!it)continue;const im=await exImages(it,o.back!==false);
   const pic=im.front?`<div class="duo${im.back?'':' solo'}"><img src="${im.front}" alt="${esc(it.denomination)} — avers">${im.back?`<img src="${im.back}" alt="${esc(it.denomination)} — revers">`:''}</div>`:'<div class="ph"></div>';
   figs+=`<figure>${pic}<figcaption><b>${esc(it.denomination)}</b><span>${esc(facts(it))}</span>${x.caption?`<em>${esc(x.caption)}</em>`:''}</figcaption></figure>`}
  rooms+=`<section id="r${r.id}"><h2>${esc(r.title)}</h2>${exTxt(r.text)}<div class="wall">${figs}</div></section>`;
 }
 return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(e.title)}</title>
<style>:root{color-scheme:light dark;--bg:#f6f3ee;--fg:#1d1b18;--mut:#6b655c;--card:#fffdf9;--line:#dcd5c9;--acc:#7a5c2e}@media(prefers-color-scheme:dark){:root{--bg:#14120f;--fg:#efe9df;--mut:#a39a8b;--card:#1d1a16;--line:#2f2a23;--acc:#d3b074}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:17px/1.6 Georgia,'Times New Roman',serif}header{padding:12vh 8vw 6vh;max-width:980px;margin:auto}h1{font-size:clamp(34px,6vw,64px);line-height:1.05;margin:0 0 .4em;letter-spacing:-.02em}header p{color:var(--mut);max-width:60ch}nav{max-width:980px;margin:0 auto 4vh;padding:0 8vw;display:flex;gap:10px;flex-wrap:wrap;font:14px system-ui,sans-serif}nav a{color:var(--acc);text-decoration:none;border:1px solid var(--line);border-radius:20px;padding:4px 12px}
section{max-width:1100px;margin:0 auto;padding:6vh 8vw;border-top:1px solid var(--line)}h2{font-size:28px;margin:0 0 .3em}section>p{color:var(--mut);max-width:62ch}.wall{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:26px;margin-top:28px}
figure{margin:0;background:var(--card);border:1px solid var(--line);border-radius:6px;padding:14px;display:flex;flex-direction:column;gap:10px}figure img,.ph{width:100%;aspect-ratio:1/1;object-fit:contain;background:#00000008;border-radius:4px}figcaption{font:14px/1.45 system-ui,sans-serif;display:flex;flex-direction:column;gap:3px}figcaption b{font:600 15px Georgia,serif}figcaption span{color:var(--mut)}figcaption em{font-family:Georgia,serif;font-style:italic;margin-top:4px}@media(max-width:560px){.wall{grid-template-columns:1fr}}.duo{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:10px 4px 2px}.duo.solo{grid-template-columns:1fr}.duo img{background:none;filter:drop-shadow(0 6px 10px rgba(0,0,0,.28))}footer{text-align:center;color:var(--mut);font:13px system-ui,sans-serif;padding:6vh 0}</style></head><body>
<header><h1>${esc(e.title)}</h1>${exTxt(e.intro)}</header>${e.rooms.length>1?`<nav>${e.rooms.map(r=>`<a href="#r${r.id}">${esc(r.title)}</a>`).join('')}</nav>`:''}${rooms}<footer>Exposition générée avec Nummus — ${esc(dateFR(Date.now()))}</footer></body></html>`;
}
