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
            "PRIORITY 1 (highest, except self-harm — see safety override in system prompt). "
            "Renders a guided breathing widget for an acute calming reset. "
            "CALL when: user is in acute physiological distress RIGHT NOW "
            "(panic, racing heart, shaking, \"I can't breathe\", \"I can't calm down\"). "
            "Use even if they also mention an upcoming event — calm first, prep later. "
            "DON'T call when: venting, mild worry, general stress, or future events without acute distress in this moment. "
            "Tool content rule: never write breathing steps or counts as text — call the tool."
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
            "PRIORITY 3. "
            "Renders a CBT-style reframe card with the original thought, the distortion type, a grounded reframe, and evidence against it. "
            "CALL when: user clearly expresses a SINGLE cognitive distortion "
            "(catastrophizing, overgeneralization, all-or-nothing, mind-reading, fortune-telling, personalization, filtering) "
            "with no specific upcoming event tied to it. "
            "DON'T call when: user is acutely panicked (breathing_exercise wins), "
            "user is preparing for a specific upcoming event (prep_for_situation wins), "
            "distortion is mild or ambiguous, or user is already self-aware about the thought. "
            "Tool content rule: never write reframe cards or evidence-against lists as text — call the tool."
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
            "PRIORITY 2. Beats reframe_thought when both could apply. "
            "Renders a structured prep card for a specific, time-bounded upcoming event the user wants to prepare for. "
            "CALL when: user names a SPECIFIC upcoming event "
            "(interview, presentation, hard conversation, exam, medical, etc.) "
            "AND shows preparation intent ('help me get ready', 'I need to prepare', 'what should I do before'). "
            "DON'T call when: user is in acute panic (breathing_exercise wins), "
            "event is vague or far in the future with no urgency, "
            "or user just wants to vent about the event without preparing. "
            "scripts field: populate ONLY when situation_type is hard_conversation. Omit for all other types. "
            "Tool content rule: never write prep card sections, worry/reframe pairs, or anchor lists as text — call the tool."
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
            "PRIORITY 4. "
            "Renders a location form (Stage 1); the widget then performs the search itself (Stage 2). "
            "CALL when: user EXPLICITLY asks to find a real therapist, counselor, psychologist, or mental health professional "
            "('I need a therapist', 'coaching isn't enough', 'I want to talk to a real person', "
            "'can you find me someone qualified', 'I need real help beyond coaching'). "
            "DON'T call when: venting about wanting help in general, user already has a therapist, "
            "casual mention of therapy without an explicit request, "
            "acute panic (breathing_exercise wins), "
            "or any self-harm / suicidal signal (safety override in system prompt — no tool, surface crisis line in text). "
            "Tool content rule: never write therapist names, listings, or clinic recommendations as text — call the tool."
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


ALL_TOOLS: list[dict] = [
    BREATHING_EXERCISE,         # priority 1
    PREP_FOR_SITUATION,         # priority 2
    REFRAME_THOUGHT,            # priority 3
    FIND_PROFESSIONAL_SUPPORT,  # priority 4
]

# ── System prompt addendum — appended when tools are active ───────────────────
# Owns three things only:
#   1. the self-harm safety override (which beats every tool),
#   2. the priority ladder summary,
#   3. the text-length rule when a tool is called.
# Per-tool triggers and exclusions live in each tool's `description` field above.

TOOLS_SYSTEM_ADDENDUM = """

═══════════════════════════════════════════
TOOL CALLING — read before every reply.
═══════════════════════════════════════════

1. SAFETY OVERRIDE (highest of all):
   If the user expresses self-harm or suicidal ideation, call NO tool.
   Respond with compassion and immediately surface a crisis line in text:
     • 988 Suicide & Crisis Lifeline (US)
     • Samaritans 116 123 (UK)
     • International directory: https://findahelpline.com

2. PRIORITY LADDER — call the HIGHEST matching tool, AT MOST ONE per turn:
     #1  breathing_exercise         — acute distress RIGHT NOW
     #2  prep_for_situation         — specific upcoming event + prep intent
     #3  reframe_thought            — clear cognitive distortion, no event
     #4  find_professional_support  — EXPLICIT request for a real therapist
     #5  (no tool — text only)      — venting, mild worry, vague topics, chat

3. WHEN YOU CALL A TOOL:
   • Your text reply MUST be 1-2 short sentences — a warm intro or follow-up.
   • NEVER write the tool's content as text (no breathing steps, no prep
     sections, no reframes, no listings). The widget renders the content;
     your text just frames it humanly.
   • Don't announce the widget ('I'm launching a card') — speak naturally.

4. WHEN YOU DON'T CALL A TOOL:
   Reply normally per the coach's style. A missed tool is better than a
   false positive — when in doubt, use text.
"""
