# ── Refactor note (2026-05-15) ────────────────────────────────────────────────
# Split by responsibility per CLAUDE.md rules. This file is the entry point only.
#   config.py  — all constants
#   models.py  — Pydantic request models
#   history.py — sliding-window history builder
#   chat.py    — validation, retry, cost, prompt assembly, routes
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .chat import router

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
