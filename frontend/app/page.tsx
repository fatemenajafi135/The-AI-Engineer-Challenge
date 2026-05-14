"use client";

import { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "assistant"; content: string };
type Phase = "landing" | "chat";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [userName, setUserName] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [mounted, setMounted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Restore session from localStorage on mount (localStorage is client-only)
  useEffect(() => {
    const savedName = localStorage.getItem("mc_userName");
    const savedMessages = localStorage.getItem("mc_messages");
    if (savedName) {
      setUserName(savedName);
      if (savedMessages) {
        try {
          setMessages(JSON.parse(savedMessages));
          setPhase("chat");
        } catch {
          // corrupted data — start fresh
        }
      }
    }
    setMounted(true);
  }, []);

  // Persist messages whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("mc_messages", JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function startChat() {
    const name = userName.trim();
    if (!name) return;
    localStorage.setItem("mc_userName", name);
    const greeting: Message = {
      role: "assistant",
      content: `Hi ${name}! I'm your mental wellness coach — here to support you with stress, motivation, habits, and confidence. What's on your mind today?`,
    };
    setMessages([greeting]);
    setPhase("chat");
  }

  function clearSession() {
    localStorage.removeItem("mc_userName");
    localStorage.removeItem("mc_messages");
    setUserName("");
    setMessages([]);
    setPhase("landing");
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || streaming) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) throw new Error("Server error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.replace(/^data: /, "").trim();
          if (!trimmed) continue;

          let parsed: { token?: string; done?: boolean; error?: string };
          try { parsed = JSON.parse(trimmed); }
          catch { continue; }

          if (parsed.error) throw new Error(parsed.error);
          if (parsed.done) { streamDone = true; break; }
          if (parsed.token) {
            const token = parsed.token;
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              next[next.length - 1] = { ...last, content: last.content + token };
              return next;
            });
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last.role === "assistant" && !last.content) {
          next[next.length - 1] = { role: "assistant", content: "Sorry, something went wrong. Please try again." };
        } else {
          next.push({ role: "assistant", content: "Sorry, something went wrong. Please try again." });
        }
        return next;
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  // Hold render until localStorage has been checked — avoids a landing flash on refresh
  if (!mounted) return null;

  // ── Landing screen ──────────────────────────────────────────────────────────
  if (phase === "landing") {
    return (
      <div style={styles.landingContainer}>

        {/* Top 50% — hero */}
        <div style={styles.hero}>
          <span style={styles.heroEmoji}>🌿</span>
          <h1 style={styles.heroTitle}>Mental Coach</h1>
          <p style={styles.heroSubtitle}>
            Your supportive AI companion for stress, motivation &amp; wellbeing
          </p>
        </div>

        {/* Bottom 50% — form */}
        <div style={styles.formSection}>
          <div style={styles.formCard}>
            <label style={styles.formLabel} htmlFor="name-input">
              What&apos;s your name?
            </label>
            <input
              id="name-input"
              style={styles.formInput}
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startChat()}
              placeholder="Enter your name…"
              autoFocus
            />
            <button
              style={{
                ...styles.startButton,
                ...(!userName.trim() ? styles.startButtonDisabled : {}),
              }}
              onClick={startChat}
              disabled={!userName.trim()}
            >
              Start your session →
            </button>
          </div>
        </div>

      </div>
    );
  }

  // ── Chat screen ─────────────────────────────────────────────────────────────
  return (
    <div style={styles.chatContainer}>
      <header style={styles.header}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.headerTitle}>🌿 Mental Coach</h1>
            <p style={styles.headerSubtitle}>Session with {userName}</p>
          </div>
          <button style={styles.newSessionButton} onClick={clearSession}>
            New session
          </button>
        </div>
      </header>

      <div style={styles.messageList}>
        {messages.map((msg, i) => {
          const isStreamingBubble =
            streaming && msg.role === "assistant" && i === messages.length - 1;

          return (
            <div
              key={i}
              style={{
                ...styles.messageBubble,
                ...(msg.role === "user" ? styles.userBubble : styles.assistantBubble),
              }}
            >
              {isStreamingBubble && msg.content === "" ? (
                <span style={styles.typingDots}>
                  <span>●</span><span>●</span><span>●</span>
                </span>
              ) : (
                <>
                  {msg.content}
                  {isStreamingBubble && (
                    <span style={styles.cursor} aria-hidden="true">▍</span>
                  )}
                </>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={styles.inputArea}>
        <textarea
          style={styles.textarea}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Share what's on your mind… (Enter to send, Shift+Enter for new line)"
          rows={1}
          disabled={streaming}
        />
        <button
          style={{
            ...styles.sendButton,
            ...(streaming || !input.trim() ? styles.sendButtonDisabled : {}),
          }}
          onClick={sendMessage}
          disabled={streaming || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  // Landing
  landingContainer: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    width: "100%",
  },
  hero: {
    height: "50vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "0 24px",
    textAlign: "center",
    background: "#1A101E",
  },
  heroEmoji: {
    fontSize: "52px",
    lineHeight: "1",
  },
  heroTitle: {
    fontSize: "42px",
    fontWeight: 800,
    color: "#FFFFFF",
    letterSpacing: "-0.5px",
  },
  heroSubtitle: {
    fontSize: "16px",
    color: "#6B7280",
    maxWidth: "360px",
    lineHeight: "1.5",
  },
  formSection: {
    height: "50vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 24px",
    borderTop: "1px solid #483550",
    background: "#26152D",
  },
  formCard: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    width: "100%",
    maxWidth: "400px",
  },
  formLabel: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#FFFFFF",
  },
  formInput: {
    padding: "14px 16px",
    borderRadius: "12px",
    border: "1px solid #483550",
    background: "#26152D",
    color: "#FFFFFF",
    fontSize: "16px",
    outline: "none",
    transition: "border-color 200ms ease",
  },
  startButton: {
    padding: "14px",
    borderRadius: "12px",
    border: "none",
    background: "#9472B6",
    color: "#FFFFFF",
    fontSize: "16px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 200ms ease",
    boxShadow: "0 4px 24px rgba(167, 139, 250, 0.2)",
  },
  startButtonDisabled: {
    background: "#483550",
    color: "#6B7280",
    cursor: "not-allowed",
    boxShadow: "none",
  },

  // Chat
  chatContainer: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    maxWidth: "760px",
    margin: "0 auto",
    width: "100%",
  },
  header: {
    padding: "20px 24px 16px",
    borderBottom: "1px solid #483550",
    background: "#1A101E",
    borderRadius: "0 0 12px 12px",
    boxShadow: "0 4px 24px rgba(167, 139, 250, 0.1)",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  newSessionButton: {
    padding: "7px 14px",
    borderRadius: "8px",
    border: "1px solid #483550",
    background: "transparent",
    color: "#6B7280",
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 200ms ease",
  },
  headerTitle: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: "13px",
    color: "#6B7280",
    marginTop: "2px",
  },
  messageList: {
    flex: 1,
    overflowY: "auto",
    padding: "24px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  messageBubble: {
    padding: "12px 16px",
    borderRadius: "18px",
    maxWidth: "75%",
    lineHeight: "1.6",
    fontSize: "15px",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    transition: "all 200ms ease",
  },
  userBubble: {
    background: "#9472B6",
    color: "#FFFFFF",
    alignSelf: "flex-end",
    borderBottomRightRadius: "4px",
    boxShadow: "0 4px 24px rgba(167, 139, 250, 0.1)",
  },
  assistantBubble: {
    background: "#483550",
    color: "#FFFFFF",
    alignSelf: "flex-start",
    borderBottomLeftRadius: "4px",
    boxShadow: "0 4px 24px rgba(167, 139, 250, 0.1)",
  },
  typingDots: {
    display: "inline-flex",
    gap: "4px",
    alignItems: "center",
    fontSize: "20px",
    color: "#6B7280",
  },
  cursor: {
    display: "inline-block",
    marginLeft: "1px",
    color: "#9472B6",
    animation: "blink 1s step-end infinite",
  },
  inputArea: {
    display: "flex",
    gap: "10px",
    padding: "16px",
    borderTop: "1px solid #483550",
    background: "#1A101E",
    alignItems: "flex-end",
    borderRadius: "12px 12px 0 0",
    boxShadow: "0 4px 24px rgba(167, 139, 250, 0.1)",
  },
  textarea: {
    flex: 1,
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #483550",
    fontSize: "15px",
    resize: "none",
    outline: "none",
    fontFamily: "inherit",
    color: "#FFFFFF",
    background: "#26152D",
    lineHeight: "1.5",
    minHeight: "48px",
    maxHeight: "140px",
    overflowY: "auto",
    transition: "border-color 200ms ease",
  },
  sendButton: {
    padding: "12px 22px",
    borderRadius: "12px",
    border: "none",
    background: "#9472B6",
    color: "#FFFFFF",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "background 200ms ease",
  },
  sendButtonDisabled: {
    background: "#483550",
    color: "#6B7280",
    cursor: "not-allowed",
  },
};
