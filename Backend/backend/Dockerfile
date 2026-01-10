# syntax=docker/dockerfile:1

# Backend Dockerfile for Python 3.11 + FastAPI + Uvicorn
# - Production-ready default CMD (no reload)
# - Dev hot-reload provided via docker-compose.override.yml

FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    # Use UTF-8 to avoid locale issues
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

# Install minimal system deps. psycopg[binary] provides libpq
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       curl \
       ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Install Python deps first (better layer caching)
COPY app/requirements.txt /app/requirements.txt
RUN python -m pip install --upgrade pip \
    && pip install --no-cache-dir -r /app/requirements.txt

# Copy application code
COPY app /app/app

# Create data dir (used by SQLite in dev)
RUN mkdir -p /app/data && chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# Default: production-like run (no reload). Dev override in compose override.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
