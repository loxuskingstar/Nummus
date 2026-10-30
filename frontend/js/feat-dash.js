'use strict';
/* =====================================================================
   ACCUEIL : widgets supplémentaires et TROPHÉES
   Le moteur de disposition (ordre, masquage, glisser-déposer) est dans view-home.js ; ce fichier ajoute des widgets
   « à la demande » (masqués par défaut, à ajouter via Personnaliser) et le module Trophées.
   ===================================================================== */
Object.assign(ACT,{
 homeEdit:()=>{ui.homeEdit=!ui.homeEdit;render()},
 hwHide:t=>{const d=state.settings.dash;d.hidden=uniq([...(d.hidden||[]),t.dataset.id]);d.shown=(d.shown||[]).filter(x=>x!==t.dataset.id);hwSave()},
 hwShow:t=>{const d=state.settings.dash;d.hidden=(d.hidden||[]).filter(x=>x!==t.dataset.id);d.shown=uniq([...(d.shown||[]),t.dataset.id]);hwSave()},
 hwMove:t=>{
  const d=state.settings.dash,ids=homeLayout().map(w=>w.id),i=ids.indexOf(t.dataset.id),j=i+(+t.dataset.d);
  if(i<0||j<0||j>=ids.length)return;[ids[i],ids[j]]=[ids[j],ids[i]];d.order=ids;hwSave();
 },
 hwReset:()=>{state.settings.dash={order:[],hidden:[],shown:[],stats:state.settings.dash.stats};hwSave()},
});

const hbars=rows=>{
 if(!rows.length)return'<p class="muted small">Aucune donnée.</p>';
 const mx=Math.max(...rows.map(r=>r[1]));
 return rows.map(([l,n])=>`<div class="bar"><span title="${esc(l)}">${esc(l)}</span><i><b style="width:${n/mx*100}%"></b></i><em>${n}</em></div>`).join('');
};
const miniRow=i=>`<div class="row" data-act="open" data-id="${i.id}" tabindex="0"><span class="mini">${thumb(i,16)}</span><span class="rt"><b>${esc(i.denomination)}</b><small class="muted">${esc(subtitle(i))}</small></span></div>`;
const owned=()=>pool().filter(i=>i.status!=='wish');

/* ---------- trophées ---------- */
const hasPhotos=i=>(i.imgs||[]).some(m=>m.role==='front')&&(i.imgs||[]).some(m=>m.role==='back');
const BADGE_CATS=['Volume','Géographie','Temps','Métaux','Ateliers et variétés','Documentation','Séries et rangement'];
const BADGE_TIERS=['Facile','Intermédiaire','Difficile','Légendaire'];
const BADGES=[];
/* B : un trophée. ladder : plusieurs paliers d'un même critère, la difficulté croît avec le rang. */
const B=(cat,id,name,icon,desc,goal,val,o={})=>BADGES.push({cat,id,name,icon,desc,goal,val,tier:o.t||1,unit:o.unit,meta:o.meta});
function ladder(cat,icon,rows,descFn,val,o={}){rows.forEach(([id,name,goal],k)=>B(cat,id,name,icon,descFn(goal),goal,val,{...o,t:Math.min(4,1+Math.floor(k*4/rows.length))}))}
const fmtN=n=>new Intl.NumberFormat('fr-FR').format(n);
const TOTAL_C=COUNTRIES.length,contTotal=k=>COUNTRIES.filter(c=>CONT[c.id]===k).length;
const metalBase=i=>norm(i.metal).replace(/\(.*?\)/g,'').replace(/[\d‰%.,]+/g,'').trim();
const yrs=L=>L.filter(hasYear).map(i=>+i.year);

