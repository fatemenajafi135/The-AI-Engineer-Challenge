# Features

What the Mental Coach actually does — with the AI layer up front, because that's where the interesting decisions are.

---

## The AI Layer

### Tools — Four Structured Actions

Instead of a chatbot that only talks, the coach can *do* things. Four OpenAI function-calling tools, each tied to a specific kind of moment a user might be in. The full definitions live in [api/tools.py](../api/tools.py); here's what each one is for and how it relates to the coaching surface.

#### 1. `breathing_exercise` — Priority 1

**What it does:** Renders an animated guided breathing widget with one of three techniques: `box` (4-4-4-4), `physiological_sigh` (the quickest panic reset), or `4-7-8` (deep wind-down).

**When the coach calls it:** Acute physiological distress *right now* — panic, racing heart, "I can't breathe," "I can't calm down." The coach reaches for this *before* anything else, even if the user also has an event coming up. Calm the nervous system first; everything else after.

**Examples that might trigger it:**
> *"My heart is racing and I can't slow down my thoughts."*
> *"I think I'm having a panic attack right now."*
> *"I can't breathe, everything feels like too much."*

(Might — not will. The model still reads context. "My heart was racing yesterday" is past-tense and won't trigger the widget.)

**Why it's a tool and not just text:** Telling someone in a panic attack to "try the 4-7-8 method" is useless — they need a *pacer*. A widget with a moving circle and a real timer is a genuinely different experience from a text instruction. This is one of the clearest examples of where function calling earns its place.

#### 2. `prep_for_situation` — Priority 2

**What it does:** Renders a structured prep card for a specific upcoming event. Tailored worries, paired with grounded reframes (not toxic positivity), plus 3-4 concrete pre-event anchors. For `hard_conversation` specifically, it also generates scripts in direct, gentle, and written-message tones.

**When the coach calls it:** User names a *specific* event (interview, presentation, hard conversation, medical visit, exam) **and** shows preparation intent ("help me get ready," "I need to prepare").

**Examples that might trigger it:**
> *"I have a job interview on Thursday — can you help me get ready?"*
> *"I need to tell my manager I'm leaving. How do I bring it up?"*
> *"I have a presentation Monday. Can you help me prepare?"*

Venting about an event without preparation intent ("I have an interview Thursday and I'm so stressed") goes to plain conversation, not this tool.

**Why it's a tool:** A prep card is structured by nature — worry → reframe pairs, ordered anchors, optional scripts. Cramming all of that into a wall of markdown loses the structure. The widget makes each section glanceable and skippable.

#### 3. `reframe_thought` — Priority 3

**What it does:** A CBT-style reframe card: the original thought, the named cognitive distortion (catastrophizing, all-or-nothing, mind-reading, etc.), a grounded reframe, and 2-4 pieces of evidence against the distortion.

**When the coach calls it:** User expresses a clear cognitive distortion with no specific event tied to it. The model intentionally avoids this when distortions are mild, ambiguous, or when the user is already self-aware about the thought — a missed card is better than a patronizing one.

**Examples that might trigger it:**
> *"I always mess everything up. I can't do anything right."*
> *"Nobody actually likes me, they're just being polite."*
> *"One person didn't like my idea, so the whole project is obviously a disaster."*

A user saying "I know I'm catastrophizing but I can't shake it" probably *won't* trigger the card — they've already named it; the coach should engage with the feeling, not re-explain the concept.

**Why it's a tool:** Naming the distortion is therapeutic in itself ("oh, that's catastrophizing"). The structured card makes that naming visible and memorable in a way that prose can't.

#### 4. `find_professional_support` — Priority 4

**What it does:** A two-stage flow. Stage 1: the coach renders a location form (country + city). Stage 2: the widget POSTs to a dedicated backend route that uses OpenAI's `web_search_preview` to find real therapists, extracts them into structured listings, and returns them alongside a hardcoded crisis-line resource for the user's country.

**When the coach calls it:** User *explicitly* asks for a real therapist — "I need someone qualified," "coaching isn't enough," "I want to talk to a real person." Not when they vent generally about wanting help.

**Examples that might trigger it:**
> *"I think I need a real therapist, not just an AI."*
> *"Can you help me find someone qualified near me?"*
> *"This is helpful but I need to talk to a professional about my anxiety."*

A casual "ugh, I should probably see a therapist someday" won't trigger it — the request needs to be present-tense and explicit.

**Why it's a tool:** A wellness coach has to know when to bow out and hand the user off. This tool is the door between "AI coaching" and "actual professional care." It's also the one place where we genuinely need a live web search — therapist availability changes constantly and can't come from training data.

### The Priority Ladder

When multiple tools could apply, the coach picks the highest-priority one and calls **at most one** per turn. The order:

```
1. breathing_exercise         (acute panic — beats everything)
2. prep_for_situation         (specific upcoming event + prep intent)
3. reframe_thought            (cognitive distortion, no event)
4. find_professional_support  (explicit therapist request)
5. (no tool, text only)       (venting, mild worry, general chat)
```

Above all of these is the **safety override**: any signal of self-harm or suicidal ideation bypasses every tool. The coach responds with compassion and surfaces crisis lines as text — 988, Samaritans, findahelpline.com — no widget, no delay, no exceptions.

### Coach Personas — Six Distinct Voices

Six system prompts that genuinely shape *how* the model responds, not just the greeting:

| Coach | Personality |
|-------|-------------|
| **The Challenger** | Calls out excuses warmly. Pushes for a specific commitment before closing. |
| **The Fixer** | Validates fast, then pivots to the concrete next action. Skips the philosophy. |
| **The Anchor** | Calm when you're not. Normalizes difficulty, slows the pace. |
| **The Hype Man** | Your loudest fan. Makes progress feel earned, not hollow. |
| **The Philosopher** | Zooms out. "Is this even the right problem to be solving?" |
| **The Wingman** | Like a smart friend. No jargon, just honest conversation. |

Each persona is prepended to the base mental-coach prompt and the tools addendum. Try the Challenger and the Anchor back-to-back with the same message — the difference is night and day.

### Conversation Memory

A **sliding window with LLM summarization**. The last 16 messages stay verbatim. Anything older gets compressed into a single summary by a cheap `gpt-4o-mini` call before being prepended to the context as `[Earlier in this session]: ...`.

This means a long coaching session doesn't lose its early context. Twenty messages in, the coach still knows you said you have an interview Thursday and you've been struggling with sleep — even though those exact messages are no longer in the prompt.

If the summarization call fails, the session degrades gracefully to the recent window only — the conversation continues, just with shorter memory.

### Prompt Injection Defense

Sixteen compiled regex patterns covering the well-known attack surface: classic overrides ("ignore all previous instructions"), role-prefix injection, named jailbreaks (DAN, developer mode), persona hijacking, prompt extraction attempts, and token-format spoofing (`<|im_start|>`, `[INST]`).

Every inbound message gets checked before it reaches the model. Blocked requests return a clear 400 — no silent drops.

### Advanced Options & API Key

On the welcome screen, an **Advanced Options** panel lets users override the defaults *before* a session starts — without touching the deployment:

- **OpenAI API Key** — password-style input, stored only in `localStorage`
- **Model** — 9 OpenAI models in the dropdown, from `gpt-4o-mini` to `gpt-5`
- **Temperature** — 0.0 to 1.5
- **Max tokens** — response length cap
- **Message limit** — how many messages before the summarizer kicks in

The coach persona is selected on the same welcome screen but lives outside the Advanced panel — it's a first-class choice, not an "advanced" one.

**API key verification.** When the user pastes a key and tabs out of the field, the frontend POSTs to a dedicated [`/api/validate-key`](../api/validate.py) route. That endpoint calls OpenAI's `GET /v1/models` — the cheapest, zero-token sanity check that proves the key is accepted. The UI then shows one of:

- **Verifying…** (while the call is in flight)
- **Valid** — green-tinted border, the rest of the advanced options become editable
- **Invalid** — amber border with the specific reason ("Invalid API key", "Could not reach OpenAI", etc.)

This is a small UX touch with an outsized benefit: users learn their key is broken *immediately* on paste, not 30 seconds later when their first message fails with a cryptic backend error.

**Show/hide toggle.** The key input has a Show/Hide button so users can confirm they pasted the right thing without giving up the password-masking by default.

**Resolution order at request time.** The backend checks the request-level `api_key` first; if empty, it falls back to the server's `OPENAI_API_KEY` env var. Either path works, and the user can switch mid-session without restarting anything.

### Token Accounting

Every chat response carries usage data — prompt tokens, completion tokens, and a dollar cost computed from a per-model pricing dict in [api/config.py](../api/config.py). The frontend aggregates these into a live session total in the info panel. Covers GPT-4o, GPT-4.1, o3/o4-mini, and GPT-5 families.

### Retry with Backoff

Transient OpenAI failures (429, 5xx, connection errors) retry with exponential backoff — 1s → 2s → 4s, up to 3 attempts. Client errors (400-level) don't retry because they won't succeed on retry. The streaming endpoint manages this manually since the SDK can't retry mid-stream.

---

## UI Features

The frontend is Next.js 15 + React 18, deliberately framework-light (no UI library, no state management lib — just React state and `localStorage`). Highlights:

### Chat Experience

- **Live token streaming** with a typewriter cursor while the model is generating
- **Markdown rendering** for assistant messages — lists, bold, code blocks, headers, blockquotes
- **Timestamps** on every message
- **Auto-resize input** that grows as you type
- **Jump-to-bottom button** when you scroll up mid-session
- **Tool-call widgets** — the four tools each render as their own React component ([BreathingWidget.tsx](../frontend/app/BreathingWidget.tsx), [PrepWidget.tsx](../frontend/app/PrepWidget.tsx), [ReframeWidget.tsx](../frontend/app/ReframeWidget.tsx), [SupportWidget.tsx](../frontend/app/SupportWidget.tsx)) inline with the conversation

### Session Persistence

Everything survives a page reload via `localStorage`:
- Messages
- User name
- Coach selection
- API key (in a password-style input)
- Model, temperature, max tokens, message limit
- Color palette
- Session start time

Hit "New Session" to reset cleanly.

### Theming

Four color palettes, swappable from the UI:
- **Indigo Night** (default — deep purple, the signature look)
- **Deep Ocean** (cool blue)
- **Forest** (muted green)
- **Ember** (warm orange)

Each palette drives five CSS custom properties, so the entire app retheme is one click. Defined in [frontend/config.ts](../frontend/config.ts).

### Info Panel

A collapsible side panel showing:
- Current model + coach + session start
- Live token total + cost for the session
- Per-message token breakdown on hover

### Export

Sessions can be exported as JSON, Markdown, or HTML — useful for sharing a conversation or just keeping a record. All formats include the total session cost.

### Advanced Options

A gear-icon panel for everything that doesn't belong in the main chat surface — model picker, temperature slider, max tokens, message limit, API key, palette. Hidden by default; the chat works fine with all defaults.

### Error Handling

When something goes wrong, the UI surfaces an actual error message — not a silent failure, not a generic "something went wrong." If the backend retries are exhausted, the user sees that. If their key is invalid, they see that. Trust the user with the truth.

---

## What's Intentionally Not Here

Worth naming, because the absence is a choice:

- **No cross-session memory.** "New Session" starts fresh by design. Cross-session memory would need a database, an auth layer, and a privacy policy — out of scope for a coaching demo.
- **No rate limiting.** Each user brings their own key (or the deployment owner accepts the bill). Rate limiting would add a dependency for no demo-time benefit.
- **No user accounts.** See above. Nothing to log in to means nothing to lose if you close the tab.
- **No analytics or telemetry.** The backend logs to stdout for debugging; nothing leaves the box.

These would all be reasonable additions for a production deployment. They'd also be three weeks of work that wouldn't show up in the user experience.
