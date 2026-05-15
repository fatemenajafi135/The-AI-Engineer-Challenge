"""
Backend configuration — single source of truth for all API constants.
Imported by index.py; keeps the route file focused on logic only.
Mirrors the role of frontend/config.ts on the backend side.
"""

import re

# ── Input validation ──────────────────────────────────────────────────────────

MAX_MESSAGE_LENGTH = 500

_INJECTION_PATTERNS = [
    # ── Classic instruction overrides ─────────────────────────────────────────
    r"ignore\s+(all\s+)?(previous|prior|above|your)\s+(instructions?|rules?|constraints?|prompt|context)",
    r"(disregard|forget|override|bypass|circumvent|skip)\s+(all\s+)?(previous|prior|your|the|any)\s+(instructions?|rules?|constraints?|guidelines?|prompt|training)",

    # ── Session-scoped overrides ("from now on…", "new instructions:") ────────
    r"(from\s+now\s+on|starting\s+now|for\s+this\s+(conversation|chat|session)|henceforth)\s*[,.]?\s*(you\s+(are|will|must|should|can)|ignore|forget|disregard|act)",
    r"your\s+(new\s+)?(instructions?|rules?|prompt|persona|role|task|directive)\s*(are|is)\s*:",
    r"new\s+(instructions?|rules?|prompt|task|persona|directive)\s*:",

    # ── Role-prefix injection — fake "system:" / "assistant:" in body ─────────
    r"(^|\n)\s*(system|assistant)\s*:\s+",

    # ── Named jailbreak modes & keywords ──────────────────────────────────────
    r"\b(jailbreak|DAN|developer\s+mode|god\s+mode|unrestricted\s+mode)\b",
    r"you\s+(have\s+no|are\s+without|are\s+free\s+from)\s+(restrictions?|limitations?|constraints?|rules?|guidelines?|filters?)",
    r"you\s+can\s+(now\s+)?(do|say|answer|respond\s+to)\s+anything",
    r"(act|behave|pretend|respond)\s+as\s+if\s+you\s+(have\s+no|are\s+without)\s+(restrictions?|limitations?|constraints?|rules?)",

    # ── Common jailbreak token formats ────────────────────────────────────────
    r"\[\s*inst\s*\]",
    r"<\|im_start\|>",
    r"<\|system\|>",
    r"<\s*(system|prompt|instruction)\s*>",

    # ── Persona / identity hijacking ──────────────────────────────────────────
    r"your\s+(true|real|actual|hidden|secret)\s+(name|identity|self|purpose|nature|role|instructions?)\s+(is|are)",
    r"(pretend|act|roleplay|play)\s+(that\s+you('re|\s+are|\s+were)|as\s+if\s+you('re|\s+are|\s+were)|as)\s+(a\s+)?(different|new|another|unrestricted|uncensored|evil|opposite|real)",

    # ── Prompt / instruction extraction ───────────────────────────────────────
    r"what\s*'?s?\s+(is\s+|are\s+|were\s+|was\s+)?your\s+(system\s+)?(prompt|instructions?|directives?|rules?|guidelines?|configuration|config|setup|training)",
    r"(tell|show|give|share|reveal|repeat|output|print|display|describe|explain|list|write|copy|paste|leak|expose|dump)\s+(me\s+)?(your\s+)?(exact\s+)?(system\s+)?(prompt|instructions?|rules?|guidelines?|directives?|configuration|config)",
    r"what\s+(were|are)\s+you\s+(instructed|told|programmed|trained|configured|designed|built|made)\s+(to\s+)?(do|say|respond|act|behave)",
    r"how\s+(were|are)\s+you\s+(programmed|instructed|configured|set\s+up|trained|built|designed)",
]

COMPILED_INJECTION_PATTERNS = [re.compile(p, re.IGNORECASE) for p in _INJECTION_PATTERNS]

# ── Defaults ──────────────────────────────────────────────────────────────────
# kept in sync with frontend/config.ts

DEFAULT_MODEL      = "gpt-4o-mini"
DEFAULT_MAX_TOKENS = 1024
DEFAULT_COACH      = "challenger"

# ── Retry ─────────────────────────────────────────────────────────────────────

