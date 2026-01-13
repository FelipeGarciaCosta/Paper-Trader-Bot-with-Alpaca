# PaperTrader — Summary and Quick Development Guide

Brief Overview
- Project: PaperTrader with Python backend (FastAPI) that fetches historical bars from Alpaca and stores data in SQLite.

1) Setup Environment (Local)
- Requirements: Python 3.8+ and pip; Docker is optional.
- Create virtual environment and install dependencies:
  ```sh
  python -m venv .venv
  .venv\Scripts\activate    # Windows
  pip install -r backend/app/requirements.txt

  python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
  ```
