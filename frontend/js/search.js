'use strict';
/* ---------- recherche avancée : ET implicite, OR, NOT / -, "phrase", champ:valeur, champ:>10, champ:1900..1950 ---------- */
const QF={nom:'denomination',denomination:'denomination',metal:'metal',poids:'weight',weight:'weight',diametre:'diameter',diameter:'diameter',annee:'year',year:'year',valeur:'value',value:'value',paye:'paid',paid:'paid',qte:'qty',quantite:'qty',titre:'fineness',fineness:'fineness',pays:'country',country:'country',emetteur:'issuer',issuer:'issuer',etat:'grade',grade:'grade',type:'type',tag:'tags',etiquette:'tags',emplacement:'storage',storage:'storage',catalogue:'cats',cat:'cats',ref:'catalog',rarete:'rarity',rarity:'rarity',atelier:'mint',mint:'mint',certif:'certified',notes:'notes',numista:'numista',is:'is'};
const QNUM=new Set(['weight','diameter','year','value','paid','qty','fineness']),QCACHE=new Map();
function numPred(v){
 v=String(v).replace(',','.').trim();let m;
 if((m=v.match(/^(-?\d+(?:\.\d+)?)\.\.(-?\d+(?:\.\d+)?)$/)))return n=>n>=+m[1]&&n<=+m[2];
 if((m=v.match(/^(>=|<=|>|<|=)?\s*(-?\d+(?:\.\d+)?)$/))){const k=+m[2],o=m[1]||'=';return n=>o==='>'?n>k:o==='<'?n<k:o==='>='?n>=k:o==='<='?n<=k:n===k}
 return null;
}
function termPred(t){
 const field=QF[norm(t.f)],txt=s=>i=>searchText(i).includes(s);
 if(!field)return txt(norm(t.f?t.f+':'+t.v:t.v));
 if(vit()&&field!=='is'&&privateKeys().has(field))return()=>false;
 if(field==='is'){const v=norm(t.v);return i=>/^(echang|trade)/.test(v)?!!i.trade:/^(souhait|wish)/.test(v)?i.status==='wish':/^(doubl|dup)/.test(v)?(i.status!=='wish'&&qtyOf(i)>1):/^(collection|owned)/.test(v)?i.status!=='wish':/^(favori|fav|coeur)/.test(v)?!!i.fav:/^(achete|bought)/.test(v)?(i.status==='wish'&&i.wishStatus==='bought'):/^(repere|spotted)/.test(v)?(i.status==='wish'&&i.wishStatus==='spotted'):/^(negoci|nego)/.test(v)?(i.status==='wish'&&i.wishStatus==='nego'):/^(cherch|search|arecherch)/.test(v)?(i.status==='wish'&&(!i.wishStatus||i.wishStatus==='search')):false}
 if(QNUM.has(field)){const f=numPred(t.v);if(!f)return()=>false;
  return field==='qty'?i=>i.status!=='wish'&&f(qtyOf(i)):i=>{if(isEmpty(i[field]))return false;const x=+i[field];return!isNaN(x)&&f(x)}}
 const s=norm(t.v),get={country:i=>cname(i.country)+' '+i.country,type:i=>i.type==='note'?'billet note':'piece coin',tags:i=>tagsOf(i).join(' | '),cats:i=>(i.cats||[]).map(catName).join(' | '),storage:i=>normPath(i.storage)}[field]||(i=>i[field]);
 return i=>norm(get(i)).includes(s);
}
function compileQuery(q){
 const key=(vit()?'V':'N')+q;if(QCACHE.has(key))return QCACHE.get(key);
 const re=/(-?)(?:([\p{L}\d_]+):)?("([^"]*)"|\S+)/gu,groups=[[]];let m,neg=false;
 while((m=re.exec(q))){
  const t={neg:!!m[1],f:m[2]||'',v:m[4]!==undefined?m[4]:m[3],quoted:m[4]!==undefined},bare=!t.f&&!t.quoted&&!t.neg;
  if(bare&&(t.v==='OR'||t.v==='|')){groups.push([]);continue}
  if(bare&&(t.v==='AND'||t.v==='ET'))continue;
  if(bare&&(t.v==='NOT'||t.v==='SAUF')){neg=true;continue}
  const p=termPred(t),n=t.neg!==neg;neg=false;groups[groups.length-1].push(n?i=>!p(i):p);
 }
 const gs=groups.filter(g=>g.length),fn=gs.length?i=>gs.some(g=>g.every(p=>p(i))):()=>true;
 if(QCACHE.size>60)QCACHE.clear();QCACHE.set(key,fn);return fn;
}
/* filtre unique, partagé par l'UI et par Store.items.search (même sémantique côté backend) */
function matchItem(i,f={}){
 if(f.status&&f.status!=='all'&&(i.status==='wish'?'wish':'owned')!==f.status)return false;
 if(f.type&&i.type!==f.type)return false;
 if(f.country&&i.country!==f.country)return false;
 if(f.metal&&!norm(i.metal).includes(norm(f.metal)))return false;
 if(f.grade&&norm(i.grade)!==norm(f.grade))return false;
 const ymin=isEmpty(f.yearMin)?null:+f.yearMin,ymax=isEmpty(f.yearMax)?null:+f.yearMax;
 if(ymin!==null||ymax!==null){if(!hasYear(i))return false;if(ymin!==null&&+i.year<ymin)return false;if(ymax!==null&&+i.year>ymax)return false}
 const vmin=isEmpty(f.valueMin)?null:+f.valueMin,vmax=isEmpty(f.valueMax)?null:+f.valueMax;
 if(vmin!==null||vmax!==null){const raw=i.status==='wish'?i.target:i.value;if(isEmpty(raw)||isNaN(+raw))return false;if(vmin!==null&&+raw<vmin)return false;if(vmax!==null&&+raw>vmax)return false}
 if(f.tag&&!tagsOf(i).some(t=>norm(t)===norm(f.tag)))return false;
 if(f.trade&&!i.trade)return false;
 if(f.cat&&!(i.cats||[]).includes(f.cat))return false;
 if(f.nostorage&&normPath(i.storage))return false;
 if(f.storage){const p=norm(normPath(i.storage)),q=norm(normPath(f.storage));if(!(p===q||p.startsWith(q+' > ')||(q&&p.startsWith(q))))return false}
 if(f.q&&!compileQuery(String(f.q))(i))return false;
 return true;
}

