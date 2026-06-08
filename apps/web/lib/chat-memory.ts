import type { ChatTurn } from "@/lib/ask-types";

export type QAPair = { user: string; assistant: string };

/** Summarise once the thread exceeds this many completed Q&A pairs. */
export const SUMMARIZE_AFTER_PAIRS = 5;

/** Always keep this many latest Q&A pairs verbatim for the model. */
export const VERBATIM_PAIR_WINDOW = 2;

export type ResolvedChatMemory = {
  summary?: string;
  effectiveHistory: ChatTurn[];
  pairsCompressed: number;
  totalPairs: number;
};

export function groupQAPairs(turns: ChatTurn[]): QAPair[] {
  const pairs: QAPair[] = [];
  let pendingUser: string | null = null;

  for (const turn of turns) {
    const role = turn.role === "assistant" ? "assistant" : "user";
    const content = typeof turn.content === "string" ? turn.content.trim() : "";
    if (!content) continue;

    if (role === "user") {
      pendingUser = content;
      continue;
    }

    if (pendingUser) {
      pairs.push({ user: pendingUser, assistant: content });
      pendingUser = null;
    }
  }

  return pairs;
}

export function flattenQAPairs(pairs: QAPair[]): ChatTurn[] {
  return pairs.flatMap((pair) => [
    { role: "user", content: pair.user },
    { role: "assistant", content: pair.assistant },
  ]);
}

/** Extract expert/company tokens for compact memory. */
function extractNamedEntities(text: string): string[] {
  const names = new Set<string>();
  for (const match of text.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g)) {
    const name = match[1]?.trim();
    if (name && name.length > 2 && !["User", "Assistant", "Expert", "Engine"].includes(name)) {
      names.add(name);
    }
  }
  for (const match of text.matchAll(/\(([a-z0-9-]+)\)/gi)) {
    const id = match[1];
    if (id && (id.includes("expert") || id.startsWith("exp-") || id.startsWith("co-"))) {
      names.add(id);
    }
  }
  return [...names].slice(0, 8);
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

export function heuristicSummarizeConversation(
  pairs: QAPair[],
  priorSummary?: string,
): string {
  const bullets: string[] = [];

  if (priorSummary?.trim()) {
    bullets.push(priorSummary.trim());
  }

  for (const pair of pairs) {
    const entities = extractNamedEntities(`${pair.user} ${pair.assistant}`);
    const entityNote = entities.length ? ` (mentioned: ${entities.join(", ")})` : "";
    bullets.push(
      `- User: ${truncate(pair.user, 140)} → Copilot: ${truncate(pair.assistant, 200)}${entityNote}`,
    );
  }

  return bullets.join("\n").slice(0, 1800);
}

export function buildEffectiveChatMemory(
  history: ChatTurn[],
  priorSummary?: string,
): ResolvedChatMemory {
  const pairs = groupQAPairs(history);

  if (pairs.length <= SUMMARIZE_AFTER_PAIRS) {
    return {
      summary: priorSummary?.trim() || undefined,
      effectiveHistory: history.slice(-SUMMARIZE_AFTER_PAIRS * 2),
      pairsCompressed: 0,
      totalPairs: pairs.length,
    };
  }

  const verbatimPairs = pairs.slice(-VERBATIM_PAIR_WINDOW);
  const toCompress = pairs.slice(0, -VERBATIM_PAIR_WINDOW);
  const summary = heuristicSummarizeConversation(toCompress, priorSummary);

  return {
    summary,
    effectiveHistory: flattenQAPairs(verbatimPairs),
    pairsCompressed: toCompress.length,
    totalPairs: pairs.length,
  };
}

export function questionWithChatMemory(
  question: string,
  history: ChatTurn[],
  summary?: string,
): string {
  const lines = [question.trim()];

  if (summary?.trim()) {
    lines.push(
      "",
      "Prior conversation summary (carry forward goals, names, and decisions):",
      summary.trim(),
    );
  }

  if (history.length) {
    const recent = history
      .slice(-VERBATIM_PAIR_WINDOW * 2)
      .map((turn) => `${turn.role === "assistant" ? "Assistant" : "User"}: ${turn.content}`)
      .join("\n");
    lines.push("", "Most recent turns:", recent);
  }

  lines.push(
    "",
    "Use only the summary and recent turns to resolve follow-up references. Prioritize the latest user question.",
  );

  return lines.join("\n");
}