/* Volume */
ladder('Volume','layers',[['first','Premier pas',1],['n10','Petite poignée',10],['n25','Boîte à chaussures',25],['n50','Tiroir plein',50],['cent','Centurion',100],['n250','Classeur rempli',250],['n500','Demi-millier',500],['mille','Millénaire',1000],['n2500','Cabinet de curiosités',2500],['n5000','Grand cabinet',5000],['n10000','Musée privé',10000]],g=>g===1?'Une première entrée dans la collection':`${fmtN(g)} entrées`,c=>c.L.length);
ladder('Volume','copy',[['q250','Légion',250],['q1000','Armée',1000],['q5000','Multitude',5000]],g=>`${fmtN(g)} exemplaires, doublons compris`,c=>c.q);
ladder('Volume','note',[['b10','Premiers billets',10],['b50','Portefeuille garni',50],['b100','Banquier',100],['b250','Imprimerie',250],['b500','Planche à billets',500]],g=>`${fmtN(g)} billets`,c=>c.L.filter(i=>i.type==='note').length);
ladder('Volume','star',[['w10','Liste au père Noël',10],['w50','Grandes ambitions',50],['w100','Rêveur infatigable',100]],g=>`${g} entrées dans la wishlist`,c=>c.W.length);

/* Géographie */
ladder('Géographie','globe',[['p3','Passeport tamponné',3],['p10','Globe-trotter',10],['p25','Explorateur',25],['voyage','Grand Voyageur',50],['p75','Citoyen du monde',75],['p100','Cosmopolite',100],['p150','Presque tout le globe',150],['pall','Atlas complet',TOTAL_C]],g=>g===TOTAL_C?`Au moins une entrée de chacun des ${TOTAL_C} pays de la liste`:`${g} pays représentés`,c=>c.countries.size);
ladder('Géographie','globe',[['k3','Trois continents',3],['k5','Tour du monde',5]],g=>`Des entrées sur ${g} continents`,c=>new Set([...c.countries].map(x=>CONT[x]).filter(Boolean)).size,{});
ladder('Géographie','note',[['bp5','Collectionneur de billets',5],['bp10','Banquier itinérant',10],['bp25','Change international',25],['bp50','Banque mondiale',50],['bp100','Réserve du monde',100],['bpall','Un billet de chaque pays',TOTAL_C]],g=>g===TOTAL_C?`Au moins un billet de chacun des ${TOTAL_C} pays`:`Des billets de ${g} pays différents`,c=>c.nc.size);
ladder('Géographie','coin',[['cp25','Monnayeur itinérant',25],['cp50','Atelier mondial',50],['cp100','Hôtel des monnaies du monde',100],['cpall','Une pièce de chaque pays',TOTAL_C]],g=>g===TOTAL_C?`Au moins une pièce de chacun des ${TOTAL_C} pays`:`Des pièces de ${g} pays différents`,c=>c.cc.size);
ladder('Géographie','repeat',[['bc10','Double face',10],['bc25','Les deux monnaies',25],['bc50','Pièces et billets, partout',50]],g=>`Une pièce et un billet du même pays, pour ${g} pays`,c=>[...c.cc].filter(x=>c.nc.has(x)).length);
[['Europe','Toute l’Europe'],['Afrique','Toute l’Afrique'],['Asie','Toute l’Asie'],['Amériques','Toutes les Amériques'],['Océanie','Toute l’Océanie']].forEach(([k,n])=>{
 const t=contTotal(k),cnt=c=>[...c.countries].filter(x=>CONT[x]===k).length;
 B('Géographie','h_'+k,'Moitié : '+k,'pin',`La moitié des pays (${Math.ceil(t/2)} sur ${t}) de la zone ${k}`,Math.ceil(t/2),cnt,{t:3});
 B('Géographie','f_'+k,n,'trophy',`Au moins une entrée de chacun des ${t} pays de la zone ${k}`,t,cnt,{t:4});
});

