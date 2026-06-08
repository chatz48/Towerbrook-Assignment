import type { ScoreBreakdown } from "./score";

export type ScoreHelpLine = { label: string; value: string };

function formatPoints(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return String(value);
  return "—";
}

export function relevanceScoreLines(breakdown: ScoreBreakdown): ScoreHelpLine[] {
  const lines: ScoreHelpLine[] = [
    { label: "Expert type", value: formatPoints(breakdown.base) },
    { label: "Company links", value: formatPoints(breakdown.edges) },
  ];
  if (breakdown.signals > 0) {
    lines.push({ label: "Recent signals", value: formatPoints(breakdown.signals) });
  }
  if (breakdown.recency > 0) {
    lines.push({ label: "Timely news", value: formatPoints(breakdown.recency) });
  }
  if (breakdown.access !== 0) {
    lines.push({
      label: "Access",
      value:
        breakdown.access > 0
          ? `+${breakdown.access} (less obvious name)`
          : `${breakdown.access} (well-known name)`,
    });
  }
  if (breakdown.crossTheme > 0) {
    lines.push({ label: "Cross-theme", value: formatPoints(breakdown.crossTheme) });
  }
  lines.push({ label: "Total", value: String(breakdown.total) });
  return lines;
}

export const RELEVANCE_SCORE_FOOTNOTE =
  "Weighted by source confidence on the expert record. Higher scores surface people with stronger theme fit, company edges, and timely signals.";
