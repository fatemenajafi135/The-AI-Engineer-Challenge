"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Usage = { prompt_tokens: number; completion_tokens: number; total_tokens: number; cost: number | null };
type Message = { role: "user" | "assistant"; content: string; timestamp?: number; usage?: Usage };
type Phase = "landing" | "chat";

// Styled markdown components — theme colours hardcoded so this stays outside the component
const md: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  p:          ({ children }) => <p style={{ margin: "0 0 6px 0", lineHeight: "1.6" }}>{children}</p>,
  ul:         ({ children }) => <ul style={{ margin: "4px 0 6px 0", paddingLeft: "20px" }}>{children}</ul>,
  ol:         ({ children }) => <ol style={{ margin: "4px 0 6px 0", paddingLeft: "20px" }}>{children}</ol>,
  li:         ({ children }) => <li style={{ margin: "2px 0", lineHeight: "1.6" }}>{children}</li>,
  strong:     ({ children }) => <strong style={{ color: "#FFFFFF", fontWeight: 700 }}>{children}</strong>,
  em:         ({ children }) => <em style={{ fontStyle: "italic", color: "#D1C4E9" }}>{children}</em>,
  a:          ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" style={{ color: "#9472B6", textDecoration: "underline" }}>{children}</a>,
  blockquote: ({ children }) => <blockquote style={{ borderLeft: "3px solid #9472B6", margin: "6px 0", paddingLeft: "12px", color: "#9B9B9B" }}>{children}</blockquote>,
  code:       ({ className, children }) =>
    className ? (
      <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px" }}>{children}</code>
    ) : (
      <code style={{ background: "rgba(0,0,0,0.35)", padding: "1px 5px", borderRadius: "4px", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.875em" }}>{children}</code>
    ),
  pre: ({ children }) => (
    <pre style={{ background: "rgba(0,0,0,0.35)", padding: "10px 12px", borderRadius: "8px", overflowX: "auto", whiteSpace: "pre-wrap", margin: "4px 0 6px 0", fontFamily: "'JetBrains Mono', monospace", fontSize: "13px" }}>
      {children}
    </pre>
  ),
  h1: ({ children }) => <h1 style={{ fontSize: "18px", fontWeight: 700, margin: "6px 0 4px 0", color: "#FFFFFF" }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "6px 0 4px 0", color: "#FFFFFF" }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{ fontSize: "15px", fontWeight: 600, margin: "6px 0 4px 0", color: "#FFFFFF" }}>{children}</h3>,
};

const COACH_OPTIONS = [
  { value: "fixer",       name: "The Fixer",       tagline: "Cuts through the noise, finds the block, hands you the next step." },
  { value: "hype",        name: "The Hype Man",    tagline: "Your most embarrassingly loyal fan — makes progress feel electric." },
  { value: "anchor",      name: "The Anchor",      tagline: "Calm when you're not, steady when everything feels like chaos." },
  { value: "challenger",  name: "The Challenger",  tagline: "Won't let you off the hook — friendly but ruthless about excuses." },
  { value: "wingman",     name: "The Wingman",     tagline: "Casual and warm, like a smart friend who actually listens." },
  { value: "philosopher", name: "The Philosopher", tagline: "Zooms out when you're too deep in your own head." },
];

const MODEL_OPTIONS = [
  {
    value: "gpt-4o-mini",
    label: "gpt-4o-mini — ultra fast & affordable"
  },
  {
    value: "gpt-4.1-mini",
    label: "gpt-4.1-mini — efficient & reliable"
  },
  {
    value: "gpt-4.1",
    label: "gpt-4.1 — strong general-purpose model"
  },
  {
    value: "gpt-4.1-nano",
    label: "gpt-4.1-nano — cheapest low-latency model"
  },
  {
    value: "o3",
    label: "o3 — advanced reasoning & emotional nuance"
  },
  {
    value: "o4-mini",
    label: "o4-mini — lightweight reasoning model"
  },
  {
    value: "gpt-5.4-mini",
    label: "gpt-5.4-mini — very fast & capable"
  },
  {
    value: "gpt-5.4",
    label: "gpt-5.4 — strong general intelligence"
  },
  {
    value: "gpt-5.5",
    label: "gpt-5.5 — most advanced thinking model"
  }
];


