"""
Sliding-window conversation history builder.
Keeps the most recent messages verbatim and summarizes older ones via LLM
so the model always has full session context without ballooning the prompt.
"""

import logging
from openai import AsyncOpenAI

from .config import HISTORY_WINDOW, SUMMARY_SYSTEM
from .models import HistoryMessage

logger = logging.getLogger(__name__)


async def build_history(raw: list[HistoryMessage], api_key: str) -> list[dict]:
    """
    Returns the message list to pass to OpenAI:
    - If len(raw) <= HISTORY_WINDOW: all messages, unchanged.
    - Otherwise: a one-sentence system summary of older messages + the recent window.
    Falls back to the bare recent window if the summarization call fails.
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
    except Exception as exc:
        logger.warning(
            "History summarization failed (%s): %s; falling back to recent window only.",
            type(exc).__name__, exc, exc_info=True,
        )
        return recent
