import importlib
import os
import sys

import pytest

MODULES = ["app.config", "app.migrations", "app.db", "app.backup", "app.credentials", "app.security", "app.cli", "app.webdav", "app.routes", "app.main"]


def load_app(tmp_path, **env):
    """Recharge l'application avec un dossier de données isolé et l'environnement demandé."""
    for k in ("NUMMUS_PASSWORD", "NUMMUS_USER", "NUMMUS_AUTH_MODE", "NUMMUS_AUTH_MAX_FAILS", "NUMMUS_BACKUP_EVERY_HOURS", "NUMMUS_BACKUP_KEEP"):
        os.environ.pop(k, None)
    os.environ["NUMMUS_DATA_DIR"] = str(tmp_path)
    os.environ["NUMMUS_BACKUP_EVERY_HOURS"] = "0"
    os.environ.update({k: str(v) for k, v in env.items()})
    for name in MODULES:
        if name in sys.modules:
            importlib.reload(sys.modules[name])
        else:
            importlib.import_module(name)
    return {n.split(".")[1]: sys.modules[n] for n in MODULES}


@pytest.fixture()
def mods(tmp_path):
    return load_app(tmp_path)


@pytest.fixture()
def client(mods):
    from fastapi.testclient import TestClient
    with TestClient(mods["main"].app) as c:
        yield c
