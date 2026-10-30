import os

from fastapi.testclient import TestClient

from conftest import load_app


def test_health_info_and_layout(client, tmp_path):
    assert client.get("/api/health").json() == {"status": "ok"}
    info = client.get("/api/info").json()
    assert info["schema"] == info["schema_latest"] >= 3
    assert (tmp_path / "db" / "nummus.sqlite3").is_file()
    assert (tmp_path / "logs").is_dir() and (tmp_path / "backups").is_dir()


def test_users_items_crud_and_filters(client):
    assert client.get("/api/users").json() == []
    assert client.put("/api/users/u1", json={"id": "u1", "name": "A"}).status_code == 204
    client.post("/api/users/u1/items/bulk", json={"items": [
        {"id": "a", "denomination": "1 franc Semeuse", "type": "coin", "status": "owned", "country": "250"},
        {"id": "b", "denomination": "5 livres", "type": "note", "status": "wish", "country": "826"}]})
    assert len(client.get("/api/users/u1/items").json()) == 2
    assert [i["id"] for i in client.get("/api/users/u1/items", params={"type": "note"}).json()] == ["b"]
    assert [i["id"] for i in client.get("/api/users/u1/items", params={"q": "semeuse"}).json()] == ["a"]
    client.put("/api/users/u1/items/a", json={"id": "zzz", "denomination": "modifié"})
    assert client.get("/api/users/u1/items/a").json()["denomination"] == "modifié"
    assert client.get("/api/users/u1/items/nope").status_code == 404
    client.post("/api/users/u1/items/bulk-delete", json={"ids": ["a"]})
    assert [i["id"] for i in client.get("/api/users/u1/items").json()] == ["b"]
    client.delete("/api/users/u1/items")
    assert client.get("/api/users/u1/items").json() == []


def test_profiles_isolated_and_deleted_with_events(client):
    for u in ("u1", "u2"):
        client.put(f"/api/users/{u}", json={"id": u, "name": u})
        client.put(f"/api/users/{u}/items/x", json={"id": "x", "denomination": u})
        client.put(f"/api/users/{u}/meta/prefs", json={"value": {"a": 1}})
        client.post(f"/api/users/{u}/events/bulk", json={"events": [{"t": 1000, "kind": "put", "id": "x", "snap": {"qty": 1}}]})
    client.delete("/api/users/u1")
    assert client.get("/api/users/u1/items").json() == []
    assert client.get("/api/users/u1/events").json() == []
    assert client.get("/api/users/u1/meta/prefs").json() == {"value": None}
    assert client.get("/api/users/u2/items/x").json()["denomination"] == "u2"
    assert len(client.get("/api/users/u2/events").json()) == 1


def test_events_order_range_and_validation(client):
    ev = lambda t, k="put", i="a", **s: {"t": t, "kind": k, "id": i, "snap": s}
    assert client.post("/api/users/u/events/bulk", json={"events": [ev(300, qty=2), ev(100, qty=1), ev(200, "del")]}).status_code == 204
    assert [e["t"] for e in client.get("/api/users/u/events").json()] == [100, 200, 300]
    assert [e["t"] for e in client.get("/api/users/u/events", params={"since": 150, "until": 250}).json()] == [200]
    assert client.get("/api/users/u/events").json()[0]["snap"] == {"qty": 1}
    assert client.post("/api/users/u/events/bulk", json={"events": [{"t": 1, "kind": "zzz", "id": "a"}]}).status_code == 400
    # les mouvements du plan de rangement sont journalisés avec leurs propres types
    mv = {"t": 400, "kind": "move", "id": "a", "snap": {"from": {"c": "c1", "n": 3}, "to": {"c": "c1", "n": 9}}}
    assert client.post("/api/users/u/events/bulk", json={"events": [mv, ev(401, "place"), ev(402, "free")]}).status_code == 204
    assert [e["kind"] for e in client.get("/api/users/u/events", params={"since": 400}).json()] == ["move", "place", "free"]
    assert client.get("/api/users/u/events", params={"since": 400}).json()[0]["snap"]["to"]["n"] == 9
    client.delete("/api/users/u/events")
    assert client.get("/api/users/u/events").json() == []


def test_meta_roundtrip(client):
    assert client.get("/api/users/u/meta/prefs").json() == {"value": None}
    client.put("/api/users/u/meta/prefs", json={"value": {"théme": "é", "n": [1, 2]}})
    assert client.get("/api/users/u/meta/prefs").json() == {"value": {"théme": "é", "n": [1, 2]}}


def test_images(client):
    data = b"\x89PNG\r\n\x1a\n" + os.urandom(64)
    assert client.put("/api/users/u/images/i1", content=data, headers={"content-type": "image/png"}).status_code == 204
    r = client.get("/api/users/u/images/i1")
    assert r.content == data and r.headers["content-type"] == "image/png"
    client.post("/api/users/u/images/bulk-delete", json={"ids": ["i1"]})
    assert client.get("/api/users/u/images/i1").status_code == 404
    assert client.put("/api/users/u/images/i2", content=b"").status_code == 400


def test_invalid_ids(client):
    assert client.put("/api/users/bad id", json={}).status_code in (400, 404)
    assert client.get("/api/users/u/meta/..%2Fx").status_code in (400, 404)
    assert client.get("/api/backups/..%2Fetc%2Fpasswd").status_code in (400, 404)


def test_numista_and_prices_unconfigured(client):
    assert client.get("/api/numista/types").status_code == 503
    assert client.get("/api/prices?cur=xx1").status_code == 400


def test_backups_endpoint(client):
    client.put("/api/users/u", json={"id": "u", "name": "u"})
    name = client.post("/api/backups").json()["name"]
    assert name in [b["name"] for b in client.get("/api/backups").json()]
    r = client.get(f"/api/backups/{name}")
    assert r.status_code == 200 and r.content[:15] == b"SQLite format 3"


def test_basic_auth(tmp_path):
    m = load_app(tmp_path, NUMMUS_PASSWORD="secret", NUMMUS_USER="jean", NUMMUS_AUTH_MODE="basic")
    with TestClient(m["main"].app) as c:
        assert c.get("/api/health").status_code == 200
        assert c.get("/api/users").status_code == 401
        assert c.get("/").status_code == 401
        assert c.get("/api/users", auth=("jean", "bad")).status_code == 401
        assert c.get("/api/users", auth=("jean", "secret")).status_code == 200
        assert c.get("/", auth=("jean", "secret")).status_code == 200
