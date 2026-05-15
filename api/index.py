from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import OpenAI, AsyncOpenAI, RateLimitError, APIStatusError, APIConnectionError
import asyncio
import logging
import os
import re
import json
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# ── Prompt injection guards ──────────────────────────────────────────────────

MAX_MESSAGE_LENGTH = 500

_INJECTION_PATTERNS = [
    # ── Classic instruction overrides ─────────────────────────────────────────
    r"ignore\s+(all\s+)?(previous|prior|above|your)\s+(instructions?|rules?|constraints?|prompt|context)",
    r"(disregard|forget|override|bypass|circumvent|skip)\s+(all\s+)?(previous|prior|your|the|any)\s+(instructions?|rules?|constraints?|guidelines?|prompt|training)",

    # ── Session-scoped overrides ("from now on…", "new instructions:") ────────
    r"(from\s+now\s+on|starting\s+now|for\s+this\s+(conversation|chat|session)|henceforth)\s*[,.]?\s*(you\s+(are|will|must|should|can)|ignore|forget|disregard|act)",
    r"your\s+(new\s+)?(instructions?|rules?|prompt|persona|role|task|directive)\s*(are|is)\s*:",
    r"new\s+(instructions?|rules?|prompt|task|persona|directive)\s*:",

    # ── Role-prefix injection — fake "system:" / "assistant:" in body ─────────
    r"(^|\n)\s*(system|assistant)\s*:\s+",

    # ── Named jailbreak modes & keywords ──────────────────────────────────────
    r"\b(jailbreak|DAN|developer\s+mode|god\s+mode|unrestricted\s+mode)\b",
    r"you\s+(have\s+no|are\s+without|are\s+free\s+from)\s+(restrictions?|limitations?|constraints?|rules?|guidelines?|filters?)",
    r"you\s+can\s+(now\s+)?(do|say|answer|respond\s+to)\s+anything",
    r"(act|behave|pretend|respond)\s+as\s+if\s+you\s+(have\s+no|are\s+without)\s+(restrictions?|limitations?|constraints?|rules?)",

    # ── Common jailbreak token formats ────────────────────────────────────────
    r"\[\s*inst\s*\]",
    r"<\|im_start\|>",
    r"<\|system\|>",
    r"<\s*(system|prompt|instruction)\s*>",

    # ── Persona / identity hijacking ──────────────────────────────────────────
    r"your\s+(true|real|actual|hidden|secret)\s+(name|identity|self|purpose|nature|role|instructions?)\s+(is|are)",
    r"(pretend|act|roleplay|play)\s+(that\s+you('re|\s+are|\s+were)|as\s+if\s+you('re|\s+are|\s+were)|as)\s+(a\s+)?(different|new|another|unrestricted|uncensored|evil|opposite|real)",

    # ── Prompt / instruction extraction ───────────────────────────────────────
    # "what's / what is / what are / what were your (system) prompt/instructions…"
    r"what\s*'?s?\s+(is\s+|are\s+|were\s+|was\s+)?your\s+(system\s+)?(prompt|instructions?|directives?|rules?|guidelines?|configuration|config|setup|training)",
    # verb list — tell/show/give/reveal/repeat/output/print/share/leak/expose/dump
    r"(tell|show|give|share|reveal|repeat|output|print|display|describe|explain|list|write|copy|paste|leak|expose|dump)\s+(me\s+)?(your\s+)?(exact\s+)?(system\s+)?(prompt|instructions?|rules?|guidelines?|directives?|configuration|config)",
    # "what were/are you instructed/told/programmed/trained to do/say"
    r"what\s+(were|are)\s+you\s+(instructed|told|programmed|trained|configured|designed|built|made)\s+(to\s+)?(do|say|respond|act|behave)",
    # "how were/are you programmed/configured/set up/trained"
    r"how\s+(were|are)\s+you\s+(programmed|instructed|configured|set\s+up|trained|built|designed)",
]
_COMPILED = [re.compile(p, re.IGNORECASE) for p in _INJECTION_PATTERNS]


def _validate_message(text: str) -> None:
    if len(text) > MAX_MESSAGE_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Message too long — please keep it under {MAX_MESSAGE_LENGTH} characters.",
        )
    if any(p.search(text) for p in _COMPILED):
        raise HTTPException(
            status_code=400,
            detail="Message blocked: it looks like a prompt injection attempt.",
        )


logger = logging.getLogger(__name__)

# Default clients — used when the request carries no api_key
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
async_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

DEFAULT_MAX_TOKENS = 1024
DEFAULT_MODEL = "gpt-4o-mini"

# ── Retry config ─────────────────────────────────────────────────────────────

_RETRY_MAX = 3
_RETRY_BASE_DELAY = 1.0  # seconds; doubles each attempt: 1 → 2 → 4


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

# ── Prompt building ──────────────────────────────────────────────────────────

BASE_PROMPT = """You are a professional mental wellness coach — warm, empathetic, and non-judgmental \
— with expertise in CBT, mindfulness, stress management, and positive psychology.

Always lead with empathy before advice. Acknowledge feelings, validate emotions without reinforcing \
catastrophic thinking, use plain language, and ask one focused follow-up question when helpful. \
Help users reframe unhelpful thoughts, build coping strategies, set goals, and develop resilience.

Responses must be concise and scannable: short paragraphs or bullet points, never walls of text. \
For stress or anxiety topics, give 3-5 actionable points maximum. For exercises (breathing, \
grounding, journaling), provide clear step-by-step instructions.

You are a coach, not a licensed therapist — do not diagnose or recommend medications. \
If a user expresses thoughts of self-harm or suicide, respond with compassion and immediately \
direct them to a crisis line (e.g. 988 Suicide & Crisis Lifeline) or emergency services."""

