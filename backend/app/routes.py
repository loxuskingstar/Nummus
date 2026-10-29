"""API REST — contrat attendu par RestAdapter (frontend/js/store.js)."""
import json
import re
import time
from typing import Any

import httpx
from fastapi import APIRouter, Body, HTTPException, Request, Response
from fastapi.responses import FileResponse

from . import backup, config, migrations
from .db import connect

router = APIRouter(prefix="/api")
ID_RE = re.compile(r"^[A-Za-z0-9_.:\-]{1,128}$")
KEY_RE = re.compile(r"^[A-Za-z0-9_.\-]{1,64}$")


def _id(v: str) -> str:
    if not ID_RE.match(v):
        raise HTTPException(400, "Identifiant invalide")
    return v


def _loads(s: str) -> Any:
    return json.loads(s)


@router.get("/health")
def health():
    with connect() as c:
        c.execute("SELECT 1")
    return {"status": "ok"}


@router.get("/info")
def info():
    """Version de l'application, version du schéma et volumétrie (utile avant une migration)."""
    with connect() as c:
        counts = {t: c.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
                  for t in ("users", "items", "images", "meta", "events")}
        schema = migrations.current(c)
    return {"app": config.APP_VERSION, "schema": schema, "schema_latest": migrations.LATEST, "counts": counts,
            "backups": len(backup.listing())}


# ---------------------------------------------------------------- sauvegardes de la base
@router.get("/backups")
def backups_list():
    return backup.listing()


@router.post("/backups", status_code=201)
def backups_create():
    return {"name": backup.run_backup("nummus-manuel")}


@router.get("/backups/{name}")
def backups_download(name: str):
    if not backup.NAME_RE.match(name):
        raise HTTPException(400, "Nom invalide")
    path = config.BACKUP_DIR / name
    if not path.is_file():
        raise HTTPException(404, "Sauvegarde introuvable")
    return FileResponse(path, media_type="application/vnd.sqlite3", filename=name)


# ---------------------------------------------------------------- profils
@router.get("/users")
def users_list():
    with connect() as c:
        rows = c.execute("SELECT data FROM users ORDER BY rowid").fetchall()
    return [_loads(r[0]) for r in rows]


@router.put("/users/{uid}", status_code=204)
def users_put(uid: str, user: dict = Body(...)):
    _id(uid)
    user["id"] = uid
    with connect() as c:
        c.execute("INSERT INTO users(id,data) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
                  (uid, json.dumps(user, ensure_ascii=False)))
    return Response(status_code=204)


@router.delete("/users/{uid}", status_code=204)
def users_delete(uid: str):
    _id(uid)
    with connect() as c:
        for t in ("items", "images", "meta", "events"):
            c.execute(f"DELETE FROM {t} WHERE user_id=?", (uid,))
        c.execute("DELETE FROM users WHERE id=?", (uid,))
    return Response(status_code=204)


# ---------------------------------------------------------------- fiches
def _plain(it: dict, key: str) -> str:
    v = it.get(key)
    return "" if v is None else str(v).lower()


@router.get("/users/{uid}/items")
def items_list(uid: str, request: Request):
    """Liste les fiches du profil. Filtres simples facultatifs : type, status, country, q (sous-chaîne).
    La recherche avancée (opérateurs, plages…) reste évaluée par l'interface (matchItem)."""
    _id(uid)
    with connect() as c:
        rows = c.execute("SELECT data FROM items WHERE user_id=? ORDER BY updated, rowid", (uid,)).fetchall()
    items = [_loads(r[0]) for r in rows]
    p = request.query_params
    for k in ("type", "status", "country"):
        if p.get(k):
            items = [i for i in items if _plain(i, k) == p[k].lower()]
    if p.get("q"):
        q = p["q"].lower()
        items = [i for i in items if q in json.dumps({k: v for k, v in i.items() if k not in ("cover", "imgs")},
                                                     ensure_ascii=False).lower()]
    return items


@router.get("/users/{uid}/items/{iid}")
def items_get(uid: str, iid: str):
    _id(uid), _id(iid)
    with connect() as c:
        r = c.execute("SELECT data FROM items WHERE user_id=? AND id=?", (uid, iid)).fetchone()
    if not r:
        raise HTTPException(404, "Fiche introuvable")
    return _loads(r[0])


def _upsert(c, uid: str, it: dict):
    c.execute("INSERT INTO items(user_id,id,data,updated) VALUES(?,?,?,?) "
              "ON CONFLICT(user_id,id) DO UPDATE SET data=excluded.data, updated=excluded.updated",
              (uid, it["id"], json.dumps(it, ensure_ascii=False), time.time()))


