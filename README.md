# Nummus

Gestionnaire de collection numismatique (pièces et billets) : interface web + API Python, un seul conteneur.
Tout ce qui est à vous vit dans **un seul dossier, `data/`**, que l'on copie pour changer de serveur.

```
nummus/
├── docker-compose.yml     # service unique, dossier ./data monté sur /data
├── Dockerfile             # python:3.12-slim, utilisateur non privilégié
├── .env.example           # variables d'environnement
├── data/                  # ← VOS DONNÉES (ignoré par git)
│   ├── db/                #   nummus.sqlite3 (base, images incluses)
│   ├── backups/           #   copies cohérentes de la base (automatiques + manuelles + avant migration)
│   └── logs/              #   nummus.log (rotation automatique)
├── backend/               # API REST (FastAPI) + SQLite
│   ├── app/
│   │   ├── main.py        #   application, journaux, sert aussi le frontend
│   │   ├── routes.py      #   contrat REST (profils, fiches, images, préférences, journal d'opérations, sauvegardes, Numista, cours)
│   │   ├── db.py          #   SQLite (WAL) ; déplace automatiquement une ancienne base /data/nummus.sqlite3 vers db/
│   │   ├── migrations.py  #   migrations de schéma versionnées (PRAGMA user_version)
│   │   ├── backup.py      #   sauvegardes (API de sauvegarde SQLite) et rotation
│   │   ├── cli.py         #   info · migrate · backup · dump · load
│   │   ├── security.py    #   authentification HTTP Basic facultative
│   │   └── config.py      #   lecture de l'environnement
│   └── tests/             #   17 tests (API, migrations, sauvegardes, export/import)
└── frontend/              # interface statique, sans étape de build
    ├── index.html, config.js, manifest.webmanifest, sw.js
    ├── css/               #   base, gallery, layout, print, polish, features
    ├── js/                #   modules de base + feat-*.js (un fichier par fonctionnalité)
    ├── vendor/            #   D3, TopoJSON, KaTeX, contours du monde (aucun CDN)
    └── icons/
```

## Démarrage

```bash
cp .env.example .env        # puis éditer : NUMMUS_PASSWORD, et NUMMUS_UID/GID (résultats de `id -u` / `id -g`)
docker compose up -d --build
```

L'application est disponible sur <http://localhost:8080> (port réglable avec `NUMMUS_PORT`).
Le dossier `./data` doit appartenir à l'utilisateur indiqué par `NUMMUS_UID`/`NUMMUS_GID` (sinon : `sudo chown -R 1000:1000 data`).

| Variable | Rôle |
|---|---|
| `NUMMUS_PASSWORD` | Active l'authentification HTTP Basic (identifiant : `NUMMUS_USER`, défaut `nummus`). Vide = pas d'authentification : à réserver à un réseau de confiance. |
| `NUMISTA_API_KEY` | Clé Numista conservée côté serveur ; active le pré-remplissage des fiches. |
| `NUMMUS_PORT` | Port publié sur l'hôte (défaut 8080). |
| `NUMMUS_BACKUP_EVERY_HOURS` / `NUMMUS_BACKUP_KEEP` | Sauvegarde automatique toutes les N heures **si la base a changé** (0 = désactivée) ; nombre de copies conservées. |

| `NUMMUS_WEBDAV_URL` / `_USER` / `_PASSWORD` / `_EVERY_HOURS` | Copie JSON de chaque profil vers un WebDAV, **faite par le serveur** si la base a changé. Aucun mot de passe dans le navigateur. |
| `NUMMUS_TRUST_PROXY` | À activer derrière un proxy inverse : la limite de 10 mots de passe erronés en 5 minutes (réponse 429) utilise alors `X-Forwarded-For`. |

Autres réglages (facultatifs, voir `backend/app/config.py`) : `NUMMUS_PRICES_URL`, `NUMMUS_FX_URL`, `NUMMUS_PRICES_TTL`, `NUMMUS_MAX_IMAGE_MB`.

## Sécurité : ce qui est (et n'est pas) protégé

