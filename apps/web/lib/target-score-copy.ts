import type { TargetScorecard } from "./investment-readiness";
import type { TowerBrookScore } from "./towerbrook";
import type { ScoreHelpLine } from "./score-copy";

const TARGET_COMPONENT_LABELS: Record<keyof TargetScorecard["components"], string> = {
  marketFit: "Market fit",
  ownership: "Ownership",
  expertValidation: "Expert validation",
  evidence: "Evidence",
  scale: "Scale",
  towerBrookPath: "TowerBrook path",
};

const TARGET_COMPONENT_MAX: Record<keyof TargetScorecard["components"], number> = {
  marketFit: 20,
  ownership: 20,
  expertValidation: 20,
  evidence: 15,
  scale: 12,
  towerBrookPath: 13,
};

export function targetScorecardLines(scorecard: TargetScorecard): ScoreHelpLine[] {
  const lines = (
    Object.entries(scorecard.components) as [keyof TargetScorecard["components"], number][]
  ).map(([key, value]) => ({
    label: TARGET_COMPONENT_LABELS[key],
    value: `${value}/${TARGET_COMPONENT_MAX[key]}`,
  }));
  lines.push({ label: "Total", value: `${scorecard.total}/100` });
  return lines;
}

export const TARGET_SCORE_FOOTNOTE =
  "Combines theme fit, ownership, named expert links, source quality, scale signals, and TowerBrook relationship path.";

export function towerBrookScoreLines(score: TowerBrookScore): ScoreHelpLine[] {
  const lines: ScoreHelpLine[] = [{ label: "Relationship", value: score.label }];
  for (const reason of score.reasons) {
    lines.push({ label: "Why", value: reason });
  }
  lines.push({ label: "Score", value: String(score.score) });
  return lines;
}

export const TOWERBROOK_SCORE_FOOTNOTE =
  "100 = TowerBrook team · 90+ portfolio · 80+ named transaction advisor · lower = thematic infrastructure fit.";
