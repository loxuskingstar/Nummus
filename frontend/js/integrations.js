'use strict';
/* ---------- intégrations externes ---------- */
const Integrations={
 numista:{
  _cats:null,
  ready:()=>CONFIG.storage==='rest'||!!state.settings.numista.key,
  async req(path){
   const r=CONFIG.storage==='rest'?await fetch(CONFIG.api.baseUrl+'/numista'+path):await fetch((state.settings.numista.baseUrl||CONFIG.numista.baseUrl)+path,{headers:{'Numista-API-Key':state.settings.numista.key}});
   if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();
  },
  getType(id){return this.req(`/types/${encodeURIComponent(id)}?lang=fr`)},
  async catalogues(){if(!this._cats){const r=await this.req('/catalogues');this._cats=r.catalogues||[]}return this._cats},
  async lookup(it){
   const m=String(it.catalog||'').match(/\b([A-Za-z]{1,8})\s*#?\s*([\w.\-/]+)/);
   if(m){try{const c=(await this.catalogues()).find(c=>norm(c.code)===norm(m[1]));if(c){const r=await this.req(`/types?catalogue=${c.id}&number=${encodeURIComponent(m[2])}&lang=fr`);if(r.types&&r.types.length)return r.types}}catch(e){}}
   const q=[it.denomination,it.issuer||cname(it.country),it.year].filter(x=>!isEmpty(x)).join(' ');
   if(!q.trim())return[];
   const r=await this.req(`/types?q=${encodeURIComponent(q)}&count=10&lang=fr`);return r.types||[];
  },
  map(t){const note=t.category==='banknote';return{
   denomination:t.title,numista:String(t.id),issuer:t.issuer&&t.issuer.name,currency:t.value&&t.value.currency&&t.value.currency.name,
   year:t.min_year,metal:t.composition&&t.composition.text,weight:t.weight,diameter:note?undefined:t.size,
   size:note&&t.size?String(t.size)+(t.size2?' × '+t.size2:''):undefined,edge:t.edge&&t.edge.description,
   obverse:t.obverse&&t.obverse.description,reverse:t.reverse&&t.reverse.description,
   catalog:(t.references||[]).map(r=>[r.catalogue&&r.catalogue.code,r.number].filter(Boolean).join(' ')).join(', ')||undefined,link:t.url}}
 },
 prices:{
  available:()=>CONFIG.storage==='rest',
  async fetch(){const r=await fetch(CONFIG.api.baseUrl+'/prices');if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()}
 }
};
const CERT={PCGS:n=>`https://www.pcgs.com/cert/${n}`,NGC:n=>`https://www.ngccoin.com/certlookup/${n}/`,PMG:n=>`https://www.pmgnotes.com/certlookup/${n}/`};
function certInfo(s){s=String(s||'');const m=s.match(/\b(PCGS|NGC|PMG)\b/i);if(!m)return null;const svc=m[1].toUpperCase();const n=(s.replace(m[0],' ').match(/\b(\d{6,10}(?:-\d{3})?)\b/)||[])[1];return{svc,n:n||null,url:n?CERT[svc](n):null}}
const certHint=v=>{const c=certInfo(v);if(!c)return'';return c.url?`${ic('shield',13)} ${c.svc} n° ${esc(c.n)} détecté — <a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">vérifier sur le site officiel</a>`:`${c.svc} détecté : ajoutez le numéro de certificat (6 à 10 chiffres) pour générer le lien.`};
