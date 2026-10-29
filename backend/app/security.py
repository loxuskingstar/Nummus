"""Authentification HTTP Basic facultative, appliquée à toute l'application (statique + API)."""
import base64
import secrets

from starlette.responses import Response

from .config import AUTH_PASSWORD, AUTH_USER

# Accessibles sans identifiants : sonde de santé du conteneur et ressources d'installation PWA
# (le navigateur les demande sans en-tête Authorization).
PUBLIC = ("/api/health", "/manifest.webmanifest", "/icons/")


def basic_auth_middleware():
    if not AUTH_PASSWORD:
        return None

    async def middleware(request, call_next):
        path = request.url.path
        if any(path == p or (p.endswith("/") and path.startswith(p)) for p in PUBLIC):
            return await call_next(request)
        header = request.headers.get("authorization", "")
        if header.lower().startswith("basic "):
            try:
                user, _, pwd = base64.b64decode(header[6:]).decode().partition(":")
                if secrets.compare_digest(user, AUTH_USER) & secrets.compare_digest(pwd, AUTH_PASSWORD):
                    return await call_next(request)
            except Exception:
                pass
        return Response("Authentification requise", status_code=401,
                        headers={"WWW-Authenticate": 'Basic realm="Nummus", charset="UTF-8"'})

    return middleware
