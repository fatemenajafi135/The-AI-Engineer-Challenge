"""
Request and response models for the Mental Coach API.
Imported by history.py and chat.py — defines the data shapes for all endpoints.
"""

from pydantic import BaseModel
from .config import DEFAULT_MODEL, DEFAULT_MAX_TOKENS, DEFAULT_COACH


class HistoryMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[HistoryMessage] = []
    coach: str = DEFAULT_COACH
    user_name: str = ""  # empty = anonymous
    # Per-request overrides supplied by the frontend
    api_key: str | None = None
    model: str = DEFAULT_MODEL
    temperature: float = 0.7
    max_tokens: int = DEFAULT_MAX_TOKENS
