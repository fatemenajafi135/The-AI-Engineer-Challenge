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
  PALETTES,
  DEFAULT_MODEL,
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
  DEFAULT_MESSAGE_LIMIT,
  DEFAULT_COACH,
  LS_KEYS,
} from "../config";
import { styles } from "./styles";
import { md } from "./markdown";
import { BreathingWidget, type BreathingTool } from "./BreathingWidget";
import { ReframeWidget, type ReframeTool } from "./ReframeWidget";
import { PrepWidget, type PrepTool } from "./PrepWidget";
import { SupportWidget, type SupportTool, type SupportResults } from "./SupportWidget";

type Usage = { prompt_tokens: number; completion_tokens: number; total_tokens: number; cost: number | null };
type Message = { role: "user" | "assistant"; content: string; timestamp?: number; usage?: Usage; breathingTool?: BreathingTool; reframeTool?: ReframeTool; prepTool?: PrepTool; supportTool?: SupportTool; supportResults?: SupportResults };
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
  type KeyStatus = "idle" | "checking" | "valid" | "invalid";
  const [apiKeyStatus, setApiKeyStatus] = useState<KeyStatus>("idle");
  const [apiKeyError,  setApiKeyError]  = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [temperature, setTemperature] = useState(DEFAULT_TEMPERATURE);
  const [maxTokens, setMaxTokens] = useState(DEFAULT_MAX_TOKENS);
  const [messageLimit, setMessageLimit] = useState(DEFAULT_MESSAGE_LIMIT);

  // Warning state: holds the pending message text when limit is reached
  const [limitWarning, setLimitWarning] = useState<string | null>(null);

  const [showNewSessionConfirm, setShowNewSessionConfirm] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showToolsPanel, setShowToolsPanel] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [paletteKey, setPaletteKey] = useState("default");
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [typingFrame, setTypingFrame] = useState(0);

  const TYPING_FRAMES = ["typing", "typing .", "typing ..", "typing ...", "typing ..", "typing ."];

  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const infoPanelRef        = useRef<HTMLDivElement>(null);
  const exportMenuRef       = useRef<HTMLDivElement>(null);
  const toolsPanelRef       = useRef<HTMLDivElement>(null);
  const newSessionPanelRef  = useRef<HTMLDivElement>(null);
  const settingsPanelRef    = useRef<HTMLDivElement>(null);

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
    if (savedTemperature)  { const v = parseFloat(savedTemperature);  if (!isNaN(v)) setTemperature(v); }
    if (savedMaxTokens)    { const v = parseInt(savedMaxTokens);    if (!isNaN(v)) setMaxTokens(v); }
    if (savedLimit)        { const v = parseInt(savedLimit);        if (!isNaN(v)) setMessageLimit(v); }
    if (savedSessionStart) { const v = parseInt(savedSessionStart); if (!isNaN(v)) setSessionStart(v); }

    const savedPalette = localStorage.getItem(LS_KEYS.palette);
    if (savedPalette && PALETTES.some((p) => p.key === savedPalette)) {
      setPaletteKey(savedPalette);
    }

    if (savedName) {
      setUserName(savedName);
      if (savedMessages) {
        try {
          setMessages(JSON.parse(savedMessages));
          setPhase("chat");
        } catch {
          console.warn("localStorage message history corrupted — starting fresh");
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

  useEffect(() => {
    if (!showExportMenu) return;
    function handleClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showExportMenu]);

  useEffect(() => {
    if (!showToolsPanel) return;
    function handleClickOutside(e: MouseEvent) {
      if (toolsPanelRef.current && !toolsPanelRef.current.contains(e.target as Node)) {
        setShowToolsPanel(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showToolsPanel]);

  useEffect(() => {
    if (!showNewSessionConfirm) return;
    function handleClickOutside(e: MouseEvent) {
      if (newSessionPanelRef.current && !newSessionPanelRef.current.contains(e.target as Node)) {
        setShowNewSessionConfirm(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNewSessionConfirm]);

  // Apply palette CSS vars whenever the selected palette changes.
  // Updating document.documentElement style properties is enough — React inline
  // styles that use var(--accent) etc. repaint automatically without a re-render.
  useEffect(() => {
    const palette = PALETTES.find((p) => p.key === paletteKey);
    if (!palette) return;
    const root = document.documentElement;
    root.style.setProperty("--bg-page",    palette.bgPage);
    root.style.setProperty("--bg-card",    palette.bgCard);
    root.style.setProperty("--accent",     palette.accent);
    root.style.setProperty("--accent-dim", palette.accentDim);
    root.style.setProperty("--accent-rgb", palette.accentRgb);
    localStorage.setItem(LS_KEYS.palette, paletteKey);
  }, [paletteKey]);

  useEffect(() => {
    if (!showSettingsPanel) return;
    function handleClickOutside(e: MouseEvent) {
      if (settingsPanelRef.current && !settingsPanelRef.current.contains(e.target as Node)) {
        setShowSettingsPanel(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSettingsPanel]);

  useEffect(() => {
    if (!streaming) { setTypingFrame(0); return; }
    const id = setInterval(() => {
      setTypingFrame((f) => (f + 1) % TYPING_FRAMES.length);
    }, 400);
    return () => clearInterval(id);
  }, [streaming]);

  function exportSession(format: "json" | "md" | "html") {
    const date    = new Date();
    const dateStr = date.toISOString().split("T")[0];
    const name    = COACH_OPTIONS.find((o) => o.value === coach)?.name ?? "Coach";
    // Snapshot the active palette so the exported HTML matches what the user sees.
    const pal = PALETTES.find((p) => p.key === paletteKey) ?? PALETTES[0];
    const palAccentAlpha08 = `rgba(${pal.accentRgb}, 0.08)`;

    // Compute session cost for inclusion in all export formats.
    const totalTokens = messages.reduce((a, m) => a + (m.usage?.total_tokens ?? 0), 0);
    const totalCost   = messages.reduce((a, m) => a + (m.usage?.cost ?? 0), 0);
    const costStr     = totalTokens === 0 ? "N/A"
                      : totalCost   === 0 ? "N/A"
                      : totalCost < 0.0001 ? `$${totalCost.toFixed(6)}`
                      : `$${totalCost.toFixed(4)}`;

    // ── Breathing technique phase summaries (mirrors BreathingWidget constants) ──
    const BREATHING_NAMES: Record<string, string> = {
      box:                "Box Breathing",
      physiological_sigh: "Physiological Sigh",
      "4-7-8":            "4-7-8 Breathing",
    };
    const BREATHING_PHASES: Record<string, string> = {
      box:                "Inhale 4s · Hold 4s · Exhale 4s · Hold 4s",
      physiological_sigh: "Inhale 2s · Double-inhale 1s · Exhale 6s",
      "4-7-8":            "Inhale 4s · Hold 7s · Exhale 8s",
    };

    // ── JSON card serializer ───────────────────────────────────────────────────
    function cardToJson(m: Message) {
      if (m.breathingTool) {
        const t = m.breathingTool;
        return {
          type:           "breathing",
          technique:      t.technique,
          technique_name: BREATHING_NAMES[t.technique],
          phases:         BREATHING_PHASES[t.technique],
          cycles:         t.cycles,
          reason:         t.reason,
        };
      }
      if (m.reframeTool) {
        const r = m.reframeTool;
        return {
          type:             "reframe",
          original_thought: r.original_thought,
          reframe:          r.reframe,
        };
      }
      if (m.prepTool) {
        const p = m.prepTool;
        return {
          type:                "prep",
          event:               p.event_description,
          worries_and_reframes: p.worries.map((w, i) => ({ worry: w, reframe: p.reframes[i] ?? "" })),
          anchors:             p.anchors,
        };
      }
      if (m.supportTool && m.supportResults) {
        const sr = m.supportResults;
        return {
          type:    "support",
          query:   sr.query,
          crisis:  sr.crisis,
          results: sr.results,
        };
      }
      return undefined;
    }

    // ── Markdown card serializer ───────────────────────────────────────────────
    function cardToMd(m: Message): string {
      if (m.breathingTool) {
        const t = m.breathingTool;
        return [
          ``,
          `> 🌬 **Breathing exercise — ${BREATHING_NAMES[t.technique]}** (${t.cycles} cycles)`,
          `> Phases: ${BREATHING_PHASES[t.technique]}`,
          `> _${t.reason}_`,
        ].join("\n");
      }
      if (m.reframeTool) {
        const r = m.reframeTool;
        return [
          ``,
          `> 🔄 **Thought reframe**`,
          `> **Original:** ${r.original_thought}`,
          `> **Reframe:** ${r.reframe}`,
        ].join("\n");
      }
      if (m.prepTool) {
        const p = m.prepTool;
        const pairs   = p.worries.map((w, i) => `> - ❓ ${w}  →  ✅ ${p.reframes[i] ?? ""}`).join("\n");
        const anchors = p.anchors.map((a) => `> - ${a}`).join("\n");
        return [
          ``,
          `> 📋 **Prep — ${p.event_description}**`,
          `> **Worries & reframes:**`,
          pairs,
          `> **To-do anchors:**`,
          anchors,
        ].join("\n");
      }
      if (m.supportTool && m.supportResults) {
        const sr     = m.supportResults;
        const crisis = sr.crisis
          ? `> 🆘 **Crisis line:** ${sr.crisis.name}` +
            (sr.crisis.number ? ` — ${sr.crisis.number}` : "") +
            (sr.crisis.url    ? ` — ${sr.crisis.url}`    : "")
          : "";
        const results = sr.results.map((r) =>
          `> - **${r.name}** (${r.type}, ${r.format})\n>   ${r.description}\n>   ${r.url}`
        ).join("\n");
        return [
          ``,
          `> 🔍 **Support search — ${sr.query.city}, ${sr.query.country}**`,
          crisis,
          results,
        ].filter(Boolean).join("\n");
      }
      return "";
    }

    // ── HTML card serializer ───────────────────────────────────────────────────
    function cardToHtml(m: Message): string {
      const card = (emoji: string, title: string, rows: string) =>
        `<div style="margin-top:10px;background:${pal.bgPage};border:1px solid ${pal.accentDim};border-radius:12px;padding:14px 16px;font-size:13px;line-height:1.6;">` +
        `<div style="font-size:11px;font-weight:700;color:${pal.accent};text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">${emoji} ${title}</div>` +
        rows +
        `</div>`;
      const row = (label: string, value: string) =>
        `<div style="margin-bottom:6px;"><span style="color:${COLORS.textSecondary};">${label}:</span> ${value}</div>`;

      if (m.breathingTool) {
        const t = m.breathingTool;
        return card("🌬", `Breathing — ${BREATHING_NAMES[t.technique]}`,
          row("Phases", BREATHING_PHASES[t.technique]) +
          row("Cycles", String(t.cycles)) +
          row("Why", `<em>${t.reason}</em>`)
        );
      }
      if (m.reframeTool) {
        const r = m.reframeTool;
        return card("🔄", "Thought Reframe",
          row("Original", `<em style="color:${COLORS.textMuted};">${r.original_thought}</em>`) +
          row("Reframe",  `<strong>${r.reframe}</strong>`)
        );
      }
      if (m.prepTool) {
        const p      = m.prepTool;
        const pairs  = p.worries.map((w, i) =>
          `<li style="margin-bottom:4px;"><span style="color:${COLORS.textSecondary};">${w}</span>` +
          ` <span style="color:${pal.accent};">→</span> ${p.reframes[i] ?? ""}</li>`
        ).join("");
        const anchors = p.anchors.map((a) =>
          `<li style="margin-bottom:4px;">${a}</li>`
        ).join("");
        return card("📋", `Prep — ${p.event_description}`,
          `<div style="margin-bottom:6px;color:${COLORS.textSecondary};font-weight:600;">Worries &amp; Reframes:</div>` +
          `<ul style="padding-left:16px;margin-bottom:10px;">${pairs}</ul>` +
          `<div style="margin-bottom:6px;color:${COLORS.textSecondary};font-weight:600;">To-do anchors:</div>` +
          `<ul style="padding-left:16px;">${anchors}</ul>`
        );
      }
      if (m.supportTool && m.supportResults) {
        const sr      = m.supportResults;
        const crisis  = sr.crisis
          ? `<div style="margin-bottom:10px;padding:8px 12px;background:${palAccentAlpha08};border-radius:8px;">` +
            `<span style="color:${pal.accent};font-weight:700;">🆘 Crisis:</span> ${sr.crisis.name}` +
            (sr.crisis.number ? ` — <strong>${sr.crisis.number}</strong>` : "") +
            (sr.crisis.url    ? ` — <a href="${sr.crisis.url}" style="color:${pal.accent};">${sr.crisis.url}</a>` : "") +
            `</div>`
          : "";
        const results = sr.results.map((r) =>
          `<div style="margin-bottom:10px;padding:8px 12px;border:1px solid ${pal.accentDim};border-radius:8px;">` +
          `<div style="font-weight:700;">${r.name}</div>` +
          `<div style="font-size:12px;color:${COLORS.textSecondary};margin:2px 0;">${r.type} · ${r.format}</div>` +
          `<div style="margin:4px 0;">${r.description}</div>` +
          `<a href="${r.url}" style="color:${pal.accent};font-size:12px;">${r.url}</a>` +
          `</div>`
        ).join("");
        return card("🔍", `Support — ${sr.query.city}, ${sr.query.country}`,
          crisis + results
        );
      }
      return "";
    }

    // ── Build output ───────────────────────────────────────────────────────────
    let content  = "";
    let mimeType = "";
    let filename = "";

    if (format === "json") {
      content = JSON.stringify({
        session: {
          user:       userName,
          coach:      name,
          model,
          started:    sessionStart ? new Date(sessionStart).toISOString() : null,
          total_cost: costStr,
          exported:   date.toISOString(),
        },
        messages: messages.map((m) => {
          const entry: Record<string, unknown> = {
            role:      m.role,
            content:   m.content,
            timestamp: m.timestamp ? new Date(m.timestamp).toISOString() : null,
          };
          const card = cardToJson(m);
          if (card) entry.card = card;
          return entry;
        }),
      }, null, 2);
      mimeType = "application/json";
      filename = `mental-coach-${dateStr}.json`;

    } else if (format === "md") {
      const header = [
        `# Mental Coach Session`,
        ``,
        `**User:** ${userName}  |  **Coach:** ${name}  |  **Model:** ${model}` +
          (sessionStart ? `  |  **Started:** ${new Date(sessionStart).toLocaleString()}` : "") +
          `  |  **Total cost:** ${costStr}`,
        ``,
        `---`,
        ``,
      ];
      const body = messages.flatMap((m) => {
        const speaker = m.role === "user" ? userName : name;
        const time    = m.timestamp
          ? new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "";
        const card = cardToMd(m);
        return [`**${speaker}**${time ? `  ·  ${time}` : ""}`, ``, m.content, card, ``, `---`, ``];
      });
      content  = [...header, ...body].join("\n");
      mimeType = "text/markdown";
      filename = `mental-coach-${dateStr}.md`;

    } else {
      const esc = (s: string) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      const bubblesHtml = messages.map((m) => {
        const isUser  = m.role === "user";
        const speaker = isUser ? userName : name;
        const time    = m.timestamp
          ? new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "";
        const bg     = isUser ? pal.accent : pal.accentDim;
        const radius = isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px";
        const align  = isUser ? "flex-end" : "flex-start";
        const card   = cardToHtml(m);
        return (
          `<div style="display:flex;flex-direction:column;align-items:${align};margin-bottom:14px;">` +
          `<div style="max-width:75%;background:${bg};color:${COLORS.textPrimary};padding:12px 16px;` +
          `border-radius:${radius};white-space:pre-wrap;line-height:1.6;font-size:15px;">` +
          `${esc(m.content)}${card}</div>` +
          (time ? `<div style="font-size:11px;color:${COLORS.textSecondary};margin-top:4px;padding:0 4px;">${esc(speaker)} · ${time}</div>` : "") +
          `</div>`
        );
      }).join("\n");

      content = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Mental Coach — ${dateStr}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:${pal.bgPage};color:${COLORS.textPrimary};font-family:system-ui,sans-serif;padding:32px 16px;min-height:100vh}
    .wrap{max-width:760px;margin:0 auto}
    .hdr{background:${pal.bgCard};border:1px solid ${pal.accentDim};border-radius:12px;padding:20px 24px;margin-bottom:24px}
    .hdr h1{font-size:22px;font-weight:700;margin-bottom:8px}
    .meta{font-size:13px;color:${COLORS.textSecondary}}
    .meta b{color:${pal.accent}}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hdr">
      <h1>🌿 Mental Coach Session</h1>
      <p class="meta">
        User: <b>${esc(userName)}</b> &nbsp;·&nbsp;
        Coach: <b>${esc(name)}</b> &nbsp;·&nbsp;
        Model: <b>${esc(model)}</b>
        ${sessionStart ? `&nbsp;·&nbsp; Started: <b>${new Date(sessionStart).toLocaleString()}</b>` : ""}
        &nbsp;·&nbsp; Cost: <b>${costStr}</b>
      </p>
    </div>
    <div>
${bubblesHtml}
    </div>
  </div>
</body>
</html>`;
      mimeType = "text/html";
      filename = `mental-coach-${dateStr}.html`;
    }

    const blob = new Blob([content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollBtn(false);
  }

  async function validateApiKey() {
    const key = apiKey.trim();
    if (!key) { setApiKeyStatus("idle"); return; }
    setApiKeyStatus("checking");
    try {
      const res  = await fetch("/api/validate-key", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ api_key: key }),
      });
      const data = await res.json();
      if (data.valid) {
        setApiKeyStatus("valid");
      } else {
        setApiKeyStatus("invalid");
        setApiKeyError(data.error ?? "Invalid key");
      }
    } catch {
      setApiKeyStatus("invalid");
      setApiKeyError("Could not verify — check your connection");
    }
  }

  function startChat() {
    const name = userName.trim();
    const key  = apiKey.trim();
    if (!name) return;

    localStorage.setItem(LS_KEYS.userName, name);
    localStorage.setItem(LS_KEYS.coach,   coach);
    localStorage.setItem(LS_KEYS.messageLimit, String(messageLimit));
    if (key) {
      localStorage.setItem(LS_KEYS.apiKey,      key);
      localStorage.setItem(LS_KEYS.model,       model);
      localStorage.setItem(LS_KEYS.temperature, String(temperature));
      localStorage.setItem(LS_KEYS.maxTokens,   String(maxTokens));
    }

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
          message:   text,
          coach,
          history,
          user_name: userName,
          ...(apiKey ? { api_key: apiKey, model, temperature, max_tokens: maxTokens } : {}),
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

          let parsed: { token?: string; done?: boolean; error?: string; usage?: Usage; tool_call?: { name: string; args: unknown } };
          try { parsed = JSON.parse(trimmed); }
          catch { console.error("Failed to parse SSE event:", trimmed); continue; }

          if (parsed.error) throw new Error(parsed.error);

          if (parsed.tool_call) {
            console.log("Tool call received:", parsed.tool_call.name);
          }

          if (parsed.tool_call?.name === "breathing_exercise") {
            const tool = parsed.tool_call.args as BreathingTool;
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last.role === "assistant") {
                next[next.length - 1] = { ...last, breathingTool: tool };
              }
              return next;
            });
          }

          if (parsed.tool_call?.name === "reframe_thought") {
            const tool = parsed.tool_call.args as ReframeTool;
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last.role === "assistant") {
                next[next.length - 1] = { ...last, reframeTool: tool };
              }
              return next;
            });
          }

          if (parsed.tool_call?.name === "prep_for_situation") {
            const tool = parsed.tool_call.args as PrepTool;
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last.role === "assistant") {
                next[next.length - 1] = { ...last, prepTool: tool };
              }
              return next;
            });
          }

          if (parsed.tool_call?.name === "find_professional_support") {
            const tool = parsed.tool_call.args as SupportTool;
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last.role === "assistant") {
                next[next.length - 1] = { ...last, supportTool: tool };
              }
              return next;
            });
          }

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

      // Detect connection dropped before the server sent {"done": true}
      if (!streamDone) {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last.role === "assistant") {
            next[next.length - 1] = {
              ...last,
              content: last.content
                ? last.content + "\n\n*(Response interrupted — connection dropped. Try again.)*"
                : "*(Response interrupted — connection dropped. Try again.)*",
            };
          }
          return next;
        });
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      console.error("Chat stream error:", err);
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
    const canStart = userName.trim().length > 0;
    const hasKey   = apiKey.trim().length > 0;

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

                  {/* API Key — password-style per security rules */}
                  <div style={styles.advancedRow}>
                    <label style={styles.advancedLabel} htmlFor="api-key-input">
                      OpenAI API Key
                    </label>
                    <div style={styles.apiKeyWrapper}>
                      <input
                        id="api-key-input"
                        style={{
                          ...styles.apiKeyInput,
                          borderColor: apiKeyStatus === "valid"   ? "var(--accent)"
                                     : apiKeyStatus === "invalid" ? COLORS.warningBorder
                                     : undefined,
                        }}
                        type={showApiKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => { setApiKey(e.target.value); setApiKeyStatus("idle"); }}
                        onBlur={validateApiKey}
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
                    {apiKeyStatus === "checking" && (
                      <p style={{ ...styles.formHint, color: COLORS.textSecondary }}>Verifying…</p>
                    )}
                    {apiKeyStatus === "valid" && (
                      <p style={{ ...styles.formHint, color: "var(--accent)" }}>✓ Key accepted</p>
                    )}
                    {apiKeyStatus === "invalid" && (
                      <p style={{ ...styles.formHint, color: COLORS.warningText }}>{apiKeyError}</p>
                    )}
                  </div>

                  {!hasKey && (
                    <p style={{ fontSize: "12px", color: COLORS.textSecondary, fontStyle: "italic", margin: "0 0 4px 0" }}>
                      Enter an API key above to customize the options below.
                    </p>
                  )}

                  {/* Model */}
                  <div style={{ ...styles.advancedRow, opacity: hasKey ? 1 : 0.4, pointerEvents: hasKey ? "auto" : "none" }}>
                    <label style={styles.advancedLabel}>Model</label>
                    <select
                      style={styles.advancedSelect}
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      disabled={!hasKey}
                    >
                      {MODEL_OPTIONS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Temperature */}
                  <div style={{ ...styles.advancedRow, opacity: hasKey ? 1 : 0.4, pointerEvents: hasKey ? "auto" : "none" }}>
                    <div style={styles.advancedLabelRow}>
                      <span style={styles.advancedLabel}>Temperature</span>
                      <span style={styles.advancedValue}>{temperature.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      style={styles.advancedSlider}
                      min={0} max={2} step={0.1}
                      value={temperature}
                      disabled={!hasKey}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    />
                    <div style={styles.sliderHints}>
                      <span>Precise (0.0)</span>
                      <span>Creative (2.0)</span>
                    </div>
                  </div>

                  {/* Max tokens */}
                  <div style={{ ...styles.advancedRow, opacity: hasKey ? 1 : 0.4, pointerEvents: hasKey ? "auto" : "none" }}>
                    <div style={styles.advancedLabelRow}>
                      <span style={styles.advancedLabel}>Max response tokens</span>
                      <span style={styles.advancedValue}>{maxTokens}</span>
                    </div>
                    <input
                      type="range"
                      style={styles.advancedSlider}
                      min={256} max={4096} step={128}
                      value={maxTokens}
                      disabled={!hasKey}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    />
                    <div style={styles.sliderHints}>
                      <span>256</span>
                      <span>4096</span>
                    </div>
                  </div>

                  {/* Message limit */}
                  <div style={{ ...styles.advancedRow, opacity: hasKey ? 1 : 0.4, pointerEvents: hasKey ? "auto" : "none" }}>
                    <div style={styles.advancedLabelRow}>
                      <span style={styles.advancedLabel}>Message limit</span>
                      <span style={styles.advancedValue}>{messageLimit}</span>
                    </div>
                    <input
                      type="range"
                      style={styles.advancedSlider}
                      min={5} max={100} step={5}
                      value={messageLimit}
                      disabled={!hasKey}
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
              className="header-btn"
              style={styles.infoButton}
              onClick={() => { setShowToolsPanel((v) => !v); setShowInfoPanel(false); setShowExportMenu(false); setShowSettingsPanel(false); }}
              aria-label="Available tools"
              title="Available tools"
            >
              ⚒
            </button>
            <button
              className="header-btn"
              style={styles.infoButton}
              onClick={() => { setShowExportMenu((v) => !v); setShowInfoPanel(false); setShowToolsPanel(false); setShowSettingsPanel(false); }}
              aria-label="Export session"
              title="Export session"
            >
              ⬇
            </button>
            <button
              className="header-btn"
              style={styles.infoButton}
              onClick={() => { setShowInfoPanel((v) => !v); setShowExportMenu(false); setShowToolsPanel(false); setShowSettingsPanel(false); }}
              aria-label="Session info"
            >
              🛈
            </button>
            <button
              className="header-btn"
              style={styles.infoButton}
              onClick={() => { setShowSettingsPanel((v) => !v); setShowInfoPanel(false); setShowExportMenu(false); setShowToolsPanel(false); }}
              aria-label="Settings"
              title="Settings"
            >
              ⚙
            </button>
            <button
              className="header-btn"
              style={styles.newSessionButton}
              onClick={() => { setShowNewSessionConfirm((v) => !v); setShowInfoPanel(false); setShowExportMenu(false); setShowToolsPanel(false); setShowSettingsPanel(false); }}
            >
              New session
            </button>
          </div>
        </div>
      </header>

      {showNewSessionConfirm && (
        <div ref={newSessionPanelRef} style={styles.infoPanel}>
          <p style={styles.infoPanelTitle}>Start a new session?</p>
          <div style={styles.infoDivider} />
          <div style={styles.infoSection}>
            <p style={{ fontSize: "13px", color: COLORS.textSecondary, lineHeight: "1.5" }}>
              All messages and session info will be cleared.
            </p>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
              <button style={styles.limitCancelBtn} onClick={() => setShowNewSessionConfirm(false)}>
                Cancel
              </button>
              <button style={styles.limitConfirmBtn} onClick={() => { setShowNewSessionConfirm(false); clearSession(); }}>
                Start fresh
              </button>
            </div>
          </div>
        </div>
      )}

      {showToolsPanel && (
        <div ref={toolsPanelRef} style={styles.infoPanel}>
          <p style={styles.infoPanelTitle}>Available Tools</p>
          <div style={styles.infoDivider} />
          <div style={styles.infoSection}>
            {[
              "Breathing Exercise",
              "Thought Reframe",
              "Prep for Situation",
              "Support Finder (web search)",
            ].map((tool) => (
              <div key={tool} style={styles.infoRow}>
                <span style={{ ...styles.infoLabel, color: COLORS.textPrimary }}>{tool}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showSettingsPanel && (
        <div ref={settingsPanelRef} style={styles.infoPanel}>
          <p style={styles.infoPanelTitle}>Color Palette</p>
          <div style={styles.infoDivider} />
          <div style={styles.infoSection}>
            {PALETTES.map((palette) => (
              <label
                key={palette.key}
                style={{
                  display:     "flex",
                  alignItems:  "center",
                  gap:         "10px",
                  cursor:      "pointer",
                  padding:     "5px 0",
                }}
              >
                <input
                  type="radio"
                  name="palette"
                  value={palette.key}
                  checked={paletteKey === palette.key}
                  onChange={() => setPaletteKey(palette.key)}
                  style={{ accentColor: "var(--accent)", cursor: "pointer", flexShrink: 0 }}
                />
                <span style={{ fontSize: "13px", color: COLORS.textPrimary, flex: 1 }}>
                  {palette.name}
                </span>
                {/* Four swatches: bgPage, bgCard, accentDim, accent */}
                <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                  {[palette.bgPage, palette.bgCard, palette.accentDim, palette.accent].map((color, i) => (
                    <div
                      key={i}
                      style={{
                        width:        "14px",
                        height:       "14px",
                        borderRadius: "3px",
                        background:   color,
                        border:       "1px solid rgba(255,255,255,0.18)",
                        flexShrink:   0,
                      }}
                    />
                  ))}
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {showExportMenu && (
        <div ref={exportMenuRef} style={styles.infoPanel}>
          <p style={styles.infoPanelTitle}>Export Session</p>
          <div style={styles.infoDivider} />
          <div style={styles.infoSection}>
            {([
              { fmt: "json",  label: "JSON",     ext: ".json" },
              { fmt: "md",    label: "Markdown",  ext: ".md"   },
              { fmt: "html",  label: "HTML",      ext: ".html" },
            ] as const).map(({ fmt, label, ext }) => (
              <button
                key={fmt}
                onClick={() => exportSession(fmt)}
                style={{ ...styles.infoRow, border: "none", background: "transparent", cursor: "pointer", width: "100%", padding: "2px 0", textAlign: "left" as const }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.7"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
              >
                <span style={{ ...styles.infoLabel, color: COLORS.textPrimary }}>{label}</span>
                <span style={{ ...styles.infoValue, color: COLORS.textSecondary }}>{ext}</span>
              </button>
            ))}
          </div>
        </div>
      )}

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
              <span style={{ ...styles.infoValue, color: "var(--accent)", fontWeight: 600 }}>
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
            ▾
          </button>
        )}
        <div ref={listRef} style={styles.messageList}>
          {messages.map((msg, i) => {
            const isUser = msg.role === "user";
            const isStreamingBubble =
              streaming && !isUser && i === messages.length - 1;
            const hasCard = !isUser && !isStreamingBubble &&
              !!(msg.breathingTool || msg.reframeTool || msg.prepTool || msg.supportTool);
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
                <div style={{
                  ...styles.messageBubble,
                  ...(isUser ? styles.userBubble : styles.assistantBubble),
                  ...(hasCard ? { maxWidth: "620px" } : {}),
                }}>
                  {isStreamingBubble && msg.content === "" ? (
                    <span style={styles.typingDots}>{TYPING_FRAMES[typingFrame]}</span>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>
                      {isStreamingBubble ? msg.content + " ▍" : msg.content}
                    </ReactMarkdown>
                  )}
                  {!isUser && msg.breathingTool && !isStreamingBubble && (
                    <div style={{ marginTop: msg.content ? 10 : 0 }}>
                      <BreathingWidget tool={msg.breathingTool} />
                    </div>
                  )}
                  {!isUser && msg.reframeTool && !isStreamingBubble && (
                    <div style={{ marginTop: msg.content ? 10 : 0 }}>
                      <ReframeWidget tool={msg.reframeTool} />
                    </div>
                  )}
                  {!isUser && msg.prepTool && !isStreamingBubble && (
                    <div style={{ marginTop: msg.content ? 10 : 0 }}>
                      <PrepWidget tool={msg.prepTool} />
                    </div>
                  )}
                  {!isUser && msg.supportTool && !isStreamingBubble && (
                    <div style={{ marginTop: msg.content ? 10 : 0 }}>
                      <SupportWidget
                        tool={msg.supportTool}
                        apiKey={apiKey}
                        initialResults={msg.supportResults}
                        onResultsSaved={(r) =>
                          setMessages((prev) => {
                            const next = [...prev];
                            next[i] = { ...next[i], supportResults: r };
                            return next;
                          })
                        }
                      />
                    </div>
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

