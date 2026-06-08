import type { AskResponse } from "./ask-types";

export function normalizeModelResponse(value: unknown, baseline: AskResponse): AskResponse {
  if (!isRecord(value)) return baseline;
  const allowedExpertIds = new Set(baseline.ranked_experts.map((e) => e.expert_id));
  const allowedCompanyIds = new Set(baseline.ranked_companies.map((c) => c.company_id));
  const allowedSourceIds = new Set(baseline.sources_used.map((s) => s.source_id));

  const next: AskResponse = {
    ...baseline,
    // Narrative fields stay baseline-locked — model may only refine cited blocks below.
    answer_summary: baseline.answer_summary,
    gaps: baseline.gaps,
    assumptions: baseline.assumptions,
    grounded: baseline.grounded,
    model_refined: true,
    model: baseline.model,
  };

  if (Array.isArray(value.call_sequence)) {
    next.call_sequence = value.call_sequence
      .map((item, index) => {
        if (!isRecord(item)) return baseline.call_sequence[index];
        const expert_ids = stringArray(item.expert_ids, baseline.call_sequence[index]?.expert_ids ?? [])
          .filter((id) => allowedExpertIds.has(id));
        return {
          phase: stringOr(item.phase, baseline.call_sequence[index]?.phase ?? "Call"),
          expert_ids,
          goal: stringOr(item.goal, baseline.call_sequence[index]?.goal ?? ""),
          citations: cleanCitations(item.citations, allowedSourceIds),
        };
      })
      .filter((item) => item && item.expert_ids.length > 0);
  }

  if (Array.isArray(value.what_to_listen_for)) {
    next.what_to_listen_for = value.what_to_listen_for
      .map((item, index) => {
        if (!isRecord(item)) return baseline.what_to_listen_for[index];
        return {
          claim: stringOr(item.claim, baseline.what_to_listen_for[index]?.claim ?? ""),
          raises_conviction_if: stringOr(
            item.raises_conviction_if,
            baseline.what_to_listen_for[index]?.raises_conviction_if ?? "",
          ),
          reduces_conviction_if: stringOr(
            item.reduces_conviction_if,
            baseline.what_to_listen_for[index]?.reduces_conviction_if ?? "",
          ),
          citations: cleanCitations(item.citations, allowedSourceIds),
        };
      })
      .filter(Boolean);
  }

  if (Array.isArray(value.risks)) {
    next.risks = value.risks
      .map((item, index) => {
        if (!isRecord(item)) return baseline.risks[index];
        return {
          risk: stringOr(item.risk, baseline.risks[index]?.risk ?? ""),
          why_it_matters: stringOr(item.why_it_matters, baseline.risks[index]?.why_it_matters ?? ""),
          disconfirming_question: stringOr(
            item.disconfirming_question,
            baseline.risks[index]?.disconfirming_question ?? "",
          ),
          citations: cleanCitations(item.citations, allowedSourceIds),
        };
      })
      .filter(Boolean);
  }

  next.ranked_experts = baseline.ranked_experts.filter((expert) =>
    allowedExpertIds.has(expert.expert_id),
  );
  next.ranked_companies = baseline.ranked_companies.filter((company) =>
    allowedCompanyIds.has(company.company_id),
  );
  next.sources_used = baseline.sources_used;
  return next;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function stringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const next = value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
  return next.length ? next : fallback;
}

function cleanCitations(value: unknown, allowed: Set<string>): string[] {
  return stringArray(value, []).filter((id) => allowed.has(id)).slice(0, 3);
}
