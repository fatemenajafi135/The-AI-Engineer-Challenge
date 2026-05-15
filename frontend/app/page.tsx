// Refactor note: styles → ./styles.ts, markdown config → ./markdown.tsx, all constants → ../config.ts
"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CHAT_STREAM_ENDPOINT,
  COACH_OPTIONS,
  COLORS,
  MODEL_OPTIONS,
  DEFAULT_MODEL,
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
  DEFAULT_MESSAGE_LIMIT,
  DEFAULT_COACH,
  LS_KEYS,
} from "../config";
import { styles } from "./styles";
import { md } from "./markdown";

type Usage = { prompt_tokens: number; completion_tokens: number; total_tokens: number; cost: number | null };
type Message = { role: "user" | "assistant"; content: string; timestamp?: number; usage?: Usage };
type Phase = "landing" | "chat";


export default function Home() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [userName, setUserName] = useState("");
  const [coach, setCoach] = useState(DEFAULT_COACH);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // New: API key + advanced options
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [temperature, setTemperature] = useState(DEFAULT_TEMPERATURE);
  const [maxTokens, setMaxTokens] = useState(DEFAULT_MAX_TOKENS);
  const [messageLimit, setMessageLimit] = useState(DEFAULT_MESSAGE_LIMIT);

  // Warning state: holds the pending message text when limit is reached
  const [limitWarning, setLimitWarning] = useState<string | null>(null);

  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [sessionStart, setSessionStart] = useState<number | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const infoPanelRef = useRef<HTMLDivElement>(null);

  // Restore full session from localStorage on mount
  useEffect(() => {
    const savedName        = localStorage.getItem(LS_KEYS.userName);
    const savedCoach        = localStorage.getItem(LS_KEYS.coach);
    const savedMessages     = localStorage.getItem(LS_KEYS.messages);
    const savedApiKey       = localStorage.getItem(LS_KEYS.apiKey);
    const savedModel        = localStorage.getItem(LS_KEYS.model);
    const savedTemperature  = localStorage.getItem(LS_KEYS.temperature);
    const savedMaxTokens    = localStorage.getItem(LS_KEYS.maxTokens);
    const savedLimit        = localStorage.getItem(LS_KEYS.messageLimit);
    const savedSessionStart = localStorage.getItem(LS_KEYS.sessionStart);

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
      localStorage.setItem(LS_KEYS.messages, JSON.stringify(messages));
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

  useEffect(() => {
    if (!showInfoPanel) return;
    function handleClickOutside(e: MouseEvent) {
      if (infoPanelRef.current && !infoPanelRef.current.contains(e.target as Node)) {
        setShowInfoPanel(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showInfoPanel]);

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollBtn(false);
  }

  function startChat() {
    const name = userName.trim();
    const key  = apiKey.trim();
    if (!name || !key) return;

    localStorage.setItem(LS_KEYS.userName,     name);
    localStorage.setItem(LS_KEYS.coach,        coach);
    localStorage.setItem(LS_KEYS.apiKey,       key);
    localStorage.setItem(LS_KEYS.model,        model);
    localStorage.setItem(LS_KEYS.temperature,  String(temperature));
    localStorage.setItem(LS_KEYS.maxTokens,    String(maxTokens));
    localStorage.setItem(LS_KEYS.messageLimit, String(messageLimit));

    const now = Date.now();
    localStorage.setItem(LS_KEYS.sessionStart, String(now));
    setSessionStart(now);

    setMessages([{
      role: "assistant",
      content: `Hi ${name}! I'm your mental wellness coach — here to support you with stress, motivation, habits, and confidence. What's on your mind today?`,
      timestamp: now,
    }]);
    setPhase("chat");
  }

  function clearSession() {
    Object.values(LS_KEYS).forEach((k) => localStorage.removeItem(k));
    setUserName("");
    setCoach(DEFAULT_COACH);
    setApiKey("");
    setModel(DEFAULT_MODEL);
    setTemperature(DEFAULT_TEMPERATURE);
    setMaxTokens(DEFAULT_MAX_TOKENS);
    setMessageLimit(DEFAULT_MESSAGE_LIMIT);
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
      const res = await fetch(CHAT_STREAM_ENDPOINT, {
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
            <p style={styles.headerSubtitle}>Your supportive AI companion</p>
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
        <div ref={infoPanelRef} style={styles.infoPanel}>
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
              <span style={{ ...styles.infoLabel, color: COLORS.textPrimary, fontWeight: 600 }}>Total</span>
              <span style={{ ...styles.infoValue, color: COLORS.textPrimary, fontWeight: 600 }}>{sessionTotals.totalTokens.toLocaleString()}</span>
            </div>
          </div>

          <div style={styles.infoDivider} />

          <div style={styles.infoSection}>
            <p style={styles.infoSectionTitle}>Estimated cost</p>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>This session</span>
              <span style={{ ...styles.infoValue, color: COLORS.accent, fontWeight: 600 }}>
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
              <strong style={{ color: COLORS.warningText }}>{used}/{messageLimit}</strong>
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

