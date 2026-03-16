# Backend (FastAPI)

## Layout

- `app/main.py`: app entrypoint
- `app/api/routes/`: routers grouped by domain
- `app/core/`: settings / shared infrastructure

## Run (dev)

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

