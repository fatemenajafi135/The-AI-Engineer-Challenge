# ── Refactor note (2026-05-15) ────────────────────────────────────────────────
# All constants moved to /api/config.py per CLAUDE.md rules.
# This file contains only: app setup, request models, helper functions, routes.
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import OpenAI, AsyncOpenAI, RateLimitError, APIStatusError, APIConnectionError
import asyncio
import logging
import os
import json
from dotenv import load_dotenv

from .config import (
    MAX_MESSAGE_LENGTH,
    COMPILED_INJECTION_PATTERNS,
    DEFAULT_MODEL,
    DEFAULT_MAX_TOKENS,
    DEFAULT_COACH,
    RETRY_MAX,
    RETRY_BASE_DELAY,
    MODEL_PRICING,
    HISTORY_WINDOW,
    SUMMARY_SYSTEM,
    BASE_PROMPT,
    COACH_PROMPTS,
)

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# ══════════════════════════════════════════════════════════════════════════════
# REQUEST MODELS
# ══════════════════════════════════════════════════════════════════════════════

class HistoryMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list[HistoryMessage] = []
    coach: str = DEFAULT_COACH
    # Per-request overrides supplied by the frontend
    api_key: str | None = None
    model: str = DEFAULT_MODEL
    temperature: float = 0.7
    max_tokens: int = DEFAULT_MAX_TOKENS

# ══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════════════

logger = logging.getLogger(__name__)

# Default clients — used when the request carries no api_key
client       = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
async_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def _validate_message(text: str) -> None:
    if len(text) > MAX_MESSAGE_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Message too long — please keep it under {MAX_MESSAGE_LENGTH} characters.",
        )
    if any(p.search(text) for p in COMPILED_INJECTION_PATTERNS):
        raise HTTPException(
            status_code=400,
            detail="Message blocked: it looks like a prompt injection attempt.",
        )


def _is_retryable(exc: Exception) -> bool:
    """Rate-limit (429) and server errors (5xx) are transient — worth retrying.
    Client errors (4xx except 429) indicate a bad request and should not retry."""
    if isinstance(exc, RateLimitError):
        return True
    if isinstance(exc, APIConnectionError):
        return True
    if isinstance(exc, APIStatusError):
        return exc.status_code >= 500
    return False


def _calc_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float | None:
    pricing = MODEL_PRICING.get(model)
    if pricing is None:
        return None
    input_rate, output_rate = pricing
    return round((prompt_tokens * input_rate + completion_tokens * output_rate) / 1_000_000, 6)


def build_system_prompt(coach: str) -> str:
    coach_text = COACH_PROMPTS.get(coach, COACH_PROMPTS[DEFAULT_COACH])
    return f"{BASE_PROMPT}\n\n{coach_text}"


def _resolve_key(request: ChatRequest) -> str:
    """Return the API key to use: request-level key takes priority over env var."""
    key = (request.api_key or "").strip() or os.getenv("OPENAI_API_KEY", "")
    if not key:
        raise HTTPException(status_code=500, detail="No OpenAI API key provided")
    return key


async def _build_history(raw: list[HistoryMessage], api_key: str) -> list[dict]:
    """
    Sliding-window history builder.
    - If total messages fit within HISTORY_WINDOW, return them all as-is.
    - Otherwise, summarize the older portion and prepend as a system note
      so the model has full session context without ballooning the prompt.
    Falls back to the bare window slice if the summarization call fails.
    """
    msgs = [{"role": m.role, "content": m.content} for m in raw]
    if len(msgs) <= HISTORY_WINDOW:
        return msgs

    old, recent = msgs[:-HISTORY_WINDOW], msgs[-HISTORY_WINDOW:]
    transcript = "\n".join(f"{m['role'].capitalize()}: {m['content']}" for m in old)

    try:
        resp = await AsyncOpenAI(api_key=api_key, max_retries=0).chat.completions.create(
            model="gpt-4o-mini",  # always use the cheap/fast model for summaries
            messages=[
                {"role": "system", "content": SUMMARY_SYSTEM},
                {"role": "user", "content": transcript},
            ],
            temperature=0.3,
            max_tokens=150,
        )
        summary = resp.choices[0].message.content.strip()
        return [
            {"role": "system", "content": f"[Earlier in this session]: {summary}"},
            *recent,
        ]
    except Exception:
        logger.warning("History summarization failed; falling back to recent window only.")
        return recent

