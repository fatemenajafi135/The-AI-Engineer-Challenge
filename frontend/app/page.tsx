"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your supportive mental coach. I'm here to help with stress, motivation, habits, and confidence. What's on your mind today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) throw new Error("Server error");

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
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
        <h1 style={styles.headerTitle}>🌿 Mental Coach</h1>
        <p style={styles.headerSubtitle}>Your supportive AI companion</p>
      </header>

      <div style={styles.messageList}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              ...styles.messageBubble,
              ...(msg.role === "user"
                ? styles.userBubble
                : styles.assistantBubble),
            }}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div style={{ ...styles.messageBubble, ...styles.assistantBubble, ...styles.typing }}>
            <span>●</span><span>●</span><span>●</span>
          </div>
        )}
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
          disabled={loading}
        />
        <button
          style={{
            ...styles.sendButton,
            ...(loading || !input.trim() ? styles.sendButtonDisabled : {}),
          }}
          onClick={sendMessage}
          disabled={loading || !input.trim()}
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
  typing: {
    display: "flex",
    gap: "4px",
    alignItems: "center",
    fontSize: "20px",
    color: "#6B7280",
    padding: "10px 16px",
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
