'use strict';
/* ---------- visionneuse plein écran ---------- */
let LB=null;
function openLightbox(itemId,mid){
 const it=state.items.find(i=>i.id===itemId);if(!it||!(it.imgs||[]).length)return;
 LB={it,imgs:it.imgs,i:Math.max(0,it.imgs.findIndex(m=>m.id===mid)),s:1,fit:1,x:0,y:0};
 $('#lb').hidden=false;document.body.style.overflow='hidden';lbShow();
}
function closeLB(){LB=null;const e=$('#lb');e.hidden=true;e.innerHTML='';if($('#modal').hidden&&$('#modal2').hidden)document.body.style.overflow=''}
function lbApply(){const im=$('#lbimg');if(im&&LB)im.style.transform=`translate(-50%,-50%) translate(${LB.x}px,${LB.y}px) scale(${LB.s})`}
function lbFit(){const st=$('#lbst'),im=$('#lbimg');if(!LB||!st||!im||!im.naturalWidth)return;im.style.width=im.naturalWidth+'px';im.style.height=im.naturalHeight+'px';LB.fit=Math.min(st.clientWidth/im.naturalWidth,st.clientHeight/im.naturalHeight);LB.s=LB.fit;LB.x=LB.y=0;lbApply()}
function lbZoom(f,cx=0,cy=0){if(!LB)return;const s=Math.min(Math.max(LB.s*f,LB.fit),Math.max(8,LB.fit*8)),r=s/LB.s;LB.x=cx-(cx-LB.x)*r;LB.y=cy-(cy-LB.y)*r;LB.s=s;if(s<=LB.fit*1.001)LB.x=LB.y=0;lbApply()}
function lbShow(){
 const m=LB.imgs[LB.i],el=$('#lb');
 el.innerHTML=`<div class="lbstage" id="lbst"><img id="lbimg" src="${esc(imgSync(m.id))}" alt="" draggable="false"></div><div class="lbbar"><span>${esc(m.cap||roleLabel(LB.it,m.role))} · ${LB.i+1}/${LB.imgs.length}</span><div class="actions"><button class="btn sm" data-act="lbz" data-d="1.4" aria-label="Zoom avant">${ic('plus',16)}</button><button class="btn sm" data-act="lbz" data-d="0.71" aria-label="Zoom arrière">−</button><button class="btn sm" data-act="lbreal">100 %</button><button class="btn sm" data-act="lbfit">Ajuster</button><button class="btn sm" data-act="lbclose" aria-label="Fermer">${ic('x',16)}</button></div></div>${LB.imgs.length>1?`<button class="lbnav l" data-act="lbnav" data-d="-1" aria-label="Précédente">‹</button><button class="lbnav r" data-act="lbnav" data-d="1" aria-label="Suivante">›</button>`:''}`;
 const im=$('#lbimg'),st=$('#lbst'),pts=new Map();let last=0;
 im.onload=lbFit;if(im.complete)lbFit();
 const dist=()=>{const v=[...pts.values()];return v.length>1?Math.hypot(v[0][0]-v[1][0],v[0][1]-v[1][1]):0};
 const rel=(x,y)=>{const r=st.getBoundingClientRect();return[x-r.left-r.width/2,y-r.top-r.height/2]};
 st.addEventListener('pointerdown',e=>{st.setPointerCapture(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY]);last=dist()});
 st.addEventListener('pointermove',e=>{const p=pts.get(e.pointerId);if(!p)return;
  if(pts.size===1){if(LB.s>LB.fit*1.001){LB.x+=e.clientX-p[0];LB.y+=e.clientY-p[1];lbApply()}pts.set(e.pointerId,[e.clientX,e.clientY])}
  else{pts.set(e.pointerId,[e.clientX,e.clientY]);const d=dist(),v=[...pts.values()];if(last)lbZoom(d/last,...rel((v[0][0]+v[1][0])/2,(v[0][1]+v[1][1])/2));last=d}});
 const up=e=>{pts.delete(e.pointerId);last=0};st.addEventListener('pointerup',up);st.addEventListener('pointercancel',up);
 st.addEventListener('wheel',e=>{e.preventDefault();lbZoom(Math.exp(-e.deltaY*.0015),...rel(e.clientX,e.clientY))},{passive:false});
 st.addEventListener('dblclick',e=>{if(LB.s>LB.fit*1.05)lbZoom(LB.fit/LB.s);else lbZoom(Math.max(1,LB.fit*2.5)/LB.s,...rel(e.clientX,e.clientY))});
}


