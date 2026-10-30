'use strict';
/* =====================================================================
   RÉGLAGES : STOCKAGE ET MIGRATION
   Montre où sont les données, leur version, le journal d'opérations et (mode serveur) les sauvegardes.
   Ne remplace pas l'export JSON complet, qui reste le format de migration portable entre modes et serveurs.
   ===================================================================== */
EXT.settings.push(()=>{
 const t0=historyStart(),rest=Store.kind==='rest';
 return `<section class="panel glass" id="storinfo"><h2>Stockage et migration</h2>
 <p class="muted" style="margin-bottom:8px">${rest?'Mode serveur : base SQLite dans le dossier <code>data/db</code> du serveur, sauvegardes dans <code>data/backups</code>, journaux dans <code>data/logs</code>. Pour migrer vers un autre serveur, copiez simplement le dossier <code>data/</code>, ou utilisez l’export JSON ci-dessus.':'Mode local : base IndexedDB de ce navigateur. Exportez régulièrement en JSON ; ce fichier s’importe aussi dans une installation serveur.'}</p>
 <dl class="facts"><dt>Format d’export</dt><dd>schéma 4 (fiches, images, préférences, séries, rangements, journal, expositions, journal d’opérations)</dd>
 <dt>Journal d’opérations</dt><dd>${state.events.length} événement${state.events.length>1?'s':''}${t0?`, depuis le ${esc(dateFR(t0))}`:''}</dd>
 <dt>Séries · contenants · expositions</dt><dd>${state.series.length} · ${state.containers.length} · ${state.expos.length}</dd>
 ${rest?'<dt>Serveur</dt><dd id="srvinfo" class="muted">chargement…</dd><dt>Sauvegardes</dt><dd id="srvbk" class="muted">chargement…</dd>':''}</dl>
 ${rest?`<div class="actions"><button class="btn" data-act="srvBackup">${ic('download',16)} Créer une sauvegarde maintenant</button><button class="btn" data-act="srvCheck">${ic('check',16)} Vérifier la base</button></div><div id="srvbklist"></div>`:''}</section>
 ${rest?`<section class="panel glass" id="acct" hidden><h2>Compte et accès</h2><p class="muted" id="acctinfo"></p>
 <form data-submit="pwdChange" class="grid2" autocomplete="off"><label>Mot de passe actuel<input type="password" name="current" autocomplete="current-password" required></label>
 <label>Nouveau mot de passe (8 caractères minimum)<input type="password" name="new" autocomplete="new-password" minlength="8" required></label>
 <div class="actions"><button class="btn primary">Changer le mot de passe</button><button type="button" class="btn" data-act="logout" id="logoutbtn">${ic('x',16)} Se déconnecter</button></div></form>
 <p class="muted small">Changer le mot de passe déconnecte tous les autres appareils. Il est enregistré (haché) dans <code>data/auth.json</code> et prend le pas sur <code>NUMMUS_PASSWORD</code>.</p></section>
 <section class="panel glass" id="shares"><h2>Liens de partage</h2><p class="muted small">Expositions publiées en lecture seule, accessibles sans mot de passe à qui possède le lien. Révoquez un lien pour le désactiver immédiatement.</p><div id="shlist" class="muted">chargement…</div></section>`:''}`;
});
EXT.after.settings=async()=>{
 if(Store.kind!=='rest'||!$('#srvinfo'))return;EXT.after.settings2();
 const base=(CONFIG.api&&CONFIG.api.baseUrl)||'/api';
 try{
  const i=await (await fetch(base+'/info')).json(),b=await (await fetch(base+'/backups')).json();
  $('#srvinfo').textContent=`Nummus ${i.app} · base v${i.schema}${i.schema!==i.schema_latest?` (v${i.schema_latest} disponible)`:''} · ${i.counts.items} fiches, ${i.counts.images} images, ${i.counts.events} événements`;
  const w=i.webdav,dv=$('#davsrv');if(dv)dv.textContent=w&&w.enabled?`actif${w.last?', dernier envoi '+new Date(w.last*1000).toLocaleString('fr-FR'):', aucun envoi pour l’instant'}${w.error?' (erreur : '+w.error+')':''}`:'non configuré';
  $('#srvbklist').innerHTML=b.length?`<div class="mlist" style="margin-top:10px">${b.slice(0,12).map(x=>`<div class="mrow"><span>${esc(x.name)}</span><span class="muted small">${new Date(x.modified*1000).toLocaleString('fr-FR')} · ${Math.max(1,Math.round(x.bytes/1024))} Ko</span><b><a class="link" href="${base}/backups/${encodeURIComponent(x.name)}">Télécharger</a> · <button class="link" data-act="srvRestore" data-name="${esc(x.name)}">Restaurer</button></b></div>`).join('')}</div>`:'';
  $('#srvbk').innerHTML=b.length?`${b.length} fichier${b.length>1?'s':''} · dernier : <a class="link" href="${base}/backups/${encodeURIComponent(b[0].name)}">${esc(b[0].name)}</a>`:'aucune pour l’instant';
 }catch(e){const a=$('#srvinfo');if(a)a.textContent='indisponible'}
};
EXT.after.settings2=async()=>{
 const base=(CONFIG.api&&CONFIG.api.baseUrl)||'/api',a=$('#acct');if(!a)return;
 try{const st=await (await fetch(base+'/auth/status')).json();a.hidden=!st.enabled;$('#acctinfo').textContent=`Connecté en tant que « ${st.user} » (mode ${st.mode==='session'?'session par cookie':'HTTP Basic'}).`;if(st.mode!=='session')$('#logoutbtn').hidden=true}catch(e){}
 shLoad();
};
async function shLoad(){
 const base=(CONFIG.api&&CONFIG.api.baseUrl)||'/api',el=$('#shlist');if(!el)return;
 try{const l=await (await fetch(base+'/shares')).json();
  el.innerHTML=l.length?`<div class="mlist">${l.map(x=>`<div class="mrow"><span><b>${esc(x.title||'Sans titre')}</b> <span class="muted small">${x.expires?'expire le '+esc(dateFR(x.expires*1000)):'sans expiration'} · ${x.views} vue${x.views>1?'s':''} · ${Math.max(1,Math.round(x.bytes/1024))} Ko</span></span><span></span><b><button class="link" data-act="shCopy" data-t="${esc(x.token)}">Copier le lien</button> · <button class="link" data-act="shDel" data-t="${esc(x.token)}">Révoquer</button></b></div>`).join('')}</div>`:'Aucun lien publié. Depuis une exposition : « Publier un lien ».'}catch(e){el.textContent='indisponible'}
}
Object.assign(ACT,{
 logout:async()=>{try{await Store.wipeMirror()}catch(e){}location.href='/logout'},
 srvRestore:async t=>{
  const n=t.dataset.name;if(!confirm(`Remplacer TOUTE la base actuelle par « ${n} » ?\n\nUne sauvegarde « pre-restore » de l’état actuel est créée avant, pour pouvoir revenir en arrière.`))return;
  const base=(CONFIG.api&&CONFIG.api.baseUrl)||'/api';
  try{const r=await fetch(`${base}/backups/${encodeURIComponent(n)}/restore`,{method:'POST'});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.detail||r.status);toast('Base restaurée, rechargement…');setTimeout(()=>location.reload(),900)}catch(e){toast('Restauration impossible : '+e.message)}
 },
 srvCheck:async()=>{
  const base=(CONFIG.api&&CONFIG.api.baseUrl)||'/api';
  try{const j=await (await fetch(base+'/integrity')).json();toast(j.sqlite==='ok'?`Base saine · ${pl(j.orphan_images,'image orpheline','images orphelines')} · ${pl(j.missing_images,'image manquante','images manquantes')}`:'Base endommagée : '+j.sqlite)}catch(e){toast('Vérification impossible')}
 },
 shCopy:async t=>{const u=location.origin+'/s/'+t.dataset.t;try{await navigator.clipboard.writeText(u);toast('Lien copié')}catch(e){prompt('Lien :',u)}},
 shDel:async t=>{if(!confirm('Révoquer ce lien ? Il cessera de fonctionner.'))return;const base=(CONFIG.api&&CONFIG.api.baseUrl)||'/api';await fetch(`${base}/shares/${encodeURIComponent(t.dataset.t)}`,{method:'DELETE'});shLoad()},
 exShare:async t=>{
  const e=exOf(t.dataset.id),d=prompt('Durée de validité du lien en jours (0 = sans expiration) :','30');if(d===null)return;
  const base=(CONFIG.api&&CONFIG.api.baseUrl)||'/api';toast('Publication…');
  try{const html=await buildExpo(e),r=await fetch(base+'/shares',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user:state.userId,kind:'expo',title:e.title,html,days:Math.max(0,+d||0)})});
   const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.detail||r.status);const u=location.origin+j.path;
   try{await navigator.clipboard.writeText(u);toast('Lien copié : '+u)}catch(_){prompt('Lien de partage :',u)}}catch(er){toast('Publication impossible : '+er.message)}
 }
});
SUBMIT.pwdChange=async(f)=>{
 const base=(CONFIG.api&&CONFIG.api.baseUrl)||'/api',d=new FormData(f);
 try{const r=await fetch(base+'/auth/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({current:d.get('current'),new:d.get('new')})});
  if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j.detail||r.status)}f.reset();toast('Mot de passe modifié')}catch(e){toast('Échec : '+e.message)}
};
ACT.srvBackup=async()=>{
 const base=(CONFIG.api&&CONFIG.api.baseUrl)||'/api';
 try{const r=await fetch(base+'/backups',{method:'POST'});if(!r.ok)throw 0;toast('Sauvegarde créée');EXT.after.settings()}catch(e){toast('Sauvegarde impossible')}
};
