"""Authentification HTTP Basic facultative, appliquée à toute l'application (statique + API),
avec limitation des échecs par adresse IP (protection contre la force brute)."""
import base64
import hashlib
import hmac
import secrets
import time
from html import escape
from urllib.parse import parse_qs
from collections import defaultdict, deque

from starlette.responses import HTMLResponse, RedirectResponse, Response

from .config import AUTH_MAX_FAILS, AUTH_MODE, AUTH_PASSWORD, AUTH_SESSION_DAYS, AUTH_USER, AUTH_WINDOW, TRUST_PROXY

# Accessibles sans identifiants : sonde de santé du conteneur et ressources d'installation PWA
# (le navigateur les demande sans en-tête Authorization).
PUBLIC = ("/api/health", "/manifest.webmanifest", "/icons/", "/login")
COOKIE = "nummus_session"

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


def _sign(exp: int) -> str:
    key = hashlib.sha256(f"nummus|{AUTH_USER}|{AUTH_PASSWORD}".encode()).digest()
    return hmac.new(key, str(exp).encode(), hashlib.sha256).hexdigest()


def make_token(now: float | None = None) -> str:
    exp = int((now or time.time()) + AUTH_SESSION_DAYS * 86400)
    return f"{exp}.{_sign(exp)}"


def valid_token(tok: str, now: float | None = None) -> bool:
    """Jeton sans état : expiration + HMAC. Changer le mot de passe invalide toutes les sessions."""
    try:
        exp, _, sig = tok.partition(".")
        return int(exp) > (now or time.time()) and hmac.compare_digest(sig, _sign(int(exp)))
    except Exception:
        return False


LOGIN_HTML = """<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nummus – connexion</title><style>
body{{margin:0;min-height:100vh;display:grid;place-items:center;background:#14110d;color:#eee;font:16px system-ui,sans-serif}}
form{{width:min(340px,90vw);display:grid;gap:12px;padding:28px;border-radius:14px;background:#1f1a14;border:1px solid #3a3226}}
h1{{margin:0 0 4px;font-size:22px}}input,button{{font:inherit;padding:10px 12px;border-radius:8px;border:1px solid #3a3226;background:#14110d;color:inherit}}
button{{background:#c9a24a;color:#14110d;border:0;font-weight:600;cursor:pointer}}.err{{color:#f08a7a;font-size:14px}}
</style></head><body><form method="post" action="/login"><h1>Nummus</h1>{err}
<input name="user" placeholder="Identifiant" autocomplete="username" value="{user}" required>
<input name="password" type="password" placeholder="Mot de passe" autocomplete="current-password" required autofocus>
<input type="hidden" name="next" value="{nxt}"><button>Se connecter</button></form></body></html>"""


def _safe_next(n: str) -> str:
    return n if n.startswith("/") and not n.startswith("//") else "/"


def _login_page(err: str = "", user: str = "", nxt: str = "/", status: int = 200):
    e = f'<div class="err">{escape(err)}</div>' if err else ""
    return HTMLResponse(LOGIN_HTML.format(err=e, user=escape(user), nxt=escape(nxt)), status_code=status)


def basic_auth_middleware():
    if not AUTH_PASSWORD:
        return None

    async def middleware(request, call_next):
        path = request.url.path
        if AUTH_MODE == "session" and path == "/login":
            return await _login(request)
        if AUTH_MODE == "session" and path == "/logout":
            r = RedirectResponse("/login", status_code=303)
            r.delete_cookie(COOKIE)
            return r
        if any(path == p or (p.endswith("/") and path.startswith(p)) for p in PUBLIC):
            return await call_next(request)
        ip = client_ip(request)
        if is_blocked(ip):
            return Response("Trop de tentatives, réessayez plus tard", status_code=429,
                            headers={"Retry-After": str(AUTH_WINDOW)})
        if AUTH_MODE == "session" and valid_token(request.cookies.get(COOKIE, "")):
            return await call_next(request)
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
        if AUTH_MODE == "session":   # pas de fenêtre Basic du navigateur : page de connexion ou 401 JSON
            if path.startswith("/api/"):
                return Response('{"detail":"Authentification requise"}', status_code=401, media_type="application/json")
            return RedirectResponse("/login?next=" + _safe_next(path), status_code=303)
        # Sans en-tête Authorization (premier passage du navigateur) : simple défi, ce n'est pas un échec.
        return Response("Authentification requise", status_code=401,
                        headers={"WWW-Authenticate": 'Basic realm="Nummus", charset="UTF-8"'})

    async def _login(request):
        ip = client_ip(request)
        if request.method != "POST":
            return _login_page(nxt=_safe_next(request.query_params.get("next", "/")))
        if is_blocked(ip):
            return _login_page("Trop de tentatives, réessayez plus tard.", status=429)
        f = parse_qs((await request.body()).decode(errors="replace"))
        user, pwd, nxt = (f.get(k, [""])[0] for k in ("user", "password", "next"))
        if secrets.compare_digest(user, AUTH_USER) & secrets.compare_digest(pwd, AUTH_PASSWORD):
            _fails.pop(ip, None)
            r = RedirectResponse(_safe_next(nxt), status_code=303)
            secure = request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"
            r.set_cookie(COOKIE, make_token(), max_age=AUTH_SESSION_DAYS * 86400, httponly=True,
                         samesite="lax", secure=secure, path="/")
            return r
        _fails[ip].append(time.time())
        return _login_page("Identifiants incorrects.", user, _safe_next(nxt), 401)

    return middleware
