"use client";

import { useState, useEffect } from "react";
import { styles } from "./styles";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BreathingTool = {
  technique: "box" | "physiological_sigh" | "4-7-8";
  cycles: number;
  reason: string;
};

type Phase = { label: string; s: number; scale: number };
type Status = "idle" | "running" | "paused" | "done";

// ── Technique configs ─────────────────────────────────────────────────────────

const TECHNIQUE_PHASES: Record<BreathingTool["technique"], Phase[]> = {
  box: [
    { label: "Inhale",  s: 4, scale: 1.5 },
    { label: "Hold",    s: 4, scale: 1.5 },
    { label: "Exhale",  s: 4, scale: 0.8 },
    { label: "Hold",    s: 4, scale: 0.8 },
  ],
  physiological_sigh: [
    { label: "Inhale",   s: 2, scale: 1.3 },
    { label: "& again…", s: 1, scale: 1.5 },
    { label: "Exhale",   s: 6, scale: 0.8 },
  ],
  "4-7-8": [
    { label: "Inhale",  s: 4, scale: 1.5 },
    { label: "Hold",    s: 7, scale: 1.5 },
    { label: "Exhale",  s: 8, scale: 0.8 },
  ],
};

const TECHNIQUE_NAMES: Record<BreathingTool["technique"], string> = {
  box:                "Box Breathing",
  physiological_sigh: "Physiological Sigh",
  "4-7-8":            "4-7-8 Breathing",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function BreathingWidget({ tool }: { tool: BreathingTool }) {
  const phases = TECHNIQUE_PHASES[tool.technique];

  const [status, setStatus]       = useState<Status>("idle");
  const [phaseIdx, setPhaseIdx]   = useState(0);
  const [cycleNum, setCycleNum]   = useState(1);

  // Advance through phases on a timer; clears itself when paused/done
  useEffect(() => {
    if (status !== "running") return;
    const phase = phases[phaseIdx];
    const t = setTimeout(() => {
      const next = phaseIdx + 1;
      if (next >= phases.length) {
        if (cycleNum >= tool.cycles) {
          setStatus("done");
        } else {
          setCycleNum((c) => c + 1);
          setPhaseIdx(0);
        }
      } else {
        setPhaseIdx(next);
      }
    }, phase.s * 1000);
    return () => clearTimeout(t);
  }, [status, phaseIdx, cycleNum, phases, tool.cycles]);

  function skip() {
    setStatus("done");
    setPhaseIdx(0);
  }

  const phase    = phases[phaseIdx];
  const isIdle   = status === "idle";
  const isRunning = status === "running";
  const isPaused = status === "paused";
  const isDone   = status === "done";

  // Circle scale: neutral when idle/paused, driven by phase when running/done-snapshot
  const circleScale = isIdle || isPaused ? 1.0 : phase.scale;
  const circleTransition = isIdle || isPaused
    ? "transform 0.4s ease-out"
    : `transform ${phase.s}s ease-in-out`;

  // Phase label shown inside the circle
  const circleLabel = isIdle ? "●" : isPaused ? "❙❙" : phase.label;

  return (
    <div style={styles.breathingCard}>

      {/* Header */}
      <div style={styles.breathingHeader}>
        <span style={styles.breathingTitle}>{TECHNIQUE_NAMES[tool.technique]}</span>
        <span style={styles.breathingReason}>{tool.reason}</span>
      </div>

      {/* Animated circle — hidden once done to make room for the completion toast */}
      {!isDone && (
        <div style={styles.breathingCircleWrap}>
          <div
            className={isRunning ? "breathing-ring" : undefined}
            style={{
              ...styles.breathingCircle,
              transform: `scale(${circleScale})`,
              transition: circleTransition,
            }}
          >
            <span style={styles.breathingLabel}>{circleLabel}</span>
          </div>
        </div>
      )}

      {/* Cycle counter */}
      {!isIdle && !isDone && (
        <p style={styles.breathingSubtitle}>
          Cycle {cycleNum} of {tool.cycles}
        </p>
      )}

      {/* Controls */}
      {!isDone && (
        <div style={styles.breathingControls}>
          {isIdle && (
            <button style={styles.breathingBtnPrimary} onClick={() => setStatus("running")}>
              Start
            </button>
          )}
          {isRunning && (
            <>
              <button style={styles.breathingBtn} onClick={() => setStatus("paused")}>Pause</button>
              <button style={styles.breathingBtn} onClick={skip}>Skip</button>
            </>
          )}
          {isPaused && (
            <>
              <button style={styles.breathingBtnPrimary} onClick={() => setStatus("running")}>Resume</button>
              <button style={styles.breathingBtn} onClick={skip}>Skip</button>
            </>
          )}
        </div>
      )}

      {/* Completion toast */}
      {isDone && (
        <div style={styles.breathingDoneToast}>
          <p style={styles.breathingDoneTitle}>Great work 🌱</p>
          <p style={styles.breathingAck}>
            I hope that helped. Take your time. Whenever you&apos;re ready, keep going.
          </p>
        </div>
      )}

    </div>
  );
}
