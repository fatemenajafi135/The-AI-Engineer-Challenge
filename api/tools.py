"""
OpenAI tool definitions for the Mental Coach.
Kept separate from config.py so constants stay clean and tools can grow independently.
Imported by chat.py — nowhere else.
"""

# ── Tool: breathing_exercise ──────────────────────────────────────────────────

BREATHING_EXERCISE: dict = {
    "type": "function",
    "function": {
        "name": "breathing_exercise",
        "description": (
            "Render an interactive breathing widget for the user. "
            "Call this when: the user is in acute stress or panic, mentions racing heart / shortness of breath / 'can't calm down', "
            "explicitly asks for a calming technique, or describes acute stress about an imminent event. "
            "Do NOT call this when: the user is venting and wants to be heard, processing thoughts, "
            "or expressing mild worry — respond with text in those cases."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "technique": {
                    "type": "string",
                    "enum": ["box", "physiological_sigh", "4-7-8"],
                    "description": (
                        "box = general stress and focus (4-4-4-4 pattern). "
                        "physiological_sigh = acute panic, quickest reset (two inhales + long exhale). "
                        "4-7-8 = winding down, sleep, deep calm."
                    ),
                },
                "cycles": {
                    "type": "integer",
                    "minimum": 2,
                    "maximum": 8,
                    "description": "Number of full breath cycles. Default 4. Use 2-3 for acute panic, 4-6 for general stress, 6-8 for deep relaxation.",
                },
                "reason": {
                    "type": "string",
                    "description": "One concise sentence explaining why this specific technique fits the user's situation right now.",
                },
            },
            "required": ["technique", "cycles", "reason"],
        },
    },
}


# ── Tool: reframe_thought ─────────────────────────────────────────────────────

REFRAME_THOUGHT: dict = {
    "type": "function",
    "function": {
        "name": "reframe_thought",
        "description": (
            "Detect a cognitive distortion in the user's statement and offer a structured reframe with evidence. "
            "Only call when the distortion is clearly present — false positives feel patronizing. "
            "Use the user's own words for original_thought. "
            "Do NOT call when: user is acutely panicked (use breathing_exercise first), "
            "user is already self-aware ('I know it's irrational but…'), "
            "or the distortion is mild or ambiguous."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "original_thought": {
                    "type": "string",
                    "description": "Direct quote or close paraphrase of the user's distorted thought.",
                },
                "distortion_type": {
                    "type": "string",
                    "enum": [
                        "catastrophizing", "overgeneralization", "all_or_nothing",
                        "mind_reading", "fortune_telling", "personalization", "filtering",
                    ],
                },
                "reframe": {
                    "type": "string",
                    "description": "A grounded alternative perspective — not toxic positivity.",
                },
                "evidence_against": {
                    "type": "array",
                    "items": {"type": "string"},
                    "minItems": 2,
                    "maxItems": 4,
                    "description": "Concrete evidence from the conversation or reasoning that contradicts the distortion.",
                },
            },
            "required": ["original_thought", "distortion_type", "reframe", "evidence_against"],
        },
    },
}

ALL_TOOLS: list[dict] = [BREATHING_EXERCISE, REFRAME_THOUGHT]

# ── System prompt addendum — appended when tools are active ───────────────────

TOOLS_SYSTEM_ADDENDUM = (
    "\n\nYou have access to two interactive tools:\n"
    "1. breathing_exercise — use when the user needs immediate nervous-system regulation "
    "(acute panic, racing heart, explicit calm-down request). "
    "Do NOT use for venting or mild worry.\n"
    "2. reframe_thought — use when the user clearly expresses a cognitive distortion "
    "(overgeneralization, catastrophizing, mind-reading, all-or-nothing, etc.). "
    "Do NOT use when the distortion is mild or ambiguous, or when the user is already self-aware about it.\n"
    "When you call any tool, do not explain that you are launching a widget — "
    "write your reply naturally as if you are engaging with the content directly."
)
