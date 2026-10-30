"""Configuration lue dans l'environnement (voir docker-compose.yml / .env.example).

Tout ce qui doit survivre à un redémarrage ou être déplacé vers un autre serveur vit
sous DATA_DIR :  db/  (base SQLite) · logs/  (journaux) · backups/  (sauvegardes)."""
import os
from pathlib import Path

APP_VERSION = "2.0.0"

DATA_DIR = Path(os.environ.get("NUMMUS_DATA_DIR", "/data"))
DB_DIR = DATA_DIR / "db"
LOG_DIR = DATA_DIR / "logs"
BACKUP_DIR = DATA_DIR / "backups"
DB_PATH = DB_DIR / "nummus.sqlite3"
LEGACY_DB_PATH = DATA_DIR / "nummus.sqlite3"   # emplacement de la version 1 (migré automatiquement)
FRONTEND_DIR = Path(os.environ.get("NUMMUS_FRONTEND_DIR", Path(__file__).resolve().parents[2] / "frontend"))

# Sauvegardes automatiques (copie cohérente de la base, uniquement si elle a changé). 0 = désactivées.
BACKUP_EVERY_HOURS = float(os.environ.get("NUMMUS_BACKUP_EVERY_HOURS", "24"))
BACKUP_KEEP = int(os.environ.get("NUMMUS_BACKUP_KEEP", "7"))

# Authentification HTTP Basic facultative (laisser vide pour la désactiver, ex. derrière un SSO).
AUTH_USER = os.environ.get("NUMMUS_USER", "nummus")
AUTH_PASSWORD = os.environ.get("NUMMUS_PASSWORD", "")
# « session » : page de connexion + cookie signé (mot de passe saisi une fois) ; « basic » : fenêtre native du navigateur.
AUTH_MODE = os.environ.get("NUMMUS_AUTH_MODE", "session").lower()
AUTH_SESSION_DAYS = int(os.environ.get("NUMMUS_SESSION_DAYS", "30"))

# Clé API Numista conservée côté serveur (proxy /api/numista/*).
NUMISTA_API_KEY = os.environ.get("NUMISTA_API_KEY", "")
NUMISTA_BASE = os.environ.get("NUMISTA_BASE_URL", "https://api.numista.com/v3")

# Cours des métaux précieux (proxy /api/prices). Source configurable ; par défaut gold-api.com (sans clé).
PRICES_URL = os.environ.get("NUMMUS_PRICES_URL", "https://api.gold-api.com/price/{symbol}")
FX_URL = os.environ.get("NUMMUS_FX_URL", "https://api.frankfurter.app/latest?from=USD&to={cur}")
PRICES_TTL = int(os.environ.get("NUMMUS_PRICES_TTL", "900"))

MAX_IMAGE_BYTES = int(os.environ.get("NUMMUS_MAX_IMAGE_MB", "25")) * 1024 * 1024

# Protection contre la force brute sur l'authentification : N échecs en WINDOW secondes => HTTP 429.
AUTH_MAX_FAILS = int(os.environ.get("NUMMUS_AUTH_MAX_FAILS", "10"))
AUTH_WINDOW = int(os.environ.get("NUMMUS_AUTH_WINDOW", "300"))
# À activer uniquement derrière un reverse proxy de confiance (Caddy…) : l'IP du client est lue dans X-Forwarded-For.
TRUST_PROXY = os.environ.get("NUMMUS_TRUST_PROXY", "").lower() in ("1", "true", "yes")

# Cache du proxy Numista (secondes).
NUMISTA_TTL = int(os.environ.get("NUMMUS_NUMISTA_TTL", "86400"))

# Synchronisation WebDAV exécutée par le serveur (le mot de passe ne transite plus par le navigateur).
# Laisser NUMMUS_WEBDAV_URL vide pour la désactiver. Le fichier est écrit sous <URL>/nummus-<profil>.json
WEBDAV_URL = os.environ.get("NUMMUS_WEBDAV_URL", "")
WEBDAV_USER = os.environ.get("NUMMUS_WEBDAV_USER", "")
WEBDAV_PASSWORD = os.environ.get("NUMMUS_WEBDAV_PASSWORD", "")
WEBDAV_EVERY_HOURS = float(os.environ.get("NUMMUS_WEBDAV_EVERY_HOURS", "24"))

# Types de fichiers acceptés par /images (images + pièces jointes PDF). Tout le reste est refusé.
ALLOWED_BLOB_TYPES = ("image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "application/pdf")
