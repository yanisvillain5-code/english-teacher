"""
routers/chat.py — Route API /api/chat
Reçoit les messages du frontend, les envoie à AIService, retourne la réponse.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.ai_service import ai_service

router = APIRouter()


# ── Modèles de données (validation automatique par Pydantic) ──────────────────

class Message(BaseModel):
    role: str    # "user" ou "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]


class ChatResponse(BaseModel):
    reply: str
    model: str


# ── Endpoint principal ────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Reçoit l'historique de la conversation et retourne la réponse du prof d'anglais.
    """
    if not request.messages:
        raise HTTPException(status_code=400, detail="Messages vides.")

    # Conversion en dicts pour AIService
    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    try:
        reply = await ai_service.chat(messages)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erreur IA : {str(e)}")

    return ChatResponse(reply=reply, model=ai_service.model)


@router.get("/model")
async def get_model():
    """Retourne le modèle actuellement utilisé."""
    return {"model": ai_service.model}
