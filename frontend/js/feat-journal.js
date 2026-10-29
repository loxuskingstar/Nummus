'use strict';
/* =====================================================================
   JOURNAL NUMISMATIQUE  +  PIÈCE DU JOUR
   Journal : histoire personnelle (découvertes, bourses, rencontres, identifications). Il reste séparé de
   l'historique financier : les entrées automatiques issues des acquisitions n'affichent jamais de prix.
   Pièce du jour : choix stable pour la journée selon un mode configurable. Les questions sont tirées des
   données de la fiche elle-même ; une anecdote n'apparaît que si l'utilisateur l'a saisie, avec sa source.
   ===================================================================== */
addModule('journal','Journal','journal','Carnet personnel : découvertes, bourses, rencontres, identifications, liées à vos pièces.',{after:'timemachine'});
const JK={acquisition:'Acquisition marquante',decouverte:'Découverte',identification:'Identification',bourse:'Bourse / salon',rencontre:'Rencontre',autre:'Autre'};
const JF={id:null,items:[],q:''};
const jEntry=id=>state.journal.find(e=>e.id===id);
EXT.views.journal=function viewJournal(){
 const f=ui.jf||(ui.jf={kind:'',q:''});
 let l=state.journal.map(e=>({...e}));
 if(state.settings.journalAcq)state.items.filter(i=>i.status!=='wish'&&/^\d{4}-\d{2}-\d{2}$/.test(i.acquired||'')).forEach(i=>l.push({id:'a_'+i.id,auto:true,date:i.acquired,kind:'acquisition',title:'Acquisition : '+i.denomination,body:'',items:[i.id]}));
 if(f.kind)l=l.filter(e=>e.kind===f.kind);
 if(f.q){const q=norm(f.q);l=l.filter(e=>norm([e.title,e.body].join(' ')).includes(q))}
 l.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 return `<header class="head"><div><h1>Journal numismatique</h1><p class="sub">Votre carnet personnel. Il est distinct de l’historique des valeurs et des prix, qui n’y apparaissent pas.</p></div><div class="actions"><button class="btn primary" data-act="jNew">${ic('plus')} Nouvelle entrée</button></div></header>
 <div class="toolbar"><label class="search">${ic('search')}<input data-in="jq" placeholder="Rechercher dans le journal…" value="${esc(f.q)}"></label>
 <select data-ch="jKind" aria-label="Type">${opt([['','Tous les types'],...Object.entries(JK)],f.kind)}</select>
 <label class="chk"><input type="checkbox" data-ch="jAcq" ${state.settings.journalAcq?'checked':''}> Inclure mes acquisitions (sans prix)</label></div>
 <div id="jlist">${jList(l)}</div>`;
};
function jList(l){
 if(!l.length)return `<div class="empty glass"><b>Journal vide</b><p>Notez une trouvaille, une visite de bourse, une identification… et reliez-la à vos pièces.</p><button class="btn primary" data-act="jNew">${ic('plus')} Première entrée</button></div>`;
 return l.map(e=>{const its=(e.items||[]).map(id=>state.items.find(i=>i.id===id)).filter(Boolean);
  return `<article class="jent glass ${e.auto?'auto':''}"><div class="jd">${esc(dateFR(e.date))} · ${esc(JK[e.kind]||'')}${e.auto?' · automatique':''}</div><h3>${esc(e.title||'(sans titre)')}</h3>${e.body?`<div class="md">${md(e.body)}</div>`:''}
  ${its.length?`<div class="jitems">${its.map(i=>`<button class="jitem" data-act="open" data-id="${i.id}"><span class="mini">${i.cover?`<img src="${esc(i.cover)}" alt="">`:ic('coin',14)}</span>${esc(i.denomination)}</button>`).join('')}</div>`:''}
  ${e.auto?'':`<div class="actions end" style="margin-top:8px"><button class="btn sm" data-act="jEdit" data-id="${e.id}">${ic('edit',14)} Modifier</button><button class="btn sm danger" data-act="jDel" data-id="${e.id}">${ic('trash',14)}</button></div>`}</article>`}).join('');
}
function redrawJournal(){if(view==='journal')render()}
Object.assign(CH,{jKind:t=>{ui.jf.kind=t.value;render()},jAcq:t=>{state.settings.journalAcq=t.checked;savePrefs();render()}});
document.addEventListener('input',e=>{
 const t=e.target;if(!t.dataset)return;
 if(t.dataset.in==='jq'){ui.jf.q=t.value;clearTimeout(ui.jt);ui.jt=setTimeout(()=>{const p=t.selectionStart;render();const i=$('input[data-in=jq]');if(i){i.focus();i.setSelectionRange(p,p)}},180)}
 else if(t.id==='jf_q'){JF.q=t.value;drawJPick()}
});
function jForm(e){
 JF.id=e?e.id:null;JF.items=e?[...(e.items||[])]:[];JF.q='';
 promptModal(e?'Modifier l’entrée':'Nouvelle entrée',`<div class="fgrid"><div class="fld"><label>Date</label><input id="jf_d" type="date" value="${esc(e?e.date:today())}" required></div>
 <div class="fld"><label>Type</label><select id="jf_k">${opt(Object.entries(JK),e?e.kind:'autre')}</select></div>
 <div class="fld wide"><label>Titre</label><input id="jf_t" value="${esc(e?e.title:'')}" required placeholder="ex. Trouvaille à la bourse de Paris"></div>
 <div class="fld wide"><label>Texte (Markdown)</label><textarea id="jf_b" rows="6" data-md="1">${esc(e?e.body||'':'')}</textarea><div class="mdp md">${e&&e.body?md(e.body):''}</div></div>
 <div class="fld wide"><label>Pièces liées</label><div class="jitems" id="jf_sel"></div><label class="search" style="margin-top:8px">${ic('search')}<input id="jf_q" placeholder="Ajouter une pièce…" autocomplete="off"></label><div id="jf_l" class="rows glass" style="margin-top:6px"></div></div></div>`,'jOk','Enregistrer',e?`data-id="${e.id}"`:'');
 drawJPick();
}
function drawJPick(){
 const sel=$('#jf_sel'),l=$('#jf_l');if(!sel||!l)return;
 sel.innerHTML=JF.items.map(id=>{const i=state.items.find(x=>x.id===id);return i?`<button type="button" class="jitem" data-act="jUnpick" data-id="${id}">${esc(i.denomination)} ${ic('x',12)}</button>`:''}).join('')||'<span class="muted small">Aucune</span>';
 if(!JF.q){l.innerHTML='';l.hidden=true;return}l.hidden=false;
 const f=compileQuery(JF.q);l.innerHTML=state.items.filter(i=>f(i)&&!JF.items.includes(i.id)).slice(0,8).map(i=>`<div class="row" style="grid-template-columns:40px 1fr" data-act="jPick" data-id="${i.id}"><span class="mini">${thumb(i,16)}</span><span><b>${esc(i.denomination)}</b> <span class="muted small">${esc(subtitle(i))}</span></span></div>`).join('')||'<p class="muted small" style="padding:8px">Aucun résultat.</p>';
}
Object.assign(ACT,{
 jNew:()=>jForm(null),jEdit:t=>jForm(jEntry(t.dataset.id)),
 jDel:t=>{if(!confirm('Supprimer cette entrée du journal ?'))return;state.journal=state.journal.filter(e=>e.id!==t.dataset.id);savePrefs();render()},
 jPick:t=>{JF.items.push(t.dataset.id);JF.q='';$('#jf_q').value='';drawJPick()},
 jUnpick:t=>{JF.items=JF.items.filter(x=>x!==t.dataset.id);drawJPick()},
});
SUBMIT.jOk=f=>{
 const d={date:$('#jf_d').value||today(),kind:$('#jf_k').value,title:$('#jf_t').value.trim(),body:$('#jf_b').value.trim(),items:[...JF.items]};if(!d.title)return;
 if(f.dataset.id)Object.assign(jEntry(f.dataset.id),d);else state.journal.push({id:uid(),created:Date.now(),...d});
 savePrefs();closeModal();if(view!=='journal')go('journal');else render();
};
/* entrées du journal reliées à une fiche */
EXT.detail.push(it=>{
 const l=state.journal.filter(e=>(e.items||[]).includes(it.id));if(!l.length||vit())return'';
 return `<section class="vhist"><h3>Dans le journal</h3>${l.sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(e=>`<p class="small" style="margin-top:6px"><span class="muted">${esc(dateFR(e.date))}</span> — <button class="link" style="all:unset;cursor:pointer;color:var(--accent)" data-act="navClose" data-v="journal">${esc(e.title)}</button></p>`).join('')}</section>`;
});

