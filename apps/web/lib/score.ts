import type { Expert, ExpertType, RelationshipType, ThemeId } from "./types";

// Tune weights to match how the deal team prioritises experts.
export const SCORE_WEIGHTS = {
  byType: {
    "ex-founder": 30,
    investor: 26,
    banker: 24,
    advisor: 22,
    "strategy-consultant": 21,
    "commercial-dd": 20,
    "technical-dd": 20,
    "engineering-consultant": 19,
    operator: 20,
    "regulatory-policy": 18,
    "service-provider": 16,
    lawyer: 16,
  } satisfies Record<ExpertType, number>,

  byRelationship: {
    founded: 14,
    "co-founded": 13,
    acquired: 12, // their company was acquired = exit-proven
    led: 10,
    partner: 9,
    "invested-in": 9,
    banked: 8,
    advised: 7,
    board: 7,
    "legal-counsel": 6,
    served: 5,
  } satisfies Record<RelationshipType, number>,

  /** Each recent "signal" (move, raise, exit) makes them timely to reach. */
  perSignal: 8,
  /** A dated news item in the last ~2 years = timely to reach. */
  recencyBoost: 12,
  /**
   * Access premium: a deal team values non-obvious connectors over names every
   * analyst already knows. Proprietary access scores up; obvious names down.
   */
  access: { proprietary: 12, obvious: -12 },
  /** Multi-theme experts connect dots across the taxonomy. */
  perExtraTheme: 6,
  /** Confidence scales the whole score so thin records don't top the list. */
  confidenceFloor: 0.5,
} as const;

export interface ScoreBreakdown {
  total: number;
  base: number;
  edges: number;
  signals: number;
  recency: number;
  access: number;
  crossTheme: number;
}

export type SessionObjective =
  | "market-structure"
  | "buyer-pain"
  | "investable-companies"
  | "deal-process"
  | "founder-introductions"
  | "red-team";

export type RankingOptimization =
  | "balanced"
  | "source-confidence"
  | "access"
  | "momentum"
  | "non-obvious";

export interface SessionCalibration {
  objective: SessionObjective;
  preferredTypes: ExpertType[];
  optimizeFor: RankingOptimization;
  theme?: ThemeId;
  geography?: "global" | "uk-europe" | "north-america";
}

export interface SessionScoreBreakdown extends ScoreBreakdown {
  baseTotal: number;
  sessionFit: number;
  objectiveFit: number;
  archetypeFit: number;
  geographyFit: number;
  optimizationFit: number;
  themeFit: number;
}

export const SESSION_OBJECTIVE_LABEL: Record<SessionObjective, string> = {
  "market-structure": "Understand market structure",
  "buyer-pain": "Validate buyer pain",
  "investable-companies": "Find investable companies",
  "deal-process": "Understand deal process",
  "founder-introductions": "Find founder introductions",
  "red-team": "Red-team the thesis",
};

export const OPTIMIZATION_LABEL: Record<RankingOptimization, string> = {
  balanced: "Balanced",
  "source-confidence": "Source confidence",
  access: "Access quality",
  momentum: "Momentum",
  "non-obvious": "Non-obvious names",
};

const OBJECTIVE_TYPE_FIT: Record<SessionObjective, Partial<Record<ExpertType, number>>> = {
  "market-structure": {
    advisor: 16,
    operator: 14,
    investor: 10,
    banker: 8,
    "strategy-consultant": 12,
    "commercial-dd": 10,
    "technical-dd": 10,
    "engineering-consultant": 10,
    "regulatory-policy": 12,
    "service-provider": 8,
  },
  "buyer-pain": {
    operator: 18,
    "commercial-dd": 14,
    "technical-dd": 14,
    "engineering-consultant": 14,
    "service-provider": 12,
    advisor: 10,
    "ex-founder": 8,
  },
  "investable-companies": {
    "ex-founder": 16,
    investor: 14,
    banker: 12,
    "strategy-consultant": 10,
    operator: 8,
  },
  "deal-process": {
    banker: 18,
    lawyer: 16,
    "commercial-dd": 12,
    "technical-dd": 12,
    investor: 12,
    advisor: 8,
  },
  "founder-introductions": {
    "ex-founder": 18,
    investor: 12,
    advisor: 10,
    operator: 8,
  },
  "red-team": {
    lawyer: 14,
    advisor: 14,
    operator: 12,
    "regulatory-policy": 12,
    "technical-dd": 10,
    "commercial-dd": 10,
    "engineering-consultant": 10,
    investor: 8,
    "service-provider": 8,
  },
};

