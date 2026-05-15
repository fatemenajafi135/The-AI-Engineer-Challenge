"""
Chat routes and all supporting logic: validation, retry, cost calculation,
prompt assembly, and API key resolution.
"""

import asyncio
import json
import logging
import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI, OpenAI, APIConnectionError, APIStatusError, RateLimitError

from .config import (
    BASE_PROMPT,
    COACH_PROMPTS,
    COMPILED_INJECTION_PATTERNS,
    DEFAULT_COACH,
    MAX_MESSAGE_LENGTH,
    MODEL_PRICING,
    RETRY_BASE_DELAY,
    RETRY_MAX,
)
from .history import build_history
from .models import ChatRequest

router = APIRouter()
logger = logging.getLogger(__name__)


# ── Validation ────────────────────────────────────────────────────────────────

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


# ── Retry ─────────────────────────────────────────────────────────────────────

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


# ── Cost calculation ──────────────────────────────────────────────────────────

def _calc_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float | None:
    pricing = MODEL_PRICING.get(model)
    if pricing is None:
        return None
    input_rate, output_rate = pricing
    return round((prompt_tokens * input_rate + completion_tokens * output_rate) / 1_000_000, 6)


# ── Prompt assembly ───────────────────────────────────────────────────────────

def build_system_prompt(coach: str) -> str:
    coach_text = COACH_PROMPTS.get(coach, COACH_PROMPTS[DEFAULT_COACH])
    return f"{BASE_PROMPT}\n\n{coach_text}"


# ── API key resolution ────────────────────────────────────────────────────────

def _resolve_key(request: ChatRequest) -> str:
    """Request-level key takes priority over the server env var."""
    key = (request.api_key or "").strip() or os.getenv("OPENAI_API_KEY", "")
    if not key:
        raise HTTPException(status_code=500, detail="No OpenAI API key provided")
    return key


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/")
def root():
    return {"status": "ok"}


@router.post("/api/chat")
async def chat(request: ChatRequest):
    _validate_message(request.message)
    key = _resolve_key(request)
    try:
        history = await build_history(request.history, key)
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


@router.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Streams the assistant reply as Server-Sent Events (SSE).
    Each token event: data: {"token": "..."}
    Final event:      data: {"done": true, "usage": {...}}
    """
    _validate_message(request.message)
    key = _resolve_key(request)

    async def token_generator():
        history = await build_history(request.history, key)
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