/* ---------- partage : image de fiche ---------- */
const SHARE={id:null,fmt:'portrait',value:false,theme:'auto',style:'classic'};
function wrapText(x,t,maxW,maxLines){
 const words=String(t).split(/\s+/),lines=[];let cur='';
 for(const w of words){const test=cur?cur+' '+w:w;if(x.measureText(test).width>maxW&&cur){lines.push(cur);cur=w}else cur=test}
 if(cur)lines.push(cur);
 if(lines.length>maxLines){lines.length=maxLines;let l=lines[maxLines-1];while(x.measureText(l+'…').width>maxW&&l.length>1)l=l.slice(0,-1);lines[maxLines-1]=l+'…'}
 else if(lines.length&&x.measureText(lines[lines.length-1]).width>maxW){let l=lines[lines.length-1];while(x.measureText(l+'…').width>maxW&&l.length>1)l=l.slice(0,-1);lines[lines.length-1]=l+'…'}
 return lines;
}
function rrect(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath()}
function hex6(c){c=String(c).trim();if(/^#[0-9a-f]{3}$/i.test(c))c='#'+c.slice(1).replace(/./g,'$&$&');return/^#[0-9a-f]{6}$/i.test(c)?c:'#2f8a78'}
function shareFacts(it,o){
 const ax=(AXIS.find(a=>a[0]===it.axis)||[])[1],ra=(RARITY.find(a=>a[0]===it.rarity)||[])[1];
 const f=[['Émetteur',it.issuer],['Souverain',it.ruler],['Atelier',it.mint],['Métal',it.metal],['Titre',isEmpty(it.fineness)?'':it.fineness+' ‰'],['Poids',isEmpty(it.weight)?'':it.weight+' g'],['Diamètre',isEmpty(it.diameter)?'':it.diameter+' mm'],['Dimensions',it.size?it.size+' mm':''],['Tranche',it.edge],['Axe',ax&&ax.replace(' — frappe ',' · ')],['Rareté',ra],['Tirage',isEmpty(it.mintage)?'':new Intl.NumberFormat('fr-FR').format(it.mintage)],['Référence',it.catalog],['N# Numista',it.numista],['Certification',it.certified],['Variété',it.variety]];
 if(o.value&&!hideVals()&&!isEmpty(it.value)&&it.status!=='wish')f.push(['Valeur estimée',fmtMoney(it.value)]);
 return f.filter(r=>!isEmpty(r[1]));
}
async function drawShareClassic(it,o,cv){
 const W=1080,H={portrait:1350,square:1080,story:1920}[o.fmt]||1350,P=64;
 cv.width=W;cv.height=H;const x=cv.getContext('2d');
 const accent=hex6(getComputedStyle(document.documentElement).getPropertyValue('--accent')),dark=o.theme==='auto'?document.documentElement.dataset.theme!=='light':o.theme==='dark';
 const serif='Georgia,"Iowan Old Style","Palatino Linotype",serif',sans='system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
 const C=dark?{bg:'#09090a',tx:'#f1f1f2',mu:'#9a9ca1',pn:'rgba(255,255,255,.055)',bd:'rgba(255,255,255,.11)'}:{bg:'#f3f5f4',tx:'#15181a',mu:'#60686b',pn:'rgba(0,0,0,.045)',bd:'rgba(0,0,0,.1)'};
 const n=parseInt(accent.slice(1),16),onAcc=(0.299*(n>>16)+0.587*((n>>8)&255)+0.114*(n&255))/255>0.62?'#111':'#fff';
 x.fillStyle=C.bg;x.fillRect(0,0,W,H);
 let g=x.createRadialGradient(W*.9,-80,0,W*.9,-80,W*.95);g.addColorStop(0,accent+'55');g.addColorStop(1,accent+'00');x.fillStyle=g;x.fillRect(0,0,W,H);
 g=x.createRadialGradient(0,H,0,0,H,W*.85);g.addColorStop(0,accent+'30');g.addColorStop(1,accent+'00');x.fillStyle=g;x.fillRect(0,0,W,H);
 /* en-tête */
 x.textBaseline='middle';x.beginPath();x.arc(P+16,84,13,0,Math.PI*2);x.lineWidth=5;x.strokeStyle=accent;x.stroke();
 x.fillStyle=C.tx;x.font=`600 38px ${serif}`;x.fillText('Nummus',P+46,84);
 x.textAlign='right';x.fillStyle=C.mu;x.font=`600 24px ${sans}`;if('letterSpacing'in x)x.letterSpacing='3px';
 x.fillText((it.type==='note'?'BILLET':'PIÈCE')+(it.status==='wish'?' · SOUHAIT':''),W-P,84);x.textAlign='left';if('letterSpacing'in x)x.letterSpacing='0px';
 /* visuels */
 const imgH=Math.round(H*(o.fmt==='story'?.34:o.fmt==='square'?.37:.40)),py=140;
 rrect(x,P,py,W-2*P,imgH,44);x.fillStyle=C.pn;x.fill();x.lineWidth=2;x.strokeStyle=C.bd;x.stroke();
 const imgs=it.imgs||[],fr=imgs.find(m=>m.role==='front')||imgs[0],bk=imgs.find(m=>m.role==='back'&&m!==fr),els=[];
 for(const m of[fr,bk].filter(Boolean)){try{const u=await imgURL(m.id);if(u)els.push(await loadImage(u))}catch(e){}}
 if(els.length){
  const k=els.length,pad=36,cw=(W-2*P-pad*(k+1))/k,ch=imgH-pad*2;
  x.save();x.shadowColor='rgba(0,0,0,.45)';x.shadowBlur=40;x.shadowOffsetY=16;
  els.forEach((im,i)=>{const sc=Math.min(cw/im.naturalWidth,ch/im.naturalHeight),w=im.naturalWidth*sc,h=im.naturalHeight*sc;x.drawImage(im,P+pad+i*(cw+pad)+(cw-w)/2,py+pad+(ch-h)/2,w,h)});
  x.restore();
 }else{x.beginPath();x.arc(W/2,py+imgH/2,imgH*.27,0,Math.PI*2);x.lineWidth=14;x.strokeStyle=accent+'88';x.stroke();x.beginPath();x.arc(W/2,py+imgH/2,imgH*.17,0,Math.PI*2);x.lineWidth=6;x.stroke()}
 /* titre */
 x.textBaseline='alphabetic';let y=py+imgH+92;
 x.fillStyle=C.tx;x.font=`700 68px ${serif}`;
 const tl=wrapText(x,it.denomination||'',W-2*P,2);tl.forEach((l,i)=>x.fillText(l,P,y+i*78));y+=(tl.length-1)*78+54;
 x.fillStyle=C.mu;x.font=`500 34px ${sans}`;x.fillText([cname(it.country),fmtYear(it.year)].filter(Boolean).join('   ·   '),P,y);
 /* pastilles */
 const chips=[it.grade,it.rarity&&it.rarity!=='C'?it.rarity:'',it.metal].filter(Boolean);let top=y+34;
 if(chips.length){
  let cx=P;const cy=y+34;x.font=`600 26px ${sans}`;
  chips.forEach((t,i)=>{const w=Math.min(x.measureText(t).width+44,W-P-cx),lab=wrapText(x,t,w-44,1)[0];rrect(x,cx,cy,w,50,25);x.fillStyle=i===0?accent:C.pn;x.fill();if(i){x.lineWidth=2;x.strokeStyle=C.bd;x.stroke()}x.fillStyle=i===0?onAcc:C.tx;x.fillText(lab,cx+22,cy+34);cx+=w+12});
  top=cy+50+46;
 }
 /* caractéristiques */
 const facts=shareFacts(it,o),colW=(W-2*P-40)/2,bottom=H-150,rowH=104,maxRows=Math.max(0,Math.floor((bottom-top)/rowH));
 facts.slice(0,maxRows*2).forEach((r,i)=>{
  const fx=P+(i%2)*(colW+40),fy=top+Math.floor(i/2)*rowH;
  x.fillStyle=C.mu;x.font=`600 21px ${sans}`;if('letterSpacing'in x)x.letterSpacing='2px';x.fillText(r[0].toUpperCase(),fx,fy+20);if('letterSpacing'in x)x.letterSpacing='0px';
  x.fillStyle=C.tx;x.font=`600 32px ${sans}`;x.fillText(wrapText(x,r[1],colW,1)[0],fx,fy+62);
 });
 /* pied */
 x.strokeStyle=C.bd;x.lineWidth=2;x.beginPath();x.moveTo(P,H-112);x.lineTo(W-P,H-112);x.stroke();
 x.fillStyle=C.mu;x.font=`500 26px ${sans}`;x.fillText(state.settings.owner||'Collection numismatique',P,H-60);
 x.textAlign='right';x.fillStyle=accent;x.fillText('Nummus',W-P,H-60);x.textAlign='left';
}
function openShare(id){
 const it=state.items.find(i=>i.id===id);if(!it)return;SHARE.id=id;
 openModal2(`<div class="mhead"><div><h2>Partager en image</h2><p class="muted small">Image sans prix d’achat, provenance, emplacement ni notes personnelles.</p></div><button class="x" data-act="close2" aria-label="Fermer">${ic('x',22)}</button></div>
 <div class="shgrid"><canvas id="shcv" class="sharecv"></canvas><div class="stack" style="gap:12px">
 <div class="fld"><label>Format</label><select data-ch="shFmt">${opt([['portrait','Portrait 4:5'],['square','Carré 1:1'],['story','Story 9:16']],SHARE.fmt)}</select></div>
 <div class="fld"><label>Style</label><select data-ch="shStyle">${opt(Object.entries(SHARE_STYLES).map(([k,v])=>[k,v[0]]),SHARE.style)}</select></div>
 <div class="fld"><label>Thème</label><select data-ch="shTheme">${opt([['auto','Comme l’application'],['dark','Sombre'],['light','Clair']],SHARE.theme)}</select></div>
 ${hideVals()||it.status==='wish'?'':`<label class="chk"><input type="checkbox" data-ch="shValue" ${SHARE.value?'checked':''}> Afficher la valeur estimée</label>`}
 <div class="actions"><button class="btn primary" data-act="shDl">${ic('download',16)} Télécharger PNG</button>${navigator.canShare?`<button class="btn" data-act="shSend">${ic('share',16)} Partager…</button>`:''}</div></div></div>`,true);
 renderShare();
}
function renderShare(){const it=state.items.find(i=>i.id===SHARE.id),cv=$('#shcv');if(it&&cv)drawShare(it,SHARE,cv).catch(e=>{console.error(e);toast('Image impossible')})}
function downloadBlob(name,b){const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},800)}

