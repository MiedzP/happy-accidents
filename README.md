# Drawing Teacher

Snap a photo of anything and get a step-by-step lesson to draw it in your chosen
medium (pencil, watercolor, charcoal, ink, colored pencil, pastel, acrylic, oil,
digital). Each step shows **your actual photo** progressively rendered in that
medium, so following the steps reconstructs your image.

## Structure
- `backend/` — FastAPI service. A vision model reads the photo, a text model writes
  a medium-specific lesson, and Pillow renders your photo into progressive step
  images. AI provider is configurable (Groq by default; Claude or local Ollama).
- `frontend/` — Expo / React Native (expo-router) app: pick a photo, pick a medium,
  follow the lesson.

## Setup

### 1. Backend
    cd backend
    python -m venv venv
    venv\Scripts\pip install -r requirements.txt
    copy .env.example .env

Edit `.env` and add a free Groq API key (https://console.groq.com). Then run:

    venv\Scripts\uvicorn main:app --host 0.0.0.0 --port 8000

### 2. Frontend
    cd frontend
    npm install
    npx expo start

Press `w` for web, or scan the QR code with Expo Go. The app auto-detects the
backend host from the Expo dev server.

## Notes
- **Never commit `.env`** — it holds your API key. `.env.example` is the template.
- Step images are generated locally from your photo with Pillow; no image API needed.
- To switch the AI provider (Claude / local Ollama), see `backend/.env.example`
  and the modules in `backend/agents/`.
