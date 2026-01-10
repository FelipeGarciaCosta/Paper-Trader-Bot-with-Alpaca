from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional

import requests

logger = logging.getLogger(__name__)


class AlpacaClient:
    def __init__(
        self,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: int = 15,
    ) -> None:
        # Read from args or env and strip accidental whitespace/quotes
        env_key = os.getenv("ALPACA_API_KEY_ID", "")
        env_secret = os.getenv("ALPACA_API_SECRET_KEY", "")
        env_base = os.getenv("ALPACA_BASE_URL", "https://paper-api.alpaca.markets")

        self.api_key = (api_key if api_key is not None else env_key).strip().strip('"').strip("'")
        self.api_secret = (api_secret if api_secret is not None else env_secret).strip().strip('"').strip("'")
        self.base_url = ((base_url if base_url is not None else env_base).strip().strip('"').strip("'"))
        self.base_url = self.base_url.rstrip("/")
        self.timeout = timeout

        if not self.api_key or not self.api_secret:
            logger.warning("Alpaca credentials are not set. API calls will fail.")

        self.session = requests.Session()
        self.session.headers.update(
            {
                "APCA-API-KEY-ID": self.api_key,
                "APCA-API-SECRET-KEY": self.api_secret,
                "Content-Type": "application/json",
                "Accept": "application/json",
            }
        )

    def _url(self, path: str) -> str:
        if not path.startswith("/"):
            path = "/" + path
        return f"{self.base_url}{path}"

    def get_account(self) -> Dict[str, Any]:
        url = self._url("/v2/account")
        logger.debug("GET %s", url)
        resp = self.session.get(url, timeout=self.timeout)
        self._raise_for_status(resp)
        return resp.json()

    def list_positions(self) -> List[Dict[str, Any]]:
        url = self._url("/v2/positions")
        logger.debug("GET %s", url)
        resp = self.session.get(url, timeout=self.timeout)
        self._raise_for_status(resp)
        data = resp.json()
        return data if isinstance(data, list) else []
        
    def delete_position(self, symbol_or_asset_id: str) -> Dict[str, Any]:
        url = self._url(f"/v2/positions/{symbol_or_asset_id}")
        logger.debug("DELETE %s", url)
        resp = self.session.delete(url, timeout=self.timeout)
        self._raise_for_status(resp)
        return resp.json()

    def list_orders_from_alpaca(self, status: str = "open") -> List[Dict[str, Any]]:
        url = self._url("/v2/orders")
        params = {"status": status}
        logger.debug("GET %s params=%s", url, params)
        resp = self.session.get(url, params=params, timeout=self.timeout)
        self._raise_for_status(resp)
        data = resp.json()
        return data if isinstance(data, list) else []

    def submit_order(
        self,
        symbol: str,
        qty: int,
        side: str,
        order_type: str = "market",
        time_in_force: str = "day",
        **kwargs: Any,
    ) -> Dict[str, Any]:
        url = self._url("/v2/orders")
        payload: Dict[str, Any] = {
            "symbol": symbol,
            "qty": qty,
            "side": side,
            "type": order_type,
            "time_in_force": time_in_force,
        }
        payload.update(kwargs)
        logger.debug("POST %s payload=%s", url, payload)
        resp = self.session.post(url, json=payload, timeout=self.timeout)
        self._raise_for_status(resp)
        return resp.json()

    def replace_order(self, order_id: str, **kwargs: Any) -> Dict[str, Any]:
        """Replace an existing order on Alpaca using PATCH /v2/orders/{order_id}.
        kwargs are passed directly as the JSON payload
        = argumentos de palabra clave con un número variable que permiten a una función aceptar cualquier cantidad de pares clave=valor
        """
        url = self._url(f"/v2/orders/{order_id}")
        payload: Dict[str, Any] = {}
        payload.update(kwargs)
        logger.debug("PATCH %s payload=%s", url, payload)
        resp = self.session.patch(url, json=payload, timeout=self.timeout)
        self._raise_for_status(resp)
        return resp.json()

    # -------- Market Data (Stocks Bars) --------
    def get_stock_bars(
        self,
        symbols: str,
        timeframe: str,
        start: str | None = None,
        end: str | None = None,
        limit: int = 1000,
        adjustment: str = "raw",
        feed: str | None = None,
        sort: str = "asc",
    ) -> Dict[str, Any]:
        """Fetch bars from Alpaca Market Data API with simple pagination aggregation.
        Returns dict with keys: bars (dict[symbol, list[bar]]).
        """
        data_base = "https://data.alpaca.markets"
        path = "/v2/stocks/bars"
        url = f"{data_base}{path}"
        params: Dict[str, Any] = {
            "symbols": symbols,
            "timeframe": timeframe,
            "limit": limit,
            "adjustment": adjustment,
            "sort": sort,
        }
        if start:
            params["start"] = start
        if end:
            params["end"] = end
        if feed:
            params["feed"] = feed

        all_bars: Dict[str, list[Dict[str, Any]]] = {}
        page_token: str | None = None

        while True:
            if page_token:
                params["page_token"] = page_token
            logger.debug("GET %s params=%s", url, params)
            resp = self.session.get(url, params=params, timeout=self.timeout)
            self._raise_for_status(resp)
            payload = resp.json()
            bars = payload.get("bars", {}) or {}
            for sym, items in bars.items():
                if sym not in all_bars:
                    all_bars[sym] = []
                all_bars[sym].extend(items)
            page_token = payload.get("next_page_token")
            if not page_token:
                break

        return {"bars": all_bars}

    def get_crypto_bars(
        self,
        loc: str,
        symbols: str,
        timeframe: str,
        start: str | None = None,
        end: str | None = None,
        limit: int = 1000,
        sort: str = "asc",
        page_token: str | None = None,
    ) -> dict:
        """Fetch crypto bars from Alpaca v1beta3 crypto endpoint with pagination.

        Returns dict with key 'bars' mapping symbol -> list[bar].
        """
        data_base = "https://data.alpaca.markets"
        path = f"/v1beta3/crypto/{loc}/bars"
        url = f"{data_base}{path}"
        params: Dict[str, Any] = {
            "symbols": symbols,
            "timeframe": timeframe,
            "limit": limit,
            "sort": sort,
        }
        if start:
            params["start"] = start
        if end:
            params["end"] = end

        all_bars: Dict[str, list[Dict[str, Any]]] = {}
        next_page: str | None = None

        while True:
            if next_page:
                params["page_token"] = next_page
            logger.debug("GET %s params=%s", url, params)
            resp = self.session.get(url, params=params, timeout=self.timeout)
            self._raise_for_status(resp)
            payload = resp.json()
            bars = payload.get("bars", {}) or {}
            for sym, items in bars.items():
                if sym not in all_bars:
                    all_bars[sym] = []
                all_bars[sym].extend(items)
            next_page = payload.get("next_page_token")
            if not next_page:
                break

        return {"bars": all_bars}

    def get_portfolio_history(
        self,
        timeframe: str | None = None,
        period: str | None = None,
        start: str | None = None,
        end: str | None = None,
        intraday_reporting: str | None = None,
        pnl_reset: str | None = None,
    ) -> dict:
        """Fetch portfolio history from Alpaca Account API.

        Returns the parsed JSON payload from Alpaca. Parameters follow Alpaca API docs:
        /v2/account/portfolio/history
        """
        url = self._url("/v2/account/portfolio/history")
        params: dict[str, str] = {}
        if timeframe:
            params["timeframe"] = timeframe
        if period:
            params["period"] = period
        if start:
            params["start"] = start
        if end:
            params["end"] = end
        if intraday_reporting:
            params["intraday_reporting"] = intraday_reporting
        if pnl_reset:
            params["pnl_reset"] = pnl_reset

        logger.debug("GET %s params=%s", url, params)
        resp = self.session.get(url, params=params, timeout=self.timeout)
        self._raise_for_status(resp)
        return resp.json()

    @staticmethod
    def _raise_for_status(resp: requests.Response) -> None:
        try:
            resp.raise_for_status()
        except requests.HTTPError as exc:  # noqa: BLE001
            content: Any
            try:
                content = resp.json()
            except Exception:  # noqa: BLE001
                content = resp.text
            logger.error("Alpaca API error %s: %s", resp.status_code, content)
            raise