/** A news item counts as "recent" if dated in the last ~2 years. */
function hasRecentNews(expert: Expert): boolean {
  const cutoff = "2024-01-01";
  return (expert.news ?? []).some((n) => n.date >= cutoff);
}

export function scoreExpert(expert: Expert): ScoreBreakdown {
  const base = SCORE_WEIGHTS.byType[expert.type] ?? 15;
  const edges = expert.companies.reduce(
    (sum, link) => sum + (SCORE_WEIGHTS.byRelationship[link.relationship] ?? 5),
    0,
  );
  const signals = (expert.signals?.length ?? 0) * SCORE_WEIGHTS.perSignal;
  const recency = hasRecentNews(expert) ? SCORE_WEIGHTS.recencyBoost : 0;
  const access = expert.access ? SCORE_WEIGHTS.access[expert.access] : 0;
  const crossTheme =
    Math.max(0, expert.themes.length - 1) * SCORE_WEIGHTS.perExtraTheme;

  const raw = base + edges + signals + recency + access + crossTheme;
  // Confidence dampens but never zeroes — scale from floor..1.
  const conf =
    SCORE_WEIGHTS.confidenceFloor +
    (1 - SCORE_WEIGHTS.confidenceFloor) * expert.confidence;

  return {
    total: Math.round(raw * conf),
    base,
    edges,
    signals,
    recency,
    access,
    crossTheme,
  };
}

/** Sort a list of experts by relevance score, descending. */
export function rankExperts(experts: Expert[]): { expert: Expert; score: ScoreBreakdown }[] {
  return experts
    .map((expert) => ({ expert, score: scoreExpert(expert) }))
    .sort((a, b) => b.score.total - a.score.total);
}

function geographyFit(expert: Expert, geography?: SessionCalibration["geography"]): number {
  if (!geography || geography === "global") return 0;
  const location = (expert.location ?? "").toLowerCase();
  if (geography === "uk-europe") {
    return /uk|united kingdom|london|ireland|europe|france|germany|spain|netherlands|denmark|sweden|norway/.test(location)
      ? 10
      : -4;
  }
  return /usa|u\.s|united states|canada|north america|california|new york|texas/.test(location)
    ? 10
    : -4;
}

function optimizationFit(expert: Expert, base: ScoreBreakdown, optimizeFor: RankingOptimization): number {
  switch (optimizeFor) {
    case "source-confidence":
      return Math.round(expert.confidence * 16);
    case "access":
      return expert.access === "proprietary" ? 16 : expert.access === "obvious" ? -8 : 0;
    case "momentum":
      return base.recency + Math.min(12, base.signals);
    case "non-obvious":
      return expert.access === "proprietary" ? 18 : expert.access === "obvious" ? -12 : 4;
    case "balanced":
    default:
      return 6;
  }
}

export function scoreExpertForSession(
  expert: Expert,
  calibration: SessionCalibration,
): SessionScoreBreakdown {
  const base = scoreExpert(expert);
  const objectiveFit = OBJECTIVE_TYPE_FIT[calibration.objective][expert.type] ?? 2;
  const archetypeFit = calibration.preferredTypes.includes(expert.type) ? 14 : 0;
  const geoFit = geographyFit(expert, calibration.geography);
  const optFit = optimizationFit(expert, base, calibration.optimizeFor);
  const themeFit = calibration.theme && expert.themes.includes(calibration.theme) ? 10 : 0;
  const sessionFit = objectiveFit + archetypeFit + geoFit + optFit + themeFit;

  return {
    ...base,
    baseTotal: base.total,
    objectiveFit,
    archetypeFit,
    geographyFit: geoFit,
    optimizationFit: optFit,
    themeFit,
    sessionFit,
    total: Math.max(0, base.total + sessionFit),
  };
}

export function rankExpertsForSession(
  experts: Expert[],
  calibration: SessionCalibration,
): { expert: Expert; score: SessionScoreBreakdown }[] {
  return experts
    .map((expert) => ({ expert, score: scoreExpertForSession(expert, calibration) }))
    .sort((a, b) => b.score.total - a.score.total);
}
