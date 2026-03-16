# AI Smart Agriculture System

Monorepo containing:
- `backend/`: FastAPI API server
- `frontend/`: React web app (Vite)
- `ai_models/`: training + inference code (placeholder)
- `datasets/`: dataset storage (placeholder)
- `iot/`: device code + payload schemas (placeholder)

## Backend (FastAPI)

### Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open:
- `http://localhost:8000/health`
- `http://localhost:8000/docs`

## Frontend (React + Vite)

### Setup

```bash
cd frontend
npm install
```

### Run

```bash
npm run dev
```

## Suggested env vars

Copy examples and edit as needed:
- `backend/.env.example` → `backend/.env`

# ai-smart-agriculture-syatem