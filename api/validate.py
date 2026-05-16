"""
API key validation route — calls GET /v1/models to confirm a key is accepted
by OpenAI without consuming any tokens or counting against rate limits.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from openai import OpenAI, AuthenticationError, APIConnectionError

router = APIRouter()


class ValidateRequest(BaseModel):
    api_key: str


@router.post("/api/validate-key")
def validate_key(req: ValidateRequest):
    key = req.api_key.strip()
    if not key:
        return {"valid": False, "error": "No key provided"}
    try:
        OpenAI(api_key=key, max_retries=0).models.list()
        return {"valid": True}
    except AuthenticationError:
        return {"valid": False, "error": "Invalid API key"}
    except APIConnectionError:
        return {"valid": False, "error": "Could not reach OpenAI — check your connection"}
    except Exception:
        return {"valid": False, "error": "Verification failed"}