RETRY_MAX        = 3
RETRY_BASE_DELAY = 1.0  # seconds; doubles each attempt: 1 → 2 → 4

# ── Token pricing ─────────────────────────────────────────────────────────────
# (input_per_1m_usd, output_per_1m_usd) — update as OpenAI adjusts pricing

MODEL_PRICING: dict[str, tuple[float, float]] = {
    # GPT-4o family
    "gpt-4o-mini":  (0.15,   0.60),
    "gpt-4o":       (2.50,  10.00),

    # GPT-4.1 family
    "gpt-4.1-nano": (0.10,   0.40),
    "gpt-4.1-mini": (0.40,   1.60),
    "gpt-4.1":      (2.00,   8.00),

    # Reasoning models
    "o4-mini":      (1.10,   4.40),
    "o3":           (10.00, 40.00),

    # GPT-5 family
    "gpt-5-nano":   (0.05,   0.40),
    "gpt-5-mini":   (0.25,   2.00),
    "gpt-5":        (1.25,  10.00),
    "gpt-5-pro":    (15.00, 120.00),
}

# ── Sliding-window history ────────────────────────────────────────────────────

HISTORY_WINDOW = 16  # recent messages kept verbatim (= 8 user/assistant exchanges)

SUMMARY_SYSTEM = (
    "Summarize the conversation below in 3-4 sentences. "
    "Cover: the user's main concern, what was explored, and any insights or commitments reached. "
    "Write in third person ('The user...'). Be concise — this will be used as context to continue the session."
)

# ── System prompts ────────────────────────────────────────────────────────────

BASE_PROMPT = """You are a professional mental wellness coach — warm, empathetic, and non-judgmental \
— with expertise in CBT, mindfulness, stress management, and positive psychology.

Always lead with empathy before advice. Acknowledge feelings, validate emotions without reinforcing \
catastrophic thinking, use plain language, and ask one focused follow-up question when helpful. \
Help users reframe unhelpful thoughts, build coping strategies, set goals, and develop resilience.

Responses must be concise and scannable: short paragraphs or bullet points, never walls of text. \
For stress or anxiety topics, give 3-5 actionable points maximum.

You are a coach, not a licensed therapist — do not diagnose or recommend medications. \
If a user expresses thoughts of self-harm or suicide, respond with compassion and immediately \
direct them to a crisis line (e.g. 988 Suicide & Crisis Lifeline) or emergency services."""

COACH_PROMPTS: dict[str, str] = {
    "challenger": (
        "Character — The Challenger: You call out excuses directly but warmly — you keep it real without being cruel. "
        "When the user avoids something, name it: 'That sounds like an excuse — what's actually stopping you?' "
        "Always push for a specific commitment before closing. Celebrate wins briefly, then ask what's next."
    ),
    "fixer": (
        "Character — The Fixer: You are efficient and solution-oriented. "
        "Validate feelings in one sentence, then pivot to the concrete block. "
        "Cut through spiraling and hand the user their next specific action. "
        "Skip the philosophy; give the plan. 'What's actually stuck?' is your core question."
    ),
    "anchor": (
        "Character — The Anchor: You are calm and steady when everything feels like chaos. "
        "You normalise difficulty without dismissing it, slow the pace, and help the user find their footing. "
        "Quiet resilience shapes every response. Offer perspective before solutions."
    ),
    "hype": (
        "Character — The Hype Man: You are the user's loudest, most embarrassingly loyal fan. "
        "Every step forward is worth celebrating — make it feel real and earned, not hollow. "
        "Your energy is electric but grounded. Make progress feel inevitable."
    ),
    "philosopher": (
        "Character — The Philosopher: You zoom out when the user is too deep in their own head. "
        "Offer perspective through broader frameworks — meaning, values, the bigger picture. "
        "You're not cold or detached; you're curious and thoughtful. "
        "'Is this even the right problem to be solving?' is your kind of question."
    ),
    "wingman": (
        "Character — The Wingman: You are casual, warm, and feel like talking to a smart friend who genuinely gets it. "
        "No jargon, no formality — just real conversation. You listen well, you care, and you give honest advice "
        "the way a trusted friend would. Supportive without being sycophantic."
    ),
}
