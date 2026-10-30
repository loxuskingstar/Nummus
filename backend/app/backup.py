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
AUTO_RE = re.compile(r"^nummus-\d{8}-\d{6}\.sqlite3$")   # sauvegardes automatiques ; « manuel-… » et « pre-migration-… » sont conservées


def _changed_since_last() -> bool:
    files = sorted(p for p in BACKUP_DIR.glob("nummus-*.sqlite3") if AUTO_RE.match(p.name))
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
    """Ne conserve que les BACKUP_KEEP dernières sauvegardes automatiques (les « manuel-… » et « pre-migration-… » sont gardées)."""
    autos = sorted(p for p in BACKUP_DIR.glob("nummus-*.sqlite3") if AUTO_RE.match(p.name))
    for old in autos[:-BACKUP_KEEP or None]:
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


def restore(name: str) -> dict:
    """Remplace la base courante par une sauvegarde. Une copie « pre-restore-… » de l'état actuel est faite d'abord
    (jamais supprimée par la rotation). La sauvegarde est vérifiée (intégrité + version) avant toute écriture."""
    from . import migrations
    if not NAME_RE.match(name) or not (BACKUP_DIR / name).is_file():
        raise ValueError("Sauvegarde introuvable")
    src = sqlite3.connect(f"file:{(BACKUP_DIR / name).as_posix()}?mode=ro", uri=True)
    try:
        if src.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise ValueError("Sauvegarde corrompue")
        v = src.execute("PRAGMA user_version").fetchone()[0]
        if v > migrations.LATEST:
            raise ValueError(f"Sauvegarde en schéma v{v}, plus récent que cette application (v{migrations.LATEST})")
        if not src.execute("SELECT 1 FROM sqlite_master WHERE name='items'").fetchone():
            raise ValueError("Ce fichier n'est pas une sauvegarde Nummus")
        safety = run_backup("pre-restore")
        dst = sqlite3.connect(DB_PATH, timeout=30)
        try:
            src.backup(dst)
            dst.commit()
            migrations.migrate(dst) if v < migrations.LATEST else None
        finally:
            dst.close()
    finally:
        src.close()
    log.warning("base restaurée depuis %s (état précédent : %s)", name, safety)
    return {"restored": name, "safety": safety}


def integrity() -> dict:
    """Contrôle de la base : PRAGMA integrity_check + images non référencées par une fiche."""
    import json
    c = sqlite3.connect(DB_PATH)
    try:
        ok = c.execute("PRAGMA integrity_check").fetchone()[0]
        used: dict[str, set] = {}
        for uid, data in c.execute("SELECT user_id,data FROM items"):
            try:
                it = json.loads(data)
            except Exception:
                continue
            s = used.setdefault(uid, set())
            for m in (it.get("imgs") or []) + (it.get("docs") or []):
                if isinstance(m, dict) and m.get("id"):
                    s.add(m["id"])
        orphans = [(u, i) for u, i in c.execute("SELECT user_id,id FROM images") if i not in used.get(u, set())]
        missing = sum(1 for u, s in used.items() for i in s if not c.execute("SELECT 1 FROM images WHERE user_id=? AND id=?", (u, i)).fetchone())
        return {"sqlite": ok, "orphan_images": len(orphans), "missing_images": missing}
    finally:
        c.close()