/* ===== Styles supplémentaires pour l'image de partage ===== */
const SHARE_DIM={portrait:1350,square:1080,story:1920};
const SERIF='Georgia,"Iowan Old Style","Palatino Linotype",serif',SANS='system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',MONO='ui-monospace,"SF Mono",Menlo,Consolas,monospace';
const subLine=it=>[cname(it.country),fmtYear(it.year)].filter(Boolean).join('  ·  ');
async function shareEls(it){
 const imgs=it.imgs||[],fr=imgs.find(m=>m.role==='front')||imgs[0],bk=imgs.find(m=>m.role==='back'&&m!==fr),els=[];
 for(const m of[fr,bk].filter(Boolean)){try{const u=await imgURL(m.id);if(u)els.push(await loadImage(u))}catch(e){}}
 return els;
}
function fitImg(x,im,cx,cy,mw,mh,shadow=0){
 const s=Math.min(mw/im.naturalWidth,mh/im.naturalHeight),w=im.naturalWidth*s,h=im.naturalHeight*s;
 x.save();if(shadow){x.shadowColor='rgba(0,0,0,.42)';x.shadowBlur=shadow;x.shadowOffsetY=shadow/3}
 x.drawImage(im,cx-w/2,cy-h/2,w,h);x.restore();return{cx,cy,w,h};
}
/* dessine 1 ou 2 faces côte à côte ; renvoie les rectangles dessinés */
function facesRow(x,els,cx,cy,mw,mh,shadow,gap=40,col='#999'){
 if(!els.length){x.strokeStyle=col;x.lineWidth=Math.min(mw,mh)*.04;x.beginPath();x.arc(cx,cy,Math.min(mw,mh)*.3,0,7);x.stroke();x.lineWidth=Math.min(mw,mh)*.02;x.beginPath();x.arc(cx,cy,Math.min(mw,mh)*.18,0,7);x.stroke();return[]}
 const k=els.length,w=(mw-gap*(k-1))/k;
 return els.map((im,i)=>fitImg(x,im,cx+(i-(k-1)/2)*(w+gap),cy,w,mh,shadow));
}
function setupShare(o,cv){const W=1080,H=SHARE_DIM[o.fmt]||1350;cv.width=W;cv.height=H;return[W,H,cv.getContext('2d')]}
const spacing=(x,px)=>{if('letterSpacing'in x)x.letterSpacing=px+'px'};
const one=(x,t,w)=>wrapText(x,String(t),w,1)[0]||'';
function centered(x,t,cx,y,maxW,lh,maxLines){const l=wrapText(x,t,maxW,maxLines);l.forEach((s,i)=>x.fillText(s,cx,y+i*lh));return l.length}
/* grille de faits en 2 colonnes, limitée à la place disponible (jamais de débordement) */
function factGrid(x,facts,cx,y,bottom,w,st){
 const rowH=st.rowH||92,rows=Math.max(0,Math.floor((bottom-y+(st.slack||0))/rowH)),colW=(w-20)/2;
 x.textAlign=st.align||'center';
 facts.slice(0,rows*2).forEach((r,i)=>{
  const col=i%2,fx=cx+(col?1:-1)*(colW/2+10),fy=y+Math.floor(i/2)*rowH;
  if(st.panel){rrect(x,fx-colW/2,fy-30,colW,rowH-14,18);x.fillStyle=st.panel;x.fill()}
  x.fillStyle=st.lab;x.font=st.labFont;spacing(x,3);x.fillText(r[0].toUpperCase(),fx,fy);spacing(x,0);
  x.fillStyle=st.val;x.font=st.valFont;x.fillText(one(x,r[1],colW-30),fx,fy+42)});
 return Math.min(rows,Math.ceil(facts.length/2));
}
function dimLine(x,x1,x2,y,label,col,font){
 x.save();x.strokeStyle=col;x.fillStyle=col;x.lineWidth=2;
 x.beginPath();x.moveTo(x1,y);x.lineTo(x2,y);x.moveTo(x1,y-12);x.lineTo(x1,y+12);x.moveTo(x2,y-12);x.lineTo(x2,y+12);x.stroke();
 x.font=font;x.textAlign='center';const w=x.measureText(label).width+24;x.fillStyle=x._bg||'#0d2b4d';x.fillRect((x1+x2)/2-w/2,y-16,w,32);x.fillStyle=col;x.textBaseline='middle';x.fillText(label,(x1+x2)/2,y+1);x.restore();
}