/* Temps */
const cent=c=>new Set(yrs(c.L).map(y=>Math.ceil(y/100))).size;
ladder('Temps','clock',[['s3','Voyageur du temps',3],['s5','Chroniqueur',5],['siecles','Chrononaute',10],['s15','Historien',15],['s20','Mémoire des siècles',20],['s25','Vingt-cinq siècles',25]],g=>`Des pièces ou billets de ${g} siècles différents`,cent);
ladder('Temps','bulb',[['a1','Un souffle d’Antiquité',1],['a10','Antiquaire',10],['archeo','Archéologue',20],['a50','Conservateur des antiques',50],['a100','Fouilles de Pompéi',100]],g=>`${g} monnaies antiques (frappées avant 476)`,c=>c.L.filter(i=>i.type==='coin'&&hasYear(i)&&+i.year<=476).length);
ladder('Temps','bulb',[['j1','Avant notre ère',1],['j10','Dix fois avant J.-C.',10],['j25','Âge du bronze et du fer',25]],g=>`${g} monnaies datées avant J.-C.`,c=>c.L.filter(i=>hasYear(i)&&+i.year<0).length);
ladder('Temps','book',[['m5','Troubadour',5],['medi','Médiéviste',20],['m50','Grand médiéviste',50]],g=>`${g} monnaies médiévales (477–1500)`,c=>c.L.filter(i=>i.type==='coin'&&hasYear(i)&&+i.year>476&&+i.year<=1500).length);
ladder('Temps','book',[['r20','Ancien Régime',20],['r50','Sous les rois',50]],g=>`${g} monnaies des temps modernes (1501–1788)`,c=>c.L.filter(i=>hasYear(i)&&+i.year>1500&&+i.year<1789).length);
ladder('Temps','book',[['x50','Siècle des révolutions',50],['x150','Chronique du XIXe',150]],g=>`${g} entrées du XIXe siècle (1801–1900)`,c=>c.L.filter(i=>hasYear(i)&&+i.year>1800&&+i.year<=1900).length);
ladder('Temps','clock',[['e1000','Mille ans d’écart',1000],['e2000','Deux millénaires',2000],['e2500','Deux millénaires et demi',2500]],g=>`Une plus ancienne et une plus récente séparées d’au moins ${fmtN(g)} ans`,c=>{const y=yrs(c.L);return y.length?Math.max(...y)-Math.min(...y):0});
B('Temps','dec20','Chaque décennie du XXe','calendar','Au moins une entrée pour chacune des dix décennies de 1900 à 1999',10,c=>new Set(yrs(c.L).filter(y=>y>=1900&&y<=1999).map(y=>Math.floor(y/10))).size,{t:3});
B('Temps','an50','Un demi-siècle de millésimes','calendar','50 millésimes différents entre 1900 et 1999',50,c=>new Set(yrs(c.L).filter(y=>y>=1900&&y<=1999)).size,{t:3});
B('Temps','an20','Chaque année du XXe siècle','calendar','Un millésime pour chacune des 100 années de 1900 à 1999',100,c=>new Set(yrs(c.L).filter(y=>y>=1900&&y<=1999)).size,{t:4});
B('Temps','an19','Chaque année du XIXe siècle','calendar','Un millésime pour chacune des 100 années de 1801 à 1900',100,c=>new Set(yrs(c.L).filter(y=>y>=1801&&y<=1900)).size,{t:4});
B('Temps','an6020','De 1960 à aujourd’hui, sans trou','calendar','Un millésime pour chaque année depuis 1960',new Date().getFullYear()-1959,c=>new Set(yrs(c.L).filter(y=>y>=1960&&y<=new Date().getFullYear())).size,{t:4});
ladder('Temps','calendar',[['v5','Petite verticale',5],['v10','Verticale',10],['v25','Grande verticale',25],['v50','Verticale totale',50]],g=>`${g} millésimes différents d’une même dénomination`,c=>{const m=new Map();c.L.filter(hasYear).forEach(i=>{const k=norm(i.denomination);(m.get(k)||m.set(k,new Set()).get(k)).add(+i.year)});return Math.max(0,...[...m.values()].map(x=>x.size))});

