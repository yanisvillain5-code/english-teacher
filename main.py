"""
main.py — Point d'entrée de l'application FastAPI
Lance le serveur et enregistre toutes les routes.
"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.config import APP_TITLE
from backend.routers import chat
import os

app = FastAPI(title=APP_TITLE, version="1.0.0")

# ── Routes API ────────────────────────────────────────────────────────────────
app.include_router(chat.router, prefix="/api")

# ── Fichiers statiques (frontend) ─────────────────────────────────────────────
frontend_path = os.path.join(os.path.dirname(__file__), "frontend")
app.mount("/static", StaticFiles(directory=frontend_path), name="static")


@app.get("/")
async def serve_frontend():
    """Sert l'interface utilisateur."""
    return FileResponse(os.path.join(frontend_path, "index.html"))


@app.get("/health")
async def health():
    """Endpoint de santé pour vérifier que le serveur tourne."""
    return {"status": "ok", "app": APP_TITLE}
