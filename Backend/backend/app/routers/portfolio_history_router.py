from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.services.alpaca_client import AlpacaClient
from app.models.portfolio_history import PortfolioHistory
from app.schemas.portfolio_history import PortfolioPointRead, PortfolioValue

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
	store: bool = Query(True, description="If true, sync new points into DB"),
	db: Session = Depends(get_db),
):
	"""Fetch portfolio history from Alpaca, optionally persist and return time-series for frontend.

	Returns an array of objects with `timestamp` and `value` (equity) suitable for the frontend chart.
	"""
	timeframe, period = _map_timeRange(timeRange)

	alpaca = AlpacaClient()
	# Only send intraday_reporting when timeframe is intraday (e.g. contains 'Min')
	intraday_reporting = "market_hours" if "Min" in timeframe else None
	try:
		data = alpaca.get_portfolio_history(
			timeframe=timeframe,
			period=period,
			start=start,
			end=end,
			intraday_reporting=intraday_reporting,
			pnl_reset="per_day",
		)
	except Exception as e:  # noqa: BLE001
		raise HTTPException(status_code=502, detail=f"Error calling Alpaca: {e}")

	# Alpaca returns arrays for keys: timestamp, equity, profit_loss, profit_loss_pct, etc.
	timestamps = data.get("timestamp") or []
	equites = data.get("equity") or []
	profit_loss = data.get("profit_loss") or []
	profit_loss_pct = data.get("profit_loss_pct") or []
	base_value = data.get("base_value")
	base_value_asof = data.get("base_value_asof")

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
			eq = float(equites[i]) if i < len(equites) else None
		except Exception:
			eq = None

		try:
			pl = float(profit_loss[i]) if i < len(profit_loss) else None
		except Exception:
			pl = None

		try:
			plp = float(profit_loss_pct[i]) if i < len(profit_loss_pct) else None
		except Exception:
			plp = None

		# Persist to DB if requested
		# Only persist portfolio points when the request corresponds to the monthly timeframe
		# or the explicit window spans ~>= 25 days. This avoids writing during frequent polling.
		persist = False
		try:
			tr_upper = (timeRange or "").upper()
		except Exception:
			tr_upper = ""

		if store:
			if tr_upper == "1M":
				persist = True
			else:
				# if start/end span a month, allow persisting
				try:
					if start and end:
						sdt = datetime.fromisoformat(start.replace("Z", "+00:00"))
						edt = datetime.fromisoformat(end.replace("Z", "+00:00"))
						if (edt - sdt).days >= 25:
							persist = True
				except Exception:
					persist = False

		if persist and eq is not None:
			try:
				ph = PortfolioHistory(
					timeframe=timeframe,
					timestamp=dt,
					equity=eq,
					profit_loss=pl,
					profit_loss_pct=plp,
					base_value=float(base_value) if base_value is not None else None,
					base_value_asof=base_value_asof,
				)
				db.add(ph)
				db.commit()
			except IntegrityError:
				db.rollback()  # already exists -> ignore
			except Exception as e:  # noqa: BLE001
				db.rollback()
				raise HTTPException(status_code=500, detail=f"Error saving portfolio point: {e}")

		# frontend expects timestamp + value
		if eq is not None:
			mapped.append({"timestamp": dt, "value": eq})

	# If we persisted to DB (persist True), prefer returning DB rows (ensures consistent ordering/format)
	try:
		should_return_db = store and ( (timeRange or "").upper() == "1M" )
		# also if explicit start/end spanned >=25 days
		if not should_return_db and start and end:
			try:
				sdt = datetime.fromisoformat(start.replace("Z", "+00:00"))
				edt = datetime.fromisoformat(end.replace("Z", "+00:00"))
				if (edt - sdt).days >= 25:
					should_return_db = True
			except Exception:
				pass
	except Exception:
		should_return_db = False

	if should_return_db:
		q = db.query(PortfolioHistory).filter(PortfolioHistory.timeframe == timeframe)
		if start:
			try:
				q = q.filter(PortfolioHistory.timestamp >= datetime.fromisoformat(start.replace("Z", "+00:00")))
			except Exception:
				pass
		if end:
			try:
				q = q.filter(PortfolioHistory.timestamp <= datetime.fromisoformat(end.replace("Z", "+00:00")))
			except Exception:
				pass

		q = q.order_by(PortfolioHistory.timestamp.asc())
		rows = q.all()
		# map to lightweight response
		return [{"timestamp": r.timestamp, "value": r.equity} for r in rows]

	# otherwise return the mapped points derived from Alpaca response
	# Note: FastAPI/Pydantic will convert datetime -> ISO string automatically
	return mapped