@router.put("/users/{uid}/items/{iid}", status_code=204)
def items_put(uid: str, iid: str, item: dict = Body(...)):
    _id(uid), _id(iid)
    item["id"] = iid
    with connect() as c:
        _upsert(c, uid, item)
    return Response(status_code=204)


@router.post("/users/{uid}/items/bulk", status_code=204)
def items_bulk(uid: str, payload: dict = Body(...)):
    _id(uid)
    items = payload.get("items")
    if not isinstance(items, list):
        raise HTTPException(400, "« items » doit être une liste")
    with connect() as c:
        for it in items:
            if not isinstance(it, dict):
                raise HTTPException(400, "Fiche invalide")
            _id(str(it.get("id", "")))
            _upsert(c, uid, it)
    return Response(status_code=204)


@router.post("/users/{uid}/items/bulk-delete", status_code=204)
def items_bulk_delete(uid: str, payload: dict = Body(...)):
    _id(uid)
    with connect() as c:
        c.executemany("DELETE FROM items WHERE user_id=? AND id=?", [(uid, _id(str(i))) for i in payload.get("ids", [])])
    return Response(status_code=204)


@router.delete("/users/{uid}/items/{iid}", status_code=204)
def items_delete(uid: str, iid: str):
    _id(uid), _id(iid)
    with connect() as c:
        c.execute("DELETE FROM items WHERE user_id=? AND id=?", (uid, iid))
    return Response(status_code=204)


@router.delete("/users/{uid}/items", status_code=204)
def items_clear(uid: str):
    _id(uid)
    with connect() as c:
        c.execute("DELETE FROM items WHERE user_id=?", (uid,))
    return Response(status_code=204)


# ---------------------------------------------------------------- journal d'événements
@router.get("/users/{uid}/events")
def events_list(uid: str, since: int = 0, until: int = 0):
    """Opérations du profil dans l'ordre chronologique. since/until : millisecondes (0 = pas de borne)."""
    _id(uid)
    sql, args = "SELECT t,kind,item_id,data FROM events WHERE user_id=? AND t>=?", [uid, since]
    if until:
        sql, args = sql + " AND t<=?", args + [until]
    with connect() as c:
        rows = c.execute(sql + " ORDER BY t, seq", args).fetchall()
    return [{"t": r[0], "kind": r[1], "id": r[2], "snap": _loads(r[3])} for r in rows]


# put/del : instantanés de fiches (remonter le temps) ; place/free/move : mouvements dans les plans de rangement
EVENT_KINDS = ("put", "del", "place", "free", "move")


@router.post("/users/{uid}/events/bulk", status_code=204)
def events_bulk(uid: str, payload: dict = Body(...)):
    _id(uid)
    evs = payload.get("events")
    if not isinstance(evs, list):
        raise HTTPException(400, "« events » doit être une liste")
    rows = []
    for e in evs:
        if not isinstance(e, dict) or e.get("kind") not in EVENT_KINDS or not isinstance(e.get("t"), (int, float)):
            raise HTTPException(400, "Événement invalide")
        rows.append((uid, int(e["t"]), e["kind"], _id(str(e.get("id", ""))), json.dumps(e.get("snap") or {}, ensure_ascii=False)))
    with connect() as c:
        c.executemany("INSERT INTO events(user_id,t,kind,item_id,data) VALUES(?,?,?,?,?)", rows)
    return Response(status_code=204)


@router.delete("/users/{uid}/events", status_code=204)
def events_clear(uid: str):
    _id(uid)
    with connect() as c:
        c.execute("DELETE FROM events WHERE user_id=?", (uid,))
    return Response(status_code=204)


# ---------------------------------------------------------------- préférences (clé/valeur JSON)
@router.get("/users/{uid}/meta/{key}")
def meta_get(uid: str, key: str):
    _id(uid)
    if not KEY_RE.match(key):
        raise HTTPException(400, "Clé invalide")
    with connect() as c:
        r = c.execute("SELECT value FROM meta WHERE user_id=? AND key=?", (uid, key)).fetchone()
    return {"value": _loads(r[0]) if r else None}