COACH_PROMPTS = {
    "challenger": (
        "Character — The Challenger: You call out excuses directly but warmly — you keep it real without being cruel. "
        "When the user avoids something, name it: 'That sounds like an excuse — what's actually stopping you?' "
        "Always push for a specific commitment before closing. Celebrate wins briefly, then ask what's next."
    ),
    "fixer": (
        "Character — The Fixer: You are efficient and solution-oriented. "
        "Validate feelings in one sentence, then pivot to the concrete block. "
        "Cut through spiraling and hand the user their next specific action. "
        "Skip the philosophy; give the plan. 'What's actually stuck?' is your core question."
    ),
    "anchor": (
        "Character — The Anchor: You are calm and steady when everything feels like chaos. "
        "You normalise difficulty without dismissing it, slow the pace, and help the user find their footing. "
        "Quiet resilience shapes every response. Offer perspective before solutions."
    ),
    "hype": (
        "Character — The Hype Man: You are the user's loudest, most embarrassingly loyal fan. "
        "Every step forward is worth celebrating — make it feel real and earned, not hollow. "
        "Your energy is electric but grounded. Make progress feel inevitable."
    ),
    "philosopher": (
        "Character — The Philosopher: You zoom out when the user is too deep in their own head. "
        "Offer perspective through broader frameworks — meaning, values, the bigger picture. "
        "You're not cold or detached; you're curious and thoughtful. "
        "'Is this even the right problem to be solving?' is your kind of question."
    ),
    "wingman": (
        "Character — The Wingman: You are casual, warm, and feel like talking to a smart friend who genuinely gets it. "
        "No jargon, no formality — just real conversation. You listen well, you care, and you give honest advice "
        "the way a trusted friend would. Supportive without being sycophantic."
    ),
}


def build_system_prompt(coach: str) -> str:
    coach_text = COACH_PROMPTS.get(coach, COACH_PROMPTS["challenger"])
    return f"{BASE_PROMPT}\n\n{coach_text}"


# ── Request model ────────────────────────────────────────────────────────────

class HistoryMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list[HistoryMessage] = []
    coach: str = "challenger"
    # Per-request overrides supplied by the frontend
    api_key: str | None = None
    model: str = DEFAULT_MODEL
    temperature: float = 0.7
    max_tokens: int = DEFAULT_MAX_TOKENS


def _resolve_key(request: ChatRequest) -> str:
    """Return the API key to use: request-level key takes priority over env var."""
    key = (request.api_key or "").strip() or os.getenv("OPENAI_API_KEY", "")
    if not key:
        raise HTTPException(status_code=500, detail="No OpenAI API key provided")
    return key


# ── Sliding-window history with summarization ────────────────────────────────

_HISTORY_WINDOW = 16  # recent messages kept verbatim (= 8 user/assistant exchanges)

_SUMMARY_SYSTEM = (
    "Summarize the conversation below in 3-4 sentences. "
    "Cover: the user's main concern, what was explored, and any insights or commitments reached. "
    "Write in third person ('The user...'). Be concise — this will be used as context to continue the session."
)


async def _build_history(raw: list[HistoryMessage], api_key: str) -> list[dict]:
    """
    Sliding-window history builder.
    - If total messages fit within _HISTORY_WINDOW, return them all as-is.
    - Otherwise, summarize the older portion and prepend the summary as a system note
      so the model has full session context without ballooning the prompt.
    Falls back to the bare window slice if the summarization call fails.
    """
    msgs = [{"role": m.role, "content": m.content} for m in raw]
    if len(msgs) <= _HISTORY_WINDOW:
        return msgs

    old, recent = msgs[:-_HISTORY_WINDOW], msgs[-_HISTORY_WINDOW:]
    transcript = "\n".join(f"{m['role'].capitalize()}: {m['content']}" for m in old)

    try:
        resp = await AsyncOpenAI(api_key=api_key, max_retries=0).chat.completions.create(
            model="gpt-4o-mini",  # always use the cheap/fast model for summaries
            messages=[
                {"role": "system", "content": _SUMMARY_SYSTEM},
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


# ── Routes ───────────────────────────────────────────────────────────────────

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
        response = OpenAI(api_key=key, max_retries=_RETRY_MAX).chat.completions.create(
            model=request.model,
            messages=[
                {"role": "system", "content": build_system_prompt(request.coach)},
                *history,
                {"role": "user", "content": request.message},
            ],
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )
        return {"reply": response.choices[0].message.content}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI error: {str(e)}")

@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Streams the assistant reply as Server-Sent Events (SSE).
    Each event: data: {"token": "..."}\n\n
    Final event: data: {"done": true}\n\n
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

        for attempt in range(_RETRY_MAX + 1):
            try:
                stream = await aclient.chat.completions.create(
                    model=request.model,
                    messages=messages,
                    stream=True,
                    temperature=request.temperature,
                    max_tokens=request.max_tokens,
                )
                break
            except Exception as exc:
                last_exc = exc
                if _is_retryable(exc) and attempt < _RETRY_MAX:
                    delay = _RETRY_BASE_DELAY * (2 ** attempt)
                    logger.warning(
                        "OpenAI transient error (attempt %d/%d), retrying in %.0fs: %s",
                        attempt + 1, _RETRY_MAX, delay, exc,
                    )
                    await asyncio.sleep(delay)
                else:
                    break

        if stream is None:
            yield f"data: {json.dumps({'error': str(last_exc)})}\n\n"
            return

        try:
            async for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    yield f"data: {json.dumps({'token': delta.content})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
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