# ══════════════════════════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/")
def root():
    return {"status": "ok"}

@app.post("/api/chat")
async def chat(request: ChatRequest):
    _validate_message(request.message)
    key = _resolve_key(request)
    try:
        history = await _build_history(request.history, key)
        # max_retries lets the SDK handle rate-limit and 5xx backoff automatically
        response = OpenAI(api_key=key, max_retries=RETRY_MAX).chat.completions.create(
            model=request.model,
            messages=[
                {"role": "system", "content": build_system_prompt(request.coach)},
                *history,
                {"role": "user", "content": request.message},
            ],
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )
        usage = response.usage
        result: dict = {"reply": response.choices[0].message.content}
        if usage:
            result["usage"] = {
                "prompt_tokens": usage.prompt_tokens,
                "completion_tokens": usage.completion_tokens,
                "total_tokens": usage.total_tokens,
                "cost": _calc_cost(request.model, usage.prompt_tokens, usage.completion_tokens),
            }
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI error: {str(e)}")

@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Streams the assistant reply as Server-Sent Events (SSE).
    Each event: data: {"token": "..."}\n\n
    Final event: data: {"done": true, "usage": {...}}\n\n
    """
    _validate_message(request.message)
    key = _resolve_key(request)

    async def token_generator():
        history = await _build_history(request.history, key)
        messages = [
            {"role": "system", "content": build_system_prompt(request.coach)},
            *history,
            {"role": "user", "content": request.message},
        ]

        # Retry only the initial connection — once tokens are flowing, mid-stream
        # retry is impossible (partial data already sent to the client).
        aclient = AsyncOpenAI(api_key=key, max_retries=0)  # retries managed below
        stream = None
        last_exc: Exception | None = None

        for attempt in range(RETRY_MAX + 1):
            try:
                stream = await aclient.chat.completions.create(
                    model=request.model,
                    messages=messages,
                    stream=True,
                    stream_options={"include_usage": True},
                    temperature=request.temperature,
                    max_tokens=request.max_tokens,
                )
                break
            except Exception as exc:
                last_exc = exc
                if _is_retryable(exc) and attempt < RETRY_MAX:
                    delay = RETRY_BASE_DELAY * (2 ** attempt)
                    logger.warning(
                        "OpenAI transient error (attempt %d/%d), retrying in %.0fs: %s",
                        attempt + 1, RETRY_MAX, delay, exc,
                    )
                    await asyncio.sleep(delay)
                else:
                    break

        if stream is None:
            yield f"data: {json.dumps({'error': str(last_exc)})}\n\n"
            return

        try:
            usage_data = None
            async for chunk in stream:
                # The final usage-only chunk has choices=[] — guard before indexing
                if chunk.choices:
                    delta = chunk.choices[0].delta
                    if delta.content:
                        yield f"data: {json.dumps({'token': delta.content})}\n\n"
                if chunk.usage:
                    usage_data = chunk.usage

            done_payload: dict = {"done": True}
            if usage_data:
                done_payload["usage"] = {
                    "prompt_tokens": usage_data.prompt_tokens,
                    "completion_tokens": usage_data.completion_tokens,
                    "total_tokens": usage_data.total_tokens,
                    "cost": _calc_cost(request.model, usage_data.prompt_tokens, usage_data.completion_tokens),
                }
            yield f"data: {json.dumps(done_payload)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        token_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
