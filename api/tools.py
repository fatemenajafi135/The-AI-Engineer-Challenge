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
            "NEVER write breathing instructions as text — always call this tool instead. "
            "If the user expresses self-harm or suicidal ideation, do NOT call any tool — "
            "surface crisis resources directly in your text reply immediately."
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

# ── Tool: find_professional_support ──────────────────────────────────────────

FIND_PROFESSIONAL_SUPPORT: dict = {
    "type": "function",
    "function": {
        "name": "find_professional_support",
        "description": (
            "FOURTH PRIORITY TOOL. Call ONLY when the user explicitly requests real professional human support — "
            "a therapist, counselor, psychologist, or mental health professional. "
            "Clear triggers: 'I need a therapist', 'coaching isn't enough', 'I want to talk to a real person', "
            "'can you find me a professional', 'I need real help beyond coaching'. "
            "Do NOT call for: venting (even about wanting help), user already has a therapist, "
            "casual mention of therapy without an explicit request to find one, "
            "acute panic (use breathing_exercise first), "
            "self-harm or suicidal ideation (NEVER call any tool — surface crisis resources directly in text immediately). "
            "This tool only renders a location form (Stage 1). The widget handles Stage 2 search directly. "
            "NEVER write resource listings or therapy recommendations as text — always call this tool instead."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "concern_type": {
                    "type": "string",
                    "enum": [
                        "anxiety", "depression", "trauma", "relationships",
                        "grief", "addiction", "general", "other",
                    ],
                    "description": "Primary concern inferred from the conversation. Use 'general' when unclear.",
                },
                "format_preference": {
                    "type": "string",
                    "enum": ["in_person", "online", "either"],
                    "description": "Whether the user has expressed a format preference. Default 'either' if not stated.",
                },
                "language_preference": {
                    "type": "string",
                    "description": (
                        "Two-letter ISO language code if the user expressed a preference (e.g. 'fa', 'en', 'es'). "
                        "Empty string if none mentioned."
                    ),
                },
            },
            "required": ["concern_type", "format_preference", "language_preference"],
        },
    },
}


ALL_TOOLS: list[dict] = [BREATHING_EXERCISE, REFRAME_THOUGHT, PREP_FOR_SITUATION, FIND_PROFESSIONAL_SUPPORT]

# ── System prompt addendum — appended when tools are active ───────────────────

TOOLS_SYSTEM_ADDENDUM = (
    "\n\nTool-calling rules — read carefully before every reply:\n\n"
    "CRITICAL OVERRIDE: Your base instructions say to provide step-by-step guidance as text. "
    "That rule applies ONLY when no tool is relevant. When a tool applies, you MUST call the tool — "
    "do NOT write its content (prep card sections, reframe panels, breathing steps, resource listings) as markdown or formatted text. "
    "Writing a prep card, reframe, breathing exercise, or professional support listing as text instead of calling the tool is wrong. "
    "Your text reply should only briefly introduce or follow up on the tool — never replicate it.\n\n"
    "SAFETY OVERRIDE (highest of all): If the user expresses self-harm or suicidal ideation, "
    "do NOT call any tool. Respond with compassion and immediately surface crisis resources "
    "(e.g. 988 Lifeline in the US, Samaritans 116 123 in the UK) directly in your text reply.\n\n"
    "- Call AT MOST ONE tool per response. Never call two tools in one turn.\n"
    "- Use this priority ladder when multiple tools could apply:\n\n"
    "  1. breathing_exercise — user is in acute physiological distress RIGHT NOW "
    "(panic, racing heart, shaking, 'I can\\'t breathe'). "
    "Use even if they also mention an upcoming event. Calm first.\n"
    "  2. prep_for_situation — user names a SPECIFIC upcoming event AND wants to prepare. "
    "Use even if they also express a cognitive distortion — address the distortion in your text reply instead.\n"
    "  3. reframe_thought — user expresses a CLEAR cognitive distortion with no specific upcoming event.\n"
    "  4. find_professional_support — user EXPLICITLY asks to find a real therapist or professional. "
    "Triggers: 'I need a therapist', 'coaching isn\\'t enough', 'I want to talk to someone qualified'. "
    "Do NOT call for: venting, existing therapist, casual therapy mention, or any crisis/self-harm signal.\n"
    "  5. Text only — venting, mild worry, self-aware thoughts, vague events, casual conversation.\n\n"
    "When in doubt, use text. A missed tool is better than a false positive.\n"
    "When you call a tool, write your text reply naturally — never say 'I am launching a widget'."
)
