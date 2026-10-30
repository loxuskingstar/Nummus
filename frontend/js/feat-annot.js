'use strict';
/* =====================================================================
   VISIONNEUSE : ANNOTATIONS ET ÉCLAIRAGE RASANT
   Annotations : flèches, cercles et légendes vectoriels, rangés dans m.ann (coordonnées en pixels de l'image)
   sur chaque photo de la fiche : l'image d'origine n'est jamais modifiée.
   Éclairage rasant : relief calculé par convolution (emboss directionnel) à partir de la luminance, superposé à la
   photo. Simulation d'aide à la lecture, pas une mesure : elle fait ressortir les usures et contremarques légères.
   ===================================================================== */
const ANN={open:false,tool:'',color:'#ff4d3d',rk:false,angle:45,power:60,solo:false,draft:null,gray:null,gw:0,gh:0};
const ANN_COLORS=['#ff4d3d','#ffd23f','#3fd0ff','#ffffff'];
const annList=()=>LB&&LB.imgs[LB.i]?(LB.imgs[LB.i].ann||[]):[];
const annSw=()=>{const im=$('#lbimg');return Math.max(3,Math.round(Math.max(im&&im.naturalWidth||800,im&&im.naturalHeight||800)/200))};

EXT.lightbox.push({
 bar:()=>`<button class="btn sm ${ANN.open?'primary':''}" data-act="annToggle" title="Flèches, cercles et légendes">${ic('pen',16)} Annoter</button><button class="btn sm ${ANN.rk?'primary':''}" data-act="rkToggle" title="Éclairage rasant simulé">${ic('sun',16)} Relief</button>`,
 after:()=>{
  const im=$('#lbimg'),st=$('#lbst');if(!im||!st)return;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.id='lbann';svg.setAttribute('class','lbl2');st.appendChild(svg);
  const cv=document.createElement('canvas');cv.id='lbrk';cv.className='lbl2';cv.hidden=!ANN.rk;st.insertBefore(cv,svg);
  const go=()=>{annPaint();if(ANN.rk)rkPaint(true)};
  im.addEventListener('load',()=>{ANN.gray=null;go()});if(im.complete)go();
  svg.addEventListener('pointerdown',annDown);svg.addEventListener('pointermove',annMove);svg.addEventListener('pointerup',annUp);
  annTools();
 }
});

