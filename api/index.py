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

# CORS so the frontend can talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
async_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """You are a professional mental wellness coach — warm, empathetic, and non-judgmental \
— with expertise in mindfulness, stress management, and positive psychology.

Always lead with empathy before advice. Acknowledge feelings, validate emotions without reinforcing \
catastrophic thinking, use plain language, and ask one focused follow-up question when helpful. \
Help users reframe unhelpful thoughts, build coping strategies, set goals, and develop resilience.

Responses must be concise and scannable: short paragraphs or bullet points, never walls of text. \
For stress or anxiety topics, give 3-5 actionable points maximum. For exercises (breathing, \
grounding, journaling), provide clear step-by-step instructions.

You are a coach, not a licensed therapist — do not diagnose or recommend medications. \
If a user expresses thoughts of self-harm or suicide, respond with compassion and immediately \
direct them to a crisis line (e.g. 988 Suicide & Crisis Lifeline) or emergency services."""

MAX_TOKENS = 1024
MODEL = "gpt-4o-mini"

class ChatRequest(BaseModel):
    message: str

@app.get("/")
def root():
    return {"status": "ok"}

@app.post("/api/chat")
def chat(request: ChatRequest):
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": request.message}
            ],
            max_tokens=MAX_TOKENS,
        )
        return {"reply": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calling OpenAI API: {str(e)}")

@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Streams the assistant reply as Server-Sent Events (SSE).
    Each event: data: {"token": "..."}\n\n
    Final event: data: {"done": true}\n\n
    """
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")

    async def token_generator():
        try:
            stream = await async_client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": request.message}
                ],
                stream=True,
                max_tokens=MAX_TOKENS,
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
