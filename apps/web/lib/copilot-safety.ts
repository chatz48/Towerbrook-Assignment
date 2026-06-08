import type { PageContext } from "./ask-types";
import type { SessionCalibration, SessionObjective } from "./score";

/** Map Copilot filter labels to session scoring objectives. */
export function objectiveToSession(objective: string): SessionObjective {
  const lower = objective.toLowerCase();
  if (lower.includes("company") || lower.includes("target")) return "investable-companies";
  if (lower.includes("red") || lower.includes("risk") || lower.includes("disconfirm")) return "red-team";
  if (lower.includes("call") || lower.includes("prep")) return "deal-process";
  if (lower.includes("pain") || lower.includes("buyer")) return "buyer-pain";
  if (lower.includes("founder") || lower.includes("intro")) return "founder-introductions";
  if (lower.includes("market") || lower.includes("structure")) return "market-structure";
  return "market-structure";
}

export function geographyToSession(geography?: string): SessionCalibration["geography"] {
  const lower = (geography ?? "").toLowerCase();
  if (lower.includes("north america") || lower.includes("us")) return "north-america";
  if (lower.includes("europe") || lower.includes("uk")) return "uk-europe";
  return "global";
}

/** Page context safe for external LLM/backend — strips outreach notes and caps sensitive text. */
export function sanitizePageContextForExternal(pageContext?: PageContext): PageContext | undefined {
  if (!pageContext) return undefined;
  const redactedVisible = redactSensitiveText(pageContext.visibleText ?? "");
  const redactedSelected = redactSensitiveText(pageContext.selectedText ?? "");
  return {
    title: pageContext.title?.slice(0, 180),
    pathname: pageContext.pathname?.slice(0, 220),
    url: pageContext.url?.slice(0, 500),
    headings: (pageContext.headings ?? []).slice(0, 8),
    selectedText: redactedSelected.slice(0, 800),
    visibleText: redactedVisible.slice(0, 2000),
  };
}

function redactSensitiveText(text: string): string {
  return text
    .replace(/outreach notes?:[\s\S]*?(?=\n\n|$)/gi, "[outreach notes redacted]")
    .replace(/call list outreach state[\s\S]*?(?=\n\n|$)/gi, "[outreach state redacted]")
    .replace(/\bnote:\s*[^\n|]+/gi, "[note redacted]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email redacted]");
}

export type ExternalChatPayload = {
  question: string;
  theme_id?: string;
  objective?: string;
  geography?: string;
  baseline_summary?: string;
  ranked_expert_names?: string[];
  ranked_company_names?: string[];
  page_context?: {
    title?: string;
    pathname?: string;
    headings?: string[];
  };
  prior_entity_ids?: { expert_ids: string[]; company_ids: string[] };
  conversation_summary?: string;
  recent_turns?: Array<{ role: string; content: string }>;
};

/** Structured backend payload for LangGraph intent router + Keiro research. */
export function buildExternalChatPayload(
  question: string,
  filters: {
    theme?: string;
    objective?: string;
    geography?: string;
    includeTowerBrookEmployees?: boolean;
  },
  pageContext?: PageContext,
  entityIds?: { expert_ids: string[]; company_ids: string[] },
  baseline?: {
    answer_summary: string;
    ranked_expert_names: string[];
    ranked_company_names: string[];
  },
  memory?: {
    conversation_summary?: string;
    recent_turns?: Array<{ role: string; content: string }>;
  },
): { message: string; theme_id?: string } {
  const safe = sanitizePageContextForExternal(pageContext);
  const payload: ExternalChatPayload = {
    question,
    ...(filters.theme && filters.theme !== "all" ? { theme_id: filters.theme } : {}),
    ...(filters.objective ? { objective: filters.objective } : {}),
    ...(filters.geography ? { geography: filters.geography } : {}),
    ...(baseline
      ? {
          baseline_summary: baseline.answer_summary,
          ranked_expert_names: baseline.ranked_expert_names,
          ranked_company_names: baseline.ranked_company_names,
        }
      : {}),
    ...(safe
      ? {
          page_context: {
            title: safe.title,
            pathname: safe.pathname,
            headings: safe.headings,
          },
        }
      : {}),
    ...(entityIds ? { prior_entity_ids: entityIds } : {}),
    ...(memory?.conversation_summary ? { conversation_summary: memory.conversation_summary } : {}),
    ...(memory?.recent_turns?.length ? { recent_turns: memory.recent_turns.slice(0, 4) } : {}),
  };
  return {
    message: JSON.stringify(payload),
    ...(payload.theme_id ? { theme_id: payload.theme_id } : {}),
  };
}