- Le **mode vitrine** est un confort d'affichage, **pas une sécurité** : le masquage des prix et champs privés est fait dans le navigateur, l'API renvoie tout à qui est authentifié. Pour exposer une collection, utilisez l'authentification Basic et un accès réseau restreint.
- En-têtes `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, compression gzip ; images servies en `Content-Security-Policy: sandbox` ; seuls JPEG, PNG, WebP, GIF, AVIF et PDF sont acceptés en téléversement.
- Les mots de passe WebDAV et clés Numista ne sont plus inclus dans les exports JSON ; en mode serveur ils restent côté serveur.
- **Chiffrement** : Réglages > Chiffrement exporte en AES-256-GCM (clé dérivée par PBKDF2). Le mot de passe n'est jamais stocké ni récupérable. La base locale du navigateur n'est pas chiffrée.
- **Sauvegardes** : les copies manuelles (`manuel-…`) ne sont jamais effacées par la rotation. Elles restent sur le même disque : copiez périodiquement `data/backups` ailleurs (cron + `rsync` ou `rclone`), ou activez WebDAV.

## Migrer ou sauvegarder ses données

Trois niveaux, du plus simple au plus portable :

1. **Copier le dossier `data/`** (serveur arrêté, ou après `backup`) vers le nouveau serveur, même arborescence, puis `docker compose up -d`.
   Au démarrage, la base est mise à jour toute seule si le schéma a évolué ; une copie `pre-migration-…` est alors écrite dans `data/backups/`.
   Une base **plus récente** que l'application est refusée (pas de retour en arrière silencieux).
2. **Sauvegarde cohérente à chaud** :
   ```bash
   docker compose exec nummus python -m app.cli backup      # écrit dans data/backups/
   docker compose exec nummus python -m app.cli info        # version du schéma, volumétrie
   ```
   Depuis l'interface : *Réglages → Stockage et migration → Créer une sauvegarde maintenant*.
3. **Export texte indépendant de SQLite** (changer de version majeure, voire de moteur de base) :
   ```bash
   docker compose exec nummus python -m app.cli dump /data/export.json
   # sur le nouveau serveur :
   docker compose exec nummus python -m app.cli load /data/export.json            # fusionne
   docker compose exec nummus python -m app.cli load /data/export.json --replace  # remplace les profils concernés
   ```
   L'export JSON de l'interface (*Réglages → Exporter*) est le même format côté profil, et s'importe aussi depuis le mode « navigateur seul ».

Pour restaurer une sauvegarde : arrêter le conteneur, remplacer `data/db/nummus.sqlite3` par le fichier voulu de `data/backups/`, relancer.

> Le journal d'opérations (« Remonter le temps ») et les mouvements de rangement font partie de la base et des exports.

## Fonctionnalités

Les modules s'activent ou se désactivent dans *Réglages → Modules* ; les données restent conservées.

| Module | Contenu |
|---|---|
| **Favoris** | Cœur sur les fiches et les cartes, vue dédiée, recherche `is:favori`. |
| **Wishlist (carnet d'acquisition)** | Priorité, avancement (à rechercher / repérée / en négociation / achetée), prix maximal, état minimal, budget prévisionnel et marge, prix observés saisis à la main, alerte quand une entrée ajoutée ressemble à un souhait (toujours validée par vous). |
| **Séries** | Séries à cases (millésimes d'un type, liste libre) avec cases manquantes grisées, « variante à identifier » distincte de « manquante », objectifs et échéances, doublons présentés sans jugement, associations suggérées à valider ; séries ouvertes définies par une règle de recherche. |
| **Plans de rangement** | Classeurs, plateaux, boîtes, tiroirs, capsules ; emplacements numérotés libres/occupés ; recherche pièce → emplacement et emplacement → pièce ; déplacements avec historique ; organisation proposée (par pays, année, type…) à valider avant application ; plan imprimable. |
| **Remonter le temps** | La collection à une date donnée, acquisitions et cessions entre deux dates, évolution des estimations enregistrées, progression des séries. |
| **Journal** | Carnet personnel (découvertes, bourses, rencontres, identifications) lié aux pièces ; ne montre jamais de prix. |
| **Pièce du jour** | Sur l'accueil, cinq modes (hasard, récente, peu consultée, fiche à compléter, pays peu représenté). |
| **Expositions** | Salles, textes, légendes ; aperçu ; export en **un fichier HTML autonome** sans prix, valeurs, provenance, emplacement ni notes. |
| **Ateliers monétaires** | Carte des ateliers déduits du champ « Atelier », filtre par période, positions approximatives signalées, ateliers inconnus à placer à la main. |
| **Pistes et diversité** | Écarts de poids/diamètre, métal ou variété divergents entre vos propres fiches, comparaison visuelle de deux exemplaires ; indicateurs de diversité et objectifs, tous descriptifs. |

### Limites assumées

* **Quantités** : la quantité d'une fiche est un nombre d'exemplaires identiques, pas des exemplaires nommés un à un. Dans un plan de rangement, chaque exemplaire occupe un emplacement.
* **Passé du journal** : l'historique commence à la première ouverture avec cette version. Les fiches déjà présentes sont « présentes dès le début du journal », jamais datées à l'acquisition. La date d'acquisition d'une fiche reste un champ indépendant.
* **Pas de données de référence embarquées** : aucune liste « officielle » de séries (2 € commémoratives, etc.), aucun poids de référence, aucune cote. Les pistes comparent vos fiches entre elles et ne prouvent ni authenticité, ni rareté, ni erreur de frappe.
* **Ateliers** : le répertoire embarqué donne des positions de villes (approximatives, en pointillés) ; les territoires historiques ne sont pas dessinés.
* **Anecdotes** : la pièce du jour n'affiche une anecdote que si vous l'avez saisie (avec sa source) ; pas de génération automatique.
* **Prix** : prix payé, valeur estimée, prix observés et valeur du métal sont des champs distincts et ne sont jamais mélangés.
* **Partage** : l'export d'exposition est un fichier à transmettre ; il n'y a pas de lien public hébergé.

## HTTPS

L'installation en application (PWA), le hachage natif du code PIN et la mise hors ligne exigent HTTPS (ou `localhost`). Placer un reverse proxy devant le conteneur, par exemple Caddy :

```
nummus.exemple.fr {
    reverse_proxy nummus:8000
}
```

(le conteneur Caddy doit être sur le même réseau Docker, ou remplacer `nummus:8000` par `localhost:8080`).

## Développement local (sans Docker)

```bash
cd backend
pip install -r requirements.txt pytest
NUMMUS_DATA_DIR=../data NUMMUS_FRONTEND_DIR=../frontend uvicorn app.main:app --reload
python -m pytest                                  # tests (dossier de données temporaire)
```

Pour utiliser le frontend seul, 100 % dans le navigateur (IndexedDB), remplacer `frontend/config.js` par `window.NUMMUS_CONFIG={storage:'indexeddb'};` et servir le dossier avec n'importe quel serveur statique.

## Architecture du frontend

* Les scripts partagent la portée globale (pas de bundler) : l'ordre dans `index.html` est significatif ; les `feat-*.js` se chargent après `actions.js`.
* `js/store.js` : couche de données — `IdbAdapter` (navigateur), `RestAdapter` (ce backend), `MemoryAdapter` (secours). L'interface ne parle qu'à `Store` et `DataIO`.
* `js/events.js` : journal d'opérations (instantanés des champs suivis, `stateAt(T)`), base de « Remonter le temps ».
* Un module se déclare avec `addModule(clé, libellé, icône, description, {view, after_})` et étend `ACT`, `CH`, `SUBMIT`, `EXT.detail` (sections de fiche), `EXT.home` (widgets d'accueil), `EXT.settings`.
* Les listes propres aux modules (séries, contenants, journal, expositions, ateliers, objectifs) sont stockées avec les préférences du profil : exportées, fusionnées à l'import, sans migration SQL.
* Le contrat REST est celui de `RestAdapter` ; il est implémenté dans `backend/app/routes.py` et documenté par l'interface Swagger sur `/api/docs`.
* La recherche avancée (opérateurs, plages…) est évaluée par l'interface ; `GET …/items` n'accepte côté serveur que les filtres simples `type`, `status`, `country`, `q`.

## Migrations de schéma (pour développeurs)

Ajouter un tuple `(n, "description", SQL ou fonction python(conn))` à la fin de `MIGRATIONS` dans `backend/app/migrations.py` (ne jamais modifier une migration déjà publiée) : il sera appliqué une seule fois, dans une transaction, après une copie de sécurité automatique. Les fiches étant stockées en JSON, ajouter un champ côté interface ne demande aucune migration.


## Tests et qualité

- Backend : `cd backend && pytest`.
- Logique pure du frontend (recherche, utilitaires) : `node --test frontend/tests/*.test.js`.
- Lint : `npm install && npm run lint` (ESLint, règle `no-undef` avec la liste des globales générée par `npm run globals`) ; formatage `npm run format` (Prettier, à utiliser sur les fichiers que vous modifiez, sans reformatage global).
- Intégration continue : `.github/workflows/ci.yml` lance pytest, les tests JS et `docker build`.

## Composants tiers

qrcode-generator 1.4.4 (MIT, `frontend/vendor/qrcode.js`), d3, topojson-client, KaTeX.
