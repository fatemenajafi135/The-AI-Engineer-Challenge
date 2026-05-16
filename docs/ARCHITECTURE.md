# Architecture & System Design

A walkthrough of how the Mental Coach is wired together, with a bias toward the AI plumbing and backend decisions. Frontend is covered where it interacts with the model layer; pure UI choices live in [FEATURES.md](./FEATURES.md).

---

## High-Level Topology

```
 ┌────────────────────┐        ┌──────────────────────┐        ┌──────────────┐
 │  Next.js (App      │  SSE   │  FastAPI (serverless │  HTTPS │   OpenAI     │
 │  Router, React 18) │ ─────► │  on Vercel / uvicorn │ ─────► │   API        │
 │                    │ ◄────  │  locally)            │ ◄────  │              │
 └────────────────────┘        └──────────────────────┘        └──────────────┘
       browser                       /api/* routes
   localStorage = state         no DB, no session store
```

A few intentional non-decisions:

- **No database.** Conversation state lives in `localStorage`. The backend is stateless — every request carries its own history, key, and config. This makes the serverless deploy trivial and makes the app safe to throw away.
- **No auth layer.** Users bring their own API key (or the deployment owner supplies one via env var). There's nothing to log in to.
- **No session store.** Tied to the above — the backend never needs to know who a user is.

These are real trade-offs. They're appropriate for a coaching demo where continuity matters *within* a session but cross-session memory is explicitly out of scope.

---

## Backend Layout

The entry point reads like a table of contents (deliberate, per [CLAUDE.md](../CLAUDE.md) refactor rules):

```
api/
├── index.py     # FastAPI app, CORS, router wiring — no business logic
├── config.py    # Constants: prompts, pricing, injection patterns, defaults
├── models.py    # Pydantic request models
├── history.py   # Sliding-window history + LLM summarization
├── tools.py     # OpenAI tool definitions + tool-priority addendum
├── chat.py      # Validation, retry, cost, prompt assembly, /api/chat routes
├── crisis.py    # Static crisis-line lookup by country
└── support.py   # /api/support/search — therapist search via web_search_preview
```

Split by **responsibility**, not by type. `chat.py` owns the chat surface end-to-end; `tools.py` owns tool definitions; `history.py` owns one specific algorithm. Adding a new tool changes one file; adding a new model changes one constant.

---

## The Chat Pipeline