/* 1) Cartel de musée */
async function drawMuseum(it,o,cv){
 const[W,H,x]=setupShare(o,cv),ink='#2a2118',mu='#7a6c58',gold='#8a6a2e',story=o.fmt==='story',sq=o.fmt==='square';
 x.fillStyle='#f4efe4';x.fillRect(0,0,W,H);
 x.strokeStyle=gold;x.lineWidth=3;x.strokeRect(36,36,W-72,H-72);x.lineWidth=1;x.strokeRect(54,54,W-108,H-108);
 const ch=H*(story?.30:sq?.30:.34),cy=110+ch/2;
 facesRow(x,await shareEls(it),W/2,cy,W-240,ch,36,50,gold);
 x.textAlign='center';x.textBaseline='alphabetic';let y=cy+ch/2+(sq?80:96);
 x.fillStyle=ink;x.font=`italic 600 ${sq?54:62}px ${SERIF}`;const lh=sq?62:72;y+=centered(x,it.denomination||'',W/2,y,W-220,lh,2)*lh-10;
 x.fillStyle=gold;x.font=`500 26px ${SERIF}`;spacing(x,5);x.fillText(one(x,subLine(it).toUpperCase(),W-200),W/2,y);spacing(x,0);
 y+=34;x.strokeStyle=gold;x.lineWidth=2;x.beginPath();x.moveTo(W/2-60,y);x.lineTo(W/2+60,y);x.stroke();y+=sq?48:56;
 const L=120,rowH=sq?54:62,rows=Math.max(0,Math.floor((H-140-y)/rowH));
 shareFacts(it,o).slice(0,rows).forEach((r,i)=>{const fy=y+i*rowH;
  x.textAlign='left';x.fillStyle=mu;x.font=`italic 26px ${SERIF}`;x.fillText(r[0],L,fy);const lw=x.measureText(r[0]).width;
  x.textAlign='right';x.fillStyle=ink;x.font=`600 28px ${SERIF}`;const v=one(x,r[1],W-2*L-lw-60),vw=x.measureText(v).width;x.fillText(v,W-L,fy);
  x.save();x.strokeStyle=mu;x.globalAlpha=.55;x.setLineDash([2,9]);x.lineWidth=2;x.beginPath();x.moveTo(L+lw+14,fy-6);x.lineTo(W-L-vw-14,fy-6);x.stroke();x.restore()});
 x.textAlign='center';x.fillStyle=mu;x.font=`500 22px ${SERIF}`;x.fillText(one(x,state.settings.owner||'Collection numismatique',W-240),W/2,H-86);x.textAlign='left';
}

