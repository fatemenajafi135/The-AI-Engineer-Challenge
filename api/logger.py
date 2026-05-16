"""
Structured turn logging — one JSON line per chat turn written to the standard logger.
Each entry captures the full context of a conversation turn: message content, tool calls,
token usage, and cost. API keys are never logged.

Output flows through Python's standard logging (stdout in dev / Vercel log drain in prod),
making entries easy to grep, pipe to jq, or ingest into any log aggregator.
"""

import json
import logging
from datetime import datetime, timezone

_logger = logging.getLogger("mentor.turns")


def log_support_search(
    *,
    country: str,
    city: str,
    concern_type: str,
    format_preference: str,
    language_preference: str,
    query: str,
    results: list[dict],
    crisis: dict | None,
) -> None:
    """Emit a structured log entry for a professional support search."""
    entry = {
        "event":               "support_search",
        "ts":                  datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
        "country":             country,
        "city":                city,
        "concern_type":        concern_type,
        "format_preference":   format_preference,
        "language_preference": language_preference or "(none)",
        "query":               query,
        "result_count":        len(results),
        "results":             results,   # full list: name, type, format, description, url
        "crisis_resource":     crisis,
    }
    _logger.info(json.dumps(entry, ensure_ascii=False))


def log_turn(
    *,
    model: str,
    coach: str,
    user_name: str,
    history_len: int,
    user_message: str,
    assistant_reply: str,
    tool_calls: list[dict],
    usage: dict | None,
) -> None:
    """Emit a single structured log entry for one user→assistant exchange."""
    entry = {
        "event":           "chat_turn",
        "ts":              datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
        "model":           model,
        "coach":           coach,
        "user_name":       user_name.strip() or "(anonymous)",
        "history_len":     history_len,
        "user_message":    user_message,
        "assistant_reply": assistant_reply,
        "tool_calls":      tool_calls,  # list of {"name": str, "args": dict}
        "usage":           usage,       # {"prompt_tokens", "completion_tokens", "total_tokens", "cost_usd"} or None
    }
    _logger.info(json.dumps(entry, ensure_ascii=False))
