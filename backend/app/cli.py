"""Outils en ligne de commande, indépendants du serveur web.

    python -m app.cli info                 version du schéma, volumétrie
    python -m app.cli migrate              applique les migrations en attente
    python -m app.cli backup               sauvegarde cohérente dans backups/
    python -m app.cli dump  fichier.json   exporte TOUT (profils, fiches, images, préférences, événements)
    python -m app.cli load  fichier.json   importe un dump (--replace : efface d'abord les profils concernés)

Dans Docker :  docker compose exec nummus python -m app.cli backup

Le dump est un format texte indépendant de SQLite : c'est le moyen de passer d'une version à l'autre,
ou vers un autre moteur de base de données."""
import argparse
import base64
import json
import sys
from datetime import datetime, timezone

from . import backup, db, migrations
from .config import APP_VERSION
from .db import connect

FORMAT = "nummus-dump"
DUMP_VERSION = 1


def cmd_info(_):
    schema = db.init()
    with connect() as c:
        counts = {t: c.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in ("users", "items", "images", "meta", "events")}
    print(json.dumps({"app": APP_VERSION, "schema": schema, "latest": migrations.LATEST, "counts": counts,
                      "backups": len(backup.listing())}, indent=2, ensure_ascii=False))


def cmd_migrate(_):
    print(f"schéma {db.init()}")


def cmd_backup(_):
    db.init()
    print(backup.run_backup("manuel"))


def build_dump() -> dict:
    """Document JSON complet (tous les profils, images comprises), indépendant de SQLite."""
    users = []
    with connect() as c:
        for (uid, udata) in c.execute("SELECT id,data FROM users ORDER BY rowid").fetchall():
            u = {"user": json.loads(udata)}
            u["items"] = [json.loads(r[0]) for r in c.execute("SELECT data FROM items WHERE user_id=? ORDER BY rowid", (uid,))]
            u["meta"] = {k: json.loads(v) for k, v in c.execute("SELECT key,value FROM meta WHERE user_id=?", (uid,))}
            u["events"] = [{"t": t, "kind": k, "id": i, "snap": json.loads(d)}
                           for t, k, i, d in c.execute("SELECT t,kind,item_id,data FROM events WHERE user_id=? ORDER BY seq", (uid,))]
            u["images"] = [{"id": i, "mime": m, "b64": base64.b64encode(d).decode()}
                           for i, m, d in c.execute("SELECT id,mime,data FROM images WHERE user_id=?", (uid,))]
            users.append(u)
        schema = migrations.current(c)
    return {"format": FORMAT, "dump_version": DUMP_VERSION, "app": APP_VERSION, "schema": schema,
            "exported_at": datetime.now(timezone.utc).isoformat(), "users": users}


def cmd_dump(a):
    db.init()
    doc = build_dump()
    with open(a.file, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False)
    print(f"{len(doc['users'])} profil(s) exporté(s) dans {a.file}")


def cmd_load(a):
    db.init()
    with open(a.file, encoding="utf-8") as f:
        doc = json.load(f)
    if doc.get("format") != FORMAT:
        sys.exit("Ce fichier n'est pas un dump Nummus.")
    if doc.get("dump_version", 0) > DUMP_VERSION:
        sys.exit("Dump produit par une version plus récente de Nummus.")
    backup.run_backup("pre-load")
    with connect() as c:
        for u in doc["users"]:
            uid = u["user"]["id"]
            if a.replace:
                for t, col in (("items", "user_id"), ("images", "user_id"), ("meta", "user_id"), ("events", "user_id")):
                    c.execute(f"DELETE FROM {t} WHERE {col}=?", (uid,))
            c.execute("INSERT INTO users(id,data) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
                      (uid, json.dumps(u["user"], ensure_ascii=False)))
            for it in u["items"]:
                c.execute("INSERT INTO items(user_id,id,data) VALUES(?,?,?) ON CONFLICT(user_id,id) DO UPDATE SET data=excluded.data",
                          (uid, it["id"], json.dumps(it, ensure_ascii=False)))
            for k, v in u["meta"].items():
                c.execute("INSERT INTO meta(user_id,key,value) VALUES(?,?,?) ON CONFLICT(user_id,key) DO UPDATE SET value=excluded.value",
                          (uid, k, json.dumps(v, ensure_ascii=False)))
            for im in u["images"]:
                c.execute("INSERT INTO images(user_id,id,mime,data) VALUES(?,?,?,?) ON CONFLICT(user_id,id) DO UPDATE SET mime=excluded.mime,data=excluded.data",
                          (uid, im["id"], im["mime"], base64.b64decode(im["b64"])))
            # en fusion, le journal existant fait foi : on n'y mélange pas celui du dump
            if not a.replace and c.execute("SELECT COUNT(*) FROM events WHERE user_id=?", (uid,)).fetchone()[0]:
                continue
            c.executemany("INSERT INTO events(user_id,t,kind,item_id,data) VALUES(?,?,?,?,?)",
                          [(uid, e["t"], e["kind"], e["id"], json.dumps(e.get("snap") or {}, ensure_ascii=False)) for e in u["events"]])
    print(f"{len(doc['users'])} profil(s) importé(s)")


def main(argv=None):
    p = argparse.ArgumentParser(prog="python -m app.cli", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("info").set_defaults(fn=cmd_info)
    sub.add_parser("migrate").set_defaults(fn=cmd_migrate)
    sub.add_parser("backup").set_defaults(fn=cmd_backup)
    d = sub.add_parser("dump"); d.add_argument("file"); d.set_defaults(fn=cmd_dump)
    l = sub.add_parser("load"); l.add_argument("file"); l.add_argument("--replace", action="store_true"); l.set_defaults(fn=cmd_load)
    a = p.parse_args(argv)
    a.fn(a)


if __name__ == "__main__":
    main()
