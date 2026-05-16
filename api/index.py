# ── Refactor note (2026-05-15) ────────────────────────────────────────────────
# Split by responsibility per CLAUDE.md rules. This file is the entry point only.
#   config.py   — all constants and system prompts
#   models.py   — Pydantic request models
#   history.py  — sliding-window history builder
#   tools.py    — OpenAI tool definitions and TOOLS_SYSTEM_ADDENDUM
#   chat.py     — validation, retry, cost, prompt assembly, chat routes
#   crisis.py   — static crisis resource map by country
#   support.py  — professional support search route (/api/support/search)
#   validate.py — API key validation route (/api/validate-key)
# ─────────────────────────────────────────────────────────────────────────────

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .chat import router as chat_router
from .support import router as support_router
from .validate import router as validate_router

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info("Mental Coach API starting up")
    yield
    logger.info("Mental Coach API shutting down")


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(support_router)
app.include_router(validate_router)
