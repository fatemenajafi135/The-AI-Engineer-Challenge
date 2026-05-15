// Refactor note: ReactMarkdown component overrides extracted from page.tsx.
// Styling config only — no logic lives here.

import type { ComponentProps } from "react";
import ReactMarkdown from "react-markdown";
import { COLORS, MONO_FONT } from "../config";

export const md: ComponentProps<typeof ReactMarkdown>["components"] = {
  p:          ({ children }) => <p style={{ margin: "0 0 6px 0", lineHeight: "1.6" }}>{children}</p>,
  ul:         ({ children }) => <ul style={{ margin: "4px 0 6px 0", paddingLeft: "20px" }}>{children}</ul>,
  ol:         ({ children }) => <ol style={{ margin: "4px 0 6px 0", paddingLeft: "20px" }}>{children}</ol>,
  li:         ({ children }) => <li style={{ margin: "2px 0", lineHeight: "1.6" }}>{children}</li>,
  strong:     ({ children }) => <strong style={{ color: COLORS.textPrimary, fontWeight: 700 }}>{children}</strong>,
  em:         ({ children }) => <em style={{ fontStyle: "italic", color: COLORS.textAccentSoft }}>{children}</em>,
  a:          ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" style={{ color: COLORS.accent, textDecoration: "underline" }}>{children}</a>,
  blockquote: ({ children }) => <blockquote style={{ borderLeft: `3px solid ${COLORS.accent}`, margin: "6px 0", paddingLeft: "12px", color: COLORS.textMuted }}>{children}</blockquote>,
  code:       ({ className, children }) =>
    className ? (
      <code style={{ fontFamily: MONO_FONT, fontSize: "13px" }}>{children}</code>
    ) : (
      <code style={{ background: COLORS.bgCode, padding: "1px 5px", borderRadius: "4px", fontFamily: MONO_FONT, fontSize: "0.875em" }}>{children}</code>
    ),
  pre: ({ children }) => (
    <pre style={{ background: COLORS.bgCode, padding: "10px 12px", borderRadius: "8px", overflowX: "auto", whiteSpace: "pre-wrap", margin: "4px 0 6px 0", fontFamily: MONO_FONT, fontSize: "13px" }}>
      {children}
    </pre>
  ),
  h1: ({ children }) => <h1 style={{ fontSize: "18px", fontWeight: 700, margin: "6px 0 4px 0", color: COLORS.textPrimary }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "6px 0 4px 0", color: COLORS.textPrimary }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{ fontSize: "15px", fontWeight: 600, margin: "6px 0 4px 0", color: COLORS.textPrimary }}>{children}</h3>,
};
