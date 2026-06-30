"""
config.py — Lecture sécurisée du fichier .env
Toute la configuration de l'app passe par ce fichier.
"""
import os
from dotenv import load_dotenv

# Charge les variables du fichier .env
load_dotenv()

# Clé API OpenRouter
OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")

# Modèle IA — changeable sans toucher au reste du code
OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "mistralai/mistral-7b-instruct")

# Titre de l'application
APP_TITLE: str = os.getenv("APP_TITLE", "English Teacher AI")

# URL de base de l'API OpenRouter
OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1/chat/completions"

# Vérification au démarrage
if not OPENROUTER_API_KEY or OPENROUTER_API_KEY == "sk-or-mettez-votre-clé-ici":
    raise ValueError(
        "❌ Clé API manquante ! Créez un fichier .env à partir de .env.example "
        "et ajoutez votre clé OPENROUTER_API_KEY."
    )
