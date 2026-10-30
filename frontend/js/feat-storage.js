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
 ${rest?`<div class="actions"><button class="btn" data-act="srvBackup">${ic('download',16)} Créer une sauvegarde maintenant</button></div>`:''}</section>`;
});
EXT.after.settings=async()=>{
 if(Store.kind!=='rest'||!$('#srvinfo'))return;
 const base=(CONFIG.api&&CONFIG.api.baseUrl)||'/api';
 try{
  const i=await (await fetch(base+'/info')).json(),b=await (await fetch(base+'/backups')).json();
  $('#srvinfo').textContent=`Nummus ${i.app} · base v${i.schema}${i.schema!==i.schema_latest?` (v${i.schema_latest} disponible)`:''} · ${i.counts.items} fiches, ${i.counts.images} images, ${i.counts.events} événements`;
  const w=i.webdav,dv=$('#davsrv');if(dv)dv.textContent=w&&w.enabled?`actif${w.last?', dernier envoi '+new Date(w.last*1000).toLocaleString('fr-FR'):', aucun envoi pour l’instant'}${w.error?' (erreur : '+w.error+')':''}`:'non configuré';
  $('#srvbk').innerHTML=b.length?`${b.length} fichier${b.length>1?'s':''} · dernier : <a class="link" href="${base}/backups/${encodeURIComponent(b[0].name)}">${esc(b[0].name)}</a>`:'aucune pour l’instant';
 }catch(e){const a=$('#srvinfo');if(a)a.textContent='indisponible'}
};
ACT.srvBackup=async()=>{
 const base=(CONFIG.api&&CONFIG.api.baseUrl)||'/api';
 try{const r=await fetch(base+'/backups',{method:'POST'});if(!r.ok)throw 0;toast('Sauvegarde créée');EXT.after.settings()}catch(e){toast('Sauvegarde impossible')}
};