/* Métaux */
ladder('Métaux','coin',[['au1','Pépite',1],['au10','Orpailleur',10],['au31','Une once troy d’or',31.1035],['midas','Midas',100],['au500','Dragon de conte',500],['au1000','Fort Knox',1000]],g=>`${fmtN(Math.round(g*10)/10)} g d’or fin accumulés`,c=>c.mp.r.gold.g,{unit:' g'});
ladder('Métaux','coin',[['ag31','Une once troy d’argent',31.1035],['ag100','Veine d’argent',100],['argent','Argentier',500],['ag1000','Kilo d’argent',1000],['ag5000','Mine d’argent',5000]],g=>`${fmtN(Math.round(g*10)/10)} g d’argent fin accumulés`,c=>c.mp.r.silver.g,{unit:' g'});
B('Métaux','pt1','Métal rare','coin','Une entrée en platine ou en palladium',1,c=>c.mp.r.platinum.n+c.mp.r.palladium.n,{t:2});
B('Métaux','nobles','Les quatre nobles','coin','Or, argent, platine et palladium, chacun représenté',4,c=>METAL_CLASSES.filter(([k])=>c.mp.r[k].n>0).length,{t:4});
ladder('Métaux','refresh',[['mx3','Trois métaux',3],['metaux','Alchimiste',5],['mx10','Maître alchimiste',10],['mx15','Pierre philosophale',15],['mx25','Table de Mendeleïev',25]],g=>`${g} métaux ou alliages différents`,c=>new Set(c.L.map(metalBase).filter(Boolean)).size);
ladder('Métaux','coin',[['big1','Grand module',1],['big10','Médaillons',10]],g=>`${g} pièces d’au moins 50 mm de diamètre`,c=>c.L.filter(i=>+i.diameter>=50).length);

/* Ateliers et variétés */
ladder('Ateliers et variétés','pin',[['at5','Voyageur des ateliers',5],['ateliers','Cartographe',15],['at30','Cartographe émérite',30],['at50','Atlas des ateliers',50],['at100','Réseau monétaire',100]],g=>`Des pièces de ${g} ateliers différents`,c=>new Set(c.L.map(i=>norm(i.mint)).filter(Boolean)).size);
ladder('Ateliers et variétés','shield',[['fdc10','Éclat d’origine',10],['fdc50','Écrin',50],['fdc100','Vitrine impeccable',100]],g=>`${g} entrées en état FDC / UNC / MS`,c=>c.L.filter(i=>/^(fdc|unc|ms|bu|spl)\b|^ms-?\d/.test(norm(i.grade))).length);
ladder('Ateliers et variétés','shield',[['gr3','Échelle de Sheldon',3],['gr6','Du B au FDC',6],['gr10','Toutes les nuances',10]],g=>`${g} états de conservation différents`,c=>new Set(c.L.map(i=>norm(i.grade)).filter(Boolean)).size);
ladder('Ateliers et variétés','shield',[['ce1','Sous scellé',1],['ce10','Bocal bien rempli',10],['ce50','Grand certifié',50]],g=>`${g} entrées avec une certification (NGC, PCGS…)`,c=>c.L.filter(i=>i.certified).length);
ladder('Ateliers et variétés','search',[['va10','Œil de lynx',10],['va50','Chasseur de variantes',50],['va150','Spécialiste des variétés',150]],g=>`${g} entrées avec une variété précisée`,c=>c.L.filter(i=>i.variety).length);
ladder('Ateliers et variétés','tree',[['dy3','Généalogiste',3],['dy10','Arbre généalogique',10],['dy25','Almanach de Gotha',25]],g=>`${g} dynasties différentes`,c=>new Set(c.L.map(i=>norm(i.dynasty)).filter(Boolean)).size);
ladder('Ateliers et variétés','tree',[['ru10','Cour royale',10],['ru50','Panthéon',50],['ru100','Tous les souverains',100]],g=>`${g} souverains différents`,c=>new Set(c.L.map(i=>norm(i.ruler)).filter(Boolean)).size);
ladder('Ateliers et variétés','pen',[['en3','Œil de graveur',3],['en10','Atelier de gravure',10]],g=>`${g} graveurs différents identifiés`,c=>new Set(c.L.map(i=>norm(i.engraver)).filter(Boolean)).size);
ladder('Ateliers et variétés','star',[['ho1','Découverte',1],['ho5','Chercheur de trésors',5]],g=>`${g} trésors d’origine renseignés`,c=>new Set(c.L.map(i=>norm(i.hoard)).filter(Boolean)).size);