export default function Home() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [userName, setUserName] = useState("");
  const [coach, setCoach] = useState("challenger");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // New: API key + advanced options
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [model, setModel] = useState("gpt-4o-mini");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [messageLimit, setMessageLimit] = useState(20);

  // Warning state: holds the pending message text when limit is reached
  const [limitWarning, setLimitWarning] = useState<string | null>(null);

  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [sessionStart, setSessionStart] = useState<number | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Restore full session from localStorage on mount
  useEffect(() => {
    const savedName        = localStorage.getItem("mc_userName");
    const savedCoach        = localStorage.getItem("mc_coach");
    const savedMessages     = localStorage.getItem("mc_messages");
    const savedApiKey       = localStorage.getItem("mc_apiKey");
    const savedModel        = localStorage.getItem("mc_model");
    const savedTemperature  = localStorage.getItem("mc_temperature");
    const savedMaxTokens    = localStorage.getItem("mc_maxTokens");
    const savedLimit        = localStorage.getItem("mc_messageLimit");
    const savedSessionStart = localStorage.getItem("mc_sessionStart");

    if (savedCoach)        setCoach(savedCoach);
    if (savedApiKey)       setApiKey(savedApiKey);
    if (savedModel)        setModel(savedModel);
    if (savedTemperature)  setTemperature(parseFloat(savedTemperature));
    if (savedMaxTokens)    setMaxTokens(parseInt(savedMaxTokens));
    if (savedLimit)        setMessageLimit(parseInt(savedLimit));
    if (savedSessionStart) setSessionStart(parseInt(savedSessionStart));

    if (savedName) {
      setUserName(savedName);
      if (savedMessages) {
        try {
          setMessages(JSON.parse(savedMessages));
          setPhase("chat");
        } catch {
          // corrupted storage — start fresh
        }
      }
    }
    setMounted(true);
  }, []);

  // Persist message history on every update
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("mc_messages", JSON.stringify(messages));
    }
  }, [messages]);

  // Show jump-to-bottom button when user scrolls up
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const onScroll = () => {
      const distanceFromBottom = list.scrollHeight - list.scrollTop - list.clientHeight;
      setShowScrollBtn(distanceFromBottom > 80);
    };
    list.addEventListener("scroll", onScroll);
    return () => list.removeEventListener("scroll", onScroll);
  }, [phase]);

  // Auto-scroll only when already near the bottom
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const distanceFromBottom = list.scrollHeight - list.scrollTop - list.clientHeight;
    if (distanceFromBottom < 80) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollBtn(false);
  }

  function startChat() {
    const name = userName.trim();
    const key  = apiKey.trim();
    if (!name || !key) return;

    localStorage.setItem("mc_userName",     name);
    localStorage.setItem("mc_coach",        coach);
    localStorage.setItem("mc_apiKey",       key);
    localStorage.setItem("mc_model",        model);
    localStorage.setItem("mc_temperature",  String(temperature));
    localStorage.setItem("mc_maxTokens",    String(maxTokens));
    localStorage.setItem("mc_messageLimit", String(messageLimit));

    const now = Date.now();
    localStorage.setItem("mc_sessionStart", String(now));
    setSessionStart(now);

    setMessages([{
      role: "assistant",
      content: `Hi ${name}! I'm your mental wellness coach — here to support you with stress, motivation, habits, and confidence. What's on your mind today?`,
      timestamp: now,
    }]);
    setPhase("chat");
  }

  function clearSession() {
    [
      "mc_userName", "mc_coach", "mc_messages", "mc_tone", "mc_persona",
      "mc_apiKey", "mc_model", "mc_temperature", "mc_maxTokens", "mc_messageLimit",
      "mc_sessionStart",
    ].forEach((k) => localStorage.removeItem(k));
    setUserName("");
    setCoach("challenger");
    setApiKey("");
    setModel("gpt-4o-mini");
    setTemperature(0.7);
    setMaxTokens(1024);
    setMessageLimit(20);
    setLimitWarning(null);
    setSessionStart(null);
    setShowInfoPanel(false);
    setMessages([]);
    setPhase("landing");
  }

  // Gate: check limit before actually sending
  function sendMessage() {
    const text = input.trim();
    if (!text || streaming) return;

    const used = messages.filter((m) => m.role === "user").length;
    if (used >= messageLimit) {
      setLimitWarning(text);
      setInput("");
      return;
    }
    executeSend(text);
  }

  // Called directly when user confirms past the limit
  function confirmContinue() {
    if (!limitWarning) return;
    const text = limitWarning;
    setLimitWarning(null);
    executeSend(text);
  }

  function cancelSend() {
    setInput(limitWarning ?? "");
    setLimitWarning(null);
  }

  async function executeSend(text: string) {
    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    const now = Date.now();
    setMessages((prev) => [...prev, { role: "user", content: text, timestamp: now }]);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.overflowY = "hidden";
    }
    setStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "", timestamp: Date.now() }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          coach,
          history,
          api_key:     apiKey,
          model,
          temperature,
          max_tokens:  maxTokens,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Server error");
      }
      if (!res.body) throw new Error("Server error");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";
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

          let parsed: { token?: string; done?: boolean; error?: string; usage?: Usage };
          try { parsed = JSON.parse(trimmed); }
          catch { continue; }

          if (parsed.error) throw new Error(parsed.error);
          if (parsed.done) {
            if (parsed.usage) {
              const usage = parsed.usage;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { ...next[next.length - 1], usage };
                return next;
              });
            }
            streamDone = true;
            break;
          }
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
      const errMsg = (err as Error).message || "Sorry, something went wrong. Please try again.";
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last.role === "assistant" && !last.content) {
          next[next.length - 1] = { role: "assistant", content: errMsg, timestamp: Date.now() };
        } else {
          next.push({ role: "assistant", content: errMsg, timestamp: Date.now() });
        }
        return next;
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
    el.style.overflowY = el.scrollHeight > 140 ? "auto" : "hidden";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  if (!mounted) return null;

  // ── Landing ─────────────────────────────────────────────────────────────────
  if (phase === "landing") {
    const canStart = userName.trim().length > 0 && apiKey.trim().length > 0;

    return (
      <div style={styles.landingContainer}>

        {/* Hero */}
        <div style={styles.hero}>
          <span style={styles.heroEmoji}>🌿</span>
          <h1 style={styles.heroTitle}>Mental Coach</h1>
          <p style={styles.heroSubtitle}>
            Your supportive AI companion for stress, motivation &amp; wellbeing
          </p>
        </div>

        {/* Form */}
        <div style={styles.formSection}>
          <div style={styles.formCard}>

            {/* Name */}
            <div>
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
            </div>

            {/* API Key — password-style per security rules */}
            <div>
              <label style={styles.formLabel} htmlFor="api-key-input">
                OpenAI API Key
              </label>
              <div style={styles.apiKeyWrapper}>
                <input
                  id="api-key-input"
                  style={styles.apiKeyInput}
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && startChat()}
                  placeholder="sk-..."
                  autoComplete="off"
                />
                <button
                  style={styles.apiKeyToggle}
                  type="button"
                  onClick={() => setShowApiKey((v) => !v)}
                  tabIndex={-1}
                  aria-label={showApiKey ? "Hide API key" : "Show API key"}
                >
                  {showApiKey ? "Hide" : "Show"}
                </button>
              </div>
              <p style={styles.formHint}>
                Stored locally in your browser. Sent only to OpenAI, never to anyone else.
              </p>
            </div>

            {/* Coach selector */}
            <div>
              <p style={styles.selectorLabel}>Choose your coach</p>
              <div style={styles.pillGroup}>
                {COACH_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    style={coach === opt.value ? styles.pillActive : styles.pill}
                    onClick={() => setCoach(opt.value)}
                  >
                    {opt.name}
                  </button>
                ))}
              </div>
              <p style={styles.selectorDesc}>
                {COACH_OPTIONS.find((o) => o.value === coach)?.tagline}
              </p>
            </div>

            {/* Advanced options — collapsible */}
            <div>
              <button
                style={styles.advancedToggle}
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
              >
                ⚙ Advanced options&nbsp;{showAdvanced ? "▴" : "▾"}
              </button>

              {showAdvanced && (
                <div style={styles.advancedPanel}>

                  {/* Model */}
                  <div style={styles.advancedRow}>
                    <label style={styles.advancedLabel}>Model</label>
                    <select
                      style={styles.advancedSelect}
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                    >
                      {MODEL_OPTIONS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Temperature */}
                  <div style={styles.advancedRow}>
                    <div style={styles.advancedLabelRow}>
                      <span style={styles.advancedLabel}>Temperature</span>
                      <span style={styles.advancedValue}>{temperature.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      style={styles.advancedSlider}
                      min={0} max={2} step={0.1}
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    />
                    <div style={styles.sliderHints}>
                      <span>Precise (0.0)</span>
                      <span>Creative (2.0)</span>
                    </div>
                  </div>

                  {/* Max tokens */}
                  <div style={styles.advancedRow}>
                    <div style={styles.advancedLabelRow}>
                      <span style={styles.advancedLabel}>Max response tokens</span>
                      <span style={styles.advancedValue}>{maxTokens}</span>
                    </div>
                    <input
                      type="range"
                      style={styles.advancedSlider}
                      min={256} max={4096} step={128}
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    />
                    <div style={styles.sliderHints}>
                      <span>256</span>
                      <span>4096</span>
                    </div>
                  </div>

                  {/* Message limit */}
                  <div style={styles.advancedRow}>
                    <div style={styles.advancedLabelRow}>
                      <span style={styles.advancedLabel}>Message limit</span>
                      <span style={styles.advancedValue}>{messageLimit}</span>
                    </div>
                    <input
                      type="range"
                      style={styles.advancedSlider}
                      min={5} max={100} step={5}
                      value={messageLimit}
                      onChange={(e) => setMessageLimit(parseInt(e.target.value))}
                    />
                    <div style={styles.sliderHints}>
                      <span>5</span>
                      <span>100</span>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Start */}
            <button
              style={{ ...styles.startButton, ...(!canStart ? styles.startButtonDisabled : {}) }}
              onClick={startChat}
              disabled={!canStart}
            >
              Start your session →
            </button>

          </div>
        </div>

      </div>
    );
  }

  // ── Chat ────────────────────────────────────────────────────────────────────
  const coachName = COACH_OPTIONS.find((o) => o.value === coach)?.name ?? "Your Coach";

  const sessionTotals = messages.reduce(
    (acc, msg) => {
      if (msg.usage) {
        acc.promptTokens     += msg.usage.prompt_tokens;
        acc.completionTokens += msg.usage.completion_tokens;
        acc.totalTokens      += msg.usage.total_tokens;
        acc.cost             += msg.usage.cost ?? 0;
      }
      return acc;
    },
    { promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: 0 },
  );

  return (
    <div style={styles.chatContainer}>
      <header style={styles.header}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.headerTitle}>🌿 Mental Coach</h1>
            <p style={styles.headerSubtitle}>{userName} · {coachName} · {model}</p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              style={styles.infoButton}
              onClick={() => setShowInfoPanel((v) => !v)}
              aria-label="Session info"
            >
              🛈
            </button>
            <button style={styles.newSessionButton} onClick={clearSession}>
              New session
            </button>
          </div>
        </div>
      </header>

      {showInfoPanel && (
        <div style={styles.infoPanel}>
          <p style={styles.infoPanelTitle}>Session Info</p>

          <div style={styles.infoSection}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Model</span>
              <span style={styles.infoValue}>{model}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Coach</span>
              <span style={styles.infoValue}>{coachName}</span>
            </div>
            {sessionStart && (
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Started</span>
                <span style={styles.infoValue}>
                  {new Date(sessionStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            )}
          </div>

          <div style={styles.infoDivider} />

          <div style={styles.infoSection}>
            <p style={styles.infoSectionTitle}>Token usage</p>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Prompt</span>
              <span style={styles.infoValue}>{sessionTotals.promptTokens.toLocaleString()}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Completion</span>
              <span style={styles.infoValue}>{sessionTotals.completionTokens.toLocaleString()}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={{ ...styles.infoLabel, color: "#FFFFFF", fontWeight: 600 }}>Total</span>
              <span style={{ ...styles.infoValue, color: "#FFFFFF", fontWeight: 600 }}>{sessionTotals.totalTokens.toLocaleString()}</span>
            </div>
          </div>

          <div style={styles.infoDivider} />

          <div style={styles.infoSection}>
            <p style={styles.infoSectionTitle}>Estimated cost</p>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>This session</span>
              <span style={{ ...styles.infoValue, color: "#9472B6", fontWeight: 600 }}>
                {sessionTotals.totalTokens === 0
                  ? "—"
                  : sessionTotals.cost === 0
                  ? "N/A"
                  : `$${sessionTotals.cost < 0.0001 ? sessionTotals.cost.toFixed(6) : sessionTotals.cost.toFixed(4)}`}
              </span>
            </div>
          </div>
        </div>
      )}

      <div style={styles.messageListWrapper}>
        {showScrollBtn && (
          <button style={styles.scrollToBottomBtn} onClick={scrollToBottom} aria-label="Jump to bottom">
            ↓
          </button>
        )}
        <div ref={listRef} style={styles.messageList}>
          {messages.map((msg, i) => {
            const isUser = msg.role === "user";
            const isStreamingBubble =
              streaming && !isUser && i === messages.length - 1;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isUser ? "flex-end" : "flex-start",
                  gap: "4px",
                }}
              >
                <div style={{ ...styles.messageBubble, ...(isUser ? styles.userBubble : styles.assistantBubble) }}>
                  {isStreamingBubble && msg.content === "" ? (
                    <span style={styles.typingDots}><span>●</span><span>●</span><span>●</span></span>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>
                      {isStreamingBubble ? msg.content + " ▍" : msg.content}
                    </ReactMarkdown>
                  )}
                </div>
                {msg.timestamp && !isStreamingBubble && (
                  <span style={styles.messageTime}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {limitWarning !== null && (() => {
        const used = messages.filter(m => m.role === "user").length;
        const over = used - messageLimit;
        return (
          <div style={styles.limitWarningBar}>
            <span style={styles.limitWarningText}>
              ⚠&nbsp;
              <strong style={{ color: "#F59E0B" }}>{used}/{messageLimit}</strong>
              {over > 0
                ? ` messages — ${over} over your limit. Continue?`
                : " messages — limit reached. Continue?"}
            </span>
            <div style={styles.limitWarningActions}>
              <button style={styles.limitCancelBtn} onClick={cancelSend}>Cancel</button>
              <button style={styles.limitConfirmBtn} onClick={confirmContinue}>Continue</button>
            </div>
          </div>
        );
      })()}

      <div style={styles.inputArea}>
        <textarea
          ref={textareaRef}
          style={styles.textarea}
          value={input}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder="Share what's on your mind… (Enter to send, Shift+Enter for new line)"
          rows={1}
          disabled={streaming}
        />
        <button
          style={{ ...styles.sendButton, ...(streaming || !input.trim() ? styles.sendButtonDisabled : {}) }}
          onClick={sendMessage}
          disabled={streaming || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  // Landing
  landingContainer: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    width: "100%",
  },
  hero: {
    height: "25vh",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "0 24px",
    textAlign: "center",
    background: "#1A101E",
  },
  heroEmoji:    { fontSize: "52px", lineHeight: "1" },
  heroTitle:    { fontSize: "42px", fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.5px" },
  heroSubtitle: { fontSize: "16px", color: "#6B7280", maxWidth: "360px", lineHeight: "1.5" },

  formSection: {
    flex: 1,
    overflowY: "auto",
    padding: "32px 24px 48px",
    borderTop: "1px solid #483550",
    background: "#26152D",
  },
  formCard: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    width: "100%",
    maxWidth: "440px",
    margin: "0 auto",
  },
  formLabel: { display: "block", fontSize: "15px", fontWeight: 600, color: "#FFFFFF", marginBottom: "8px" },
  formInput: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "12px",
    border: "1px solid #483550",
    background: "#1A101E",
    color: "#FFFFFF",
    fontSize: "16px",
    outline: "none",
    transition: "border-color 200ms ease",
    boxSizing: "border-box",
  },
  formHint: { fontSize: "11px", color: "#6B7280", marginTop: "6px" },

  // API key field
  apiKeyWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  apiKeyInput: {
    width: "100%",
    padding: "14px 70px 14px 16px",
    borderRadius: "12px",
    border: "1px solid #483550",
    background: "#1A101E",
    color: "#FFFFFF",
    fontSize: "16px",
    outline: "none",
    transition: "border-color 200ms ease",
    boxSizing: "border-box",
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: "0.04em",
  },
  apiKeyToggle: {
    position: "absolute",
    right: "10px",
    padding: "5px 10px",
    background: "transparent",
    border: "1px solid #483550",
    borderRadius: "6px",
    color: "#6B7280",
    fontSize: "12px",
    cursor: "pointer",
    transition: "all 200ms ease",
    whiteSpace: "nowrap",
  },

  // Coach selector
  selectorLabel: { fontSize: "15px", fontWeight: 600, color: "#FFFFFF", marginBottom: "10px" },
  pillGroup:     { display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "8px" },
  pill: {
    padding: "7px 16px",
    borderRadius: "20px",
    border: "1px solid #483550",
    background: "transparent",
    color: "#6B7280",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 200ms ease",
    whiteSpace: "nowrap",
  },
  pillActive: {
    padding: "7px 16px",
    borderRadius: "20px",
    border: "1px solid #9472B6",
    background: "#9472B6",
    color: "#FFFFFF",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 200ms ease",
    whiteSpace: "nowrap",
  },
  selectorDesc: { fontSize: "12px", color: "#6B7280", marginTop: "8px", minHeight: "16px" },

  // Advanced options
  advancedToggle: {
    background: "transparent",
    border: "none",
    color: "#9472B6",
    fontSize: "14px",
    cursor: "pointer",
    padding: "4px 0",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    transition: "opacity 200ms ease",
  },
  advancedPanel: {
    marginTop: "14px",
    padding: "20px",
    background: "#1A101E",
    borderRadius: "12px",
    border: "1px solid #483550",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  advancedRow: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  advancedLabelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  advancedLabel: { fontSize: "13px", fontWeight: 600, color: "#FFFFFF" },
  advancedValue: { fontSize: "13px", color: "#9472B6", fontFamily: "'JetBrains Mono', monospace" },
  advancedSelect: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #483550",
    background: "#26152D",
    color: "#FFFFFF",
    fontSize: "14px",
    outline: "none",
    cursor: "pointer",
  },
  advancedSlider: {
    width: "100%",
    accentColor: "#9472B6",
    cursor: "pointer",
  },
  sliderHints: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11px",
    color: "#6B7280",
  },

  // Start button
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
    position: "relative",
  },
  header: {
    padding: "20px 24px 16px",
    borderBottom: "1px solid #483550",
    background: "#1A101E",
    borderRadius: "0 0 12px 12px",
    boxShadow: "0 4px 24px rgba(167, 139, 250, 0.1)",
  },
  headerRow:     { display: "flex", alignItems: "center", justifyContent: "space-between" },
  headerTitle:   { fontSize: "22px", fontWeight: 700, color: "#FFFFFF" },
  headerSubtitle: { fontSize: "13px", color: "#6B7280", marginTop: "2px" },
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
  infoButton: {
    padding: "6px 10px",
    borderRadius: "8px",
    border: "1px solid #483550",
    background: "transparent",
    color: "#9472B6",
    fontSize: "16px",
    cursor: "pointer",
    lineHeight: "1",
    transition: "all 200ms ease",
  },
  infoPanel: {
    position: "absolute",
    top: "72px",
    right: "16px",
    width: "260px",
    background: "#1A101E",
    border: "1px solid #483550",
    borderRadius: "12px",
    padding: "16px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
    zIndex: 100,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  infoPanelTitle: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#FFFFFF",
    margin: 0,
  },
  infoSection: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  infoSectionTitle: {
    fontSize: "10px",
    fontWeight: 600,
    color: "#6B7280",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    margin: 0,
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: "13px",
    color: "#6B7280",
  },
  infoValue: {
    fontSize: "13px",
    color: "#FFFFFF",
    fontFamily: "'JetBrains Mono', monospace",
  },
  infoDivider: {
    height: "1px",
    background: "#483550",
  },

  messageListWrapper: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  scrollToBottomBtn: {
    position: "absolute",
    bottom: "16px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 10,
    padding: "6px 16px",
    borderRadius: "20px",
    border: "1px solid #483550",
    background: "#1A101E",
    color: "#9472B6",
    fontSize: "16px",
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
    transition: "all 200ms ease",
  },
  messageList: {
    height: "100%",
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
    wordBreak: "break-word",
    transition: "all 200ms ease",
  },
  userBubble: {
    background: "#9472B6",
    color: "#FFFFFF",
    borderBottomRightRadius: "4px",
    boxShadow: "0 4px 24px rgba(167, 139, 250, 0.1)",
  },
  assistantBubble: {
    background: "#483550",
    color: "#FFFFFF",
    borderBottomLeftRadius: "4px",
    boxShadow: "0 4px 24px rgba(167, 139, 250, 0.1)",
  },
  messageTime: {
    fontSize: "11px",
    color: "#6B7280",
    padding: "0 4px",
  },
  typingDots: { display: "inline-flex", gap: "4px", alignItems: "center", fontSize: "20px", color: "#6B7280" },

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
    overflowY: "hidden",
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
  sendButtonDisabled: { background: "#483550", color: "#6B7280", cursor: "not-allowed" },

  // Limit warning bar
  limitWarningBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "10px 16px",
    borderTop: "1px solid #C97316",
    background: "#1A101E",
  },
  limitWarningText: {
    fontSize: "13px",
    color: "#F59E0B",
    flex: 1,
  },
  limitWarningActions: {
    display: "flex",
    gap: "8px",
    flexShrink: 0,
  },
  limitCancelBtn: {
    padding: "5px 12px",
    borderRadius: "8px",
    border: "1px solid #483550",
    background: "transparent",
    color: "#6B7280",
    fontSize: "13px",
    cursor: "pointer",
  },
  limitConfirmBtn: {
    padding: "5px 12px",
    borderRadius: "8px",
    border: "none",
    background: "#9472B6",
    color: "#FFFFFF",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
};