/* 2) Affiche */
async function drawPoster(it,o,cv){
 const[W,H,x]=setupShare(o,cv),accent=hex6(getComputedStyle(document.documentElement).getPropertyValue('--accent')),n=parseInt(accent.slice(1),16);
 const dark=(0.299*(n>>16)+0.587*((n>>8)&255)+0.114*(n&255))/255<=0.62,fg=dark?'#ffffff':'#101214',story=o.fmt==='story',sq=o.fmt==='square';
 x.fillStyle=accent;x.fillRect(0,0,W,H);
 const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(255,255,255,.14)');g.addColorStop(1,'rgba(0,0,0,.26)');x.fillStyle=g;x.fillRect(0,0,W,H);
 x.textBaseline='middle';x.fillStyle=fg;x.font=`800 30px ${SANS}`;spacing(x,6);x.fillText('NUMMUS',70,92);x.textAlign='right';x.fillText((it.type==='note'?'BILLET':'PIÈCE'),W-70,92);x.textAlign='left';spacing(x,0);
 const pr=W*(story?.36:sq?.25:.33),pcy=(sq?150:H*(story?.30:.33)-(story?0:0))+(sq?pr:0)*(sq?1:0)-(sq?0:0);
 const cy=sq?150+pr:pcy;
 x.beginPath();x.arc(W/2,cy,pr,0,7);x.fillStyle=dark?'rgba(255,255,255,.16)':'rgba(0,0,0,.10)';x.fill();
 facesRow(x,await shareEls(it),W/2,cy,pr*1.7,pr*1.45,34,16,fg);
 x.textBaseline='alphabetic';x.fillStyle=fg;
 const top=cy+pr+24,bottom=H-64,subH=64,text=(it.denomination||'').toUpperCase();
 let fs=118,lines,th;
 do{x.font=`800 ${fs}px ${SANS}`;lines=wrapText(x,text,W-140,3);th=lines.length*fs*.98;fs-=4}while(fs>48&&(lines.some(l=>l.endsWith('…'))||th+subH>bottom-top));
 fs+=4;let y=top+fs*.9;lines.forEach((l,i)=>x.fillText(l,70,y+i*fs*.98));y=top+th+36;
 const rem=bottom-(y+subH-20);
 const showYear=hasYear(it)&&rem>=150,yr=hasYear(it)?String(Math.abs(it.year))+(+it.year<0?' av.':''):'';
 x.font=`500 34px ${SANS}`;x.globalAlpha=.88;
 x.fillText(one(x,[cname(it.country),it.metal,showYear?'':yr].filter(Boolean).join('  ·  '),W-140),70,y+30);x.globalAlpha=1;
 if(showYear){const fz=Math.min(story?300:230,Math.floor(rem/.8));x.font=`800 ${fz}px ${SANS}`;x.lineWidth=5;x.strokeStyle=fg;x.globalAlpha=.9;x.strokeText(yr,66,bottom);x.globalAlpha=1}
}