The streaming endpoint at [api/chat.py:185](../api/chat.py#L185) is the heart of the system. Here's what happens per request:

```
 user message
      │
      ▼
 ┌────────────────────────────┐
 │ 1. Validate                │  length + injection regex (16+ patterns)
 └────────────────────────────┘
      │
      ▼
 ┌────────────────────────────┐
 │ 2. Resolve API key         │  request-level beats env var
 └────────────────────────────┘
      │
      ▼
 ┌────────────────────────────┐
 │ 3. Build history           │  if > 16 msgs: summarize older, keep window
 └────────────────────────────┘
      │
      ▼
 ┌────────────────────────────┐
 │ 4. Assemble system prompt  │  base + coach persona + tools addendum
 └────────────────────────────┘
      │
      ▼
 ┌────────────────────────────┐
 │ 5. Phase 1 — call w/ tools │  tool_choice="auto", stream tokens/tool calls
 └────────────────────────────┘
      │
      ├──► no tool called: stream tokens directly to client, done.
      │
      └──► tool called:
                │
                ▼
       ┌────────────────────────────┐
       │ 6. Emit tool_call SSE      │  frontend renders the widget
       └────────────────────────────┘
                │
                ▼
       ┌────────────────────────────┐
       │ 7. Phase 2 — text follow-up│  inject tool result, stream the framing text
       └────────────────────────────┘
```

### Two-Phase Streaming

The two-phase design (Phase 1 with tools, Phase 2 for the framing text) is intentional. OpenAI's streaming API can return either content tokens **or** tool calls per turn — not both interleaved in a usable way. So:

- **Phase 1** opens a stream with `tools=ALL_TOOLS, tool_choice="auto"`. If the model decides to call a tool, the chunked argument fragments are accumulated by index ([chat.py:228-249](../api/chat.py#L228-L249)) and emitted as a single `tool_call` SSE event when complete. If the model just talks, content tokens stream straight through.
- **Phase 2** only runs if a tool was called. We rebuild the message list with the tool call + a synthetic `{"acknowledged": true}` tool result, then stream the text reply that frames the rendered widget for the user.

This keeps the UX live (tokens stream as they arrive) while still supporting tool calls cleanly.

### SSE Event Schema

The stream emits four event types over `text/event-stream`:

```
{"tool_call": {"name": "breathing_exercise", "args": {...}}}
{"token": "Let's "}
{"done": true, "usage": {"prompt_tokens": 1234, "completion_tokens": 56, "cost": 0.00012}}
{"error": "..."}
```

The frontend [page.tsx](../frontend/app/page.tsx) parses these and either appends to the active message (`token`), mounts a widget component (`tool_call`), or closes out the message and updates the cost panel (`done`).

---

## History & Summarization

`history.py` implements a **sliding window with LLM summarization** ([history.py:16](../api/history.py#L16)):

- If `len(history) ≤ HISTORY_WINDOW` (16): send everything as-is
- Otherwise: take the older slice, summarize it via a cheap `gpt-4o-mini` call with a fixed system prompt, and prepend the result as `[Earlier in this session]: ...`

The summarizer always uses `gpt-4o-mini` regardless of the user's chosen chat model — summaries are cheap by design. If the summarization call fails, we fall back gracefully to the bare recent window (the conversation degrades, doesn't break).

Why not just token-counting? See the design discussion in the v0.2.0 section of the [README](../README.md) — for an app with a 400-char message cap and a 128k-context model, token math is solving a problem we don't have. Summarization preserves *meaning* over long sessions, which is what a coaching app actually needs.

---

## Tool Calling — The Mental Model

Four tools, each with strict trigger semantics ([api/tools.py](../api/tools.py)):

| Priority | Tool | Triggers when |
|----------|------|---------------|
| 1 | `breathing_exercise` | Acute physiological distress *right now* |
| 2 | `prep_for_situation` | Specific upcoming event + preparation intent |
| 3 | `reframe_thought` | Clear cognitive distortion, no specific event |
| 4 | `find_professional_support` | Explicit request for a real therapist |
| — | (no tool) | Venting, mild worry, general chat |

The priority ladder lives in the **system prompt addendum** ([tools.py:233](../api/tools.py#L233)), not in code. The model is told:

> "Call the HIGHEST matching tool, AT MOST ONE per turn."

A **safety override** sits above every tool: self-harm or suicidal ideation bypasses tools entirely and surfaces crisis lines as text. This is enforced via prompt, not regex — the model is more reliable at recognizing nuanced expressions of crisis than a pattern matcher, and a false negative here matters more than for any other case.

Each tool definition's `description` field carries its own trigger rules ("CALL when... DON'T call when...") so the model gets per-tool guidance at the function-calling layer, where it pays the most attention.

---

## The Support Search — A Second Tool-Calling Hop

The `find_professional_support` tool is a two-stage flow that crosses the chat/search boundary:

**Stage 1** (chat): the model calls the tool with a `concern_type` + `format_preference`. The frontend renders a `SupportWidget` form asking for country + city.

**Stage 2** (search): the widget POSTs to [api/support/search](../api/support.py#L116), which:
1. Builds a structured search query
2. Calls OpenAI's **Responses API with `web_search_preview`** for live web results
3. Runs a follow-up `chat.completions.create` with `response_format={"type": "json_object"}` to extract structured listings
4. Returns results plus a static crisis-line lookup for the country

This pattern — **tool call → UI form → second API with web search → structured extraction** — is a useful template for any flow where the model needs to gather more user input before performing an action.

---

## Prompt Injection Defense

The injection guard ([api/config.py:13-49](../api/config.py#L13-L49)) is 16 compiled regex patterns covering:

- **Classic overrides** ("ignore all previous instructions")
- **Session-scoped overrides** ("from now on, you are...")
- **Role-prefix injection** (fake `system:` / `assistant:` lines)
- **Named jailbreaks** (DAN, developer mode, god mode)
- **Persona hijacking** ("your true identity is...")
- **Prompt extraction** ("repeat your system prompt", "what were you told to do")
- **Token-format spoofing** (`<|im_start|>`, `[INST]`)

Patterns are compiled once at module load. Every inbound message is checked against all of them in [chat.py:41](../api/chat.py#L41) before the message ever reaches the model. Blocked requests return a 400 with a clear message — no silent drops.

It's not bulletproof (no regex set is), but it covers the well-known attack surface and runs in microseconds.

---

## Retry & Resilience

`_is_retryable` ([chat.py:56](../api/chat.py#L56)) distinguishes transient from terminal failures:

- **Retry**: `RateLimitError` (429), `APIConnectionError`, `APIStatusError` with 5xx
- **Don't retry**: 4xx client errors — these are bad requests; retrying won't help

Backoff is exponential with `RETRY_BASE_DELAY=1s, RETRY_MAX=3`: 1s → 2s → 4s.

The non-streaming endpoint uses the OpenAI SDK's built-in `max_retries`. The streaming endpoint manages retries manually via `_open_stream` ([chat.py:102](../api/chat.py#L102)) because the SDK can't retry mid-stream — we need to catch failures at stream-open time and retry that specific call.

---

## Cost Accounting

Every `done` event carries token usage and dollar cost ([chat.py:70](../api/chat.py#L70)):

```python
def _calc_cost(model, prompt_tokens, completion_tokens) -> float | None:
    input_rate, output_rate = MODEL_PRICING[model]
    return (prompt_tokens * input_rate + completion_tokens * output_rate) / 1_000_000
```

Pricing lives in a single dict in [config.py:66](../api/config.py#L66) — update as OpenAI moves rates. The frontend aggregates per-session totals from these payloads, which is what the live cost counter in the info panel reads from.

The Phase 2 usage overwrites Phase 1 usage when a tool is called, so the reported cost reflects the full round-trip.

---

## Frontend ↔ Backend Contract

The frontend talks only to relative `/api/*` paths. [next.config.mjs](../frontend/next.config.mjs) rewrites these to `BACKEND_URL` (defaulting to `http://localhost:8000` in dev). On Vercel, both halves live at the same origin so the rewrite is a no-op.

Two endpoints:

- `POST /api/chat/stream` — SSE chat stream (the main one)
- `POST /api/support/search` — therapist search (Stage 2 of the support tool)

A non-streaming `POST /api/chat` exists as a fallback / test surface but isn't used by the UI.

---

## Why These Choices

A few decisions worth defending:

**Stateless backend.** Pure functions are easier to deploy serverlessly, easier to reason about, and impossible to corrupt by accident. The cost is that the client carries history per request — fine for a chat app where messages are small text.

**System prompt does the heavy lifting for tool selection.** I could've written a Python router that inspects the user message and forces a tool. I didn't, because the model is genuinely better at the nuance ("is this acute panic or just venting?") than any classifier I'd write in an afternoon. The priority ladder lives in the prompt so it's editable in one place.

**SSE over WebSockets.** SSE is one-way, simple, and works through every CDN and proxy without ceremony. We don't need bidirectional streaming — the user sends one message, the model streams one reply.

**Separate files for tool definitions vs. chat logic.** Tools will keep growing (web search, calendar, notes are obvious next additions). Keeping them in their own module means `chat.py` stays focused on the streaming state machine.
