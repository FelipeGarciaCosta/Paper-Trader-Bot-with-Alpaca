from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.services.alpaca_client import AlpacaClient
from app.schemas.portfolio_history import PortfolioValue

router = APIRouter()


def _map_timeRange(time_range: str) -> tuple[str, Optional[str]]:
	"""Map frontend timeRange (1D,1M,1Y,ALL) to Alpaca timeframe+period."""
	tr = (time_range or "1M").upper()
	if tr == "1D":
		# intraday, return 1 minute resolution and 1 day period
		return "1Min", "1D"
	if tr == "1M":
		# daily resolution across 1 month
		return "1D", "1M"
	if tr == "1Y":
		# daily resolution across 1 year (Alpaca uses 'A' for years in period)
		return "1D", "1A"
	if tr == "ALL":
		# daily resolution across a large period (10 years)
		return "1D", "10A"
	# default
	return "1D", "1M"


@router.get("/history", response_model=list[PortfolioValue])
def get_portfolio_history(
	timeRange: str = Query("1M", description="One of: 1D,1M,1Y,ALL"),
	start: Optional[str] = Query(None, description="RFC-3339 start time override"),
	end: Optional[str] = Query(None, description="RFC-3339 end time override"),
):
	"""Fetch portfolio history from Alpaca and return time-series for frontend.

	Returns an array of objects with `timestamp` and `value` (equity) suitable for the frontend chart.
	"""
	timeframe, period = _map_timeRange(timeRange)

	alpaca = AlpacaClient()
	# Use extended_hours to ensure consistency across all timeframes
	intraday_reporting = "extended_hours" if "Min" in timeframe else None
	try:
		data = alpaca.get_portfolio_history(
			timeframe=timeframe,
			period=period,
			start=start,
			end=end,
			intraday_reporting=intraday_reporting,
		)
	except Exception as e:  # noqa: BLE001
		raise HTTPException(status_code=502, detail=f"Error calling Alpaca: {e}")

	# Alpaca returns arrays for keys: timestamp, equity, profit_loss, profit_loss_pct, etc.
	timestamps = data.get("timestamp") or []
	equities = data.get("equity") or []

	mapped = []
	for i, ts in enumerate(timestamps):
		try:
			# Alpaca returns epoch seconds (integers). Accept str/float as well.
			unix = int(ts)
			dt = datetime.utcfromtimestamp(unix)
		except Exception:
			# Try ISO parsing as fallback
			try:
				dt = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
			except Exception:
				# skip malformed
				continue

		try:
			eq = float(equities[i]) if i < len(equities) else None
		except Exception:
			eq = None

		# Frontend expects timestamp + value
		if eq is not None:
			mapped.append({"timestamp": dt, "value": eq})

	# Return the mapped points derived from Alpaca response
	# Note: FastAPI/Pydantic will convert datetime -> ISO string automatically
	return mapped


@router.get("/value")
def get_portfolio_value():
	"""Fetch current portfolio value from Alpaca account.

	Returns the portfolio_value field from /v2/account endpoint.
	"""
	alpaca = AlpacaClient()
	try:
		account_data = alpaca.get_account()
		portfolio_value = account_data.get("portfolio_value")
		if portfolio_value is None:
			raise HTTPException(status_code=500, detail="portfolio_value not found in account data")
		return {"portfolio_value": float(portfolio_value)}
	except Exception as e:  # noqa: BLE001
		raise HTTPException(status_code=502, detail=f"Error calling Alpaca: {e}")

