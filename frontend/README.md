# 🌿 Mental Coach — Frontend

A sleek, dark-mode chat UI built with **Next.js 15** + **TypeScript**, backed by a FastAPI server that streams real-time responses from OpenAI. Six distinct coach personalities. Markdown rendering. Session memory. Zero distractions.

---

## ✨ Features

| Feature | Details |
|---|---|
| **Welcome screen** | Captures your name, persists it across reloads |
| **6 coach personas** | The Fixer · Hype Man · Anchor · Challenger · Wingman · Philosopher |
| **Real-time streaming** | SSE token-by-token typewriter effect, animated `●●●` thinking indicator |
| **Markdown rendering** | `react-markdown` + `remark-gfm` — headers, lists, code blocks, bold, links |
| **Session persistence** | Name, coach, and full message history survive page refreshes via `localStorage` |
| **Auto-resize textarea** | Input box grows with your text, capped at 140 px, then scrolls |
| **Jump-to-bottom button** | Floats up when you scroll back; auto-hides when you're at the bottom |
| **New session** | One-click reset wipes all local state and returns to the landing screen |
| **Keyboard shortcuts** | `Enter` → send · `Shift+Enter` → new line |

---

## 🗂️ Project Structure

```
frontend/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── stream/
│   │           └── route.ts   # Next.js Route Handler — proxies SSE without buffering
│   ├── layout.tsx             # Root layout, <html> shell, metadata
│   ├── page.tsx               # Entire chat UI (landing + chat phases, all styles)
│   └── globals.css            # Reset, body background, scrollbar, @keyframes blink
├── next.config.mjs            # Rewrites /api/* → backend (used for non-stream routes)
├── tsconfig.json
└── package.json
```

---

## 🚀 Running Locally

### Prerequisites

- **Node.js 20+**
- **Backend running** at `http://localhost:8000` — see [api/README.md](../api/README.md)

### Steps

```bash
# 1. Install dependencies
cd frontend
npm install

# 2. Start the dev server
npm run dev

# 3. Open in browser
open http://localhost:3000
```

> The backend must be running before you start chatting, otherwise you'll get a 502 error.

---

## ⚙️ Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `BACKEND_URL` | `http://localhost:8000` | Where the Next.js server sends requests to the FastAPI backend |

Set it in a `.env.local` file in the `frontend/` directory:

```bash
# frontend/.env.local
BACKEND_URL=http://localhost:8000
```

For Vercel deployments, set `BACKEND_URL` in the project's **Environment Variables** settings page.

---

## 🔌 How the Backend Connection Works

The frontend never calls the backend directly from the browser. All `/api/*` requests go through Next.js:

```
Browser → Next.js Route Handler → FastAPI backend
```

**Why a Route Handler instead of a plain rewrite?**

Next.js `rewrites` in `next.config.mjs` buffer the full response body before forwarding it — which kills the typewriter streaming effect. The custom Route Handler at [app/api/chat/stream/route.ts](app/api/chat/stream/route.ts) pipes the `ReadableStream` directly with zero buffering, preserving the SSE token-by-token delivery.

The `/api/chat` (non-streaming) endpoint still works via the rewrite in `next.config.mjs` as a fallback.

---

## 🏗️ Architecture Overview

```
page.tsx
├── Phase: "landing"
│   ├── Name input  →  saved to localStorage as mc_userName
│   └── Coach selector (6 pills)  →  saved as mc_coach
│
└── Phase: "chat"
    ├── Messages rendered with ReactMarkdown (remark-gfm)
    ├── Streaming via fetch + ReadableStream + SSE parser
    ├── AbortController for in-flight cancellation
    ├── Auto-scroll: only fires if already near the bottom
    ├── Jump-to-bottom button: shown when scrolled >80px from end
    └── Session saved to localStorage on every message update
```

**State kept in `localStorage`**

| Key | Value |
|---|---|
| `mc_userName` | User's display name |
| `mc_coach` | Selected coach ID (e.g. `"challenger"`) |
| `mc_messages` | Full message history as JSON |

---

## 🎨 Design System

The UI follows the project's deep-indigo dark theme:

| Token | Value |
|---|---|
| Background | `#26152D` |
| Card / header / input bar | `#1A101E` |
| User bubble | `#9472B6` |
| Assistant bubble | `#483550` |
| Accent / send button | `#9472B6` |
| Border | `#483550` |
| Text secondary | `#6B7280` |
| Code font | JetBrains Mono (Google Fonts) |

Bubble radius: `18px` · Card radius: `12px` · Transitions: `200ms ease`

---

## 📦 Building for Production

```bash
npm run build   # type-checks + produces .next/
npm start       # serves the production build on :3000
```

For Vercel, just push — it picks up the Next.js project automatically. Make sure `BACKEND_URL` is set in your Vercel environment variables.

---

## 🧰 Key Dependencies

| Package | Version | Why |
|---|---|---|
| `next` | ^15.3.2 | Framework + Route Handlers + rewrites |
| `react` / `react-dom` | ^18 | UI rendering |
| `react-markdown` | ^10.1.0 | Render markdown in chat bubbles |
| `remark-gfm` | ^4.0.1 | Tables, strikethrough, task lists, autolinks |
| `typescript` | ^5 | Type safety |

---

## 🐛 Common Issues

**Blank screen / no messages**  
→ Make sure the backend is running: `curl http://localhost:8000/` should return `{"status":"ok"}`.

**Typewriter effect not working / responses appear all at once**  
→ The Route Handler proxy must be used (not a plain rewrite). Check that `app/api/chat/stream/route.ts` exists and the frontend is calling `/api/chat/stream`.

**`OPENAI_API_KEY` error in the backend**  
→ Set the key in your shell before starting the backend: `export OPENAI_API_KEY=sk-...`

**Old session data showing up unexpectedly**  
→ Click **New session** in the header, or clear `mc_*` keys from `localStorage` in DevTools → Application → Local Storage.
