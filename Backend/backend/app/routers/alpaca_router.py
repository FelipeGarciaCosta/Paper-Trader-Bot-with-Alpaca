from fastapi import APIRouter, HTTPException
from app.services.alpaca_client import AlpacaClient

router = APIRouter()

#ENPOINTS FOR ALPACA INTERACTIONS:
# /alpaca/account /alpaca/debug-env



@router.get("/account")
def get_account():
    client = AlpacaClient()
    return client.get_account()

#This is to test if the base URL and credentials are set correctly
@router.get("/debug-env")
def alpaca_debug_env():
    client = AlpacaClient()
    key_tail = client.api_key[-4:] if client.api_key else None
    secret_length = len(client.api_secret) if client.api_secret else 0

    return {
        "base_url": client.base_url,
        "has_key": bool(client.api_key),
        "key_tail": key_tail,
        "secret_length": secret_length,
    }
