"""Point d'entrée : API REST (/api) + interface statique (/) servies par le même processus."""
import logging
from contextlib import asynccontextmanager
from logging.handlers import RotatingFileHandler

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.gzip import GZipMiddleware

from . import backup, db, webdav
from .config import APP_VERSION, FRONTEND_DIR, LOG_DIR
from .routes import public, router
from .security import basic_auth_middleware


def setup_logging() -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    handler = RotatingFileHandler(LOG_DIR / "nummus.log", maxBytes=2_000_000, backupCount=5, encoding="utf-8")
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
    for name in ("nummus", "uvicorn.error", "uvicorn.access"):
        lg = logging.getLogger(name)
        if not any(isinstance(h, RotatingFileHandler) for h in lg.handlers):
            lg.addHandler(handler)
    logging.getLogger("nummus").setLevel(logging.INFO)


@asynccontextmanager
async def lifespan(_: FastAPI):
    setup_logging()
    schema = db.init()
    logging.getLogger("nummus").info("Nummus %s démarré (schéma %s)", APP_VERSION, schema)
    backup.start()
    webdav.start()
    yield


app = FastAPI(title="Nummus", version=APP_VERSION, docs_url="/api/docs", openapi_url="/api/openapi.json",
              lifespan=lifespan)
_auth = basic_auth_middleware()
if _auth:
    app.middleware("http")(_auth)


@app.middleware("http")
async def security_headers(request, call_next):
    """En-têtes posés sur toutes les réponses (sans écraser ceux déjà définis par une route)."""
    r = await call_next(request)
    r.headers.setdefault("X-Content-Type-Options", "nosniff")
    r.headers.setdefault("X-Frame-Options", "DENY")
    r.headers.setdefault("Referrer-Policy", "same-origin")
    return r


app.add_middleware(GZipMiddleware, minimum_size=1000)   # JSON des fiches, JS, CSS
app.include_router(router)
app.include_router(public)
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
