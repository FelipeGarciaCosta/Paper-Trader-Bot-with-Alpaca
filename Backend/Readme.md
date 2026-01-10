# PaperTrader — Resumen y guía rápida de desarrollo

Resumen breve
- Proyecto: PaperTrader con backend en Python (FastAPI) que obtiene historic bars de Alpaca y guarda datos en SQLite.

1) Preparar el entorno (local)
- Requisitos: Python 3.8+ y pip; opcional Docker.
- Crear entorno virtual e instalar dependencias:
  ```sh
  python -m venv .venv
  .venv\Scripts\activate    # Windows
  pip install -r backend/app/requirements.txt

  uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
  python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000