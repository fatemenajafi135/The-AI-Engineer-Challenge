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

ALL_TOOLS: list[dict] = [BREATHING_EXERCISE]

# ── System prompt addendum — appended when tools are active ───────────────────

TOOLS_SYSTEM_ADDENDUM = (
    "\n\nYou have access to the breathing_exercise tool. "
    "Use it only when the user needs nervous system regulation in the moment — not for general stress talk. "
    "When you call it, do not explain that you are launching a widget; "
    "write your reply as if you are naturally introducing the exercise ('Let's do this together...')."
)
