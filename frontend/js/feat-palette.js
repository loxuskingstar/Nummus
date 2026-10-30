'use strict';
/* =====================================================================
   PALETTE DE COMMANDES (Ctrl+K / ⌘K) : aller à une page, lancer une action, retrouver une fiche, un catalogue ou un
   dossier en tapant quelques lettres. Et réglage « Interface simple / avancée » (voir SIMPLE_HIDE dans shell.js).
   ===================================================================== */
const PALT={q:'',i:0,list:[]};
function palCommands(){
 const c=[],al=NAV.filter(navAllowed);
 groupedNav().forEach(([g,l])=>l.forEach(n=>c.push({t:n[1],s:g[1],ic:n[2],run:()=>go(n[0])})));
 al.filter(n=>PRIMARY.includes(n[0])||n[0]==='settings').forEach(n=>c.push({t:n[1],s:'Aller à',ic:n[2],run:()=>go(n[0])}));
 if(!vit()){
  c.push({t:'Ajouter une pièce ou un billet',s:'Action',ic:'plus',run:()=>ACT.add({dataset:{status:'owned'}}),k:'nouveau creer ajouter'},
   {t:'Ajouter à la wishlist',s:'Action',ic:'star',run:()=>ACT.add({dataset:{status:'wish'}}),k:'souhait'},
   {t:'Imprimer / exporter en PDF',s:'Action',ic:'print',run:()=>ACT.print(),k:'inventaire assurance'},
   {t:'Exporter la collection (JSON)',s:'Action',ic:'download',run:()=>exportJSON(),k:'sauvegarde backup'},
   {t:'Exporter en CSV',s:'Action',ic:'download',run:()=>exportCSV()},
   {t:'Mode vitrine',s:'Action',ic:'eye',run:()=>ACT.vitOn()});
  state.catalogs.forEach(k=>c.push({t:k.name,s:'Catalogue',ic:'book',run:()=>go('cat:'+k.id)}));
  state.folders.forEach(f=>c.push({t:f.name,s:'Dossier intelligent',ic:'folder',run:()=>go('folder:'+f.id)}));
 }
 c.push({t:'Basculer thème clair / sombre',s:'Action',ic:'sun',run:()=>{state.settings.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';savePrefs();applyTheme()},k:'dark light apparence'},
  {t:state.settings.simple?'Passer en interface avancée':'Passer en interface simple',s:'Action',ic:'sliders',run:()=>ACT.simpleToggle(),k:'modules menu'});
 return c;
}
function palSearch(q){
 const nq=norm(q.trim()),cmds=palCommands(),res=[];
 const score=(txt,k)=>{const a=norm(txt+' '+(k||''));if(!nq)return 1;if(norm(txt).startsWith(nq))return 3;if(a.split(/\s+/).some(w=>w.startsWith(nq)))return 2;return nq.split(/\s+/).every(w=>a.includes(w))?1:0};
 cmds.map(x=>[x,score(x.t,x.k+' '+x.s)]).filter(x=>x[1]).sort((a,b)=>b[1]-a[1]).slice(0,nq?7:12).forEach(([x])=>res.push(x));
 if(nq.length>=2){
  pool().map(i=>[i,[i.denomination,cname(i.country),i.year,i.catalog,i.numista,i.mint,i.metal,i.variety].map(x=>norm(String(x??''))).join(' ')])
   .filter(([,a])=>nq.split(/\s+/).every(w=>a.includes(w))).slice(0,8)
   .forEach(([i])=>res.push({t:i.denomination,s:[cname(i.country),fmtYear(i.year)].filter(Boolean).join(', ')||'Fiche',ic:i.type==='note'?'note':'coin',run:()=>openDetail(i.id),item:true}));
 }
 return res;
}
function palDraw(){
 const el=$('#palette');if(!el)return;PALT.list=palSearch(PALT.q);PALT.i=Math.min(PALT.i,Math.max(0,PALT.list.length-1));
 $('#palList').innerHTML=PALT.list.length?PALT.list.map((x,i)=>`<button class="pal-i ${i===PALT.i?'on':''}" data-pi="${i}">${ic(x.ic||'search',16)}<span><b>${esc(x.t)}</b></span><small>${esc(x.s)}</small></button>`).join(''):'<p class="muted" style="padding:14px">Aucun résultat.</p>';
 const on=$('#palList .on');if(on&&on.scrollIntoView)on.scrollIntoView({block:'nearest'});
}
function palOpen(){
 if($('#palette'))return palClose();
 PALT.q='';PALT.i=0;
 const d=document.createElement('div');d.id='palette';d.className='pal-back';
 d.innerHTML=`<div class="pal glass" role="dialog" aria-modal="true" aria-label="Recherche et commandes"><input id="palIn" type="text" placeholder="Aller à, ajouter, chercher une fiche…" autocomplete="off" spellcheck="false" aria-label="Commande ou recherche"><div id="palList"></div><div class="pal-foot muted small">↑↓ naviguer · Entrée valider · Échap fermer</div></div>`;
 document.body.appendChild(d);palDraw();$('#palIn').focus();
}
function palClose(){const e=$('#palette');if(e)e.remove()}
function palRun(i){const x=PALT.list[i];if(!x)return;palClose();setTimeout(()=>x.run(),0)}
document.addEventListener('keydown',e=>{
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();palOpen();return}
 if(!$('#palette'))return;
 if(e.key==='Escape'){e.preventDefault();palClose()}
 else if(e.key==='ArrowDown'){e.preventDefault();PALT.i=Math.min(PALT.list.length-1,PALT.i+1);palDraw()}
 else if(e.key==='ArrowUp'){e.preventDefault();PALT.i=Math.max(0,PALT.i-1);palDraw()}
 else if(e.key==='Enter'){e.preventDefault();palRun(PALT.i)}
},true);
document.addEventListener('input',e=>{if(e.target.id==='palIn'){PALT.q=e.target.value;PALT.i=0;palDraw()}});
document.addEventListener('click',e=>{
 const b=e.target.closest&&e.target.closest('#palette');if(!b)return;
 const it=e.target.closest('[data-pi]');if(it)palRun(+it.dataset.pi);else if(e.target.id==='palette')palClose();
});
ACT.palette=()=>palOpen();
ACT.simpleToggle=()=>{state.settings.simple=!state.settings.simple;if(state.settings.simple&&SIMPLE_HIDE.includes(view.split(':')[0]))view='home';savePrefs();render();toast(state.settings.simple?'Interface simple : modules avancés masqués':'Interface avancée : tous les modules actifs')};
EXT.settings.push(()=>`<section class="panel glass"><h2>Interface</h2><label class="chk"><input type="checkbox" data-act="simpleToggle" ${state.settings.simple?'checked':''}> Interface simple</label>
 <p class="muted small" style="margin-top:6px">Masque les modules avancés (Explorer, Pistes, Remonter le temps, Ateliers, Étiquettes, Expositions, Journal, Audit, Rapport, Trophées, Séries, Recherche éclair, Doublons). Rien n’est supprimé : désactivez ce réglage pour tout retrouver. Raccourci : <kbd>Ctrl</kbd>+<kbd>K</kbd> ouvre la recherche et les commandes.</p></section>`);
