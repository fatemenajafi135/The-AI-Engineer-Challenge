/*
 * Frontend configuration — single source of truth for all frontend constants.
 * Constants previously scattered across page.tsx are centralized here so they
 * are easy to update, test, and share across future components.
 * Backend constants live separately in /api/index.py.
 */

// ── Color palette ─────────────────────────────────────────────────────────────
// Named by role, not by hue — swap hex values here to retheme the entire app.

export const COLORS = {
  // Backgrounds
  bgPrimary:      "#26152D",  // main page background
  bgSurface:      "#1A101E",  // header, cards, input bar

  // Accents
  accent:         "#9472B6",  // user bubbles, send button, links, active pills
  accentDim:      "#483550",  // assistant bubbles, hover state, borders

  // Text
  textPrimary:    "#FFFFFF",
  textSecondary:  "#6B7280",  // muted labels, hints
  textMuted:      "#9B9B9B",  // blockquote text
  textAccentSoft: "#D1C4E9",  // em / italic in markdown

  // Shadows & overlays (used inside boxShadow / background compound values)
  shadowAccent:   "rgba(167, 139, 250, 0.1)",  // subtle indigo glow
  shadowAccentMd: "rgba(167, 139, 250, 0.2)",  // stronger glow (start button)
  shadowDark:     "rgba(0,0,0,0.35)",           // code block background
  shadowMedium:   "rgba(0,0,0,0.4)",            // scroll-to-bottom button
  shadowHeavy:    "rgba(0,0,0,0.6)",            // panel overlays

  // Warning
  warningText:    "#F59E0B",  // amber message text
  warningBorder:  "#C97316",  // amber border
} as const;

// ── API endpoints ─────────────────────────────────────────────────────────────

export const CHAT_STREAM_ENDPOINT = "/api/chat/stream";

// ── Typography ────────────────────────────────────────────────────────────────

export const MONO_FONT = "'JetBrains Mono', monospace";

// ── App metadata ──────────────────────────────────────────────────────────────

export const APP_TITLE       = "Mental Coach";
export const APP_DESCRIPTION = "Your supportive AI mental coach";

// ── Defaults ─────────────────────────────────────────────────────────────────
// kept in sync with api/config.py

export const DEFAULT_MODEL         = "gpt-4o-mini";
export const DEFAULT_TEMPERATURE   = 0.7;
export const DEFAULT_MAX_TOKENS    = 1024;
export const DEFAULT_MESSAGE_LIMIT = 20;
export const DEFAULT_COACH         = "challenger";

// ── localStorage keys ─────────────────────────────────────────────────────────

export const LS_KEYS = {
  userName:     "mc_userName",
  coach:        "mc_coach",
  messages:     "mc_messages",
  tone:         "mc_tone",     // legacy — no longer written; cleared for old sessions
  persona:      "mc_persona",  // legacy — no longer written; cleared for old sessions
  apiKey:       "mc_apiKey",
  model:        "mc_model",
  temperature:  "mc_temperature",
  maxTokens:    "mc_maxTokens",
  messageLimit: "mc_messageLimit",
  sessionStart: "mc_sessionStart",
} as const;

// ── Coach definitions ─────────────────────────────────────────────────────────

export const COACH_OPTIONS = [
  { value: "fixer",       name: "The Fixer",       tagline: "Cuts through the noise, finds the block, hands you the next step." },
  { value: "hype",        name: "The Hype Man",    tagline: "Your most embarrassingly loyal fan — makes progress feel electric." },
  { value: "anchor",      name: "The Anchor",      tagline: "Calm when you're not, steady when everything feels like chaos." },
  { value: "challenger",  name: "The Challenger",  tagline: "Won't let you off the hook — friendly but ruthless about excuses." },
  { value: "wingman",     name: "The Wingman",     tagline: "Casual and warm, like a smart friend who actually listens." },
  { value: "philosopher", name: "The Philosopher", tagline: "Zooms out when you're too deep in your own head." },
];

// ── Model options ─────────────────────────────────────────────────────────────

export const MODEL_OPTIONS = [
  { value: "gpt-4o-mini",  label: "gpt-4o-mini — ultra fast & affordable" },
  { value: "gpt-4.1-mini", label: "gpt-4.1-mini — efficient & reliable" },
  { value: "gpt-4.1",      label: "gpt-4.1 — strong general-purpose model" },
  { value: "gpt-4.1-nano", label: "gpt-4.1-nano — cheapest low-latency model" },
  { value: "o3",           label: "o3 — advanced reasoning & emotional nuance" },
  { value: "o4-mini",      label: "o4-mini — lightweight reasoning model" },
  { value: "gpt-5.4-mini", label: "gpt-5.4-mini — very fast & capable" },
  { value: "gpt-5.4",      label: "gpt-5.4 — strong general intelligence" },
  { value: "gpt-5.5",      label: "gpt-5.5 — most advanced thinking model" },
];
