"""
Chat routes and all supporting logic: validation, retry, cost calculation,
prompt assembly, and API key resolution.

Two-phase streaming (2026-05-15):
  Phase 1 — call OpenAI with tools (tool_choice="auto").
             If the model calls a tool, accumulate its args and emit a tool_call SSE event.
  Phase 2 — call OpenAI again with the tool result injected to get the text response.
  If no tool is called in Phase 1, tokens stream directly without a Phase 2 round-trip.
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
from .tools import ALL_TOOLS, TOOLS_SYSTEM_ADDENDUM

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

def build_system_prompt(coach: str, user_name: str = "") -> str:
    name_intro = (
        f"You are speaking with {user_name.strip()}. Use their name occasionally and naturally — "
        f"not in every reply, but when warmth or emphasis calls for it.\n\n"
        if user_name.strip() else ""
    )
    coach_text = COACH_PROMPTS.get(coach, COACH_PROMPTS[DEFAULT_COACH])
    return f"{name_intro}{BASE_PROMPT}\n\n{coach_text}{TOOLS_SYSTEM_ADDENDUM}"


# ── API key resolution ────────────────────────────────────────────────────────

def _resolve_key(request: ChatRequest) -> str:
    """Request-level key takes priority over the server env var."""
    key = (request.api_key or "").strip() or os.getenv("OPENAI_API_KEY", "")
    if not key:
        raise HTTPException(status_code=500, detail="No OpenAI API key provided")
    return key


# ── Streaming helper ──────────────────────────────────────────────────────────

async def _open_stream(
    aclient: AsyncOpenAI,
    *,
    model: str,
    messages: list,
    temperature: float,
    max_tokens: int,
    tools: list | None = None,
):
    """Open an OpenAI streaming completion, retrying on transient errors.
    Passes tools + tool_choice='auto' only when tools is provided.
    Returns the stream object, or None if all retries are exhausted."""
    kwargs: dict = dict(
        model=model,
        messages=messages,
        stream=True,
        stream_options={"include_usage": True},
        temperature=temperature,
        max_tokens=max_tokens,
    )
    if tools:
        kwargs["tools"] = tools
        kwargs["tool_choice"] = "auto"

    last_exc: Exception | None = None
    for attempt in range(RETRY_MAX + 1):
        try:
            return await aclient.chat.completions.create(**kwargs)
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
    logger.error("All OpenAI retries exhausted: %s", last_exc)
    return None


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
                {"role": "system", "content": build_system_prompt(request.coach, request.user_name)},
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

    Event types emitted:
      {"tool_call": {"name": "...", "args": {...}}}  — model invoked a tool
      {"token": "..."}                               — text token
      {"done": true, "usage": {...}}                 — stream complete
      {"error": "..."}                               — unrecoverable error
    """
    _validate_message(request.message)
    key = _resolve_key(request)

    async def token_generator():
        history = await build_history(request.history, key)
        messages = [
            {"role": "system", "content": build_system_prompt(request.coach, request.user_name)},
            *history,
            {"role": "user", "content": request.message},
        ]

        aclient = AsyncOpenAI(api_key=key, max_retries=0)  # retries managed by _open_stream

        logger.info(
            "Stream request — model=%s coach=%s msg_len=%d history=%d",
            request.model, request.coach, len(request.message), len(request.history),
        )

        # ── Phase 1: call with tools ──────────────────────────────────────────
        stream = await _open_stream(
            aclient,
            model=request.model,
            messages=messages,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            tools=ALL_TOOLS,
        )
        if stream is None:
            yield f"data: {json.dumps({'error': 'Could not connect to OpenAI'})}\n\n"
            return

        # tool_calls_by_idx accumulates fragmented tool call chunks keyed by index
        tool_calls_by_idx: dict[int, dict] = {}
        usage_data = None

        try:
            async for chunk in stream:
                if chunk.choices:
                    delta = chunk.choices[0].delta

                    # Accumulate tool call argument fragments (arrive in pieces across chunks)
                    if delta.tool_calls:
                        for tc in delta.tool_calls:
                            idx = tc.index
                            if idx not in tool_calls_by_idx:
                                tool_calls_by_idx[idx] = {"id": "", "name": "", "arguments": ""}
                            entry = tool_calls_by_idx[idx]
                            if tc.id:
                                entry["id"] = tc.id
                            if tc.function:
                                if tc.function.name:
                                    entry["name"] = tc.function.name
                                if tc.function.arguments:
                                    entry["arguments"] += tc.function.arguments

                    # Direct text token — model chose not to call a tool this turn
                    if delta.content:
                        yield f"data: {json.dumps({'token': delta.content})}\n\n"

                if chunk.usage:
                    usage_data = chunk.usage
        except Exception as e:
            logger.error("Phase 1 stream error: %s", e, exc_info=True)
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

        # ── Phase 2: process tool calls, then get text reply ──────────────────
        if tool_calls_by_idx:
            sorted_tcs = [tool_calls_by_idx[i] for i in sorted(tool_calls_by_idx)]

            # Emit each tool call to the frontend before the assistant text arrives
            for tc in sorted_tcs:
                try:
                    args = json.loads(tc["arguments"])
                except Exception:
                    logger.warning("Tool arg JSON parse failed for %s — using empty args", tc["name"])
                    args = {}
                yield f"data: {json.dumps({'tool_call': {'name': tc['name'], 'args': args}})}\n\n"
                logger.info("Tool called: %s", tc["name"])

            # Reconstruct the assistant's tool_calls message for the follow-up call
            tool_call_list = [
                {
                    "id": tc["id"],
                    "type": "function",
                    "function": {"name": tc["name"], "arguments": tc["arguments"]},
                }
                for tc in sorted_tcs
            ]

            # Tool result: simple acknowledgment — the model already computed the values
            tool_results = [
                {
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": json.dumps({"acknowledged": True}),
                }
                for tc in sorted_tcs
            ]

            phase2_messages = [
                *messages,
                {"role": "assistant", "content": None, "tool_calls": tool_call_list},
                *tool_results,
            ]

            stream2 = await _open_stream(
                aclient,
                model=request.model,
                messages=phase2_messages,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
            )
            if stream2 is None:
                yield f"data: {json.dumps({'error': 'Phase 2 connection failed'})}\n\n"
                return

            try:
                async for chunk in stream2:
                    if chunk.choices:
                        delta = chunk.choices[0].delta
                        if delta.content:
                            yield f"data: {json.dumps({'token': delta.content})}\n\n"
                    if chunk.usage:
                        usage_data = chunk.usage  # overwrite with Phase 2 usage
            except Exception as e:
                logger.error("Phase 2 stream error: %s", e, exc_info=True)
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                return

        # ── Final done event ──────────────────────────────────────────────────
        done_payload: dict = {"done": True}
        if usage_data:
            logger.info(
                "Stream complete — prompt=%d completion=%d total=%d",
                usage_data.prompt_tokens, usage_data.completion_tokens, usage_data.total_tokens,
            )
            done_payload["usage"] = {
                "prompt_tokens": usage_data.prompt_tokens,
                "completion_tokens": usage_data.completion_tokens,
                "total_tokens": usage_data.total_tokens,
                "cost": _calc_cost(request.model, usage_data.prompt_tokens, usage_data.completion_tokens),
            }
        yield f"data: {json.dumps(done_payload)}\n\n"

    return StreamingResponse(
        token_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