/* Documentation */
ladder('Documentation','image',[['ph10','Premier cliché',10],['photo','Photographe',50],['ph100','Studio photo',100],['ph250','Reporter',250],['ph500','Photographe officiel',500]],g=>`${g} entrées avec photo d’avers et de revers`,c=>c.L.filter(hasPhotos).length);
ladder('Documentation','edit',[['so10','Fiche propre',10],['soigne','Fiches soignées',25],['so100','Archiviste',100],['so500','Bénédictin',500]],g=>`${g} entrées complètes (photo, année, pays, poids, diamètre)`,c=>c.L.filter(i=>(i.imgs||[]).length&&hasYear(i)&&i.country&&+i.weight>0&&+i.diameter>0).length);
ladder('Documentation','receipt',[['pv25','Comptable',25],['pv100','Grand livre',100]],g=>`${g} entrées avec prix et date d’achat`,c=>c.L.filter(i=>!isEmpty(i.paid)&&i.acquired).length);
ladder('Documentation','link',[['nu25','Lié à Numista',25],['nu100','Encyclopédiste',100]],g=>`${g} entrées avec un numéro Numista`,c=>c.L.filter(i=>i.numista).length);
ladder('Documentation','book',[['ca50','Référencé',50],['ca200','Bibliographe',200]],g=>`${g} entrées avec une référence de catalogue`,c=>c.L.filter(i=>i.catalog).length);
ladder('Documentation','edit',[['no25','Carnetiste',25],['no100','Plume',100]],g=>`${g} entrées avec des notes personnelles`,c=>c.L.filter(i=>i.notes).length);
ladder('Documentation','file',[['do1','Papiers en règle',1],['do10','Dossier complet',10],['do50','Archives notariales',50]],g=>`${g} documents joints (factures, certificats)`,c=>c.L.reduce((n,i)=>n+(i.docs||[]).length,0));
ladder('Documentation','pen',[['an1','Œil critique',1],['an10','Loupe de l’expert',10],['an50','Planche anatomique',50]],g=>`${g} photos annotées`,c=>c.L.reduce((n,i)=>n+(i.imgs||[]).filter(m=>(m.ann||[]).length).length,0));
ladder('Documentation','tag',[['tg10','Étiqueteur',10],['tg30','Taxonomiste',30]],g=>`${g} étiquettes différentes utilisées`,c=>new Set(c.L.flatMap(i=>tagsOf(i).map(norm))).size);

/* Séries et rangement */
const serDone=c=>state.series.filter(s=>{const p=seriesProgress(s,c.L);return!p.open&&p.total>0&&p.missing===0&&p.unid===0});
ladder('Séries et rangement','target',[['serie','Série complète',1],['se3','Triple série',3],['se5','Cinq séries',5],['se10','Collectionneur de séries',10]],g=>g===1?'Compléter une série à cases à 100 %':`Compléter ${g} séries à cases`,c=>serDone(c).length);
B('Séries et rangement','se50','Série monumentale','target','Compléter une série d’au moins 50 cases',1,c=>serDone(c).filter(s=>s.slots.length>=50).length,{t:4});
B('Séries et rangement','se100','Série colossale','target','Compléter une série d’au moins 100 cases',1,c=>serDone(c).filter(s=>s.slots.length>=100).length,{t:4});
ladder('Séries et rangement','target',[['sc25','Cases cochées',25],['sc100','Centaine de cases',100],['sc500','Tapisserie de cases',500],['sc1000','Mille cases',1000]],g=>`${fmtN(g)} cases de séries remplies, toutes séries confondues`,c=>state.series.reduce((n,s)=>n+seriesProgress(s,c.L).owned,0));
ladder('Séries et rangement','slots',[['ct1','Premier classeur',1],['ct3','Rayonnage',3],['ct10','Salle des coffres',10]],g=>`${g} contenants (classeurs, médailliers) créés`,c=>state.containers.length);
ladder('Séries et rangement','slots',[['rg50','Bien rangé',50],['rg250','Archiviste du rangement',250]],g=>`${g} entrées avec un emplacement`,c=>{const pm=placedMap();return c.L.filter(i=>normPath(i.storage)||(pm.get(i.id)||[]).length).length});
B('Séries et rangement','range','Tout est rangé','slots','Au moins 20 entrées, toutes avec un emplacement',1,c=>{const pm=placedMap();return c.L.length>=20&&c.L.every(i=>normPath(i.storage)||(pm.get(i.id)||[]).length)?1:0},{t:3});
ladder('Séries et rangement','image',[['ex1','Vernissage',1],['ex5','Cycle d’expositions',5],['ex15','Commissaire',15]],g=>`${g} expositions créées`,c=>state.expos.length);
ladder('Séries et rangement','trophy',[['tr10','Chasseur de trophées',10],['tr30','Tableau de chasse',30],['tr60','Grand chelem',60]],g=>`${g} autres trophées obtenus`,c=>c.done,{meta:1});

