# 🎓 English Teacher AI

Un professeur d'anglais IA disponible 24h/24, propulsé par OpenRouter.

---

## 🚀 Installation en 4 étapes

### 1. Prérequis
- Python 3.10 ou plus récent → [python.org](https://python.org)

### 2. Installer les dépendances
```bash
pip install -r requirements.txt
```

### 3. Configurer votre clé API
```bash
# Copiez le fichier exemple
cp .env.example .env

# Ouvrez .env et remplacez la clé par la vôtre
# OPENROUTER_API_KEY=sk-or-votre-vraie-clé
```

### 4. Lancer l'application
```bash
python -m uvicorn main:app --reload
```

Ouvrez votre navigateur sur → **http://localhost:8000**

---

## ⚙️ Changer de modèle IA

Ouvrez `.env` et modifiez uniquement cette ligne :
```
OPENROUTER_MODEL=meta-llama/llama-3-8b-instruct
```

Modèles recommandés (gratuits ou peu chers) :
| Modèle | Description |
|--------|-------------|
| `mistralai/mistral-7b-instruct` | Rapide, bon en langues |
| `meta-llama/llama-3-8b-instruct` | Équilibré |
| `google/gemma-3-12b-it:free` | Gratuit |
| `openai/gpt-4o-mini` | Très performant |

---

## 🏗️ Architecture

```
english-teacher/
├── .env                  ← Votre config privée (jamais partagée)
├── .env.example          ← Modèle public
├── requirements.txt
├── main.py               ← Point d'entrée FastAPI
├── backend/
│   ├── config.py         ← Lecture du .env
│   ├── ai_service.py     ← Classe AIService (unique accès à l'IA)
│   └── routers/
│       └── chat.py       ← Route POST /api/chat
└── frontend/
    ├── index.html
    ├── style.css
    └── app.js
```

---

## 🔒 Sécurité

- La clé API n'est **jamais** dans le code
- Le fichier `.env` est dans `.gitignore` (jamais sur GitHub)
- Toutes les requêtes IA passent par `AIService` (un seul endroit à sécuriser)
