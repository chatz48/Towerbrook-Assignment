import type { ThemeFocus } from "@/lib/theme-focus";
import { buildOutreachContextText, type OutreachPlanState } from "@/lib/outreach-plan";
import { workspaceKindLabel, type WorkspaceItem } from "@/lib/workspace";
import { getTheme } from "@/lib/themes";
import type { ThemeId } from "@/lib/types";
import type { AskResponse, ChatTurn, CopilotFilters, PageContext } from "./types";

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  answer?: AskResponse;
};

export function makeInitialFilters(
  theme: ThemeFocus,
  includeTowerBrookEmployees: boolean,
): CopilotFilters {
  return {
    objective: "Find experts",
    theme,
    geography: "Europe / North America",
    archetypes: ["operator", "advisor", "banker", "ex-founder"],
    sourceScope: "Premium sourced directory",
    includeTowerBrookEmployees,
  };
}

export function defaultQuestion(theme: ThemeFocus) {
  if (theme === "clean-energy-advisory") {
    return "Who should I call first to assess clean-energy advisory and development opportunities?";
  }
  if (theme === "grid-infrastructure") {
    return "Who should I call first for grid interconnection bottlenecks?";
  }
  if (theme === "smart-water") {
    return "Who should I call first to assess smart-water infrastructure and analytics opportunities?";
  }
  return "Who should I call first across the three investment themes?";
}

export type IdleStarter =
  | { kind: "prompt"; label: string; prompt: string }
  | { kind: "link"; label: string; href: string };

/** Empty-state chips — only actions the directory and graph can support. */
export function idlePromptSuggestions(theme: string): IdleStarter[] {
  const focus = theme as ThemeFocus;
  const themeName =
    focus === "grid-infrastructure"
      ? "grid infrastructure"
      : focus === "clean-energy-advisory"
        ? "clean energy advisory"
        : focus === "smart-water"
          ? "smart water"
          : "the current theme";

  return [
    { kind: "prompt", label: "Top experts", prompt: defaultQuestion(focus) },
    {
      kind: "prompt",
      label: "Actionable targets",
      prompt: "Which companies are most actionable and which experts validate them?",
    },
    { kind: "link", label: "Relationship graph", href: "/graph" },
    {
      kind: "prompt",
      label: "Draft outreach",
      prompt: `Draft concise outreach for the top-ranked expert on ${themeName}, grounded in their role, linked companies, and why they are relevant.`,
    },
  ];
}

/** Send enough turns for server-side memory compaction (summarise after five Q&A pairs). */
export const MAX_CHAT_HISTORY_TURNS = 24;

export function toChatHistory(messages: ConversationMessage[]): ChatTurn[] {
  return messages
    .map((message) => ({
      role: message.role,
      content:
        message.role === "assistant" && message.answer
          ? assistantHistoryContent(message.content, message.answer)
          : message.content,
    }))
    .filter((message) => message.content.trim().length > 0)
    .slice(-MAX_CHAT_HISTORY_TURNS);
}

function assistantHistoryContent(summary: string, answer: AskResponse): string {
  const experts = answer.ranked_experts
    .slice(0, 3)
    .map((e) => `${e.name} (${e.expert_id})`)
    .join(", ");
  const companies = answer.ranked_companies
    .slice(0, 3)
    .map((c) => `${c.name} (${c.company_id})`)
    .join(", ");
  return [summary, experts ? `Top experts: ${experts}` : "", companies ? `Top companies: ${companies}` : ""]
    .filter(Boolean)
    .join("\n");
}

export function mergePageContext(
  focus: PageContext | undefined,
  basket: PageContext,
): PageContext {
  if (!focus) return basket;
  return {
    title: focus.title ?? basket.title,
    pathname: focus.pathname ?? basket.pathname,
    headings: [...(focus.headings ?? []), ...(basket.headings ?? [])],
    visibleText: [focus.visibleText, basket.visibleText].filter(Boolean).join("\n\n"),
    selectedText: focus.selectedText,
    url: focus.url,
  };
}

export async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return { error: "The server returned a non-JSON response." };
  }
}

export function responseError(data: unknown, fallback: string) {
  return isRecord(data) && typeof data.error === "string" ? data.error : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function makeMessageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function collectCitations(items: { citations: string[] }[]): string[] {
  return [...new Set(items.flatMap((item) => item.citations))].slice(0, 4);
}

export function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function buildWorkspacePageContext(
  items: WorkspaceItem[],
  filters: CopilotFilters,
  outreachState?: OutreachPlanState,
): PageContext {
  const saved = items.slice(0, 16).map((item) => {
    const detail = [workspaceKindLabel(item.kind), item.name, item.sub, item.note, item.status]
      .filter(Boolean)
      .join(" | ");
    return `- ${detail}`;
  });
  const outreach = outreachState ? buildOutreachContextText(outreachState) : "";
  const sections = [
    saved.length
      ? `Current basket for this investment workflow:\n${saved.join("\n")}`
      : "Current basket is empty.",
    outreach ? `Call list outreach state (owner, status, notes):\n${outreach}` : "",
  ].filter(Boolean);
  return {
    title: "AI Copilot",
    pathname: "/ask",
    headings: [
      `Theme: ${themeLabel(filters.theme)}`,
      `Objective: ${filters.objective}`,
      `Saved basket items: ${items.length}`,
      outreach ? "Call list outreach notes attached" : "",
    ].filter(Boolean),
    visibleText: sections.join("\n\n"),
  };
}

export function buildBasketPrompt(items: WorkspaceItem[], theme: string, instruction: string): string {
  const saved = items.length
    ? items
        .slice(0, 12)
        .map((item) => `${workspaceKindLabel(item.kind)}: ${item.name}${item.sub ? ` (${item.sub})` : ""}`)
        .join("; ")
    : "No saved basket items yet.";
  return `${instruction}\n\nTheme: ${themeLabel(theme)}\nBasket: ${saved}`;
}

export function themeLabel(value: string): string {
  if (value === "all") return "All themes";
  return getTheme(value as ThemeId)?.name ?? value;
}

export function formatSourceId(sourceId: string): string {
  return sourceId.replace(/^[A-Z]+/, "");
}
