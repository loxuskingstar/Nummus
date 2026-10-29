"""Sauvegardes de la base : copies cohérentes (API de sauvegarde SQLite), même pendant l'utilisation."""
import logging
import re
import sqlite3
import threading
import time
from datetime import datetime

from .config import BACKUP_DIR, BACKUP_EVERY_HOURS, BACKUP_KEEP, DB_PATH

log = logging.getLogger("nummus.backup")
NAME_RE = re.compile(r"^[A-Za-z0-9_.\-]{1,120}\.sqlite3$")


def _changed_since_last() -> bool:
    files = sorted(BACKUP_DIR.glob("nummus-*.sqlite3"))
    if not files:
        return True
    last = files[-1].stat().st_mtime
    mt = [p.stat().st_mtime for p in (DB_PATH, DB_PATH.with_name(DB_PATH.name + "-wal")) if p.exists()]
    return bool(mt) and max(mt) > last


def run_backup(label: str = "nummus") -> str:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    dest = BACKUP_DIR / f"{label}-{datetime.now():%Y%m%d-%H%M%S}.sqlite3"
    src = sqlite3.connect(DB_PATH)
    dst = sqlite3.connect(dest)
    try:
        with dst:
            src.backup(dst)
    finally:
        src.close()
        dst.close()
    rotate()
    log.info("sauvegarde %s", dest.name)
    return dest.name


def rotate() -> None:
    """Ne conserve que les BACKUP_KEEP dernières sauvegardes automatiques (les « pre-migration-… » sont gardées)."""
    for old in sorted(BACKUP_DIR.glob("nummus-*.sqlite3"))[:-BACKUP_KEEP or None]:
        old.unlink(missing_ok=True)


def listing() -> list[dict]:
    out = []
    for p in sorted(BACKUP_DIR.glob("*.sqlite3"), reverse=True):
        s = p.stat()
        out.append({"name": p.name, "bytes": s.st_size, "modified": int(s.st_mtime)})
    return out


def _loop() -> None:
    time.sleep(60)   # laisse le serveur démarrer
    while True:
        try:
            if _changed_since_last():
                run_backup()
        except Exception:
            log.exception("échec de la sauvegarde automatique")
        time.sleep(max(BACKUP_EVERY_HOURS, 0.05) * 3600)


def start() -> None:
    if BACKUP_EVERY_HOURS > 0:
        threading.Thread(target=_loop, daemon=True, name="nummus-backup").start()
