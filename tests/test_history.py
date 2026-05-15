"""
Tests for api/history.py — sliding-window conversation history builder.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from api.history import build_history
from api.models import HistoryMessage
from api.config import HISTORY_WINDOW


def make_msgs(n: int) -> list[HistoryMessage]:
    """Alternating user/assistant messages for a given count."""
    return [
        HistoryMessage(
            role="user" if i % 2 == 0 else "assistant",
            content=f"Message {i}",
        )
        for i in range(n)
    ]


def _patch_openai(summary_text: str = "Summary.", raise_exc: Exception | None = None):
    """Context manager helper: patches AsyncOpenAI in api.history."""
    mock_cls = MagicMock()
    mock_client = AsyncMock()
    mock_cls.return_value = mock_client

    if raise_exc:
        mock_client.chat.completions.create = AsyncMock(side_effect=raise_exc)
    else:
        mock_resp = MagicMock()
        mock_resp.choices[0].message.content = summary_text
        mock_client.chat.completions.create = AsyncMock(return_value=mock_resp)

    return patch("api.history.AsyncOpenAI", mock_cls), mock_client


class TestBuildHistoryShortPath:
    async def test_empty_history(self):
        result = await build_history([], "key")
        assert result == []

    async def test_single_message(self):
        msgs = make_msgs(1)
        result = await build_history(msgs, "key")
        assert len(result) == 1
        assert result[0] == {"role": "user", "content": "Message 0"}

    async def test_history_at_exact_window_size(self):
        msgs = make_msgs(HISTORY_WINDOW)
        result = await build_history(msgs, "key")
        assert len(result) == HISTORY_WINDOW

    async def test_short_history_preserves_all_messages(self):
        msgs = make_msgs(5)
        result = await build_history(msgs, "key")
        for i, msg in enumerate(result):
            assert msg["content"] == f"Message {i}"

    async def test_short_history_preserves_roles(self):
        msgs = make_msgs(4)
        result = await build_history(msgs, "key")
        assert result[0]["role"] == "user"
        assert result[1]["role"] == "assistant"


class TestBuildHistoryLongPath:
    async def test_long_history_calls_openai(self):
        msgs = make_msgs(HISTORY_WINDOW + 4)
        patcher, mock_client = _patch_openai("The user discussed stress.")
        with patcher:
            await build_history(msgs, "key")
        mock_client.chat.completions.create.assert_called_once()

    async def test_long_history_returns_summary_plus_recent(self):
        msgs = make_msgs(HISTORY_WINDOW + 4)
        patcher, _ = _patch_openai("Earlier the user was anxious.")
        with patcher:
            result = await build_history(msgs, "key")
        assert len(result) == HISTORY_WINDOW + 1  # 1 summary + window

    async def test_long_history_summary_is_system_role(self):
        msgs = make_msgs(HISTORY_WINDOW + 4)
        patcher, _ = _patch_openai("Some summary.")
        with patcher:
            result = await build_history(msgs, "key")
        assert result[0]["role"] == "system"

    async def test_long_history_summary_contains_earlier_marker(self):
        msgs = make_msgs(HISTORY_WINDOW + 4)
        patcher, _ = _patch_openai("The user felt overwhelmed.")
        with patcher:
            result = await build_history(msgs, "key")
        assert "[Earlier in this session]" in result[0]["content"]

    async def test_long_history_summary_embeds_llm_text(self):
        msgs = make_msgs(HISTORY_WINDOW + 4)
        patcher, _ = _patch_openai("The user felt overwhelmed by work.")
        with patcher:
            result = await build_history(msgs, "key")
        assert "The user felt overwhelmed by work." in result[0]["content"]

    async def test_long_history_recent_window_is_tail_of_messages(self):
        msgs = make_msgs(HISTORY_WINDOW + 4)
        patcher, _ = _patch_openai("Summary.")
        with patcher:
            result = await build_history(msgs, "key")
        # The last result message should be the last original message
        last_original = f"Message {HISTORY_WINDOW + 3}"
        assert result[-1]["content"] == last_original

    async def test_long_history_openai_failure_falls_back_to_recent(self):
        msgs = make_msgs(HISTORY_WINDOW + 4)
        patcher, _ = _patch_openai(raise_exc=Exception("OpenAI down"))
        with patcher:
            result = await build_history(msgs, "key")
        # Fallback: return just the recent window, no summary
        assert len(result) == HISTORY_WINDOW

    async def test_fallback_first_message_is_not_summary(self):
        msgs = make_msgs(HISTORY_WINDOW + 4)
        patcher, _ = _patch_openai(raise_exc=RuntimeError("timeout"))
        with patcher:
            result = await build_history(msgs, "key")
        # First message should be a real user/assistant turn, not a system summary
        assert result[0]["role"] in ("user", "assistant")

    async def test_fallback_preserves_most_recent_message(self):
        msgs = make_msgs(HISTORY_WINDOW + 4)
        patcher, _ = _patch_openai(raise_exc=Exception("fail"))
        with patcher:
            result = await build_history(msgs, "key")
        last_original = f"Message {HISTORY_WINDOW + 3}"
        assert result[-1]["content"] == last_original
