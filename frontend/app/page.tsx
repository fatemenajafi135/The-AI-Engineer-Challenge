"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const STORAGE_KEY = "mental-coach-history";

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content:
    "Hi! I'm your supportive mental coach. I'm here to help with stress, motivation, habits, and confidence. What's on your mind today?",
};

function loadHistory(): Message[] {
  if (typeof window === "undefined") return [INITIAL_MESSAGE];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [INITIAL_MESSAGE];
  } catch {
    return [INITIAL_MESSAGE];
  }
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(loadHistory);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Persist to localStorage only after streaming completes
  useEffect(() => {
    if (!streaming) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages, streaming]);

  function clearChat() {
    setMessages([INITIAL_MESSAGE]);
    localStorage.removeItem(STORAGE_KEY);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || streaming) return;

    // Snapshot current messages as history before updating state
    const history = messages;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setStreaming(true);

    // Append an empty assistant bubble that we'll fill token-by-token
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
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

        // SSE lines are separated by double newlines: "data: {...}\n\n"
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.replace(/^data: /, "").trim();
          if (!trimmed) continue;

          let parsed: { token?: string; done?: boolean; error?: string };
          try {
            parsed = JSON.parse(trimmed);
          } catch {
            continue;
          }

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
        if (next[next.length - 1].role === "assistant" && !next[next.length - 1].content) {
          next[next.length - 1] = {
            role: "assistant",
            content: "Sorry, something went wrong. Please try again.",
          };
        } else {
          next.push({
            role: "assistant",
            content: "Sorry, something went wrong. Please try again.",
          });
        }
        return next;
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>🌿 Mental Coach</h1>
          <p style={styles.headerSubtitle}>Your supportive AI companion</p>
        </div>
        <button style={styles.clearButton} onClick={clearChat} disabled={streaming}>
          Clear chat
        </button>
      </header>

      <div style={styles.messageList}>
        {messages.map((msg, i) => {
          const isStreamingBubble =
            streaming &&
            msg.role === "assistant" &&
            i === messages.length - 1;

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

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    maxWidth: "760px",
    margin: "0 auto",
    width: "100%",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px 16px",
    borderBottom: "1px solid #483550",
    background: "#1A101E",
    borderRadius: "0 0 12px 12px",
    boxShadow: "0 4px 24px rgba(167, 139, 250, 0.1)",
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
  clearButton: {
    padding: "8px 16px",
    borderRadius: "10px",
    border: "1px solid #483550",
    background: "transparent",
    color: "#6B7280",
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 200ms ease",
    whiteSpace: "nowrap",
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
