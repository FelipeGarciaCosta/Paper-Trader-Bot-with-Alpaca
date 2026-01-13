# <img src="Frontend/public/trading-bot-icono-fav.ico" alt="PaperTrader Logo" width="32" style="vertical-align: middle;"/> Paper Trading Bot with Alpaca 

A full-stack paper trading platform that integrates with Alpaca Markets API, enabling users to practice trading strategies with real-time market data without risking real money.

##  Overview

This application provides a complete paper trading experience with portfolio tracking, real-time market data visualization, and order management. Built with a modern tech stack, it features a FastAPI backend for robust API handling and a React frontend with beautiful UI components.

### Key Features

- **Real-time Portfolio Tracking**: Monitor your paper trading portfolio performance with interactive charts
- **Market Data Visualization**: Access real-time stock and crypto market data with trading charts
- **Order Management**: Place, track, and manage buy/sell orders with various order types
- **Position Monitoring**: Track all open positions with real-time P&L calculations
- **Asset Exploration**: Search and explore available trading instruments
- **Dark/Light Theme**: Modern UI with theme switching support
- **Historical Data**: View portfolio history and analyze trading performance over time

##  Architecture

The project follows a microservices architecture with clear separation between frontend and backend:

```
├── Backend/           # FastAPI REST API
│   └── backend/
│       ├── app/       # Application code
│       │   ├── models/      # SQLAlchemy ORM models
│       │   ├── schemas/     # Pydantic schemas for validation
│       │   ├── routers/     # API route handlers
│       │   └── services/    # Business logic (Alpaca client)
│       └── data/      # Database storage (SQLite/PostgreSQL)
│
└── Frontend/          # React + TypeScript SPA
    └── src/
        ├── components/      # Reusable UI components
        ├── pages/          # Route-based page components
        ├── services/       # API client
        └── types/          # TypeScript type definitions
```

##  Technology Stack

### Backend Stack

| Layer | Technologies | Key Libraries |
|-------|-------------|---------------|
| **Framework** | Python 3.x | FastAPI 0.115.2 |
| **Web Server** | ASGI | Uvicorn 0.30.6 |
| **Database** | PostgreSQL / SQLite | SQLAlchemy 2.0.34, psycopg 3.2.3 |
| **Validation** | Data Models | Pydantic 2.9.2 |
| **HTTP Client** | API Integration | Requests 2.32.3 |
| **Environment** | Configuration | python-dotenv 1.0.1 |
| **Trading API** | Alpaca Markets | Custom HTTP client |

### Frontend Stack

| Layer | Technologies | Key Libraries |
|-------|-------------|---------------|
| **Framework** | React 18.3 | TypeScript 5.8 |
| **Build Tool** | Vite 5.4 | SWC Plugin |
| **Routing** | SPA Navigation | React Router DOM 6.30 |
| **State Management** | Server State | TanStack Query 5.83 |
| **Styling** | CSS Framework | Tailwind CSS 3.4 |
| **UI Components** | Component Library | Radix UI, shadcn/ui |
| **Charts** | Data Visualization | Recharts 2.15 |
| **Forms** | Form Handling | React Hook Form 7.61, Zod 3.25 |
| **Themes** | Dark/Light Mode | next-themes 0.3 |

##  Prerequisites

Before deploying the application, ensure you have:

- **Node.js** 18.x or higher
- **Python** 3.10 or higher
- **PostgreSQL** 14+ (optional, can use SQLite for development)
- **Alpaca Account**: Sign up at [Alpaca Markets](https://alpaca.markets/) and get paper trading API credentials

##  Deployment Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "Paper Trader Bot with Alpaca"
```

### 2. Backend Setup

#### Configure Environment Variables

```bash
cd Backend
cp .env.example backend/.env
```

Edit `backend/.env` and add your Alpaca credentials:

```env
# Alpaca Paper Trading Credentials
ALPACA_API_KEY_ID=your_alpaca_key_id_here
ALPACA_API_SECRET_KEY=your_alpaca_secret_key_here
ALPACA_BASE_URL=https://paper-api.alpaca.markets

# Database (use SQLite for quick start)
DATABASE_URL=sqlite:///./data/app.db

# For PostgreSQL production:
# DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/papertrade
```

#### Install Dependencies & Run

```bash
cd backend/app
pip install -r requirements.txt

# Run the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`

### 3. Frontend Setup

#### Configure API Endpoint

Edit `Frontend/src/services/tradingApi.ts` if needed to point to your backend URL.

#### Install Dependencies & Run

```bash
cd Frontend
npm install

# Development mode
npm run dev

# Production build
npm run build
npm run preview
```

The frontend will be available at `http://localhost:5173` (dev) or `http://localhost:4173` (preview)

### 4. Access the Application

1. Open your browser at `http://localhost:5173`
2. The app will connect to the backend at `http://localhost:8000`
3. Start exploring markets and placing paper trades!

## 🐳 Docker Deployment (Optional)

If you prefer using Docker:

```bash
# Backend
cd Backend/backend
docker build -t paper-trading-backend .
docker run -p 8000:8000 --env-file .env paper-trading-backend

# Frontend (requires backend URL configuration)
cd Frontend
# Build and serve with nginx or node server
```

##  API Documentation

Once the backend is running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Main Endpoints

- `GET /alpaca/account` - Get account information
- `GET /positions` - List all positions
- `POST /orders` - Place a new order
- `GET /orders` - List all orders
- `GET /portfolio/history` - Get portfolio history
- `GET /market-data/stocks/{symbol}/bars` - Get stock market data
- `GET /market-data/crypto/{symbol}/bars` - Get crypto market data

## 🔧 Development

### Backend Development

```bash
cd Backend/backend/app
uvicorn main:app --reload
```

### Frontend Development

```bash
cd Frontend
npm run dev
```

Hot-reload is enabled for both environments.

##  Environment Variables Reference

### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `ALPACA_API_KEY_ID` | Alpaca API key | Required |
| `ALPACA_API_SECRET_KEY` | Alpaca API secret | Required |
| `ALPACA_BASE_URL` | Alpaca API endpoint | `https://paper-api.alpaca.markets` |
| `DATABASE_URL` | Database connection string | `sqlite:///./data/app.db` |
| `APP_NAME` | Application name | `PaperTradeBot API` |
| `BACKEND_PORT` | Server port | `8000` |

##  Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

##  License

This project is for educational purposes. Please ensure compliance with Alpaca Markets' terms of service.

##  Disclaimer

This is a paper trading application for educational and practice purposes only. No real money is involved. Always practice risk management and do your own research before trading with real funds.
