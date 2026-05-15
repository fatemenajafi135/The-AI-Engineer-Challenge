"use client";

import { useState } from "react";
import { styles } from "./styles";
import { SUPPORT_SEARCH_ENDPOINT } from "../config";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SupportTool = {
  concern_type:
    | "anxiety" | "depression" | "trauma" | "relationships"
    | "grief"   | "addiction"  | "general" | "other";
  format_preference:   "in_person" | "online" | "either";
  language_preference: string;
};

type SupportResult = {
  name:        string;
  type:        "therapist" | "center" | "platform";
  format:      "in_person" | "online" | "hybrid";
  description: string;
  url:         string;
};

type CrisisResource = {
  name:   string;
  number: string | null;
  url:    string | null;
};

type Stage = "form" | "loading" | "results" | "error";

// ── Metadata ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<SupportResult["type"], string> = {
  therapist: "Therapist",
  center:    "Center",
  platform:  "Platform",
};

const FORMAT_LABELS: Record<SupportResult["format"], string> = {
  in_person: "In-person",
  online:    "Online",
  hybrid:    "Hybrid",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function SupportWidget({ tool, apiKey }: { tool: SupportTool; apiKey: string }) {
  const [stage,    setStage]   = useState<Stage>("form");
  const [country,  setCountry] = useState("");
  const [city,     setCity]    = useState("");
  const [language, setLanguage] = useState(tool.language_preference || "");
  const [results,  setResults] = useState<SupportResult[]>([]);
  const [crisis,   setCrisis]  = useState<CrisisResource | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const canSearch = country.trim().length > 0 && city.trim().length > 0;

  async function handleSearch() {
    if (!canSearch) return;
    setStage("loading");
    setErrorMsg("");

    try {
      const res = await fetch(SUPPORT_SEARCH_ENDPOINT, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country:             country.trim(),
          city:                city.trim(),
          concern_type:        tool.concern_type,
          format_preference:   tool.format_preference,
          language_preference: language.trim(),
          api_key:             apiKey,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail || "Search failed");
      }

      const data: { results: SupportResult[]; crisis: CrisisResource } = await res.json();
      setResults(data.results || []);
      setCrisis(data.crisis || null);
      setStage("results");
    } catch (err) {
      setErrorMsg((err as Error).message || "Something went wrong. Please try again.");
      setStage("error");
    }
  }

  // ── Stage: form ─────────────────────────────────────────────────────────────
  if (stage === "form") {
    return (
      <div style={styles.supportCard}>
        <div style={styles.supportFormHeader}>
          <span style={styles.supportFormTitle}>🌱 Let&apos;s find real support near you</span>
          <span style={styles.supportFormSubtitle}>
            Your location stays private — used only for this search
          </span>
        </div>

        <div style={styles.supportFormBody}>
          <div style={styles.supportFormRow}>
            <label style={styles.supportFormLabel} htmlFor="support-country">Country</label>
            <input
              id="support-country"
              style={styles.supportFormInput}
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="e.g. Iran, United States…"
              autoFocus
            />
          </div>

          <div style={styles.supportFormRow}>
            <label style={styles.supportFormLabel} htmlFor="support-city">City</label>
            <input
              id="support-city"
              style={styles.supportFormInput}
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="e.g. Tehran, New York…"
            />
          </div>

          <div style={styles.supportFormRow}>
            <label style={styles.supportFormLabel} htmlFor="support-lang">
              Language preference <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span>
            </label>
            <input
              id="support-lang"
              style={styles.supportFormInput}
              type="text"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="e.g. Farsi, Spanish, any…"
            />
          </div>

          <button
            style={{ ...styles.supportSubmitBtn, ...(!canSearch ? styles.supportSubmitBtnDisabled : {}) }}
            onClick={handleSearch}
            disabled={!canSearch}
          >
            Find support →
          </button>
        </div>
      </div>
    );
  }

  // ── Stage: loading ──────────────────────────────────────────────────────────
  if (stage === "loading") {
    return (
      <div style={styles.supportCard}>
        <div style={styles.supportLoadingWrap}>
          <span style={styles.supportLoadingText}>Searching for support near {city}, {country}…</span>
          <span style={styles.typingDots}><span>●</span><span>●</span><span>●</span></span>
        </div>
      </div>
    );
  }

  // ── Stage: error ────────────────────────────────────────────────────────────
  if (stage === "error") {
    return (
      <div style={styles.supportCard}>
        <div style={styles.supportErrorWrap}>
          <span style={styles.supportErrorText}>{errorMsg}</span>
          <button style={styles.supportSearchAgainBtn} onClick={() => setStage("form")}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ── Stage: results ──────────────────────────────────────────────────────────
  return (
    <div style={styles.supportCard}>

      {/* Crisis strip — always shown at the top */}
      {crisis && (
        <div style={styles.supportCrisisStrip}>
          <span style={styles.supportCrisisLabel}>🆘 Immediate help:</span>
          <span style={styles.supportCrisisName}>{crisis.name}</span>
          {crisis.number && (
            <span style={styles.supportCrisisNumber}>{crisis.number}</span>
          )}
          {crisis.url && (
            <a
              style={styles.supportCrisisLink}
              href={crisis.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit →
            </a>
          )}
        </div>
      )}

      {/* Results header */}
      <div style={styles.supportResultsHeader}>
        Support near <strong>{city}, {country}</strong>
      </div>

      {/* No results fallback */}
      {results.length === 0 && (
        <div style={styles.supportNoResults}>
          No listings found for this location. Try a nearby city or adjust your search.
        </div>
      )}

      {/* Result cards */}
      {results.map((r, i) => (
        <div key={i} style={styles.supportResultCard}>
          <div style={styles.supportResultTop}>
            <span style={styles.supportResultName}>{r.name}</span>
            <div style={styles.supportResultTagRow}>
              <span style={styles.supportResultTag}>{TYPE_LABELS[r.type] ?? r.type}</span>
              <span style={styles.supportResultFormatTag}>{FORMAT_LABELS[r.format] ?? r.format}</span>
            </div>
          </div>
          <p style={styles.supportResultDesc}>{r.description}</p>
          {r.url && (
            <a
              style={styles.supportResultLink}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit →
            </a>
          )}
        </div>
      ))}

      {/* Footer */}
      <div style={styles.supportResultsFooter}>
        <span style={styles.supportDisclaimer}>
          ⓘ These are starting points — verify credentials before booking
        </span>
        <button style={styles.supportSearchAgainBtn} onClick={() => setStage("form")}>
          Search again
        </button>
      </div>

    </div>
  );
}