function badgeCtx(){
 const L=owned(),W=pool().filter(i=>i.status==='wish');
 const countries=new Set(L.map(i=>i.country).filter(Boolean));
 return{L,W,countries,q:L.reduce((n,i)=>n+qtyOf(i),0),cc:new Set(L.filter(i=>i.type!=='note').map(i=>i.country).filter(Boolean)),nc:new Set(L.filter(i=>i.type==='note').map(i=>i.country).filter(Boolean)),mp:metalPortfolio(L),done:0};
}
function badgeState(){
 const c=badgeCtx(),tier=b=>b.tier;
 const calc=b=>{let v=0;try{v=Math.max(0,+b.val(c)||0)}catch(e){console.error(b.id,e)}return{...b,v,pct:Math.min(100,v/b.goal*100),done:v>=b.goal,date:state.settings.badgeSeen[b.id]}};
 const base=BADGES.filter(b=>!b.meta).map(calc);c.done=base.filter(b=>b.done).length;
 const meta=BADGES.filter(b=>b.meta).map(calc);
 return BADGES.map(b=>base.find(x=>x.id===b.id)||meta.find(x=>x.id===b.id));
}
/* enregistre la date d'obtention ; ne félicite pas pour les trophées déjà acquis à la première ouverture ni après un
   changement du catalogue de trophées (BADGE_VER) */
const BADGE_VER=2;
function badgeSync(){
 if(vit())return;
 const seen=state.settings.badgeSeen,silent=!seen._init||seen._ver!==BADGE_VER;let ch=false;
 badgeState().forEach(b=>{if(b.done&&!seen[b.id]){seen[b.id]=Date.now();ch=true;if(!silent)toast(`Trophée obtenu : ${b.name}`)}});
 if(silent){seen._init=1;seen._ver=BADGE_VER;ch=true}
 if(ch)savePrefs();
}
EXT.after.home=badgeSync;
addModule('badges','Trophées','trophy','Succès de collectionneur : pays représentés, métal fin, séries complétées…',{after:'stats',view:()=>viewBadges(),after_:badgeSync});
function viewBadges(){
 const l=badgeState(),n=l.filter(b=>b.done).length,f=ui.bdFilter||'all';
 const fmtv=b=>`${nf1(b.v)}${b.unit||''} / ${nf1(b.goal)}${b.unit||''}`;
 const tierN=t=>`${l.filter(b=>b.tier===t&&b.done).length}/${l.filter(b=>b.tier===t).length}`;
 const show=b=>f==='all'||(f==='done'?b.done:!b.done);
 const card=b=>`<div class="mcard glass bdg t${b.tier} ${b.done?'got':''}"><h3>${ic(b.icon,18)} ${esc(b.name)} ${b.done?`<span class="chip acc">${ic('check',12)} obtenu</span>`:''}</h3>
  <span class="meta">${esc(b.desc)}</span><div class="pbar"><i style="width:${b.pct}%"></i></div>
  <span class="meta"><span class="tier t${b.tier}">${BADGE_TIERS[b.tier-1]}</span> ${b.done?`Obtenu le ${esc(b.date&&b.date>1?dateFR(b.date):'—')}`:esc(fmtv(b))}</span></div>`;
 return `<header class="head"><div><h1>Trophées</h1><p class="sub">${n} sur ${l.length} obtenus. Ces succès ne comparent rien aux autres : ils mesurent seulement l’avancement de votre propre collection.</p></div></header>
 <div class="actions" style="margin-bottom:14px"><div class="seg">${[['all','Tous'],['done','Obtenus'],['todo','À obtenir']].map(([k,t])=>`<button data-act="bdFilter" data-v="${k}" class="${f===k?'on':''}">${t}</button>`).join('')}</div>
 <span class="muted small">${BADGE_TIERS.map((t,k)=>`<span class="tier t${k+1}">${t}</span> ${tierN(k+1)}`).join(' · ')}</span></div>
 ${BADGE_CATS.map(cat=>{const cl=l.filter(b=>b.cat===cat),sh=cl.filter(show);if(!sh.length)return'';return `<section style="margin-bottom:22px"><h2 style="font-size:1.05rem;margin:0 0 10px">${esc(cat)} <span class="muted small">${cl.filter(b=>b.done).length}/${cl.length}</span></h2><div class="modgrid">${sh.map(card).join('')}</div></section>`}).join('')}`;
}
ACT.bdFilter=t=>{ui.bdFilter=t.dataset.v;render()};

