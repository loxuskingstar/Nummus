FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    NUMMUS_DATA_DIR=/data NUMMUS_FRONTEND_DIR=/srv/frontend

WORKDIR /srv
COPY backend/requirements.txt /srv/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app /srv/app
COPY frontend /srv/frontend

# Utilisateur non privilégié ; /data est le seul répertoire inscriptible (volume).
RUN useradd --system --uid 10001 --home-dir /nonexistent nummus \
 && mkdir /data && chown nummus /data
USER nummus
VOLUME /data
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health',timeout=4).status==200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