/* 3) Épuré */
async function drawMinimal(it,o,cv){
 const[W,H,x]=setupShare(o,cv),dark=o.theme==='auto'?document.documentElement.dataset.theme!=='light':o.theme==='dark';
 const bg=dark?'#0c0d0e':'#fbfbf9',tx=dark?'#f2f2f0':'#141516',mu=dark?'#8d9094':'#7b7f82',sq=o.fmt==='square';
 x.fillStyle=bg;x.fillRect(0,0,W,H);
 const ch=H*(o.fmt==='story'?.42:sq?.46:.50),cy=H*.07+ch/2+30;
 facesRow(x,await shareEls(it),W/2,cy,W-200,ch,30,60,mu);
 x.textAlign='center';x.textBaseline='alphabetic';let y=cy+ch/2+(sq?90:110);
 x.fillStyle=tx;x.font=`500 ${sq?48:54}px ${SERIF}`;const lh=sq?56:64;y+=centered(x,it.denomination||'',W/2,y,W-200,lh,2)*lh-14;
 x.fillStyle=mu;x.font=`400 26px ${SANS}`;spacing(x,2);x.fillText(one(x,subLine(it),W-160),W/2,y);
 const f=[(it.metal||'').length<26?it.metal:'',isEmpty(it.weight)?'':it.weight+' g',isEmpty(it.diameter)?'':it.diameter+' mm',it.grade].filter(Boolean).join('   ·   ');
 if(f){x.font=`400 22px ${SANS}`;x.fillText(one(x,f,W-160),W/2,y+50)}
 spacing(x,6);x.font=`600 20px ${SANS}`;x.fillText('NUMMUS',W/2,H-60);spacing(x,0);x.textAlign='left';
}

/* 4) Galerie */
async function drawGallery(it,o,cv){
 const[W,H,x]=setupShare(o,cv),gold='#d8b46a',cream='#f3ead7',story=o.fmt==='story',sq=o.fmt==='square';
 x.fillStyle='#050505';x.fillRect(0,0,W,H);
 const cy=H*(story?.29:sq?.27:.33),ch=H*(story?.27:sq?.30:.30);
 const g=x.createRadialGradient(W/2,cy-ch*.15,0,W/2,cy-ch*.15,W*.78);g.addColorStop(0,'rgba(255,236,190,.34)');g.addColorStop(.55,'rgba(255,236,190,.07)');g.addColorStop(1,'rgba(255,236,190,0)');x.fillStyle=g;x.fillRect(0,0,W,H);
 facesRow(x,await shareEls(it),W/2,cy,W-220,ch,60,50,gold);
 const fl=cy+ch/2+14;x.fillStyle='rgba(216,180,106,.5)';x.fillRect(W/2-170,fl,340,3);
 x.textAlign='center';x.textBaseline='alphabetic';let y=fl+(sq?84:104);
 x.fillStyle=cream;x.font=`600 ${sq?54:64}px ${SERIF}`;const lh=sq?62:74;y+=centered(x,it.denomination||'',W/2,y,W-200,lh,2)*lh-14;
 x.fillStyle=gold;x.font=`500 24px ${SANS}`;spacing(x,6);x.fillText(one(x,subLine(it).toUpperCase(),W-160),W/2,y);spacing(x,0);y+=sq?62:70;
 factGrid(x,shareFacts(it,o),W/2,y,H-118,W-240,{lab:gold,val:cream,labFont:`600 20px ${SANS}`,valFont:`500 30px ${SERIF}`,rowH:sq?84:92});
 x.fillStyle='#8a8272';x.font=`500 20px ${SANS}`;spacing(x,4);x.textAlign='center';x.fillText(one(x,(state.settings.owner||'Collection numismatique').toUpperCase(),W-200),W/2,H-62);spacing(x,0);x.textAlign='left';
}

