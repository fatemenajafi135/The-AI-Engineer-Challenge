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
            "HIGHEST PRIORITY TOOL. Call this when the user is in acute physiological distress RIGHT NOW: "
            "panic, racing heart, shortness of breath, 'I can't calm down', shaking. "
            "Call this even if they also mention an upcoming event — calm first, prep later. "
            "Do NOT call for: venting, mild worry, general stress, or future events without acute distress. "
            "NEVER write breathing instructions as text — always call this tool instead."
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
            "Call when the user clearly expresses a cognitive distortion "
            "(overgeneralization, catastrophizing, mind-reading, all-or-nothing, fortune-telling, personalization, filtering). "
            "Do NOT call when: user is acutely panicked (breathing_exercise first), "
            "user is preparing for a specific upcoming event (prep_for_situation instead), "
            "distortion is mild or ambiguous, or user is already self-aware about the thought. "
            "NEVER write a reframe card as formatted text — always call this tool instead."
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


# ── Tool: prep_for_situation ──────────────────────────────────────────────────

PREP_FOR_SITUATION: dict = {
    "type": "function",
    "function": {
        "name": "prep_for_situation",
        "description": (
            "Generate a structured prep card for a specific, time-bounded upcoming event the user wants to prepare for. "
            "Second priority after breathing_exercise. Beats reframe_thought when both could apply. "
            "Call when: user names a concrete event (interview, presentation, hard conversation, exam, etc.) "
            "AND shows preparation intent ('I need to prepare', 'help me get ready', 'what should I do before'). "
            "Do NOT call when: user is in acute panic (use breathing_exercise first), "
            "event is vague or far in the future with no urgency, "
            "or user just wants to vent about the event without preparing. "
            "scripts field: populate ONLY when situation_type is hard_conversation — omit for all others. "
            "NEVER write a prep card as formatted text or markdown — always call this tool instead."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "situation_type": {
                    "type": "string",
                    "enum": [
                        "interview", "presentation", "hard_conversation",
                        "medical", "exam", "first_date", "performance_review", "other",
                    ],
                },
                "event_description": {
                    "type": "string",
                    "description": "Brief description of the specific event in the user's words.",
                },
                "worries": {
                    "type": "array",
                    "items": {"type": "string"},
                    "minItems": 2,
                    "maxItems": 5,
                    "description": "Specific worries the user expressed or that are typical for this situation type.",
                },
                "reframes": {
                    "type": "array",
                    "items": {"type": "string"},
                    "minItems": 2,
                    "maxItems": 5,
                    "description": "One grounded reframe per worry, in the same order. Not dismissive.",
                },
                "anchors": {
                    "type": "array",
                    "items": {"type": "string"},
                    "minItems": 3,
                    "maxItems": 4,
                    "description": "Concrete grounding steps for before the event: breathing resets, physical grounding, mental reminders. Always provide 3-4.",
                },
                "scripts": {
                    "type": "array",
                    "description": "Conversation scripts — ONLY for hard_conversation. Omit for all other types.",
                    "items": {
                        "type": "object",
                        "properties": {
                            "tone": {"type": "string", "enum": ["direct", "gentle", "written"]},
                            "text": {"type": "string"},
                        },
                        "required": ["tone", "text"],
                    },
                },
            },
            "required": ["situation_type", "event_description", "worries", "reframes", "anchors"],
        },
    },
}

ALL_TOOLS: list[dict] = [BREATHING_EXERCISE, REFRAME_THOUGHT, PREP_FOR_SITUATION]

# ── System prompt addendum — appended when tools are active ───────────────────

TOOLS_SYSTEM_ADDENDUM = (
    "\n\nTool-calling rules — read carefully before every reply:\n\n"
    "CRITICAL OVERRIDE: Your base instructions say to provide step-by-step guidance as text. "
    "That rule applies ONLY when no tool is relevant. When a tool applies, you MUST call the tool — "
    "do NOT write its content (prep card sections, reframe panels, breathing steps) as markdown or formatted text. "
    "Writing a prep card, reframe, or breathing exercise as text instead of calling the tool is wrong. "
    "Your text reply should only briefly introduce or follow up on the tool — never replicate it.\n\n"
    "- Call AT MOST ONE tool per response. Never call two tools in one turn.\n"
    "- Use this priority ladder when multiple tools could apply:\n\n"
    "  1. breathing_exercise — user is in acute physiological distress RIGHT NOW "
    "(panic, racing heart, shaking, 'I can\\'t breathe'). "
    "Use even if they also mention an upcoming event. Calm first.\n"
    "  2. prep_for_situation — user names a SPECIFIC upcoming event AND wants to prepare. "
    "Use even if they also express a cognitive distortion — address the distortion in your text reply instead.\n"
    "  3. reframe_thought — user expresses a CLEAR cognitive distortion with no specific upcoming event.\n"
    "  4. Text only — venting, mild worry, self-aware thoughts, vague future events, casual conversation.\n\n"
    "When in doubt, use text. A missed tool is better than a false positive.\n"
    "When you call a tool, write your text reply naturally — never say 'I am launching a widget'."
)
