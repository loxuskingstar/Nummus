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
const SHARE={id:null,fmt:'portrait',value:false,theme:'auto'};
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
async function drawShare(it,o,cv){
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
 <div class="fld"><label>Thème</label><select data-ch="shTheme">${opt([['auto','Comme l’application'],['dark','Sombre'],['light','Clair']],SHARE.theme)}</select></div>
 ${hideVals()||it.status==='wish'?'':`<label class="chk"><input type="checkbox" data-ch="shValue" ${SHARE.value?'checked':''}> Afficher la valeur estimée</label>`}
 <div class="actions"><button class="btn primary" data-act="shDl">${ic('download',16)} Télécharger PNG</button>${navigator.canShare?`<button class="btn" data-act="shSend">${ic('share',16)} Partager…</button>`:''}</div></div></div>`,true);
 renderShare();
}
function renderShare(){const it=state.items.find(i=>i.id===SHARE.id),cv=$('#shcv');if(it&&cv)drawShare(it,SHARE,cv).catch(e=>{console.error(e);toast('Image impossible')})}
function downloadBlob(name,b){const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},800)}
