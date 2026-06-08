import { companiesWithLinks, getExperts } from "@/lib/data";
import type { ChatTurn, PageContext } from "@/lib/ask-types";
import type { WorkspaceKind } from "@/lib/workspace";
import type { Company, Expert } from "@/lib/types";
import { filterTowerBrookEmployees } from "@/lib/employee-scope";

export type ParsedBasketEntry = {
  kind: WorkspaceKind;
  name: string;
  sub?: string;
  entityId?: string;
};

const BASKET_LINE_PREFIX = /^-\s+/;
const KIND_BY_PROMPT_LABEL: Record<string, WorkspaceKind> = {
  expert: "call",
  target: "target",
  memo: "memo",
};

/** Parse `Basket: Expert: Name (sub); Target: Name` from copilot prompts. */
export function parseBasketFromQuestion(question: string): ParsedBasketEntry[] {
  const match = question.match(/\nBasket:\s*([\s\S]+)$/i);
  if (!match?.[1]) return [];

  const entries: ParsedBasketEntry[] = [];
  for (const segment of match[1].split(";").map((part) => part.trim()).filter(Boolean)) {
    const typed = segment.match(/^(Expert|Target|Memo):\s*(.+)$/i);
    if (!typed) continue;
    const kind = KIND_BY_PROMPT_LABEL[typed[1].toLowerCase()];
    if (!kind) continue;
    const namePart = typed[2].trim();
    const paren = namePart.match(/^(.+?)\s*\((.+)\)\s*$/);
    const entry: ParsedBasketEntry = {
      kind,
      name: (paren?.[1] ?? namePart).trim(),
    };
    if (paren?.[2]?.trim()) entry.sub = paren[2].trim();
    entries.push(entry);
  }
  return entries;
}

/** Parse basket lines from workspace page context visible text. */
export function parseBasketFromPageContext(pageContext?: PageContext): ParsedBasketEntry[] {
  const visible = pageContext?.visibleText ?? "";
  if (!visible.includes("Current basket for this investment workflow")) return [];

  const entries: ParsedBasketEntry[] = [];
  for (const line of visible.split("\n")) {
    if (!BASKET_LINE_PREFIX.test(line)) continue;
    const body = line.replace(BASKET_LINE_PREFIX, "");
    const parts = body.split("|").map((part) => part.trim());
    if (parts.length < 2) continue;

    const kindLabel = parts[0];
    const kind = kindLabelToWorkspaceKind(kindLabel);
    if (!kind) continue;

    entries.push({
      kind,
      name: parts[1],
      sub: parts[2] || undefined,
    });
  }
  return entries;
}

function kindLabelToWorkspaceKind(label: string): WorkspaceKind | null {
  const normalized = label.toLowerCase();
  if (normalized.includes("expert") || normalized.includes("call")) return "call";
  if (normalized.includes("compan") || normalized.includes("target")) return "target";
  if (normalized.includes("memo") || normalized.includes("note")) return "memo";
  return null;
}

/** `using these experts: James Knight, Jane Doe` and similar follow-up phrasing. */
export function parseNamedExpertsFromQuestion(question: string): ParsedBasketEntry[] {
  const patterns = [
    /using these experts:\s*(.+?)(?:\.\s*|$)/i,
    /using (?:the )?experts:\s*(.+?)(?:\.\s*|$)/i,
    /experts:\s*(.+?)(?:\.\s*Summarise|\.|$)/i,
  ];

  for (const pattern of patterns) {
    const match = question.match(pattern);
    if (!match?.[1]) continue;

    return match[1]
      .split(/,|\band\b/i)
      .map((segment) => segment.trim().replace(/\.$/, ""))
      .filter((name) => name.length > 2)
      .map((name) => ({ kind: "call" as const, name }));
  }

  return [];
}

export function parseExpertsMentionedInQuestion(
  question: string,
  includeTowerBrookEmployees: boolean,
): ParsedBasketEntry[] {
  const directory = filterTowerBrookEmployees(getExperts(), includeTowerBrookEmployees);
  return directory
    .filter((expert) => question.includes(expert.name))
    .map((expert) => ({ kind: "call" as const, name: expert.name, entityId: expert.id }));
}

export function questionReferencesPriorTurn(question: string): boolean {
  return /\bthese (calls|experts|people)\b|after these calls|from the (prior|previous)|the saved basket/i.test(
    question,
  );
}

