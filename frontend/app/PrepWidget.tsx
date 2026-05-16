"use client";

import { useState } from "react";
import { styles } from "./styles";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PrepTool = {
  situation_type:
    | "interview"
    | "presentation"
    | "hard_conversation"
    | "medical"
    | "exam"
    | "first_date"
    | "performance_review"
    | "other";
  event_description: string;
  worries: string[];
  reframes: string[];
  anchors: string[];
  scripts?: { tone: "direct" | "gentle" | "written"; text: string }[];
};

// ── Metadata ──────────────────────────────────────────────────────────────────

const SITUATION_LABELS: Record<PrepTool["situation_type"], string> = {
  interview:          "Interview",
  presentation:       "Presentation",
  hard_conversation:  "Hard Conversation",
  medical:            "Medical",
  exam:               "Exam",
  first_date:         "First Date",
  performance_review: "Performance Review",
  other:              "Other",
};

const TONE_LABELS: Record<"direct" | "gentle" | "written", string> = {
  direct:  "Direct",
  gentle:  "Gentle",
  written: "Written",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function PrepWidget({ tool }: { tool: PrepTool }) {
  const [checkedAnchors, setCheckedAnchors] = useState<number[]>([]);
  const [activeScriptTab, setActiveScriptTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const hasScripts = tool.scripts && tool.scripts.length > 0;

  function toggleAnchor(i: number) {
    setCheckedAnchors((prev) =>
      prev.includes(i) ? prev.filter((n) => n !== i) : [...prev, i]
    );
  }

  function copyScript() {
    const script = tool.scripts?.[activeScriptTab];
    if (!script) return;
    navigator.clipboard.writeText(script.text)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => { setCopyFailed(true); setTimeout(() => setCopyFailed(false), 2000); });
  }

  return (
    <div style={styles.prepCard}>

      {/* Header — situation pill + event description */}
      <div style={styles.prepHeader}>
        <span style={styles.prepSituationPill}>
          {SITUATION_LABELS[tool.situation_type]}
        </span>
        <span style={styles.prepEventDesc}>{tool.event_description}</span>
      </div>

      {/* Worries → Reframes */}
      <div style={styles.prepSection}>
        <span style={styles.prepSectionTitle}>Worries → Reframes</span>
        {tool.worries.map((worry, i) => (
          <div key={i} style={styles.prepWorryRow}>
            <p style={styles.prepWorryText}>{worry}</p>
            <span style={styles.prepArrow}>→</span>
            <p style={styles.prepReframeText}>{tool.reframes[i] ?? ""}</p>
          </div>
        ))}
      </div>

      {/* Anchors — interactive checkboxes */}
      <div style={styles.prepSection}>
        <span style={styles.prepSectionTitle}>Grounding steps</span>
        {tool.anchors.map((anchor, i) => {
          const checked = checkedAnchors.includes(i);
          return (
            <div
              key={i}
              style={styles.prepAnchorRow}
              onClick={() => toggleAnchor(i)}
              role="checkbox"
              aria-checked={checked}
            >
              <input
                type="checkbox"
                checked={checked}
                readOnly
                style={{ accentColor: "#9472B6", cursor: "pointer", flexShrink: 0 }}
              />
              <span
                style={{
                  ...styles.prepAnchorText,
                  ...(checked ? { opacity: 0.45, textDecoration: "line-through" } : {}),
                }}
              >
                {anchor}
              </span>
            </div>
          );
        })}
      </div>

      {/* Scripts — only for hard_conversation */}
      {hasScripts && (
        <div style={styles.prepSection}>
          <span style={styles.prepSectionTitle}>Scripts</span>
          <div style={styles.prepTabRow}>
            {tool.scripts!.map((s, i) => (
              <button
                key={i}
                style={i === activeScriptTab ? styles.prepTabActive : styles.prepTab}
                onClick={() => setActiveScriptTab(i)}
              >
                {TONE_LABELS[s.tone]}
              </button>
            ))}
          </div>
          <div style={styles.prepScriptWrap}>
            <p style={styles.prepScriptBlock}>
              {tool.scripts![activeScriptTab].text}
            </p>
            <button style={styles.prepCopyBtn} onClick={copyScript}>
              {copied ? "Copied!" : copyFailed ? "Failed" : "Copy"}
            </button>
          </div>
        </div>
      )}


</div>
  );
}
