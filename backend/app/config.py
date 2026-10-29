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
BACKUP_KEEP = int(os.environ.get("NUMMUS_BACKUP_KEEP", "14"))

# Authentification HTTP Basic facultative (laisser vide pour la désactiver, ex. derrière un SSO).
AUTH_USER = os.environ.get("NUMMUS_USER", "nummus")
AUTH_PASSWORD = os.environ.get("NUMMUS_PASSWORD", "")

# Clé API Numista conservée côté serveur (proxy /api/numista/*).
NUMISTA_API_KEY = os.environ.get("NUMISTA_API_KEY", "")
NUMISTA_BASE = os.environ.get("NUMISTA_BASE_URL", "https://api.numista.com/v3")

# Cours des métaux précieux (proxy /api/prices). Source configurable ; par défaut gold-api.com (sans clé).
PRICES_URL = os.environ.get("NUMMUS_PRICES_URL", "https://api.gold-api.com/price/{symbol}")
FX_URL = os.environ.get("NUMMUS_FX_URL", "https://api.frankfurter.app/latest?from=USD&to={cur}")
PRICES_TTL = int(os.environ.get("NUMMUS_PRICES_TTL", "900"))

MAX_IMAGE_BYTES = int(os.environ.get("NUMMUS_MAX_IMAGE_MB", "25")) * 1024 * 1024
