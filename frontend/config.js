/* Configuration injectée avant l'application. Avec le backend Docker, les données
   sont stockées côté serveur (SQLite). Pour un usage 100 % navigateur (sans serveur),
   remplacer par : window.NUMMUS_CONFIG={storage:'indexeddb'}; */
window.NUMMUS_CONFIG={storage:'rest',api:{baseUrl:'/api'}};
