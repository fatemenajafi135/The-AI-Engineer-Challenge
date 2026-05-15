"use client";

import { useState } from "react";
import { styles } from "./styles";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ReframeTool = {
  original_thought: string;
  distortion_type:
    | "catastrophizing"
    | "overgeneralization"
    | "all_or_nothing"
    | "mind_reading"
    | "fortune_telling"
    | "personalization"
    | "filtering";
  reframe: string;
  evidence_against: string[];
};

// ── Distortion metadata ───────────────────────────────────────────────────────

const DISTORTION_LABELS: Record<ReframeTool["distortion_type"], string> = {
  catastrophizing:    "Catastrophizing",
  overgeneralization: "Overgeneralization",
  all_or_nothing:     "All-or-Nothing",
  mind_reading:       "Mind Reading",
  fortune_telling:    "Fortune Telling",
  personalization:    "Personalization",
  filtering:          "Filtering",
};

const DISTORTION_DEFS: Record<ReframeTool["distortion_type"], string> = {
  catastrophizing:    "Assuming the worst possible outcome will definitely happen.",
  overgeneralization: "One bad event becomes a never-ending pattern of defeat.",
  all_or_nothing:     "Seeing situations in black and white with no room for nuance.",
  mind_reading:       "Assuming you know what others are thinking, usually negatively.",
  fortune_telling:    "Predicting the future as if it's already decided — and bad.",
  personalization:    "Taking personal blame for things outside your control.",
  filtering:          "Focusing exclusively on negatives while filtering out positives.",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function ReframeWidget({ tool }: { tool: ReframeTool }) {
  const [showDef, setShowDef] = useState(false);

  return (
    <div style={styles.reframeCard}>

      {/* Distortion pill — tappable to reveal definition */}
      <button
        style={styles.reframeDistortionPill}
        onClick={() => setShowDef((v) => !v)}
      >
        {DISTORTION_LABELS[tool.distortion_type]}&nbsp;{showDef ? "▴" : "↗"}
      </button>
      {showDef && (
        <p style={styles.reframeDefinition}>
          {DISTORTION_DEFS[tool.distortion_type]}
        </p>
      )}

      {/* Two-panel side-by-side */}
      <div style={styles.reframePanels}>
        <div style={{ ...styles.reframePanel, paddingLeft: 0 }}>
          <span style={styles.reframePanelLabel}>What you said</span>
          <p style={styles.reframeOriginal}>&ldquo;{tool.original_thought}&rdquo;</p>
        </div>
        <div style={styles.reframePanelDivider} />
        <div style={{ ...styles.reframePanel, paddingRight: 0 }}>
          <span style={styles.reframePanelLabel}>Another way to see it</span>
          <p style={styles.reframeReframe}>{tool.reframe}</p>
        </div>
      </div>

      {/* Evidence list */}
      <div style={styles.reframeEvidenceSection}>
        <span style={styles.reframeEvidenceTitle}>Evidence against this</span>
        <ul style={styles.reframeEvidenceList}>
          {tool.evidence_against.map((e, i) => (
            <li key={i} style={styles.reframeEvidenceItem}>· {e}</li>
          ))}
        </ul>
      </div>

    </div>
  );
}
