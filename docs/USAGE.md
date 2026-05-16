# Usage Guide

Everything you need to get the Mental Coach running — on your laptop or on Vercel — plus the two ways to plug an OpenAI key into the app.

---

## Prerequisites

- **Python** ≥ 3.12 (< 3.13) — pinned in [pyproject.toml](../pyproject.toml)
- **Node.js** ≥ 18 (recommended: 20+)
- An **OpenAI API key** — [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

---

## Running Locally

The app has two halves that talk to each other:

| Half | Stack | Port |
|------|-------|------|
| **Backend** | FastAPI + Uvicorn | `8000` |
| **Frontend** | Next.js 15 (App Router) | `3000` |

The frontend proxies `/api/*` requests to the backend via [next.config.mjs](../frontend/next.config.mjs) — so you only ever talk to `localhost:3000` in your browser.

### 1. Backend

```bash
# from project root — recommended: uv (fast, lockfile-aware)
uv sync
uv run uvicorn api.index:app --reload --port 8000
```

Don't have `uv`? Install it from [astral.sh/uv](https://docs.astral.sh/uv/), or use the plain pip alternative:

```bash
pip install -r requirements.txt
uvicorn api.index:app --reload --port 8000
```

Confirm it's alive: `curl http://localhost:8000/` should return `{"status":"ok"}`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see the Mental Coach landing screen.

> **Hot reload** is on for both halves — edit a Python file, the backend restarts; edit a `.tsx` file, the browser updates.

---

## Deploying to Vercel

Vercel handles both halves with one config: [vercel.json](../vercel.json) routes every request to the Python entry point, and the `frontend/` Next.js app is detected automatically.

1. **Push the repo to GitHub.**
2. **Import the project on Vercel** → it auto-detects Next.js.
3. Set the **Root Directory** to `frontend/` in project settings.
4. Add environment variables (see below).
5. Click Deploy.

That's it. Vercel builds the Next.js frontend, deploys the FastAPI backend as a serverless function, and wires them together.

---

## API Key — Two Ways to Provide One

The backend resolves the OpenAI key in this order (see [api/chat.py:92](../api/chat.py#L92)):

1. **Per-request key** sent from the UI (highest priority)
2. **`OPENAI_API_KEY` environment variable** on the server

You can use either, or both.

### Option A — Environment Variable (server-side)

Good for: your own deployments, demos where users shouldn't need a key.

**Locally:**
```bash
# .env file in project root
OPENAI_API_KEY=sk-...
```

The backend loads this on startup via `python-dotenv`.

**On Vercel:**
- Project Settings → Environment Variables → add `OPENAI_API_KEY`
- Redeploy to pick it up

### Option B — User-Supplied Key (browser-side)

Good for: public deployments where each user pays for their own usage.

In the UI:
1. Open the **Advanced Options** panel (gear icon in the header)
2. Paste your key into the **OpenAI API Key** field — it's a password-style input
3. The key is stored in **localStorage** under `mc_apiKey` and sent with every chat request

> **Security note:** the key never touches the server's filesystem or logs. It lives in your browser and rides along on each request. If you're not the only person using the deployment, Option B is the right choice.

If both are set, the user-supplied key wins.

---

## Configuration Knobs (UI)

Two places to tweak things, depending on what you're changing:

**On the welcome screen → Advanced Options** (set before the session starts):
- **Model** — pick from 9 OpenAI models (gpt-4o-mini through gpt-5)
- **Temperature** — 0.0 to 1.5
- **Max tokens** — response length cap
- **Message limit** — how many messages before the sliding-window summarizer kicks in
- **OpenAI API Key** — your personal key, stored only in `localStorage`

**During the chat → Settings (gear icon in the header):**
- **Color palette** — four themes (Indigo Night, Deep Ocean, Forest, Ember)

Defaults live in [frontend/config.ts](../frontend/config.ts) and [api/config.py](../api/config.py) — they're kept in sync by comment, not by import (intentional, see [CLAUDE.md](../CLAUDE.md) refactoring rules).

---

## Quick Sanity Checks

```bash
# backend health
curl http://localhost:8000/

# backend chat (non-streaming)
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "hi", "api_key": "sk-..."}'
```

If both return 200s, you're good. If the chat call returns a 400, double-check your API key; if it returns a 500, check the backend logs for the underlying OpenAI error.
