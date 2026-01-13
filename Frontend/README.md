
# PaperTrader Frontend — Quick Development Guide

## Overview
Modern React application with TypeScript, Vite, and TailwindCSS for real-time trading visualization using Alpaca market data.

## Requirements
- Node.js 16+ and npm/yarn
- Backend running on `http://localhost:8000`

## Setup
```sh
npm install
npm run dev      # Start dev server on http://localhost:8081
npm run build    # Production build
npm run lint     # Check code quality
```

**Note:** Default port is 8081 to avoid conflicts with PostgreSQL's default port (8080).

## Project Structure
```
src/
├── components/        # Reusable UI components
│   ├── trading/      # Trading-specific: TradingChart, PortfolioChart
│   ├── orders/       # OrderForm, OrdersTable
│   ├── positions/    # PositionsList, PositionsTable
│   ├── strategy/     # StrategyList, BotActivityMonitor
│   └── ui/          # shadcn/ui primitives (Button, Card, Dialog, etc.)
├── pages/           # Full page components (Home, Login, Strategy, Explore)
├── services/        # API calls (tradingApi.ts)
├── types/           # TypeScript interfaces (trading.ts)
├── contexts/        # React Context (AuthContext)
└── hooks/           # Custom hooks (use-toast, use-mobile)
```

## Key Components
- **PortfolioChart**: Real-time portfolio value curve with time range filters
- **TradingChart**: Price chart with Recharts (supports crypto & stocks)
- **OrderForm**: Create orders with validation (React Hook Form + Zod)
- **StrategyList**: Display and manage bot configurations
- **Navigation**: Route handling with React Router

## Tech Stack
- **React 18** with TypeScript
- **Vite** for fast builds
- **TailwindCSS** for styling
- **Recharts** for data visualization
- **React Router** for navigation
- **TanStack Query** for server state
- **shadcn/ui** for UI components

## API Integration
All API calls in `src/services/tradingApi.ts` connect to the backend at `BASE_URL = http://localhost:8000`.

Example endpoints:
- `GET /portfolio/history?timeRange=1M` → Portfolio history
- `GET /positions/` → Open positions
- `POST /orders/` → Create order
- `GET /bot/status` → Bot status
