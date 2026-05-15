# ── Refactor note (2026-05-15) ────────────────────────────────────────────────
# Split by responsibility per CLAUDE.md rules. This file is the entry point only.
#   config.py  — all constants and system prompts
#   models.py  — Pydantic request models
#   history.py — sliding-window history builder
#   tools.py   — OpenAI tool definitions and TOOLS_SYSTEM_ADDENDUM
#   chat.py    — validation, retry, cost, prompt assembly, chat routes
#   crisis.py  — static crisis resource map by country
#   support.py — professional support search route (/api/support/search)
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .chat import router as chat_router
from .support import router as support_router

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(support_router)
