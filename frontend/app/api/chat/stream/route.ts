import { NextRequest } from "next/server";

// Never cache or statically generate this route
export const dynamic = "force-dynamic";

/**
 * Proxies the SSE stream from the FastAPI backend to the browser.
 * Using a Route Handler instead of next.config.mjs rewrites because
 * Next.js rewrite proxies buffer the response body, killing the typewriter effect.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";

  let upstream: Response;
  try {
    upstream = await fetch(`${backendUrl}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // Disable Next.js fetch caching so we always hit the backend live
      cache: "no-store",
    });
  } catch {
    return new Response(JSON.stringify({ error: "Could not reach backend" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!upstream.ok) {
    // Forward the backend's error body so the frontend receives the real detail message
    const errBody = await upstream.text();
    return new Response(errBody, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!upstream.body) {
    return new Response(JSON.stringify({ error: "Backend error" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Pipe the ReadableStream directly — no buffering
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