export function parseBasketContext(
  question: string,
  pageContext?: PageContext,
  chatHistory?: ChatTurn[],
  includeTowerBrookEmployees = true,
): ParsedBasketEntry[] {
  const fromBasketLine = parseBasketFromQuestion(question);
  if (fromBasketLine.length) return fromBasketLine;

  const fromNamedList = parseNamedExpertsFromQuestion(question);
  if (fromNamedList.length) return fromNamedList;

  const fromPageContext = parseBasketFromPageContext(pageContext);
  if (fromPageContext.length) return fromPageContext;

  const fromQuestionMention = parseExpertsMentionedInQuestion(question, includeTowerBrookEmployees);
  if (fromQuestionMention.length) return fromQuestionMention;

  if (questionReferencesPriorTurn(question) && chatHistory?.length) {
    const recent = chatHistory
      .slice(-8)
      .map((turn) => turn.content ?? "")
      .join("\n");
    const fromHistoryBasket = parseBasketFromQuestion(recent);
    if (fromHistoryBasket.length) return fromHistoryBasket;
    const fromHistoryNames = parseExpertsMentionedInQuestion(recent, includeTowerBrookEmployees);
    if (fromHistoryNames.length) return fromHistoryNames;
  }

  return [];
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function orderExpertsByQuestion(question: string, experts: Expert[]): Expert[] {
  const normalized = question.toLowerCase();
  return [...experts].sort((a, b) => {
    const aIndex = normalized.indexOf(a.name.toLowerCase());
    const bIndex = normalized.indexOf(b.name.toLowerCase());
    return (aIndex < 0 ? Number.MAX_SAFE_INTEGER : aIndex) - (bIndex < 0 ? Number.MAX_SAFE_INTEGER : bIndex);
  });
}

export function resolveBasketExperts(
  entries: ParsedBasketEntry[],
  includeTowerBrookEmployees: boolean,
): Expert[] {
  const callNames = entries.filter((e) => e.kind === "call");
  if (!callNames.length) return [];

  const directory = filterTowerBrookEmployees(getExperts(), includeTowerBrookEmployees);
  const byId = new Map(directory.map((expert) => [expert.id, expert]));
  const byName = new Map(directory.map((expert) => [normalizeName(expert.name), expert]));

  const resolved: Expert[] = [];
  const seen = new Set<string>();

  for (const entry of callNames) {
    let expert: Expert | undefined;
    if (entry.entityId) expert = byId.get(entry.entityId);
    if (!expert) expert = byName.get(normalizeName(entry.name));
    if (!expert) {
      expert = directory.find(
        (candidate) =>
          normalizeName(candidate.name).includes(normalizeName(entry.name)) ||
          normalizeName(entry.name).includes(normalizeName(candidate.name)),
      );
    }
    if (expert && !seen.has(expert.id)) {
      seen.add(expert.id);
      resolved.push(expert);
    }
  }
  return resolved;
}

export function resolveBasketCompanies(
  entries: ParsedBasketEntry[],
  includeTowerBrookEmployees: boolean,
): Company[] {
  const targetNames = entries.filter((e) => e.kind === "target");
  if (!targetNames.length) return [];

  const directory = companiesWithLinks(undefined, includeTowerBrookEmployees);
  const byId = new Map(directory.map((company) => [company.id, company]));
  const byName = new Map(directory.map((company) => [normalizeName(company.name), company]));

  const resolved: Company[] = [];
  const seen = new Set<string>();

  for (const entry of targetNames) {
    let company: Company | undefined;
    if (entry.entityId) company = byId.get(entry.entityId);
    if (!company) company = byName.get(normalizeName(entry.name));
    if (!company) {
      company = directory.find(
        (candidate) =>
          normalizeName(candidate.name).includes(normalizeName(entry.name)) ||
          normalizeName(entry.name).includes(normalizeName(candidate.name)),
      );
    }
    if (company && !seen.has(company.id)) {
      seen.add(company.id);
      resolved.push(company);
    }
  }
  return resolved;
}

export function hasBasketContext(
  question: string,
  pageContext?: PageContext,
  chatHistory?: ChatTurn[],
): boolean {
  return parseBasketContext(question, pageContext, chatHistory).length > 0;
}
