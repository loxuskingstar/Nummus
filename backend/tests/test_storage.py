"""Migrations, déplacement de l'ancienne base, sauvegardes, dump/load."""
import json
import shutil
import sqlite3

import pytest

from conftest import load_app


def make_v1_db(path):
    """Reproduit la base de la version 1 : schéma initial, sans user_version."""
    path.parent.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(path)
    c.executescript("""
    CREATE TABLE users  (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE items  (user_id TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, updated REAL NOT NULL DEFAULT 0, PRIMARY KEY (user_id,id));
    CREATE TABLE images (user_id TEXT NOT NULL, id TEXT NOT NULL, mime TEXT NOT NULL, data BLOB NOT NULL, PRIMARY KEY (user_id,id));
    CREATE TABLE meta   (user_id TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (user_id,key));
    """)
    c.execute("INSERT INTO users VALUES('local','{\"id\":\"local\",\"name\":\"Ma collection\"}')")
    c.execute("INSERT INTO items(user_id,id,data) VALUES('local','a','{\"id\":\"a\",\"denomination\":\"1 franc\"}')")
    c.execute("INSERT INTO images VALUES('local','i1','image/png',x'89504e47')")
    c.execute("INSERT INTO meta VALUES('local','prefs','{\"x\":1}')")
    c.commit(); c.close()


def test_legacy_db_is_moved_and_migrated(tmp_path):
    make_v1_db(tmp_path / "nummus.sqlite3")          # emplacement de la v1 : à la racine de /data
    m = load_app(tmp_path)
    schema = m["db"].init()
    assert schema == m["migrations"].LATEST
    assert not (tmp_path / "nummus.sqlite3").exists()
    assert (tmp_path / "db" / "nummus.sqlite3").is_file()
    # les données sont intactes, la table d'événements existe
    with m["db"].connect() as c:
        assert c.execute("SELECT data FROM items").fetchone()[0] == '{"id":"a","denomination":"1 franc"}'
        assert c.execute("SELECT COUNT(*) FROM images").fetchone()[0] == 1
        assert c.execute("SELECT COUNT(*) FROM events").fetchone()[0] == 0
    # une copie de sécurité a été écrite avant la migration
    pre = list((tmp_path / "backups").glob("pre-migration-*.sqlite3"))
    assert len(pre) == 1
    old = sqlite3.connect(pre[0])
    assert old.execute("PRAGMA user_version").fetchone()[0] == 0 and old.execute("SELECT COUNT(*) FROM items").fetchone()[0] == 1


def test_fresh_db_has_no_premigration_backup(tmp_path):
    m = load_app(tmp_path)
    m["db"].init()
    assert not list((tmp_path / "backups").glob("pre-migration-*"))
    assert m["db"].init() == m["migrations"].LATEST          # idempotent


def test_newer_database_is_refused(tmp_path):
    m = load_app(tmp_path)
    m["db"].init()
    c = sqlite3.connect(tmp_path / "db" / "nummus.sqlite3")
    c.execute(f"PRAGMA user_version={m['migrations'].LATEST + 5}"); c.commit(); c.close()
    with pytest.raises(RuntimeError, match="plus récente"):
        m["db"].init()


def test_failed_migration_rolls_back(tmp_path):
    m = load_app(tmp_path)
    m["db"].init()
    mg = m["migrations"]
    bad = mg.LATEST + 1
    mg.MIGRATIONS.append((bad, "cassée", "CREATE TABLE ok_table(x); CREATE TABLE ok_table(x);"))
    mg.LATEST = bad
    try:
        with pytest.raises(sqlite3.OperationalError):
            m["db"].init()
        c = sqlite3.connect(tmp_path / "db" / "nummus.sqlite3")
        assert c.execute("PRAGMA user_version").fetchone()[0] == bad - 1
        assert not c.execute("SELECT name FROM sqlite_master WHERE name='ok_table'").fetchall()
    finally:
        mg.MIGRATIONS.pop()


def test_backup_rotation_and_content(tmp_path):
    m = load_app(tmp_path, NUMMUS_BACKUP_KEEP=2)
    m["db"].init()
    with m["db"].connect() as c:
        c.execute("INSERT INTO users VALUES('u','{}')")
    import time
    names = []
    for _ in range(4):
        names.append(m["backup"].run_backup()); time.sleep(1.05)
    left = sorted(p.name for p in (tmp_path / "backups").glob("nummus-*.sqlite3"))
    assert left == sorted(names)[-2:]
    assert sqlite3.connect(tmp_path / "backups" / left[-1]).execute("SELECT COUNT(*) FROM users").fetchone()[0] == 1


def test_dump_and_load_roundtrip_to_new_server(tmp_path):
    src = tmp_path / "srv1"
    m = load_app(src)
    m["db"].init()
    with m["db"].connect() as c:
        c.execute("INSERT INTO users VALUES('u','{\"id\":\"u\",\"name\":\"Jean\"}')")
        c.execute("INSERT INTO items(user_id,id,data) VALUES('u','a','{\"id\":\"a\",\"denomination\":\"é\"}')")
        c.execute("INSERT INTO images VALUES('u','i1','image/png',x'89504e47')")
        c.execute("INSERT INTO meta VALUES('u','prefs','{\"catalogs\":[1]}')")
        c.execute("INSERT INTO events(user_id,t,kind,item_id,data) VALUES('u',5,'put','a','{\"qty\":1}')")
    dump = tmp_path / "dump.json"
    m["cli"].main(["dump", str(dump)])
    assert json.loads(dump.read_text())["format"] == "nummus-dump"

    dst = tmp_path / "srv2"                          # « autre serveur »
    m2 = load_app(dst)
    m2["cli"].main(["load", str(dump)])
    with m2["db"].connect() as c:
        assert json.loads(c.execute("SELECT data FROM items").fetchone()[0])["denomination"] == "é"
        assert c.execute("SELECT data FROM images").fetchone()[0] == bytes.fromhex("89504e47")
        assert json.loads(c.execute("SELECT value FROM meta").fetchone()[0]) == {"catalogs": [1]}
        assert c.execute("SELECT t,kind FROM events").fetchone() == (5, "put")
    m2["cli"].main(["load", str(dump)])                # recharger ne duplique rien
    with m2["db"].connect() as c:
        assert c.execute("SELECT COUNT(*) FROM items").fetchone()[0] == 1
        assert c.execute("SELECT COUNT(*) FROM events").fetchone()[0] == 1


def test_copying_data_folder_is_a_valid_migration(tmp_path):
    """Déplacer le dossier data/ sur un autre serveur suffit."""
    a = tmp_path / "a"
    m = load_app(a); m["db"].init()
    with m["db"].connect() as c:
        c.execute("INSERT INTO users VALUES('u','{}')")
    m["backup"].run_backup()
    shutil.copytree(a, tmp_path / "b")
    m2 = load_app(tmp_path / "b")
    assert m2["db"].init() == m2["migrations"].LATEST
    with m2["db"].connect() as c:
        assert c.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 1
