"""Synchronisation WebDAV exécutée par le serveur : un export JSON par profil est déposé périodiquement
(uniquement si la base a changé), avec les identifiants lus dans l'environnement. Le navigateur ne manipule
donc plus de mot de passe WebDAV (et plus de CORS)."""
import logging
import re
import threading
import time

import httpx

from . import config
from .cli import build_dump
from .db import connect

log = logging.getLogger("nummus.webdav")
_state: dict = {"last": None, "error": None, "mtime": 0.0}


def enabled() -> bool:
    return bool(config.WEBDAV_URL)


def status() -> dict:
    return {"enabled": enabled(), "last": _state["last"], "error": _state["error"]}


def _db_mtime() -> float:
    ps = [config.DB_PATH, config.DB_PATH.with_name(config.DB_PATH.name + "-wal")]
    return max((p.stat().st_mtime for p in ps if p.exists()), default=0.0)


def push_all(force: bool = False) -> int:
    """Envoie un fichier par profil. Renvoie le nombre de profils envoyés."""
    if not enabled():
        return 0
    mt = _db_mtime()
    if not force and mt <= _state["mtime"]:
        return 0
    doc = build_dump()
    base = config.WEBDAV_URL.rstrip("/") + "/"
    auth = (config.WEBDAV_USER, config.WEBDAV_PASSWORD) if config.WEBDAV_USER else None
    n = 0
    try:
        with httpx.Client(timeout=60, auth=auth) as cl:
            for u in doc["users"]:
                name = re.sub(r"[^A-Za-z0-9_.-]+", "-", (u["user"].get("name") or u["user"].get("id") or "profil")).strip("-") or "profil"
                one = {**doc, "users": [u]}
                r = cl.put(f"{base}nummus-{name}.json", json=one)
                r.raise_for_status()
                n += 1
        _state.update(last=int(time.time()), error=None, mtime=mt)
    except Exception as e:
        _state["error"] = type(e).__name__
        log.exception("échec de la synchronisation WebDAV")
    return n


def _loop() -> None:
    time.sleep(90)
    while True:
        try:
            push_all()
        except Exception:
            log.exception("synchronisation WebDAV")
        time.sleep(max(config.WEBDAV_EVERY_HOURS, 0.05) * 3600)


def start() -> None:
    if enabled() and config.WEBDAV_EVERY_HOURS > 0:
        threading.Thread(target=_loop, daemon=True, name="nummus-webdav").start()