/* ---------- barre d'outils ---------- */
function annTools(){
 $('#lbtools')?.remove();if(!LB||!(ANN.open||ANN.rk))return;
 const t=(k,l,i)=>`<button class="btn sm ${ANN.tool===k?'primary':''}" data-act="annTool" data-k="${k}">${ic(i,15)} ${l}</button>`;
 const h=document.createElement('div');h.id='lbtools';h.className='lbtools';
 h.innerHTML=(ANN.open?`<div class="actions">${t('a','Flèche','arrow')}${t('c','Cercle','circle')}${t('t','Légende','pen')}
  ${ANN_COLORS.map(c=>`<button class="sw ${ANN.color===c?'on':''}" style="background:${c}" data-act="annColor" data-v="${c}" aria-label="Couleur ${c}"></button>`).join('')}
  <button class="btn sm" data-act="annUndo">${ic('undo',15)} Annuler</button><button class="btn sm danger" data-act="annClear">${ic('trash',15)} Tout effacer</button></div>`:'')
 +(ANN.rk?`<div class="actions"><label class="small">Direction de la lumière <input type="range" min="0" max="359" value="${ANN.angle}" data-rk="angle"></label>
  <label class="small">Intensité <input type="range" min="10" max="100" value="${ANN.power}" data-rk="power"></label>
  <label class="chk small"><input type="checkbox" data-rk="solo" ${ANN.solo?'checked':''}> Relief seul</label></div>`:'');
 $('#lb').insertBefore(h,$('#lb .lbbar'));
}
function annPaint(){
 const svg=$('#lbann'),im=$('#lbimg');if(!svg||!im||!im.naturalWidth)return;
 const W=im.naturalWidth,H=im.naturalHeight,sw=annSw();svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
 svg.style.pointerEvents=ANN.open&&ANN.tool?'auto':'none';svg.style.cursor=ANN.tool?'crosshair':'';
 const shape=(a,i)=>{
  const st=`stroke="${a.c}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  if(a.t==='c')return `<ellipse cx="${a.x}" cy="${a.y}" rx="${a.rx}" ry="${a.ry}" ${st}/>`;
  if(a.t==='a'){const ang=Math.atan2(a.y2-a.y1,a.x2-a.x1),L=sw*5,hx=a.x2-Math.cos(ang-.45)*L,hy=a.y2-Math.sin(ang-.45)*L,gx=a.x2-Math.cos(ang+.45)*L,gy=a.y2-Math.sin(ang+.45)*L;
   return `<path d="M${a.x1} ${a.y1}L${a.x2} ${a.y2}M${hx} ${hy}L${a.x2} ${a.y2}L${gx} ${gy}" ${st}/>`}
  const fs=sw*7;return `<text x="${a.x}" y="${a.y}" font-size="${fs}" font-family="system-ui,sans-serif" font-weight="700" fill="${a.c}" stroke="#000" stroke-width="${fs/9}" paint-order="stroke">${esc(a.s)}</text>`;
 };
 svg.innerHTML=[...annList(),...(ANN.draft?[ANN.draft]:[])].map(shape).join('');
}
const annPt=(e)=>{const r=$('#lbann').getBoundingClientRect(),im=$('#lbimg');return[(e.clientX-r.left)/r.width*im.naturalWidth,(e.clientY-r.top)/r.height*im.naturalHeight].map(Math.round)};
function annDown(e){
 if(!ANN.open||!ANN.tool)return;e.stopPropagation();e.preventDefault();const[x,y]=annPt(e);
 if(ANN.tool==='t'){const s=prompt('Légende :');if(s&&s.trim())annAdd({t:'t',x,y,s:s.trim().slice(0,60),c:ANN.color});return}
 e.target.setPointerCapture&&e.target.setPointerCapture(e.pointerId);ANN.draft={t:ANN.tool,c:ANN.color,x1:x,y1:y,x2:x,y2:y,x,y,rx:0,ry:0,o:[x,y]};
}
function annMove(e){
 if(!ANN.draft)return;e.stopPropagation();const[x,y]=annPt(e),d=ANN.draft;
 if(d.t==='a'){d.x2=x;d.y2=y}else{d.rx=Math.abs(x-d.o[0]);d.ry=Math.abs(y-d.o[1]);d.x=d.o[0];d.y=d.o[1]}
 annPaint();
}
function annUp(e){
 const d=ANN.draft;if(!d)return;e.stopPropagation();ANN.draft=null;
 const big=d.t==='a'?Math.hypot(d.x2-d.x1,d.y2-d.y1):Math.max(d.rx,d.ry);
 if(big<8){annPaint();return}
 delete d.o;annAdd(d);
}
function annAdd(a){const m=LB.imgs[LB.i];(m.ann=m.ann||[]).push(a);annSave();annPaint()}
function annSave(){const m=LB.imgs[LB.i];if(m.ann&&!m.ann.length)delete m.ann;putItems([LB.it])}

/* ---------- relief ---------- */
function rkPaint(full){
 const cv=$('#lbrk'),im=$('#lbimg');if(!cv||!im||!im.naturalWidth)return;
 try{
  if(!ANN.gray){
   const k=Math.min(1,1100/Math.max(im.naturalWidth,im.naturalHeight)),w=Math.round(im.naturalWidth*k),h=Math.round(im.naturalHeight*k);
   const o=document.createElement('canvas');o.width=w;o.height=h;const x=o.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0,w,h);
   const d=x.getImageData(0,0,w,h).data,g=new Float32Array(w*h);for(let i=0;i<g.length;i++)g[i]=d[i*4]*.3+d[i*4+1]*.59+d[i*4+2]*.11;
   ANN.gray=g;ANN.gw=w;ANN.gh=h;cv.width=w;cv.height=h;
  }
  const w=ANN.gw,h=ANN.gh,g=ANN.gray,c=cv.getContext('2d'),out=c.createImageData(w,h),a=ANN.angle*Math.PI/180,lx=Math.cos(a),ly=Math.sin(a),k=ANN.power/25;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const i=y*w+x;let v=128;
   if(x>0&&y>0&&x<w-1&&y<h-1){const gx=g[i+1]-g[i-1],gy=g[i+w]-g[i-w];v=128+(gx*lx+gy*ly)*k}
   v=v<0?0:v>255?255:v;const o=i*4;out.data[o]=out.data[o+1]=out.data[o+2]=v;out.data[o+3]=255;
  }
  c.putImageData(out,0,0);
 }catch(e){ANN.rk=false;cv.hidden=true;toast('Relief indisponible pour cette image');return}
 cv.style.mixBlendMode=ANN.solo?'normal':'overlay';cv.hidden=false;
}
let rkRaf=0;
document.addEventListener('input',e=>{
 const k=e.target.dataset&&e.target.dataset.rk;if(!k||!LB)return;
 if(k==='solo')ANN.solo=e.target.checked;else ANN[k]=+e.target.value;
 cancelAnimationFrame(rkRaf);rkRaf=requestAnimationFrame(()=>rkPaint());
});

Object.assign(ACT,{
 annToggle:()=>{ANN.open=!ANN.open;if(!ANN.open)ANN.tool='';else if(!ANN.tool)ANN.tool='a';lbShow()},
 annTool:t=>{ANN.tool=t.dataset.k;annTools();annPaint()},
 annColor:t=>{ANN.color=t.dataset.v;annTools()},
 annUndo:()=>{const m=LB.imgs[LB.i];if(m.ann&&m.ann.length){m.ann.pop();annSave();annPaint()}},
 annClear:()=>{const m=LB.imgs[LB.i];if(m.ann&&m.ann.length&&confirm('Effacer toutes les annotations de cette photo ?')){m.ann=[];annSave();annPaint()}},
 rkToggle:()=>{ANN.rk=!ANN.rk;lbShow()},
});
