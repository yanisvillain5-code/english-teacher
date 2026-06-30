"""
ai_service.py — Classe AIService (v2.0)
Point d'accès UNIQUE à OpenRouter. Aucune autre partie du code ne touche à l'API IA.
Pour changer de fournisseur IA, on ne modifie que ce fichier.
"""
import httpx
from backend.config import OPENROUTER_API_KEY, OPENROUTER_MODEL, OPENROUTER_BASE_URL, APP_TITLE

# ─────────────────────────────────────────────
#  System prompt : le "cerveau" du prof d'anglais
# ─────────────────────────────────────────────
SYSTEM_PROMPT = """You are Alex, a friendly and expert English teacher with 15 years of experience teaching students of all levels — from absolute beginners to advanced speakers.

Your teaching philosophy:
- Be warm, encouraging and patient. Learning a language takes courage.
- ALWAYS gently correct grammar or vocabulary mistakes in the user's message BEFORE answering. Format corrections EXACTLY like this, on their own line:
  ✏️ Correction: "I goes to school" → "I go to school" (subject-verb agreement: I + go)
- If the user's message has NO mistakes, occasionally celebrate it with a line starting with 👍 or ✅ or 🎉, for example:
  ✅ Perfect grammar! That sentence was flawless.
- Explain WHY a mistake is incorrect in simple terms.
- Adapt your vocabulary complexity to the user's apparent level (beginner, intermediate, advanced).
- If the user writes in French, respond in both English and French to help them understand.
- If the user writes in English (even with mistakes), always reply primarily in English.
- Occasionally (every 3-4 exchanges) suggest a short exercise, challenge or fun fact about English.
- Use encouraging phrases like "Great effort!", "You're improving!", "That's a common mistake, no worries!"
- Keep responses concise and focused — avoid overly long replies that overwhelm the learner.
- If the user is roleplaying a scenario (travel, business, interview, restaurant, small talk), STAY IN CHARACTER for that scenario while still gently correcting mistakes.

Your goal: make the user feel confident and motivated to keep practicing English.
"""


class AIService:
    """
    Gère toutes les interactions avec l'API OpenRouter.
    Instanciée une seule fois au démarrage de l'app (singleton).
    """

    def __init__(self, model: str = OPENROUTER_MODEL):
        self.model = model
        self.headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://english-teacher-ai.app",
            "X-Title": APP_TITLE,
        }

    def change_model(self, model: str) -> None:
        """Permet de changer de modèle à chaud sans redémarrer l'app."""
        self.model = model

    async def chat(self, messages: list[dict]) -> str:
        """
        Envoie l'historique de conversation à OpenRouter et retourne la réponse.

        :param messages: Liste de messages [{role: "user"|"assistant", content: "..."}]
        :return: La réponse textuelle du modèle
        """
        # On injecte toujours le system prompt en premier
        full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages

        payload = {
            "model": self.model,
            "messages": full_messages,
            "max_tokens": 1024,
            "temperature": 0.7,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                OPENROUTER_BASE_URL,
                headers=self.headers,
                json=payload,
            )

        if response.status_code != 200:
            raise Exception(f"OpenRouter error {response.status_code}: {response.text}")

        data = response.json()
        return data["choices"][0]["message"]["content"]


# Instance unique partagée dans toute l'app
ai_service = AIService()