/* ---------- consultations (pour le mode « peu consultée ») ---------- */
function noteView(id){const v=state.views[id]||(state.views[id]={n:0,t:0});v.n++;v.t=Date.now();savePrefs()}

/* ---------- pièce du jour ---------- */
const DAILY_MODES={random:'Au hasard',recent:'Récemment ajoutée',least:'Peu consultée',complete:'Fiche à compléter',rare:'Pays peu représenté'};
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const FILL=['year','country','metal','weight','diameter','mint','grade','catalog','obverse','reverse','notes','cover','rarity','issuer'];
const fillScore=i=>FILL.filter(k=>!isEmpty(i[k])).length;
function pickDaily(){
 const own=pool().filter(i=>i.status!=='wish');if(!own.length)return null;
 const mode=state.settings.daily.mode,seed=hash(today()+'|'+mode+'|'+(ui.dailyRoll||0));
 let c=own;
 if(mode==='recent')c=[...own].sort((a,b)=>(b.created||0)-(a.created||0)).slice(0,10);
 else if(mode==='least'){const n=i=>(state.views[i.id]||{}).n||0,m=Math.min(...own.map(n));c=own.filter(i=>n(i)===m)}
 else if(mode==='complete'){const s=[...own].sort((a,b)=>fillScore(a)-fillScore(b)),lim=fillScore(s[0]);c=s.filter(i=>fillScore(i)===lim)}
 else if(mode==='rare'){const by={};own.forEach(i=>{const k=i.country||'?';by[k]=(by[k]||0)+1});const m=Math.min(...Object.values(by));c=own.filter(i=>(by[i.country||'?'])===m)}
 return c[seed%c.length];
}
function dailyQuestion(it){
 const q=[];
 if(hasYear(it)&&it.denomination)q.push([`En quelle année cette pièce ou ce billet (${esc(it.denomination)}) a-t-il été émis ?`,esc(fmtYear(it.year))]);
 if(it.country)q.push([`De quel pays actuel provient « ${esc(it.denomination)} » ?`,esc(cname(it.country))]);
 if(it.metal)q.push([`Dans quel métal ou quelle composition est « ${esc(it.denomination)} » ?`,esc(it.metal)]);
 if(it.mint)q.push([`Quel est l’atelier de frappe de « ${esc(it.denomination)} » ?`,esc(it.mint)]);
 if(!q.length)return'';
 const k=q[hash(it.id+today())%q.length];
 return `<details class="q"><summary><b>Question du jour</b> — ${k[0]}</summary><p style="margin-top:6px">Réponse selon votre fiche : <b>${k[1]}</b></p></details>`;
}
EXT.home.push(function dailyWidget(){
 const it=pickDaily();if(!it)return'';
 const mode=state.settings.daily.mode;
 return `<section class="daily glass" style="margin-bottom:16px"><div class="dimg">${it.cover?`<img src="${esc(it.cover)}" alt="">`:ic(it.type==='note'?'note':'coin',44)}</div>
 <div><span class="tl">${ic('dice',12)} Pièce du jour</span><h3><button style="all:unset;cursor:pointer" data-act="open" data-id="${it.id}">${esc(it.denomination)}</button></h3><p class="muted small">${esc(subtitle(it))}${it.metal?' · '+esc(it.metal):''}</p>
 ${it.anecdote?`<p class="small" style="margin-top:6px">${esc(it.anecdote)}<br><span class="muted">${it.anecdoteSrc?'Source : '+esc(it.anecdoteSrc):'Source non précisée — à vérifier'}</span></p>`:''}
 ${dailyQuestion(it)}
 <div class="actions" style="margin-top:8px;gap:8px"><select data-ch="dailyMode" aria-label="Mode de la pièce du jour">${opt(Object.entries(DAILY_MODES),mode)}</select><button class="btn sm" data-act="dailyRoll" title="Une autre pièce">${ic('refresh',14)} Une autre</button></div></div></section>`;
});
Object.assign(CH,{dailyMode:t=>{state.settings.daily.mode=t.value;ui.dailyRoll=0;savePrefs();render()}});
ACT.dailyRoll=()=>{ui.dailyRoll=(ui.dailyRoll||0)+1;render()};