/* ---------- widgets ---------- */
homeWidget({id:'trophies',title:'Trophées',icon:'trophy',link:()=>moreLink('badges','Tous'),when:()=>!vit(),body:()=>{
 const l=badgeState(),got=l.filter(b=>b.done),next=l.filter(b=>!b.done).sort((a,b)=>b.pct-a.pct).slice(0,2);
 return `<div class="kl muted small" style="margin-bottom:6px">${got.length} / ${l.length} obtenus</div><div class="pbar" style="margin-bottom:10px"><i style="width:${got.length/l.length*100}%"></i></div>
 ${next.map(b=>`<div class="mrow"><span>${esc(b.name)}</span><span class="muted">${esc(nf1(b.v))}${b.unit||''} / ${b.goal}</span><b>${Math.round(b.pct)} %</b></div>`).join('')||'<p class="muted small">Tous les trophées sont obtenus.</p>'}`}});
homeWidget({id:'quick',title:'Recherche éclair',icon:'bolt',when:()=>!vit(),body:()=>`<p class="muted small" style="margin-bottom:10px">En bourse, vérifiez en deux secondes si une pièce est déjà dans votre collection, en double ou dans votre wishlist.</p><button class="btn primary" data-act="quickOpen">${ic('search',16)} Vérifier une pièce</button>`});
homeWidget({id:'wishtop',title:'Wishlist prioritaire',icon:'star',off:true,link:()=>moreLink('wishlist'),when:()=>!vit(),body:()=>{
 const w=pool().filter(i=>i.status==='wish').sort((a,b)=>(+b.priority||0)-(+a.priority||0)).slice(0,5);
 return w.length?`<div class="wl">${w.map(miniRow).join('')}</div>`:'<p class="muted small">Aucun souhait.</p>'}});
homeWidget({id:'series',title:'Séries en cours',icon:'target',off:true,link:()=>moreLink('series'),when:()=>isOn('series'),body:()=>{
 const l=state.series.map(s=>({s,p:seriesProgress(s,pool())})).filter(x=>x.p.pct===null||x.p.pct<100).sort((a,b)=>(b.p.pct||0)-(a.p.pct||0)).slice(0,4);
 return l.length?l.map(({s,p})=>`<button class="mrow" style="all:unset;display:block;cursor:pointer;margin-bottom:8px;width:100%" data-act="nav" data-v="series:${s.id}"><span>${esc(s.name)}</span><div class="pbar"><i style="width:${p.pct||0}%"></i></div></button>`).join(''):'<p class="muted small">Aucune série en cours.</p>'}});
homeWidget({id:'eras',title:'Siècles représentés',icon:'clock',off:true,link:()=>moreLink('timeline'),body:()=>{
 const m={};owned().filter(hasYear).forEach(i=>{const k=century(+i.year);m[k]=m[k]||{n:0,y:+i.year};m[k].n+=qtyOf(i)});
 return hbars(Object.entries(m).sort((a,b)=>b[1].n-a[1].n).slice(0,6).map(([k,v])=>[k,v.n]))}});
