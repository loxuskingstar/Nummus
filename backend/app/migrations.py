"""Migrations de schéma versionnées (PRAGMA user_version).

Règles pour faire évoluer la base :
  * ne jamais modifier une migration déjà publiée : en ajouter une nouvelle à la fin de MIGRATIONS ;
  * une migration est soit du SQL (chaîne), soit une fonction python(conn) ;
  * chaque migration s'exécute dans une transaction ; en cas d'échec rien n'est appliqué ;
  * avant toute migration sur une base existante, une copie « pre-migration-… » est écrite
    dans backups/ (elle n'est jamais supprimée par la rotation automatique)."""
import logging
import sqlite3
from datetime import datetime

from .config import BACKUP_DIR

log = logging.getLogger("nummus.db")

V1_BASE = """
CREATE TABLE IF NOT EXISTS users  (id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS items  (user_id TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL,
                                   updated REAL NOT NULL DEFAULT (strftime('%s','now')),
                                   PRIMARY KEY (user_id, id));
CREATE TABLE IF NOT EXISTS images (user_id TEXT NOT NULL, id TEXT NOT NULL, mime TEXT NOT NULL, data BLOB NOT NULL,
                                   PRIMARY KEY (user_id, id));
CREATE TABLE IF NOT EXISTS meta   (user_id TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL,
                                   PRIMARY KEY (user_id, key));
"""

V2_EVENTS = """
-- Journal des opérations (ajout / modification / suppression d'une fiche), base de la « machine à remonter le temps ».
-- t = horodatage en millisecondes ; data = instantané JSON des champs utiles de la fiche à ce moment.
CREATE TABLE IF NOT EXISTS events (seq INTEGER PRIMARY KEY AUTOINCREMENT,
                                   user_id TEXT NOT NULL, t INTEGER NOT NULL, kind TEXT NOT NULL,
                                   item_id TEXT NOT NULL, data TEXT NOT NULL DEFAULT '{}');
CREATE INDEX IF NOT EXISTS events_user_t ON events (user_id, t);
CREATE INDEX IF NOT EXISTS events_item ON events (user_id, item_id);
"""

V3_INDEXES = """
CREATE INDEX IF NOT EXISTS items_user ON items (user_id, updated);
"""

MIGRATIONS = [
    (1, "schéma initial (profils, fiches, images, préférences)", V1_BASE),
    (2, "journal d'événements", V2_EVENTS),
    (3, "index des fiches par profil", V3_INDEXES),
]
LATEST = MIGRATIONS[-1][0]


def current(conn: sqlite3.Connection) -> int:
    return conn.execute("PRAGMA user_version").fetchone()[0]


def snapshot(conn: sqlite3.Connection, label: str) -> str:
    """Copie cohérente de la base ouverte (API de sauvegarde SQLite)."""
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    dest = BACKUP_DIR / f"{label}-{datetime.now():%Y%m%d-%H%M%S}.sqlite3"
    out = sqlite3.connect(dest)
    try:
        with out:
            conn.backup(out)
    finally:
        out.close()
    return dest.name


def has_data(conn: sqlite3.Connection) -> bool:
    return conn.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table'").fetchone()[0] > 0


def migrate(conn: sqlite3.Connection) -> int:
    v = current(conn)
    if v > LATEST:
        raise RuntimeError(
            f"La base est en version {v}, plus récente que cette application (version {LATEST}). "
            "Mettez à jour Nummus plutôt que de rétrograder la base.")
    pending = [m for m in MIGRATIONS if m[0] > v]
    if not pending:
        return v
    if has_data(conn):
        name = snapshot(conn, f"pre-migration-v{v}-to-v{LATEST}")
        log.info("copie de sécurité avant migration : %s", name)
    for num, title, step in pending:
        log.info("migration %d : %s", num, title)
        conn.execute("BEGIN")
        try:
            if callable(step):
                step(conn)
            else:
                for stmt in filter(None, (s.strip() for s in _split(step))):
                    conn.execute(stmt)
            conn.execute(f"PRAGMA user_version = {num}")
            conn.execute("COMMIT")
        except Exception:
            conn.execute("ROLLBACK")
            raise
    return LATEST


def _split(script: str):
    """Découpe un script SQL en instructions (sans point-virgule dans les chaînes : cas non utilisé ici)."""
    lines = [l for l in script.splitlines() if not l.strip().startswith("--")]
    return "\n".join(lines).split(";")
