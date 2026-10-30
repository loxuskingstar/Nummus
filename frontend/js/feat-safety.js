'use strict';
/* =====================================================================
   SÉCURITÉ ET ROBUSTESSE
   1. Corbeille : une fiche supprimée reste 30 jours en base (champ « deleted »), hors de state.items,
      avec un bouton « Annuler » pendant quelques secondes.
   2. Chiffrement côté client (Web Crypto, AES-256-GCM, clé dérivée du mot de passe par PBKDF2) :
      export JSON chiffré et, au choix, envois WebDAV chiffrés. Le mot de passe n'est jamais stocké.
   ===================================================================== */
addModule('trash','Corbeille','bin','Fiches supprimées, conservées 30 jours avant suppression définitive.',{after:'storage',view:()=>viewTrash()});

/* ---------- corbeille ---------- */
const TRASH_DAYS=30,DAY_MS=864e5;
const trashLeft=it=>Math.max(0,Math.ceil(TRASH_DAYS-(Date.now()-(it.deleted||0))/DAY_MS));

function trashItems(ids){
 const s=new Set(ids),moved=state.items.filter(i=>s.has(i.id));
 if(!moved.length)return Promise.resolve();
 recordDel(moved);                                  // le journal « Remonter le temps » voit la fiche disparaître
 const now=Date.now();moved.forEach(i=>{i.deleted=now});
 state.items=state.items.filter(i=>!s.has(i.id));
 state.trash=[...moved,...state.trash];
 ids.forEach(id=>ui.picked.delete(id));
 return Store.items.bulkPut(state.userId,moved).catch(fail);
}
function restoreItems(ids){
 const s=new Set(ids),back=state.trash.filter(i=>s.has(i.id));
 if(!back.length)return Promise.resolve();
 back.forEach(i=>{delete i.deleted});
 state.trash=state.trash.filter(i=>!s.has(i.id));
 back.forEach(i=>state.items.unshift(i));
 state.items.sort((a,b)=>(b.created||0)-(a.created||0));
 recordPut(back);
 return Store.items.bulkPut(state.userId,back).catch(fail);
}
function purgeItems(ids){
 const s=new Set(ids),gone=state.trash.filter(i=>s.has(i.id));
 if(!gone.length)return Promise.resolve();
 const im=gone.flatMap(i=>[...(i.imgs||[]),...(i.docs||[])].map(m=>m.id));
 state.trash=state.trash.filter(i=>!s.has(i.id));
 im.forEach(forgetImg);
 return Promise.all([Store.items.bulkDelete(state.userId,[...s]),im.length?Store.images.bulkDelete(state.userId,im):0]).catch(fail);
}
function purgeTrash(){                              // appelé à chaque ouverture de profil
 const old=state.trash.filter(i=>Date.now()-(i.deleted||0)>TRASH_DAYS*DAY_MS).map(i=>i.id);
 if(old.length)purgeItems(old);
}

/* toast avec un bouton d'action (« Annuler ») */
let TOAST_FN=null;
function toastAction(msg,label,fn,ms=8000){
 const t=$('#toast');t.innerHTML=`${esc(msg)} <button class="btn sm" data-act="toastDo">${esc(label)}</button>`;
 TOAST_FN=fn;t.classList.add('on','act');clearTimeout(toast.t);
 toast.t=setTimeout(()=>{t.classList.remove('on','act');TOAST_FN=null},ms);
}
function trashWithUndo(ids,msg){
 trashItems(ids);
 toastAction(msg,'Annuler',()=>{restoreItems(ids);render();toast('Restaurée')});
}

function viewTrash(){
 const l=state.trash.slice().sort((a,b)=>(b.deleted||0)-(a.deleted||0));
 return `<header class="head"><div><h1>Corbeille</h1><p class="sub">Les fiches supprimées sont conservées ${TRASH_DAYS} jours, photos comprises, puis effacées définitivement.</p></div>
 ${l.length?`<div class="actions"><button class="btn" data-act="trashRestoreAll">${ic('undo',16)} Tout restaurer</button><button class="btn danger" data-act="trashEmpty">${ic('trash',16)} Vider</button></div>`:''}</header>
 ${l.length?`<div class="panel glass">${l.map(it=>`<div class="exrow"><span class="mini">${thumb(it,18)}</span><span><b>${esc(it.denomination)}</b> <span class="muted small">${esc(subtitle(it))}</span><br><span class="muted small">Supprimée le ${esc(dateFR(it.deleted))} · effacement dans ${pl(trashLeft(it),'jour','jours')}</span></span><span><button class="btn sm" data-act="trashRestore" data-id="${it.id}">${ic('undo',14)} Restaurer</button> <button class="btn sm danger" data-act="trashPurge" data-id="${it.id}" aria-label="Supprimer définitivement">${ic('x',14)}</button></span></div>`).join('')}</div>`
 :'<div class="empty glass"><b>La corbeille est vide</b><p>Les fiches que vous supprimez arrivent ici et peuvent être restaurées.</p></div>'}`;
}
Object.assign(ACT,{
 toastDo:()=>{const f=TOAST_FN;TOAST_FN=null;$('#toast').classList.remove('on','act');if(f)f()},
 trashRestore:t=>{restoreItems([t.dataset.id]);render();toast('Fiche restaurée')},
 trashRestoreAll:()=>{restoreItems(state.trash.map(i=>i.id));render();toast('Corbeille restaurée')},
 trashPurge:t=>{const it=state.trash.find(i=>i.id===t.dataset.id);if(it&&confirm(`Supprimer définitivement « ${it.denomination} » ?`)){purgeItems([it.id]);render()}},
 trashEmpty:()=>{if(state.trash.length&&confirm(`Supprimer définitivement ${pl(state.trash.length,'fiche','fiches')} ?`)){purgeItems(state.trash.map(i=>i.id));render()}},
});

