from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import OpenAI, AsyncOpenAI
import os
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

# Default clients — used when the request carries no api_key
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
async_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

DEFAULT_MAX_TOKENS = 1024
DEFAULT_MODEL = "gpt-4o-mini"

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


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok"}

@app.post("/api/chat")
def chat(request: ChatRequest):
    key = _resolve_key(request)
    try:
        history = [{"role": m.role, "content": m.content} for m in request.history[-5:]]
        response = OpenAI(api_key=key).chat.completions.create(
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
    key = _resolve_key(request)

    async def token_generator():
        try:
            history = [{"role": m.role, "content": m.content} for m in request.history[-5:]]
            stream = await AsyncOpenAI(api_key=key).chat.completions.create(
                model=request.model,
                messages=[
                    {"role": "system", "content": build_system_prompt(request.coach)},
                    *history,
                    {"role": "user", "content": request.message},
                ],
                stream=True,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
            )
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
