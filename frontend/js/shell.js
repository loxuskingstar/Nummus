'use strict';
/* ---------- navigation / état d'interface ---------- */
const NAV=[['home','Accueil','home',null,1],['collection','Collection','grid',null,1],['wishlist','Wishlist','star','wishlist',0],['catalogs','Catalogues','book','catalogs',1],['atlas','Atlas','globe','atlas',1],['timeline','Chronologie','clock','timeline',1],['stats','Statistiques','chart','stats',1],['doubles','Doublons et échanges','repeat','doubles',0],['storage','Rangement','layers','storage',0],['tools','Outils et glossaire','calc','tools',1],['settings','Réglages','sliders',null,0]];
const MODULE_INFO={catalogs:['Catalogues','Collections numériques libres, coffrets et séries complètes.'],wishlist:['Wishlist','Pièces et billets à acquérir, avec priorité et prix cible.'],atlas:['Atlas','Carte du monde : les pays de votre collection s’illuminent.'],timeline:['Chronologie','Frise par époque, avec carte des origines.'],stats:['Statistiques','Répartitions, investissement, valeur et portefeuille métaux.'],doubles:['Doublons et échanges','Exemplaires multiples, objets à échanger, doublons probables.'],storage:['Rangement','Arborescence hiérarchique des emplacements.'],tools:['Outils et glossaire','Calendriers, métaux, chiffres romains, grades, lexique.']};
/* registre d'extension : les modules (js/feat-*.js) y déclarent vues, rendus différés, widgets et sections de fiche */
const EXT={views:{},after:{},detail:[],home:[],settings:[],beforeSave:[],lightbox:[],tools:[]};
function addModule(key,label,icon,desc,opts={}){
 const at=opts.after?NAV.findIndex(n=>n[0]===opts.after)+1:NAV.length-1;
 NAV.splice(at>0?at:NAV.length-1,0,[key,label,icon,opts.module===undefined?key:opts.module,opts.vit?1:0]);
 if(opts.module!==null&&desc)MODULE_INFO[opts.module||key]=[label,desc];
 if(opts.view)EXT.views[key]=opts.view;if(opts.after_)EXT.after[key]=opts.after_;
}
let view='home';
const emptyFilters=()=>({q:'',cat:'',type:'',country:'',metal:'',grade:'',yearMin:'',yearMax:'',valueMin:'',valueMax:'',tag:'',trade:false,storage:'',nostorage:false});
const ui={menu:false,filters:emptyFilters(),sort:'recent',showFilters:false,selecting:false,picked:new Set(),lastResults:[],atlas:{type:'',wish:false,sel:null},tl:{from:null,to:null,type:'',wish:false,country:null},gloss:{q:'',letter:''}};
const isOn=k=>!k||state.modules[k]!==false;
const navAllowed=n=>isOn(n[3])&&(!vit()||n[4]);
const isListView=()=>view==='collection'||view==='wishlist'||view==='favorites'||view.startsWith('folder:')||view.startsWith('cat:');
const catOf=v=>state.catalogs.find(c=>'cat:'+c.id===v);
const curCat=()=>view.startsWith('cat:')?view.slice(4):'';
const folderOf=v=>state.folders.find(f=>'folder:'+f.id===v);
const listStatus=()=>view==='wishlist'?'wish':view==='collection'?'owned':view==='favorites'?'all':view.startsWith('cat:')?'all':((folderOf(view)||{}).status||'owned');
const viewBase=()=>pool().filter(i=>matchItem(i,{status:listStatus(),cat:curCat()})&&(view!=='favorites'||i.fav));
const activeFilterCount=()=>['metal','grade','yearMin','yearMax','valueMin','valueMax','tag','trade','storage','nostorage'].filter(k=>!!ui.filters[k]).length;
function go(v,opts={}){
 view=v;ui.filters=emptyFilters();ui.sort=v==='wishlist'?'prio':'recent';ui.selecting=false;ui.picked.clear();ui.atlas.sel=null;ui.tl.country=null;ui.showFilters=false;
 ui.menu=false;const f=folderOf(v);if(f){Object.assign(ui.filters,clone(f.filters||{}));ui.sort=f.sort||'recent'}
 const cc=catOf(v);if(cc)ui.filters.cat=cc.id;
 if(opts.filters){Object.assign(ui.filters,opts.filters);ui.showFilters=true}
 render();scrollTo(0,0);
}

function applyTheme(){
 const s=state.settings,t=s.theme,dark=t==='dark'||(t==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);
 const r=document.documentElement;r.dataset.theme=dark?'dark':'light';r.style.setProperty('--accent',s.accent);
 r.classList.toggle('noglass',s.glass===false);r.style.setProperty('--blur',(s.blur??14)+'px');r.classList.toggle('hc',!!s.contrast);r.classList.toggle('noambient',s.ambient===false);
 const c=s.accent.replace('#','');const n=parseInt(c.length===3?c.replace(/./g,'$&$&'):c,16);
 const lum=(0.299*(n>>16)+0.587*((n>>8)&255)+0.114*(n&255))/255;r.style.setProperty('--on-accent',lum>0.62?'#111':'#fff');
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>state&&applyTheme());

