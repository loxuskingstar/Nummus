"""Accès SQLite : un fichier unique (DATA_DIR/db/nummus.sqlite3), mode WAL.

Les fiches sont stockées en JSON : le schéma d'une fiche évolue côté interface
(champs personnalisables) sans migration SQL. Les colonnes SQL ne portent que
l'identité et le rattachement à un profil (user_id)."""
import logging
import shutil
import sqlite3
from contextlib import contextmanager

from . import migrations
from .config import BACKUP_DIR, DATA_DIR, DB_DIR, DB_PATH, LEGACY_DB_PATH, LOG_DIR

log = logging.getLogger("nummus.db")


def _adopt_legacy_db() -> None:
    """Version 1 : la base était dans DATA_DIR/nummus.sqlite3. On la déplace dans db/ (avec ses fichiers WAL)."""
    if DB_PATH.exists() or not LEGACY_DB_PATH.exists():
        return
    for suffix in ("", "-wal", "-shm"):
        src = LEGACY_DB_PATH.with_name(LEGACY_DB_PATH.name + suffix)
        if src.exists():
            shutil.move(str(src), str(DB_DIR / (DB_PATH.name + suffix)))
    log.warning("ancienne base déplacée de %s vers %s", LEGACY_DB_PATH, DB_PATH)


def init() -> int:
    for d in (DATA_DIR, DB_DIR, LOG_DIR, BACKUP_DIR):
        d.mkdir(parents=True, exist_ok=True)
    _adopt_legacy_db()
    c = sqlite3.connect(DB_PATH, timeout=15, isolation_level=None)   # transactions gérées par migrations.migrate
    try:
        c.execute("PRAGMA journal_mode=WAL")
        return migrations.migrate(c)
    finally:
        c.close()


@contextmanager
def connect():
    c = sqlite3.connect(DB_PATH, timeout=15)
    c.execute("PRAGMA foreign_keys=ON")
    try:
        yield c
        c.commit()
    except Exception:
        c.rollback()
        raise
    finally:
        c.close()
