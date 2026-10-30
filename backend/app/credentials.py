"""Identifiants modifiables depuis l'interface.

NUMMUS_PASSWORD (environnement) active l'authentification et sert de mot de passe initial. Dès que le mot de passe est
changé dans l'interface, un condensé PBKDF2 est écrit dans DATA_DIR/auth.json et prend le pas sur la variable
d'environnement (qui peut alors rester inchangée). Supprimer auth.json rétablit le mot de passe de l'environnement."""
import hashlib
import json
import os
import secrets

from .config import AUTH_PASSWORD, AUTH_USER, DATA_DIR

FILE = DATA_DIR / "auth.json"
ITER = 200_000


def _load() -> dict | None:
    try:
        d = json.loads(FILE.read_text())
        return d if d.get("salt") and d.get("hash") else None
    except Exception:
        return None


def _hash(pwd: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", pwd.encode(), bytes.fromhex(salt), ITER).hex()


def user() -> str:
    return AUTH_USER


def check(u: str, pwd: str) -> bool:
    ok_user = secrets.compare_digest(u.encode(), AUTH_USER.encode())
    d = _load()
    if d:
        return secrets.compare_digest(_hash(pwd, d["salt"]), d["hash"]) & ok_user
    return secrets.compare_digest(pwd.encode(), AUTH_PASSWORD.encode()) & ok_user


def secret() -> bytes:
    """Matériau de signature des cookies : change avec le mot de passe, ce qui déconnecte toutes les sessions."""
    d = _load()
    return hashlib.sha256(f"nummus|{AUTH_USER}|{d['hash'] if d else AUTH_PASSWORD}".encode()).digest()


def set_password(new: str) -> None:
    salt = os.urandom(16).hex()
    FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps({"salt": salt, "hash": _hash(new, salt)}))
    os.chmod(tmp, 0o600)
    tmp.replace(FILE)