homeWidget({id:'grades',title:'États de conservation',icon:'shield',off:true,body:()=>{
 const m={};owned().forEach(i=>{if(i.grade)m[i.grade]=(m[i.grade]||0)+qtyOf(i)});
 return hbars(Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,6))}});
homeWidget({id:'storage',title:'Rangement',icon:'slots',off:true,link:()=>moreLink('storage'),when:()=>!vit(),body:()=>{
 const L=owned(),pm=placedMap(),ranged=L.filter(i=>normPath(i.storage)||(pm.get(i.id)||[]).length).length;
 return `<div class="kl muted small" style="margin-bottom:6px">${ranged} / ${L.length} entrées rangées</div><div class="pbar"><i style="width:${L.length?ranged/L.length*100:0}%"></i></div>
 ${L.length-ranged?`<p class="muted small" style="margin-top:8px">${pl(L.length-ranged,'entrée','entrées')} sans emplacement. <button class="link" data-act="nav" data-v="storage">Ranger</button></p>`:''}`}});
homeWidget({id:'records',title:'Records de la collection',icon:'chart',off:true,body:H=>{
 const L=owned(),best=(f,cmp)=>L.filter(i=>!isEmpty(i[f])&&!isNaN(+i[f])).sort(cmp)[0];
 const old=L.filter(hasYear).sort((a,b)=>a.year-b.year)[0],rec=L.filter(hasYear).sort((a,b)=>b.year-a.year)[0],hv=best('weight',(a,b)=>b.weight-a.weight),big=best('diameter',(a,b)=>b.diameter-a.diameter);
 const row=(t,i,x)=>i?`<div class="mrow"><span>${t}</span><span class="muted"><button class="link" data-act="open" data-id="${i.id}">${esc(i.denomination)}</button></span><b>${esc(x)}</b></div>`:'';
 return `<div class="mlist">${row('Plus ancienne',old,old&&fmtYear(old.year))}${row('Plus récente',rec,rec&&fmtYear(rec.year))}${row('Plus lourde',hv,hv&&hv.weight+' g')}${row('Plus grande',big,big&&big.diameter+' mm')}</div>`||'<p class="muted small">Pas assez de données.</p>'}});
homeWidget({id:'attention',title:'À vérifier',icon:'warn',off:true,when:()=>!vit(),body:()=>{
 const L=owned(),dd=ddClusters().length,nophoto=L.filter(i=>!(i.imgs||[]).length).length,nostor=L.filter(i=>!normPath(i.storage)&&!(placedMap().get(i.id)||[]).length).length;
 const line=(n,t,v)=>`<div class="mrow"><span>${t}</span><span></span><b><button class="link" data-act="nav" data-v="${v}">${n}</button></b></div>`;
 return `<div class="mlist">${line(dd,'Doublons probables','doubles')}${line(nophoto,'Sans photo','collection')}${line(nostor,'Sans emplacement','storage')}${line(state.trash.length,'Dans la corbeille','trash')}</div>`}});
homeWidget({id:'months',title:'Acquisitions sur 12 mois',icon:'chart',off:true,when:()=>!vit(),body:()=>{
 const now=new Date(),keys=[...Array(12)].map((_,k)=>{const d=new Date(now.getFullYear(),now.getMonth()-11+k,1);return[d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'),MONTHS[d.getMonth()].slice(0,3)]});
 const m={};owned().forEach(i=>{const d=i.acquired?String(i.acquired).slice(0,7):new Date(i.created||0).toISOString().slice(0,7);m[d]=(m[d]||0)+qtyOf(i)});
 const mx=Math.max(1,...keys.map(k=>m[k[0]]||0));
 return `<div style="display:flex;align-items:flex-end;gap:4px;height:90px">${keys.map(([k,l])=>`<div style="flex:1;text-align:center" title="${k} : ${m[k]||0}"><div style="height:${(m[k]||0)/mx*70}px;min-height:2px;background:var(--accent);border-radius:3px"></div><small class="muted" style="font-size:9px">${l}</small></div>`).join('')}</div>`}});