@router.put("/users/{uid}/meta/{key}", status_code=204)
def meta_put(uid: str, key: str, payload: dict = Body(...)):
    _id(uid)
    if not KEY_RE.match(key):
        raise HTTPException(400, "Clé invalide")
    with connect() as c:
        c.execute("INSERT INTO meta(user_id,key,value) VALUES(?,?,?) "
                  "ON CONFLICT(user_id,key) DO UPDATE SET value=excluded.value",
                  (uid, key, json.dumps(payload.get("value"), ensure_ascii=False)))
    return Response(status_code=204)


# ---------------------------------------------------------------- images (blobs)
@router.get("/users/{uid}/images/{iid}")
def image_get(uid: str, iid: str):
    _id(uid), _id(iid)
    with connect() as c:
        r = c.execute("SELECT mime,data FROM images WHERE user_id=? AND id=?", (uid, iid)).fetchone()
    if not r:
        raise HTTPException(404, "Image introuvable")
    return Response(content=r[1], media_type=r[0], headers={"Cache-Control": "private, max-age=86400"})


@router.put("/users/{uid}/images/{iid}", status_code=204)
async def image_put(uid: str, iid: str, request: Request):
    _id(uid), _id(iid)
    body = await request.body()
    if not body:
        raise HTTPException(400, "Image vide")
    if len(body) > config.MAX_IMAGE_BYTES:
        raise HTTPException(413, "Image trop volumineuse")
    mime = (request.headers.get("content-type") or "application/octet-stream").split(";")[0].strip()
    if not mime.startswith("image/"):
        mime = "application/octet-stream"
    with connect() as c:
        c.execute("INSERT INTO images(user_id,id,mime,data) VALUES(?,?,?,?) "
                  "ON CONFLICT(user_id,id) DO UPDATE SET mime=excluded.mime, data=excluded.data", (uid, iid, mime, body))
    return Response(status_code=204)


@router.post("/users/{uid}/images/bulk-delete", status_code=204)
def images_bulk_delete(uid: str, payload: dict = Body(...)):
    _id(uid)
    with connect() as c:
        c.executemany("DELETE FROM images WHERE user_id=? AND id=?", [(uid, _id(str(i))) for i in payload.get("ids", [])])
    return Response(status_code=204)


@router.delete("/users/{uid}/images", status_code=204)
def images_clear(uid: str):
    _id(uid)
    with connect() as c:
        c.execute("DELETE FROM images WHERE user_id=?", (uid,))
    return Response(status_code=204)


# ---------------------------------------------------------------- intégrations externes
@router.get("/numista/{path:path}")
async def numista_proxy(path: str, request: Request):
    """Relais vers l'API Numista : la clé reste côté serveur (NUMISTA_API_KEY)."""
    if not config.NUMISTA_API_KEY:
        raise HTTPException(503, "NUMISTA_API_KEY n'est pas configurée sur le serveur")
    if ".." in path:
        raise HTTPException(400, "Chemin invalide")
    async with httpx.AsyncClient(timeout=20) as cl:
        r = await cl.get(f"{config.NUMISTA_BASE.rstrip('/')}/{path}", params=dict(request.query_params),
                         headers={"Numista-API-Key": config.NUMISTA_API_KEY})
    return Response(content=r.content, status_code=r.status_code,
                    media_type=r.headers.get("content-type", "application/json"))


_prices: dict = {"t": 0.0, "cur": "", "v": None}
SYMBOLS = {"gold": "XAU", "silver": "XAG", "platinum": "XPT", "palladium": "XPD"}


@router.get("/prices")
async def prices(cur: str = "EUR"):
    """Cours spot par once troy dans la devise demandée (par défaut EUR), mis en cache PRICES_TTL secondes."""
    cur = cur.upper()
    if not re.fullmatch(r"[A-Z]{3}", cur):
        raise HTTPException(400, "Devise invalide")
    if _prices["v"] and _prices["cur"] == cur and time.time() - _prices["t"] < config.PRICES_TTL:
        return _prices["v"]
    try:
        async with httpx.AsyncClient(timeout=15) as cl:
            rate = 1.0
            if cur != "USD":
                fx = await cl.get(config.FX_URL.format(cur=cur))
                fx.raise_for_status()
                rate = float(fx.json()["rates"][cur])
            out = {}
            for k, sym in SYMBOLS.items():
                r = await cl.get(config.PRICES_URL.format(symbol=sym))
                r.raise_for_status()
                out[k] = round(float(r.json()["price"]) * rate, 2)
    except Exception as e:
        raise HTTPException(502, f"Source de cours indisponible ({type(e).__name__})")
    _prices.update(t=time.time(), cur=cur, v=out)
    return out