/* ---------- chiffrement ---------- */
const TXT_ENC=new TextEncoder(),TXT_DEC=new TextDecoder(),PBKDF2_ITER=310000;
const cryptoOK=()=>!!(window.crypto&&crypto.subtle);
const toB64=u8=>{let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode(...u8.subarray(i,i+0x8000));return btoa(s)};
const fromB64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function deriveKey(pw,salt,iter){
 const base=await crypto.subtle.importKey('raw',TXT_ENC.encode(pw),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:iter,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function encryptText(text,pw){
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const key=await deriveKey(pw,salt,PBKDF2_ITER);
 const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,TXT_ENC.encode(text)));
 return JSON.stringify({format:'nummus-enc',v:1,cipher:'AES-256-GCM',kdf:'PBKDF2-SHA256',iter:PBKDF2_ITER,salt:toB64(salt),iv:toB64(iv),data:toB64(ct)});
}
async function decryptDoc(doc,pw){                  // lève une erreur si le mot de passe est faux (GCM authentifie)
 const key=await deriveKey(pw,fromB64(doc.salt),doc.iter||PBKDF2_ITER);
 return TXT_DEC.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(doc.iv)},key,fromB64(doc.data)));
}

/* saisie du mot de passe : renvoie une promesse (null si annulé) */
const PW={res:null,confirm:false};
function askPassword(title,{confirm=false,note=''}={}){
 return new Promise(res=>{
  PW.res=res;PW.confirm=confirm;
  openModal2(`<form data-submit="pwOk"><div class="mhead"><h2>${esc(title)}</h2><button type="button" class="x" data-act="pwCancel" aria-label="Fermer">${ic('x',22)}</button></div>
  ${note?`<p class="muted small" style="margin-bottom:10px">${note}</p>`:''}
  <div class="fgrid"><div class="fld wide"><label>Mot de passe</label><input type="password" id="pw1" autocomplete="new-password" required minlength="${confirm?8:1}"></div>
  ${confirm?'<div class="fld wide"><label>Confirmation</label><input type="password" id="pw2" autocomplete="new-password" required></div>':''}</div>
  <div class="actions end"><button type="button" class="btn" data-act="pwCancel">Annuler</button><button class="btn primary">${ic('lock',16)} Valider</button></div></form>`,true);
 });
}
SUBMIT.pwOk=()=>{
 const a=$('#pw1').value;
 if(PW.confirm&&a!==$('#pw2').value){toast('Les deux mots de passe diffèrent');return}
 const r=PW.res;PW.res=null;closeModal2();if(r)r(a);
};
ACT.pwCancel=()=>{const r=PW.res;PW.res=null;closeModal2();if(r)r(null)};

async function exportEncrypted(){
 if(!cryptoOK()){toast('Le chiffrement exige HTTPS (ou localhost)');return}
 const pw=await askPassword('Chiffrer l’export',{confirm:true,note:'8 caractères minimum. <b>Il n’existe aucun moyen de récupérer ce mot de passe</b> : sans lui, le fichier est définitivement illisible.'});
 if(!pw)return;
 try{
  toast('Chiffrement en cours…');
  const data=await DataIO.export(state.userId),text=await encryptText(JSON.stringify(data),pw);
  download(`nummus-${slug(userName())}-${today()}.chiffre.json`,text,'application/json');
  state.settings.backup.last=Date.now();state.settings.backup.snoozeUntil=null;savePrefs();checkBackup();
  toast('Export chiffré téléchargé');
 }catch(e){console.error(e);toast('Chiffrement impossible')}
}
/* import : appelé par offerImport quand le fichier est un export chiffré */
async function importEncrypted(doc){
 if(!cryptoOK()){toast('Le déchiffrement exige HTTPS (ou localhost)');return}
 for(let essai=0;essai<3;essai++){
  const pw=await askPassword('Fichier chiffré',{note:essai?'Mot de passe incorrect, réessayez.':'Saisissez le mot de passe choisi lors de l’export.'});
  if(pw===null)return;
  try{offerImport(await decryptDoc(doc,pw));return}catch(e){}
 }
 toast('Déchiffrement impossible');
}
/* envoi WebDAV : chiffré si l'option est cochée */
async function sealForUpload(data){
 const text=JSON.stringify(data);
 if(!state.settings.encDav)return text;
 const pw=await askPassword('Chiffrer l’envoi WebDAV',{note:'Le même mot de passe sera nécessaire pour récupérer la sauvegarde.'});
 if(!pw)throw new Error('envoi annulé');
 return encryptText(text,pw);
}

EXT.settings.push(()=>`<section class="panel glass" id="encpanel"><h2>${ic('lock',18)} Chiffrement</h2>
 <p class="muted" style="margin-bottom:10px">Protège les <b>fichiers qui quittent l’application</b> (exports, WebDAV) avec AES-256-GCM : valeurs, emplacements et adresses restent illisibles sans le mot de passe, qui n’est jamais enregistré. La base locale du navigateur, elle, n’est pas chiffrée : protégez l’accès à votre session.</p>
 <div class="actions"><button class="btn primary" data-act="exportEnc">${ic('download',16)} Exporter en JSON chiffré</button>
 <label class="chk"><input type="checkbox" data-ch="encDav" ${state.settings.encDav?'checked':''}> Chiffrer aussi les envois WebDAV</label></div>
 ${cryptoOK()?'':'<p class="small" style="color:var(--danger,#c0453a);margin-top:8px">Indisponible : ouvrez Nummus en HTTPS ou sur localhost.</p>'}</section>`);
ACT.exportEnc=exportEncrypted;
CH.encDav=t=>{state.settings.encDav=t.checked;savePrefs()};