/* ---------- gabarit : barre haute, widgets latéraux, hero, catalogues ---------- */
const PRIMARY=['home','collection'];
/* groupes du menu haut : un module inconnu (ajouté plus tard) tombe dans le dernier groupe */
const NAV_GROUPS=[
 ['build','Constituer','layers',['wishlist','favorites','catalogs','series','quick','doubles']],
 ['explore','Explorer','globe',['atlas','timeline','mints','explore','timemachine']],
 ['analyse','Analyser','chart',['stats','insights','badges','tools']],
 ['manage','Gérer','slots',['storage','labels','expos','journal','trash']]];
const navGroupOf=k=>(NAV_GROUPS.find(g=>g[3].includes(k))||NAV_GROUPS[NAV_GROUPS.length-1])[0];
function groupedNav(){
 const al=NAV.filter(navAllowed).filter(n=>!PRIMARY.includes(n[0])&&n[0]!=='settings');
 return NAV_GROUPS.map(g=>[g,al.filter(n=>navGroupOf(n[0])===g[0]).sort((x,y)=>{const i=g[3].indexOf(x[0]),j=g[3].indexOf(y[0]);return (i<0?99:i)-(j<0?99:j)})]).filter(([,l])=>l.length);
}
const navBtn=n=>`<button class="${view===n[0]?'on':''}" data-act="nav" data-v="${n[0]}" title="${n[1]}">${ic(n[2],17)}<span>${n[1]}</span></button>`;
function moreWrap(){
 const cur=view.split(':')[0];
 return groupedNav().map(([g,l])=>{
  const on=l.some(n=>n[0]===cur)||(g[0]==='build'&&(view.startsWith('folder:')||view.startsWith('cat:'))),open=ui.menu===g[0];
  const folders=(g[0]==='build'&&!vit()&&state.folders.length)?`<div class="menuh">Dossiers intelligents</div>${state.folders.map(f=>`<button class="mi ${view==='folder:'+f.id?'on':''}" data-act="nav" data-v="folder:${f.id}">${ic('folder',16)}<span><b>${esc(f.name)}</b></span></button>`).join('')}`:'';
  return `<div class="menuwrap"><button class="${on?'on':''}" data-act="menu" data-g="${g[0]}" aria-haspopup="true" aria-expanded="${open}">${ic(g[2],17)}<span>${g[1]}</span>${ic('chev',11)}</button>${open?`<div class="menu glass">${l.map(n=>{const d=(MODULE_INFO[n[3]||n[0]]||[])[1]||'';return `<button class="mi ${cur===n[0]?'on':''}" data-act="nav" data-v="${n[0]}">${ic(n[2],18)}<span><b>${n[1]}</b>${d?`<small>${esc(d)}</small>`:''}</span></button>`}).join('')}${folders}</div>`:''}</div>`;
 }).join('');
}
const CAT_COLORS=['#2f8a78','#3b6fd4','#8a4fbf','#c0453a','#b7791f','#d4568f','#5b6670','#2a9bb5'];
const catItems=id=>pool().filter(i=>(i.cats||[]).includes(id));
const visCats=()=>state.catalogs.filter(c=>!vit()||catItems(c.id).length);
function catTile(c,big){
 const its=catItems(c.id),cov=(its.find(i=>i.cover)||{}).cover;
 return `<button class="cat-tile ${big?'big':''}" data-act="nav" data-v="cat:${c.id}" style="--cc:${esc(c.color||CAT_COLORS[0])}${cov?`;--cimg:url(${cov})`:''}"><span class="ct-n">${esc(c.name)}</span><span style="display:flex;gap:6px;align-items:center">${c.kind==='coffret'?'<span class="ct-k">Coffret</span>':''}<span class="ct-c">${ic('coin',12)} ${its.length}</span></span></button>`;
}
function catInfo(c){
 const n=catItems(c.id).filter(i=>i.status!=='wish').reduce((s,i)=>s+qtyOf(i),0);
 return `${c.desc?`<p class="sub">${esc(c.desc)}</p>`:''}${c.target>0?`<div class="tile glass" style="margin-top:12px;max-width:360px"><span class="tl">Complétion</span><b>${n} <small>/ ${c.target}</small></b><div class="pbar"><i style="width:${Math.min(100,n/c.target*100)}%"></i></div></div>`:''}`;
}
const featured=()=>{const c=pool().filter(i=>i.status!=='wish'&&i.cover);return c.length?c[Math.floor(Date.now()/864e5)%c.length]:null};
const nf1=n=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1}).format(n);
const FX={amt:100,from:'USD',to:'EUR',rate:null,err:false,init:false};
