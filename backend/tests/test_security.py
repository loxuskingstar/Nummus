import base64
import time

from fastapi.testclient import TestClient

from conftest import load_app


def basic(u, p):
    return {"Authorization": "Basic " + base64.b64encode(f"{u}:{p}".encode()).decode()}


def test_security_headers_on_api_and_static(client):
    for path in ("/api/health", "/"):
        r = client.get(path)
        assert r.headers["x-content-type-options"] == "nosniff"
        assert r.headers["x-frame-options"] == "DENY"
        assert r.headers["referrer-policy"] == "same-origin"


def test_gzip_on_large_json(client):
    client.put("/api/users/u", json={"id": "u", "name": "u"})
    client.post("/api/users/u/items/bulk", json={"items": [{"id": str(i), "denomination": "x" * 80} for i in range(60)]})
    r = client.get("/api/users/u/items", headers={"Accept-Encoding": "gzip"})
    assert r.headers.get("content-encoding") == "gzip" and len(r.json()) == 60


def test_bruteforce_is_throttled_then_reset_by_success(tmp_path):
    m = load_app(tmp_path, NUMMUS_PASSWORD="secret", NUMMUS_AUTH_MAX_FAILS=3)
    with TestClient(m["main"].app) as c:
        assert c.get("/api/health").status_code == 200            # sonde publique, jamais limitée
        assert c.get("/api/info").status_code == 401                # simple défi : pas un échec
        for _ in range(3):
            assert c.get("/api/info", headers=basic("nummus", "faux")).status_code == 401
        assert c.get("/api/info", headers=basic("nummus", "secret")).status_code == 429   # même le bon mot de passe
        m["security"]._fails.clear()
        assert c.get("/api/info", headers=basic("nummus", "secret")).status_code == 200


def test_session_login_cookie(tmp_path):
    m = load_app(tmp_path, NUMMUS_PASSWORD="secret")
    m["security"]._fails.clear()
    with TestClient(m["main"].app, follow_redirects=False) as c:
        assert c.get("/api/info").status_code == 401 and "www-authenticate" not in c.get("/api/info").headers
        r = c.get("/")
        assert r.status_code == 303 and r.headers["location"].startswith("/login")
        assert c.get("/login").status_code == 200
        assert c.post("/login", data={"user": "nummus", "password": "faux"}).status_code == 401
        r = c.post("/login", data={"user": "nummus", "password": "secret", "next": "//evil.com"})
        assert r.status_code == 303 and r.headers["location"] == "/" and "nummus_session" in r.cookies
        assert c.get("/api/info").status_code == 200            # cookie conservé par le client
        c.cookies.set("nummus_session", "1.deadbeef")
        assert c.get("/api/info").status_code == 401
    assert not m["security"].valid_token(m["security"].make_token(time.time() - 40 * 86400))


def test_blob_whitelist(client):
    client.put("/api/users/u", json={"id": "u", "name": "u"})
    assert client.put("/api/users/u/images/a", content=b"%PDF-1.4", headers={"content-type": "application/pdf"}).status_code == 204
    assert client.put("/api/users/u/images/b", content=b"\x89PNG", headers={"content-type": "image/png"}).status_code == 204
    assert client.put("/api/users/u/images/c", content=b"<svg onload=alert(1)>", headers={"content-type": "image/svg+xml"}).status_code == 415
    assert client.put("/api/users/u/images/d", content=b"<html>", headers={"content-type": "text/html"}).status_code == 415
    r = client.get("/api/users/u/images/a")
    assert r.headers["content-type"] == "application/pdf" and r.headers["content-security-policy"] == "sandbox"


def test_manual_backups_survive_rotation(tmp_path):
    m = load_app(tmp_path, NUMMUS_BACKUP_KEEP=2)
    with TestClient(m["main"].app):
        manual = m["backup"].run_backup("manuel")
        for _ in range(4):
            m["backup"].run_backup()
            time.sleep(1.05)
        names = [b["name"] for b in m["backup"].listing()]
        assert manual in names
        assert len([n for n in names if m["backup"].AUTO_RE.match(n)]) == 2


def test_numista_proxy_is_cached(tmp_path, monkeypatch):
    m = load_app(tmp_path, NUMISTA_API_KEY="k")
    calls = []

    class Resp:
        status_code, content, headers = 200, b'{"ok":1}', {"content-type": "application/json"}

    class Client:
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): pass
        async def get(self, url, **k):
            calls.append(url)
            return Resp()

    monkeypatch.setattr(m["routes"].httpx, "AsyncClient", Client)
    with TestClient(m["main"].app) as c:
        assert c.get("/api/numista/types/1?lang=fr").json() == {"ok": 1}
        r = c.get("/api/numista/types/1?lang=fr")
        assert r.headers["x-nummus-cache"] == "hit" and len(calls) == 1
        c.get("/api/numista/types/2")
        assert len(calls) == 2
