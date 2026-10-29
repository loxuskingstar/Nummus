'use strict';
/* =====================================================================
   NUMMUS — application de numismatique (prototype, fichier unique)

   Architecture :
   - CONFIG     : surchargeable par window.NUMMUS_CONFIG (fichier config.js
                  injecté par le conteneur Docker), ex. { storage:'rest',
                  api:{ baseUrl:'/api' } }.
   - Store      : couche de données abstraite. Trois adaptateurs partagent la
                  même interface : IdbAdapter (IndexedDB, par défaut),
                  RestAdapter (backend Docker), MemoryAdapter (secours).
                  L'interface utilisateur ne parle QU'à Store et DataIO.
   - state      : cache mémoire du profil actif (userId, items, préférences).

   Contrat REST attendu par RestAdapter (à implémenter côté backend) :
     GET    /health
     GET    /users                         PUT/DELETE /users/:uid
     GET    /users/:uid/items[?q=&type=…]  (search : mêmes clés que matchItem)
     GET    /users/:uid/items/:id          PUT/DELETE /users/:uid/items/:id
     POST   /users/:uid/items/bulk         { items:[…] }
     POST   /users/:uid/items/bulk-delete  { ids:[…] }
     DELETE /users/:uid/items
     GET/PUT /users/:uid/meta/:key         { value:… }
     GET    /numista/*  (proxy vers l'API Numista, clé côté serveur)
     GET    /prices     { gold, silver, platinum, palladium } par once troy
   ===================================================================== */

const CONFIG=Object.assign({storage:'indexeddb',api:{baseUrl:'/api'},numista:{baseUrl:'https://api.numista.com/v3'},backupIntervalDays:7},window.NUMMUS_CONFIG||{});
