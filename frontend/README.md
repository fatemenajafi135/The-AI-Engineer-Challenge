# 🧠 Mental Coach — Frontend

A sleek, dark-themed chat UI built with **Next.js**, powered by a FastAPI backend that connects to OpenAI. Your personal AI mental coach is just a message away! 💬

## 🚀 Running Locally

### Prerequisites

- Node.js 20+
- The backend running at `http://localhost:8000` (see [api/README.md](../api/README.md))

### Steps

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

> Make sure the backend is running before you start chatting — otherwise you'll get connection errors!

## 🏗️ Project Structure

```
frontend/
├── app/
│   ├── layout.tsx     # Root layout and metadata
│   ├── page.tsx       # Main chat interface
│   └── globals.css    # Global styles and theme
├── next.config.mjs    # Proxies /api/* to the backend
├── tsconfig.json      # TypeScript config
└── package.json       # Dependencies
```

## 🔌 How It Connects to the Backend

In development, Next.js proxies all `/api/*` requests to `http://localhost:8000` via `next.config.mjs` — so the frontend just calls `/api/chat` without needing to hardcode the backend URL.

## 📦 Building for Production

```bash
npm run build
npm start
```
