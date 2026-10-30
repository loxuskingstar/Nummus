"""Authentification HTTP Basic facultative, appliquée à toute l'application (statique + API),
avec limitation des échecs par adresse IP (protection contre la force brute)."""
import base64
import secrets
import time
from collections import defaultdict, deque

from starlette.responses import Response

from .config import AUTH_MAX_FAILS, AUTH_PASSWORD, AUTH_USER, AUTH_WINDOW, TRUST_PROXY

# Accessibles sans identifiants : sonde de santé du conteneur et ressources d'installation PWA
# (le navigateur les demande sans en-tête Authorization).
PUBLIC = ("/api/health", "/manifest.webmanifest", "/icons/")

_fails: dict[str, deque] = defaultdict(deque)   # ip -> horodatages des échecs récents


def client_ip(request) -> str:
    if TRUST_PROXY:
        fwd = request.headers.get("x-forwarded-for", "")
        if fwd:
            return fwd.split(",")[0].strip()
    return request.client.host if request.client else "?"


def _recent(ip: str, now: float) -> deque:
    q = _fails[ip]
    while q and now - q[0] > AUTH_WINDOW:
        q.popleft()
    if not q:
        _fails.pop(ip, None)
    return q


def is_blocked(ip: str, now: float | None = None) -> bool:
    return AUTH_MAX_FAILS > 0 and len(_recent(ip, now or time.time())) >= AUTH_MAX_FAILS


def basic_auth_middleware():
    if not AUTH_PASSWORD:
        return None

    async def middleware(request, call_next):
        path = request.url.path
        if any(path == p or (p.endswith("/") and path.startswith(p)) for p in PUBLIC):
            return await call_next(request)
        ip = client_ip(request)
        if is_blocked(ip):
            return Response("Trop de tentatives, réessayez plus tard", status_code=429,
                            headers={"Retry-After": str(AUTH_WINDOW)})
        header = request.headers.get("authorization", "")
        if header.lower().startswith("basic "):
            try:
                user, _, pwd = base64.b64decode(header[6:]).decode().partition(":")
                if secrets.compare_digest(user, AUTH_USER) & secrets.compare_digest(pwd, AUTH_PASSWORD):
                    _fails.pop(ip, None)
                    return await call_next(request)
                _fails[ip].append(time.time())          # identifiants fournis mais faux
            except Exception:
                _fails[ip].append(time.time())
        # Sans en-tête Authorization (premier passage du navigateur) : simple défi, ce n'est pas un échec.
        return Response("Authentification requise", status_code=401,
                        headers={"WWW-Authenticate": 'Basic realm="Nummus", charset="UTF-8"'})

    return middleware
