'use strict';
/* =====================================================================
   RECHERCHE ÉCLAIR (bourse)
   Une seule zone de saisie : « 20 francs 1951 », « denier auguste », « 2 euros 2015 monaco ».
   Répond en un coup d'œil : déjà en collection (combien), en double, dans la wishlist ou absente.
   Fonctionne hors ligne (données locales + application installée), sans aucun appel réseau.
   ===================================================================== */
addModule('quick','Recherche éclair','bolt','Vérifier en deux secondes, en bourse, si une pièce est déjà dans la collection ou la wishlist.',{after:'wishlist',view:()=>viewQuick(),after_:()=>{const q=$('#qk_q');if(q){q.focus();if(q.value)qkRun(q.value)}}});
const QK={q:''};
function qkParse(text){
 const m=String(text).match(/(^|\s)(-?\d{3,4})(?=\s|$)/g),year=m?+m[m.length-1].trim():null;
 const rest=norm(String(text).replace(m?m[m.length-1]:'',' ')).split(/\s+/).filter(Boolean);
 return{year,tokens:rest};
}
function qkMatches(text){
 const{year,tokens}=qkParse(text);
 if(!tokens.length&&year===null)return[];
 return pool().filter(i=>{
  if(year!==null&&!(hasYear(i)&&(+i.year===year||(!isEmpty(i.yearEnd)&&year>=+i.year&&year<=+i.yearEnd))))return false;
  if(!tokens.length)return true;
  const s=searchText(i);return tokens.every(t=>s.includes(t));
 });
}
function qkVerdict(list){
 const own=list.filter(i=>i.status!=='wish'),wish=list.filter(i=>i.status==='wish'),n=own.reduce((s,i)=>s+qtyOf(i),0);
 if(own.length&&n>1)return{cls:'ok',t:`Déjà en collection : ${n} exemplaires`,sub:'Vous en avez déjà plusieurs — inutile d’en reprendre sauf variété ou état différent.'};
 if(own.length)return{cls:'ok',t:'Déjà en collection : 1 exemplaire',sub:'Comparez l’état et la variété avant d’acheter un second exemplaire.'};
 if(wish.length)return{cls:'wish',t:'Dans votre wishlist',sub:wish[0].target?`Prix maximal fixé : ${fmtMoney(wish[0].target)}`:'Pas de prix maximal fixé.'};
 return{cls:'none',t:'Absente de la collection',sub:'Aucune fiche ne correspond. Si la saisie est très courte, précisez l’année ou le pays.'};
}
function qkRun(text){
 QK.q=text;const el=$('#qk_res');if(!el)return;
 if(!text.trim()){el.innerHTML='<p class="muted">Saisissez une dénomination, éventuellement suivie d’une année ou d’un pays.</p>';return}
 const list=qkMatches(text),v=qkVerdict(list),{year,tokens}=qkParse(text);
 const hits=list.slice(0,8).map(i=>`<div class="row" data-act="open" data-id="${i.id}" tabindex="0"><span class="mini">${thumb(i,18)}</span><span class="rt"><b>${esc(i.denomination)}</b><small class="muted">${esc(subtitle(i))}${i.grade?' · '+esc(i.grade):''}${i.mint?' · '+esc(i.mint):''}</small></span><span class="muted small">${i.status==='wish'?'souhait':'×'+qtyOf(i)}</span></div>`).join('');
 const near=!list.length&&tokens.length?ddFind({denomination:tokens.join(' '),year},55).slice(0,3):[];
 el.innerHTML=`<div class="qkv ${v.cls}"><b>${esc(v.t)}</b><span>${esc(v.sub)}</span></div>
  ${list.length?`<div class="panel glass wl" style="margin-top:12px">${hits}${list.length>8?`<p class="muted small" style="padding:8px">… et ${list.length-8} autres. Précisez la recherche.</p>`:''}</div>`:''}
  ${near.length?`<p class="muted small" style="margin-top:12px">Fiches proches : ${near.map(h=>`<button class="link" data-act="open" data-id="${h.it.id}">${esc(h.it.denomination)} ${esc(fmtYear(h.it.year))}</button>`).join(', ')}</p>`:''}
  ${vit()?'':`<div class="actions" style="margin-top:14px"><button class="btn primary" data-act="qkAdd" data-s="owned">${ic('plus',16)} Ajouter à la collection</button><button class="btn" data-act="qkAdd" data-s="wish">${ic('star',16)} Ajouter à la wishlist</button></div>`}`;
}
function viewQuick(){
 return `<header class="head"><div><h1>Recherche éclair</h1><p class="sub">Tapez ce que vous avez devant vous. Aucune connexion nécessaire.</p></div></header>
 <label class="search qkbig">${ic('search')}<input id="qk_q" value="${esc(QK.q)}" placeholder="ex. 20 francs 1951, denier auguste, 2 euros 2015 monaco" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="search"></label>
 <div id="qk_res" style="margin-top:14px"></div>`;
}
document.addEventListener('input',e=>{if(e.target.id==='qk_q')qkRun(e.target.value)});
Object.assign(ACT,{
 quickOpen:()=>go('quick'),
 qkAdd:t=>{const{year,tokens}=qkParse(QK.q);openForm(null,{status:t.dataset.s,denomination:tokens.join(' ').replace(/\b\w/g,c=>c.toUpperCase()),year:year===null?undefined:year})},
});