/* ---------- Markdown minimal (échappé) + LaTeX ---------- */
function md(src){
 const maths=[];
 let s=String(src||'')
  .replace(/\$\$([\s\S]+?)\$\$/g,(m,t)=>{maths.push([t,true]);return`\u0000${maths.length-1}\u0000`})
  .replace(/\$([^\s$](?:[^$\n]*[^\s$])?)\$(?!\d)/g,(m,t)=>{maths.push([t,false]);return`\u0000${maths.length-1}\u0000`});
 const inline=t=>t.replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g,'$1<em>$2</em>').replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
 const lines=esc(s).split('\n');let out=[],list=null,para=[];
 const flushP=()=>{if(para.length){out.push('<p>'+inline(para.join('<br>'))+'</p>');para=[]}};
 const flushL=()=>{if(list){out.push(`</${list}>`);list=null}};
 for(const raw of lines){const l=raw.trimEnd();let m;
  if(!l.trim()){flushP();flushL();continue}
  if((m=l.match(/^(#{1,3})\s+(.*)/))){flushP();flushL();out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`)}
  else if(/^(-{3,}|\*{3,})$/.test(l.trim())){flushP();flushL();out.push('<hr>')}
  else if((m=l.match(/^&gt;\s?(.*)/))){flushP();flushL();out.push(`<blockquote>${inline(m[1])}</blockquote>`)}
  else if((m=l.match(/^\s*[-*]\s+(.*)/))){flushP();if(list!=='ul'){flushL();out.push('<ul>');list='ul'}out.push(`<li>${inline(m[1])}</li>`)}
  else if((m=l.match(/^\s*\d+[.)]\s+(.*)/))){flushP();if(list!=='ol'){flushL();out.push('<ol>');list='ol'}out.push(`<li>${inline(m[1])}</li>`)}
  else{flushL();para.push(l)}}
 flushP();flushL();
 return out.join('').replace(/\u0000(\d+)\u0000/g,(m,n)=>tex(maths[n][0],maths[n][1]));
}
