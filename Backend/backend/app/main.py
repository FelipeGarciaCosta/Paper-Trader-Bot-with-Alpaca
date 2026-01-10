from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.routers.alpaca_router import router as alpaca_router
from app.routers.order_router import router as order_router
from app.routers.stock_bars_router import router as stock_bars_router
from app.routers.position_router import router as position_router
from app.routers.portfolio_history_router import router as portfolio_history_router
from app.routers.crypto_bars_router import router as crypto_bars_router
import logging
import os
from dotenv import load_dotenv



# ---------- Settings ----------
load_dotenv()
APP_NAME = os.getenv("APP_NAME", "PaperTradeBot API")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(APP_NAME)

# ---------- FastAPI App ----------
app = FastAPI(title=APP_NAME, version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)
    logger.info("🚀 Application started")

@app.get("/")
def root():
    return {"message": "Welcome to PaperTradeBot API"}

# Routers
app.include_router(alpaca_router, prefix="/alpaca", tags=["Alpaca"])
app.include_router(order_router, prefix="/orders", tags=["Orders"])
app.include_router(position_router, prefix="/positions", tags=["Positions"])
app.include_router(stock_bars_router, prefix="/market-data", tags=["MarketData"])
app.include_router(portfolio_history_router, prefix="/portfolio", tags=["Portfolio"])
app.include_router(crypto_bars_router, prefix="/market-data", tags=["MarketData"])
