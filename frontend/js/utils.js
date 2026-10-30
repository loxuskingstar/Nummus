'use strict';
/* ---------- utilitaires ---------- */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-3);
const today=()=>new Date().toISOString().slice(0,10);
const uniq=a=>[...new Set(a.filter(x=>x!==undefined&&x!==null&&x!==''))];
const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const pl=(n,a,b)=>`${n} ${n>1?b:a}`;
const hasYear=i=>i.year!==null&&i.year!==undefined&&i.year!==''&&!isNaN(+i.year);
const isEmpty=v=>v===undefined||v===null||v==='';
const clone=o=>{try{return structuredClone(o)}catch(e){return JSON.parse(JSON.stringify(o))}};
const debounce=(fn,ms)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}};
const lsGet=(k,d)=>{try{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v)}catch(e){return d}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const slug=s=>norm(s).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'collection';
const dateFR=x=>new Date(x).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'});
const MONTHS=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const IMG_KEYS=new Set(['front','back','frontT','backT']);
const ICON={
 home:'<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
 chev:'<path d="M9 6l6 6-6 6"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
 chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
 repeat:'<path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/>',
 calc:'<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 11h2M14 11h2M8 15h2M14 15h2M8 19h2M14 19h2"/>',
 sliders:'<path d="M4 6h8M18 6h2M4 12h2M12 12h8M4 18h10"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
 x:'<path d="M6 6l12 12M18 6L6 18"/>',edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',
 trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
 copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
 link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
 coin:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/>',
 note:'<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
 check:'<path d="M5 12l5 5L20 7"/>',list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h0M3 12h0M3 18h0"/>',
 folder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
 layers:'<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
 print:'<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
 eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 select:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 12l3 3 5-6"/>',
 crop:'<path d="M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14"/>',
 rotl:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
 rotr:'<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
 download:'<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
 filter:'<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
 tag:'<path d="M3 12V3h9l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
 move:'<path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>',
 shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
 refresh:'<path d="M4 4v6h6M20 20v-6h-6"/><path d="M20 10a8 8 0 0 0-14.9-3M4 14a8 8 0 0 0 14.9 3"/>',
 share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4"/>',
 more:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
 image:'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 8"/>',
 book:'<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
 heart:'<path d="M12 20.5s-7.5-4.6-9.2-9.4C1.7 8 3.6 4.8 6.9 4.8c1.9 0 3.5 1 5.1 3 1.6-2 3.2-3 5.1-3 3.3 0 5.2 3.2 4.1 6.3-1.7 4.8-9.2 9.4-9.2 9.4z"/>',
 heartf:'<path fill="currentColor" d="M12 20.5s-7.5-4.6-9.2-9.4C1.7 8 3.6 4.8 6.9 4.8c1.9 0 3.5 1 5.1 3 1.6-2 3.2-3 5.1-3 3.3 0 5.2 3.2 4.1 6.3-1.7 4.8-9.2 9.4-9.2 9.4z"/>',
 edit:'<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M13.5 8.5l2 2"/>',
 box:'<path d="M3 7.500L12 3l9 4.500v9L12 21l-9-4.500z"/><path d="M3 7.500L12 12l9-4.500M12 12v9"/>',
 slots:'<rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8" cy="8" r="1.8"/><circle cx="16" cy="8" r="1.8"/><circle cx="8" cy="16" r="1.8"/><circle cx="16" cy="16" r="1.8"/>',
 journal:'<path d="M6 3h11a2 2 0 0 1 2 2v16H8a2 2 0 0 1-2-2V3z"/><path d="M6 19a2 2 0 0 1 2-2h11M10 8h6M10 12h6"/>',
 frame:'<rect x="3" y="4" width="18" height="16" rx="1.5"/><rect x="7" y="8" width="10" height="8" rx=".5"/>',
 pin:'<path d="M12 21s-6.5-5.8-6.5-11a6.5 6.5 0 0 1 13 0c0 5.2-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
 rewind:'<path d="M11 6L4 12l7 6V6zM20 6l-7 6 7 6V6z"/>',
 warn:'<path d="M12 3.5l9.5 16.5h-19L12 3.5z"/><path d="M12 10v5M12 17.8v.2"/>',
 bulb:'<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.900c.6.5 1 1.300 1 2.1h5c0-.8.4-1.600 1-2.1A6 6 0 0 0 12 3z"/>',
 dice:'<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><circle cx="8.5" cy="8.5" r="1.1"/><circle cx="15.5" cy="15.5" r="1.1"/><circle cx="12" cy="12" r="1.1"/>',
 compare:'<rect x="3" y="4" width="8" height="16" rx="1.5"/><rect x="13" y="4" width="8" height="16" rx="1.5"/>',
 target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
 up:'<path d="M6 14l6-6 6 6"/>',down:'<path d="M6 10l6 6 6-6"/>',
 qr:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20h1"/>',
 trophy:'<path d="M8 4h8v6a4 4 0 0 1-8 0zM8 6H4v1a3 3 0 0 0 4 3M16 6h4v1a3 3 0 0 1-4 3M12 14v4M8 21h8M9 18h6"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.500 1.500M17.500 17.500L19 19M5 19l1.500-1.500M17.500 6.500L19 5"/>',
 graph:'<circle cx="6" cy="6" r="2.500"/><circle cx="18" cy="8" r="2.500"/><circle cx="12" cy="18" r="2.500"/><path d="M8 7l8 1M7 8l4 8M17 10l-4 6"/>',
 file:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
 undo:'<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
 drag:'<circle cx="9" cy="6" r="1.200"/><circle cx="15" cy="6" r="1.200"/><circle cx="9" cy="12" r="1.200"/><circle cx="15" cy="12" r="1.200"/><circle cx="9" cy="18" r="1.200"/><circle cx="15" cy="18" r="1.200"/>',
 bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
 tree:'<path d="M12 3v6M12 9H5v5M12 9h7v5M5 14v7M19 14v7M12 9v12"/>',
 scale:'<path d="M12 3v18M6 21h12M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
 stamp:'<path d="M8 21h8M5 17h14v-3a4 4 0 0 0-4-4h-1V7a2 2 0 1 0-4 0v3H9a4 4 0 0 0-4 4z"/>',
 pen:'<path d="M12 20h9M16.500 3.500a2.100 2.100 0 0 1 3 3L7 19l-4 1 1-4z"/>',
 arrow:'<path d="M5 19L19 5M9 5h10v10"/>',
 circle:'<circle cx="12" cy="12" r="8"/>',
 lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
 bin:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
 zap:'<path d="M3 3l18 18M13 2L6 11M18 13l-7 9"/>',
 album:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16M6 9h3M6 13h3M15 9h3M15 13h3"/>'
};
const ic=(n,s=18)=>`<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]||''}</svg>`;
function toast(m){const t=$('#toast');t.textContent=m;t.classList.remove('act');t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),2600)}
function download(name,text,mime){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:mime}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},800)}
const toRoman=n=>{let r='';for(const[v,s]of[[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']])while(n>=v){r+=s;n-=v}return r};
const fromRoman=s=>{const v={I:1,V:5,X:10,L:50,C:100,D:500,M:1000};s=String(s).toUpperCase().trim();if(!s)return NaN;let t=0;for(let i=0;i<s.length;i++){const a=v[s[i]],b=v[s[i+1]]||0;if(!a)return NaN;t+=a<b?-a:a}return toRoman(t)===s?t:NaN};
const fmtYear=y=>(isEmpty(y)||isNaN(+y))?'':(+y<0?`${-y} av. J.-C.`:String(y));
/* datation en fourchette : « 44 av. J.-C. – 31 av. J.-C. » ; vide si la fiche n'a pas d'année */
const yearSpan=it=>{if(!hasYear(it))return'';const a=fmtYear(it.year);return(!isEmpty(it.yearEnd)&&!isNaN(+it.yearEnd)&&+it.yearEnd!==+it.year)?`${a} – ${fmtYear(it.yearEnd)}`:a};
const century=y=>{const c=Math.ceil(Math.abs(y)/100)||1;return(c===1?'Ier':toRoman(c)+'e')+' siècle'+(y<0?' av. J.-C.':'')};
const normPath=s=>String(s||'').split('>').map(x=>x.trim()).filter(Boolean).join(' > ');
const tagsOf=i=>String(i.tags||'').split(',').map(s=>s.trim()).filter(Boolean);

/* ---------- LaTeX (KaTeX) ---------- */
const tex=(s,display)=>{try{if(window.katex)return katex.renderToString(s,{throwOnError:false,displayMode:!!display,strict:'ignore'})}catch(e){}return`<code>${esc(s)}</code>`};

/* ---------- pays (code ISO numérique, comme dans world-atlas) ---------- */
const COUNTRIES=`004|Afghanistan;008|Albanie;012|Algérie;020|Andorre;024|Angola;028|Antigua-et-Barbuda;032|Argentine;051|Arménie;036|Australie;040|Autriche;031|Azerbaïdjan;044|Bahamas;048|Bahreïn;050|Bangladesh;052|Barbade;112|Biélorussie;056|Belgique;084|Belize;204|Bénin;064|Bhoutan;068|Bolivie;070|Bosnie-Herzégovine;072|Botswana;076|Brésil;096|Brunéi;100|Bulgarie;854|Burkina Faso;108|Burundi;116|Cambodge;120|Cameroun;124|Canada;132|Cap-Vert;140|République centrafricaine;148|Tchad;152|Chili;156|Chine;196|Chypre;170|Colombie;174|Comores;178|Congo;180|RD Congo;410|Corée du Sud;408|Corée du Nord;188|Costa Rica;384|Côte d'Ivoire;191|Croatie;192|Cuba;208|Danemark;262|Djibouti;212|Dominique;214|République dominicaine;818|Égypte;222|Salvador;784|Émirats arabes unis;218|Équateur;232|Érythrée;724|Espagne;233|Estonie;748|Eswatini;840|États-Unis;231|Éthiopie;242|Fidji;246|Finlande;250|France;266|Gabon;270|Gambie;268|Géorgie;276|Allemagne;288|Ghana;300|Grèce;308|Grenade;304|Groenland;320|Guatemala;324|Guinée;624|Guinée-Bissau;226|Guinée équatoriale;328|Guyana;332|Haïti;340|Honduras;348|Hongrie;238|Îles Malouines;090|Îles Salomon;356|Inde;360|Indonésie;368|Irak;364|Iran;372|Irlande;352|Islande;376|Israël;380|Italie;388|Jamaïque;392|Japon;400|Jordanie;398|Kazakhstan;404|Kenya;417|Kirghizistan;296|Kiribati;414|Koweït;418|Laos;426|Lesotho;428|Lettonie;422|Liban;430|Libéria;434|Libye;438|Liechtenstein;440|Lituanie;442|Luxembourg;807|Macédoine du Nord;450|Madagascar;458|Malaisie;454|Malawi;462|Maldives;466|Mali;470|Malte;504|Maroc;584|Îles Marshall;480|Maurice;478|Mauritanie;484|Mexique;583|Micronésie;498|Moldavie;492|Monaco;496|Mongolie;499|Monténégro;508|Mozambique;104|Birmanie (Myanmar);516|Namibie;520|Nauru;524|Népal;558|Nicaragua;562|Niger;566|Nigeria;578|Norvège;540|Nouvelle-Calédonie;554|Nouvelle-Zélande;512|Oman;800|Ouganda;860|Ouzbékistan;586|Pakistan;585|Palaos;275|Palestine;591|Panama;598|Papouasie-Nouvelle-Guinée;600|Paraguay;528|Pays-Bas;604|Pérou;608|Philippines;616|Pologne;620|Portugal;630|Porto Rico;634|Qatar;642|Roumanie;826|Royaume-Uni;643|Russie;646|Rwanda;659|Saint-Kitts-et-Nevis;674|Saint-Marin;670|Saint-Vincent-et-les-Grenadines;662|Sainte-Lucie;882|Samoa;678|Sao Tomé-et-Principe;682|Arabie saoudite;686|Sénégal;688|Serbie;690|Seychelles;694|Sierra Leone;702|Singapour;703|Slovaquie;705|Slovénie;706|Somalie;729|Soudan;728|Soudan du Sud;144|Sri Lanka;752|Suède;756|Suisse;740|Suriname;760|Syrie;762|Tadjikistan;158|Taïwan;834|Tanzanie;203|Tchéquie;764|Thaïlande;626|Timor oriental;768|Togo;776|Tonga;780|Trinité-et-Tobago;788|Tunisie;795|Turkménistan;792|Turquie;798|Tuvalu;804|Ukraine;858|Uruguay;548|Vanuatu;336|Vatican;862|Venezuela;704|Viêt Nam;887|Yémen;894|Zambie;716|Zimbabwe;732|Sahara occidental;XK|Kosovo`
 .split(';').map(s=>{const[id,name]=s.split('|');return{id,name}}).sort((a,b)=>a.name.localeCompare(b.name,'fr'));
const CMAP=Object.fromEntries(COUNTRIES.map(c=>[c.id,c.name]));
const cname=c=>CMAP[c]||'';

/* ---------- champs (personnalisables) ---------- */
const F=(key,label,type,o={})=>Object.assign({key,label,type,group:'Identification'},o);
const CO={group:'Caractéristiques',applies:'coin'},NO={group:'Caractéristiques',applies:'note'};
const RARITY=[['C','Courante'],['R','R — Rare'],['RR','RR — Très rare'],['RRR','RRR — Extrêmement rare'],['RRRR','RRRR — Exceptionnelle'],['U','Unique']];
const AXIS=[['12','↑↑ 12 h (0°) — frappe médaille'],['6','↑↓ 6 h (180°) — frappe monnaie'],['3','→ 3 h (90°)'],['9','← 9 h (270°)'],['other','Autre / irrégulière']];
const BUILTIN=[
 F('type','Type','select',{core:true,options:[['coin','Pièce'],['note','Billet']]}),
 F('country','Pays actuel (pour la carte)','country',{core:true}),
 F('issuer','Émetteur / entité historique','text',{list:'issuers',ph:'Empire romain, URSS, Royaume de France…'}),
 F('denomination','Dénomination','text',{core:true,ph:'1 franc, 10 dollars, denarius…'}),
 F('currency','Devise','text'),
 F('year','Année (grégorienne)','number',{core:true,ph:'Négative pour av. J.-C.'}),
 F('ruler','Souverain / autorité','text'),
 F('dynasty','Dynastie / lignée','text',{list:'dynasties',ph:'Julio-Claudiens, Capétiens, Bourbons…'}),
 F('yearEnd','Année la plus tardive (datation en fourchette)','number',{ph:'Ex. année -44 puis fin -31'}),
 F('attribution','Attribution incertaine ou disputée','text',{ph:'Tricastins ou Allobroges ?'}),
 F('series','Série / type','text'),
 F('catalog','Référence de catalogue','text',{group:'Références',ph:'KM# 123, Pick 45, RIC I 207…'}),
 F('numista','N° Numista (N#)','text',{group:'Références'}),
 F('mintage','Tirage','number',{group:'Références'}),
 F('engraver','Graveur','text',{group:'Références',list:'engravers'}),
 F('hoard','Trésor / lot d’origine','text',{group:'Références',list:'hoards'}),
 F('overstruck','Surfrappe sur (type de la pièce d’origine)','text',{group:'Références'}),
 F('symbols','Symboles, monogrammes, différents','text',{group:'Références',ph:'☧, ⚓, Λ, étoile…'}),
 F('mint','Atelier monétaire','text',CO),
 F('metal','Métal / composition','text',{...CO,list:'metals'}),
 F('fineness','Titre (‰)','number',CO),
 F('weight','Poids (g)','number',CO),
 F('diameter','Diamètre (mm)','number',CO),
 F('edge','Tranche','text',CO),
 F('axis','Axe des coins (orientation du revers)','select',{...CO,options:AXIS}),
 F('material','Support','text',{...NO,list:'materials'}),
 F('printer','Imprimeur','text',NO),
 F('size','Dimensions (mm)','text',NO),
 F('serial','Numéro de série','text',NO),
 F('signatures','Signatures','text',NO),
 F('grade','État / grade','text',{group:'État',list:'grades'}),
 F('variety','Variété / erreur','text',{group:'État'}),
 F('certified','Certification','text',{group:'État',ph:'PCGS MS65 12345678, NGC 1234567-001…'}),
 F('rarity','Rareté','select',{group:'État',options:RARITY}),
 F('obverse','Avers / recto','textarea',{group:'Description'}),
 F('reverse','Revers / verso','textarea',{group:'Description'}),
 F('qty','Quantité','number',{group:'Collection',scope:'owned'}),
 F('storage','Emplacement','path',{group:'Collection',scope:'owned',list:'storages',ph:'Meuble > Tiroir 2 > Classeur bleu > Page 4',private:true}),
 F('trade','Disponible à l’échange','checkbox',{group:'Collection',scope:'owned'}),
 F('public','Visible en mode vitrine','checkbox',{group:'Collection',scope:'owned'}),
 F('paid','Prix payé (total, devise de référence)','money',{group:'Valeur',scope:'owned',private:true}),
 F('paidAmount','Prix payé en devise d’origine','money',{group:'Valeur',scope:'owned',private:true}),
 F('paidCur','Devise d’achat (code ISO)','text',{group:'Valeur',scope:'owned',private:true,list:'currencies',ph:'USD, GBP, JPY…'}),
 F('paidRate','Taux (1 unité d’origine = … devise de réf.)','number',{group:'Valeur',scope:'owned',private:true}),
 F('acquired','Date d’acquisition','date',{group:'Valeur',scope:'owned',private:true}),
 F('source','Provenance / vendeur','text',{group:'Valeur',scope:'owned',private:true}),
 F('value','Valeur estimée (unitaire)','money',{group:'Valeur'}),
 F('priority','Priorité','select',{group:'Souhait',scope:'wish',options:[['3','Haute'],['2','Moyenne'],['1','Basse']]}),
 F('wishStatus','Avancement de la recherche','select',{group:'Souhait',scope:'wish',options:[['search','À rechercher'],['spotted','Repérée'],['nego','En négociation'],['bought','Achetée']]}),
 F('target','Prix maximal acceptable','money',{group:'Souhait',scope:'wish'}),
 F('minGrade','État minimal souhaité','text',{group:'Souhait',scope:'wish',list:'grades'}),
 F('link','Lien','url',{group:'Notes'}),
 F('cats','Catalogues et coffrets','catalogs',{group:'Collection'}),
 F('anecdote','Anecdote historique (avec sa source ci-dessous)','textarea',{group:'Notes'}),
 F('anecdoteSrc','Source de l’anecdote (ouvrage, URL…)','text',{group:'Notes'}),
 F('tags','Étiquettes (séparées par des virgules)','text',{group:'Notes',list:'tags'}),
 F('notes','Notes personnelles (Markdown, LaTeX avec $…$)','markdown',{group:'Notes',private:true})
];
const WISH_ST={search:'À rechercher',spotted:'Repérée',nego:'En négociation',bought:'Achetée'};
const GROUPS=['Identification','Références','Caractéristiques','État','Description','Collection','Valeur','Souhait','Notes','Champs personnalisés'];
const ISSUERS=[
 'République française','Royaume de France','Premier Empire','Second Empire','État français (Vichy)','Royaume de Grande-Bretagne','Royaume-Uni','Empire espagnol','Royaume d’Italie','Union latine','Saint-Empire romain germanique','République de Venise','Royaume de Naples','Royaume de Prusse','Empire allemand','Empire austro-hongrois','Empire russe','Empire ottoman','URSS','RDA','RFA','Yougoslavie','Tchécoslovaquie',
 'Empire romain','République romaine','Grèce antique','Empire byzantin','Empire sassanide','Empire achéménide','Carthage','Égypte ptolémaïque',
 'Empire du Japon','Shogunat Tokugawa','Dynastie Ming','Dynastie Qing','Empire mongol','Raj britannique','Califat abbasside','Perse safavide',
 'Indochine française','Afrique-Occidentale française','Rhodésie','Zaïre','Ceylan','Confédération sudiste'];
const METALS=['Or','Or 900‰','Or 916‰','Argent','Argent 835‰','Argent 900‰','Argent 925‰','Bronze','Cuivre','Laiton','Nickel','Cupronickel','Billon','Aluminium','Zinc','Acier','Acier plaqué','Bimétallique','Électrum','Platine','Palladium'];
const GRADES=['B','TB','TTB','SUP','SPL','FDC','BE','G','VG','F','VF','XF','AU','UNC','MS-60','MS-63','MS-65','PF-65','NEUF'];
const PERIODS=[['antiquite','Antiquité (→ 476)',null,476],['moyenage','Moyen Âge (477–1492)',477,1492],['modernes','Temps modernes (1493–1799)',1493,1799],['xix','XIXe siècle',1800,1899],['xx','XXe siècle',1900,1999],['xxi','XXIe siècle',2000,null]];
const optionsOf=f=>(f.options||[]).map(o=>Array.isArray(o)?o:[o,o]);