/* 5) Médaille : bleu nuit, chaque face dans un anneau d'or */
async function drawMedal(it,o,cv){
 const[W,H,x]=setupShare(o,cv),gold='#e0c070',story=o.fmt==='story',sq=o.fmt==='square';
 const g=x.createRadialGradient(W/2,H*.25,0,W/2,H*.25,H*.9);g.addColorStop(0,'#16294d');g.addColorStop(1,'#050b1a');x.fillStyle=g;x.fillRect(0,0,W,H);
 const els=await shareEls(it),k=Math.max(1,els.length),maxD=Math.min((W-220-60*(k-1))/k,H*(story?.27:sq?.30:.30)),cy=H*(story?.25:sq?.27:.27)+(sq?20:30);
 if(!els.length)facesRow(x,els,W/2,cy,maxD,maxD,0,0,gold);
 els.forEach((im,i)=>{const cx=W/2+(i-(k-1)/2)*(maxD+60);
  x.strokeStyle=gold;x.lineWidth=5;x.beginPath();x.arc(cx,cy,maxD/2+16,0,7);x.stroke();
  x.lineWidth=1.5;x.globalAlpha=.55;x.beginPath();x.arc(cx,cy,maxD/2+32,0,7);x.stroke();x.globalAlpha=1;
  fitImg(x,im,cx,cy,maxD,maxD,40)});
 x.textAlign='center';x.textBaseline='alphabetic';let y=cy+maxD/2+(sq?100:116);
 x.fillStyle='#f6f1e4';x.font=`700 ${sq?52:60}px ${SERIF}`;const lh=sq?60:70;y+=centered(x,it.denomination||'',W/2,y,W-180,lh,2)*lh-12;
 x.fillStyle=gold;x.font=`500 24px ${SANS}`;spacing(x,6);x.fillText(one(x,subLine(it).toUpperCase(),W-160),W/2,y);spacing(x,0);y+=sq?62:72;
 factGrid(x,shareFacts(it,o),W/2,y,H-112,W-200,{panel:'rgba(255,255,255,.06)',lab:gold,val:'#f6f1e4',labFont:`600 18px ${SANS}`,valFont:`500 28px ${SERIF}`,rowH:sq?92:100});
 x.fillStyle='#6f7a93';x.font=`500 20px ${SANS}`;spacing(x,4);x.fillText('NUMMUS',W/2,H-58);spacing(x,0);x.textAlign='left';
}

/* 6) Vintage : papier sépia, double bordure, ornements */
async function drawVintage(it,o,cv){
 const[W,H,x]=setupShare(o,cv),ink='#3b2a17',mu='#7b6444',story=o.fmt==='story',sq=o.fmt==='square';
 const g=x.createRadialGradient(W/2,H/2,H*.2,W/2,H/2,H*.8);g.addColorStop(0,'#eadfc4');g.addColorStop(1,'#d3bf96');x.fillStyle=g;x.fillRect(0,0,W,H);
 x.strokeStyle=ink;x.lineWidth=7;x.strokeRect(34,34,W-68,H-68);x.lineWidth=2;x.strokeRect(54,54,W-108,H-108);
 [[54,54],[W-54,54],[54,H-54],[W-54,H-54]].forEach(([a,b])=>{x.fillStyle=ink;x.save();x.translate(a,b);x.rotate(Math.PI/4);x.fillRect(-9,-9,18,18);x.restore()});
 x.textAlign='center';x.textBaseline='alphabetic';x.fillStyle=mu;x.font=`600 22px ${SERIF}`;spacing(x,8);x.fillText(it.type==='note'?'BILLET DE COLLECTION':'MONNAIE DE COLLECTION',W/2,118);spacing(x,0);
 const ch=H*(story?.29:sq?.29:.33),cy=150+ch/2+10;
 x.save();if('filter'in x)x.filter='sepia(.55) contrast(1.05)';
 facesRow(x,await shareEls(it),W/2,cy,W-240,ch,30,50,mu);x.restore();
 let y=cy+ch/2+(sq?84:100);
 x.fillStyle=ink;x.font=`700 ${sq?48:56}px ${SERIF}`;spacing(x,2);const lh=sq?56:64;y+=centered(x,(it.denomination||'').toUpperCase(),W/2,y,W-190,lh,2)*lh-10;spacing(x,0);
 x.strokeStyle=ink;x.lineWidth=2;x.beginPath();x.moveTo(W/2-180,y+6);x.lineTo(W/2-18,y+6);x.moveTo(W/2+18,y+6);x.lineTo(W/2+180,y+6);x.stroke();x.save();x.translate(W/2,y+6);x.rotate(Math.PI/4);x.fillStyle=ink;x.fillRect(-6,-6,12,12);x.restore();
 y+=52;x.fillStyle=mu;x.font=`italic 30px ${SERIF}`;x.fillText(one(x,subLine(it),W-200),W/2,y);y+=sq?52:62;
 const rowH=sq?46:54,rows=Math.max(0,Math.floor((H-130-y)/rowH));
 shareFacts(it,o).slice(0,rows).forEach((r,i)=>{x.fillStyle=ink;x.font=`600 26px ${SERIF}`;x.fillText(one(x,r[0]+'  ·  '+r[1],W-220),W/2,y+i*rowH)});
 x.fillStyle=mu;x.font=`italic 22px ${SERIF}`;x.fillText(one(x,state.settings.owner||'Collection numismatique',W-240),W/2,H-84);x.textAlign='left';
}

/* 7) Plan technique : bleu de plan, quadrillage, cotes */
async function drawBlueprint(it,o,cv){
 const[W,H,x]=setupShare(o,cv),bg='#0d2b4d',ln='#cfe6ff',story=o.fmt==='story',sq=o.fmt==='square';x._bg=bg;
 x.fillStyle=bg;x.fillRect(0,0,W,H);
 for(let i=0;i<=W;i+=40){x.strokeStyle=i%200?'rgba(207,230,255,.07)':'rgba(207,230,255,.16)';x.lineWidth=1;x.beginPath();x.moveTo(i,0);x.lineTo(i,H);x.stroke()}
 for(let j=0;j<=H;j+=40){x.strokeStyle=j%200?'rgba(207,230,255,.07)':'rgba(207,230,255,.16)';x.lineWidth=1;x.beginPath();x.moveTo(0,j);x.lineTo(W,j);x.stroke()}
 x.strokeStyle=ln;x.lineWidth=3;x.strokeRect(36,36,W-72,H-72);
 x.textBaseline='alphabetic';x.fillStyle=ln;x.font=`600 22px ${MONO}`;spacing(x,4);x.fillText('FICHE TECHNIQUE',70,88);x.textAlign='right';x.fillText('NUMMUS',W-70,88);x.textAlign='left';spacing(x,0);
 const ch=H*(story?.27:sq?.27:.30),cy=150+ch/2+20;
 const rects=facesRow(x,await shareEls(it),W/2,cy,W-260,ch,0,70,ln);
 x.strokeStyle='rgba(207,230,255,.55)';x.lineWidth=1.5;x.setLineDash([14,8]);
 rects.forEach(r=>{x.beginPath();x.moveTo(r.cx,r.cy-r.h/2-24);x.lineTo(r.cx,r.cy+r.h/2+24);x.moveTo(r.cx-r.w/2-24,r.cy);x.lineTo(r.cx+r.w/2+24,r.cy);x.stroke()});x.setLineDash([]);
 if(rects[0]&&!isEmpty(it.diameter)){const r=rects[0];dimLine(x,r.cx-r.w/2,r.cx+r.w/2,r.cy+r.h/2+52,'⌀ '+it.diameter+' mm',ln,`500 22px ${MONO}`)}
 let y=cy+ch/2+(sq?130:150);x.textAlign='left';x.fillStyle='#fff';x.font=`700 ${sq?44:50}px ${MONO}`;const lh=sq?52:58;y+=centered(x,(it.denomination||'').toUpperCase(),70,y,W-140,lh,2)*lh-14;
 x.fillStyle=ln;x.font=`400 24px ${MONO}`;x.fillText(one(x,subLine(it).toUpperCase(),W-140),70,y);const rowH=sq?46:52;y+=rowH+8;
 const rows=Math.max(0,Math.floor((H-130-y)/rowH)),fx=shareFacts(it,o).slice(0,rows);
 fx.forEach((r,i)=>{const fy=y+i*rowH;x.strokeStyle='rgba(207,230,255,.45)';x.lineWidth=1.5;x.beginPath();x.moveTo(70,fy-rowH+14);x.lineTo(W-70,fy-rowH+14);x.stroke();
  x.fillStyle='rgba(207,230,255,.75)';x.font=`400 20px ${MONO}`;x.fillText(r[0].toUpperCase(),84,fy-4);x.textAlign='right';x.fillStyle='#fff';x.font=`600 26px ${MONO}`;x.fillText(one(x,r[1],W-420),W-84,fy-4);x.textAlign='left'});
 if(fx.length){const fy=y+fx.length*rowH;x.strokeStyle='rgba(207,230,255,.45)';x.beginPath();x.moveTo(70,fy-rowH+14);x.lineTo(W-70,fy-rowH+14);x.stroke()}
 x.fillStyle='rgba(207,230,255,.7)';x.font=`400 20px ${MONO}`;x.fillText(one(x,state.settings.owner||'Collection numismatique',W-140),70,H-64);
}

const SHARE_STYLES={classic:['Classique',drawShareClassic],museum:['Cartel de musée',drawMuseum],poster:['Affiche',drawPoster],minimal:['Épuré',drawMinimal],gallery:['Galerie',drawGallery],medal:['Médaille',drawMedal],vintage:['Vintage',drawVintage],blueprint:['Plan technique',drawBlueprint]};
async function drawShare(it,o,cv){return(SHARE_STYLES[o.style]||SHARE_STYLES.classic)[1](it,o,cv)}