import { callBackendApi, hasBackendApi } from "@/lib/backend-api";
import { complete, hasModel } from "@/lib/llm";
import type { ChatTurn } from "@/lib/ask-types";
import type { AskResponse } from "@/lib/ask-types";
import { getTheme } from "@/lib/themes";
import type { ThemeId } from "@/lib/types";

const CHITCHAT_MODEL = "deepseek-v4-flash";

const CHITCHAT_SYSTEM = `You are Expert Engine Copilot for TowerBrook — a people-intelligence workflow for thematic PE sourcing.

Reply in 1–3 short sentences. Tone: friendly, professional, concise.
You help users find experts, map actionable companies, explore the relationship graph, build call plans, and draft outreach from a curated directory.
Do not invent expert names, companies, or deals. Do not write long paragraphs.`;

function fallbackChitchatReply(question: string): string {
  const q = question.toLowerCase();
  if (q.includes("thank")) {
    return "You're welcome — ask anytime you want help ranking experts, mapping targets, or drafting a call plan.";
  }
  if (/^(hi|hello|hey|good )/.test(q)) {
    return (
      "Hello — I'm Expert Engine Copilot. I can help you find experts, map targets, " +
      "and build call plans from TowerBrook's sourced directory. What would you like to explore?"
    );
  }
  return (
    "I'm here to help with expert sourcing, company mapping, call plans, and outreach drafts. " +
    "What would you like to work on?"
  );
}

function formatRecentTurns(turns: ChatTurn[]): string {
  return turns
    .slice(-4)
    .map((turn) => `${turn.role === "assistant" ? "Assistant" : "User"}: ${turn.content}`)
    .join("\n");
}

export async function generateChitchatReply(input: {
  question: string;
  conversationSummary?: string;
  recentTurns?: ChatTurn[];
  themeScope?: string;
}): Promise<{ text: string; model: string }> {
  const payload = {
    question: input.question.trim(),
    conversation_summary: input.conversationSummary ?? "",
    recent_turns: (input.recentTurns ?? []).slice(-4).map((turn) => ({
      role: turn.role,
      content: turn.content,
    })),
    theme_scope: input.themeScope ?? "all themes",
  };

  if (hasBackendApi()) {
    try {
      const result = await callBackendApi<{ reply: string; model_used: string }>("/chat/chitchat", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (result?.reply?.trim()) {
        return { text: result.reply.trim(), model: result.model_used || CHITCHAT_MODEL };
      }
    } catch {
      // fall through to local DeepSeek or deterministic reply
    }
  }

  if (hasModel()) {
    try {
      const user = JSON.stringify({
        question: payload.question,
        theme_scope: payload.theme_scope,
        conversation_summary: payload.conversation_summary,
        recent_turns: formatRecentTurns(input.recentTurns ?? []),
      });
      const text = await complete(CHITCHAT_SYSTEM, user, {
        model: CHITCHAT_MODEL,
        maxTokens: 180,
      });
      return { text, model: CHITCHAT_MODEL };
    } catch {
      // fall through
    }
  }

  return { text: fallbackChitchatReply(input.question), model: "deterministic-fallback" };
}

export function chitchatThemeScope(themeFilter: unknown): string {
  if (typeof themeFilter === "string" && themeFilter !== "all") {
    return getTheme(themeFilter as ThemeId)?.name ?? "All themes";
  }
  return "All themes";
}

export function buildChitchatAnswer(
  question: string,
  reply: string,
  model: string,
  filters: Record<string, unknown>,
): AskResponse {
  const theme = chitchatThemeScope(filters.theme);
  return {
    intent: "chitchat",
    answer_summary: reply,
    generated_at: new Date().toISOString(),
    input_context: {
      question,
      objective: "Find experts",
      theme,
      geography: String(filters.geography ?? "Global / Europe priority"),
      archetypes: [],
      source_scope: String(filters.sourceScope ?? "Premium sourced directory"),
    },
    ranked_experts: [],
    ranked_companies: [],
    call_sequence: [],
    what_to_listen_for: [],
    gaps: [],
    risks: [],
    sources_used: [],
    confidence: {
      score: 0.75,
      label: "Indicative",
      rationale: "Conversational reply — not sourced from the expert directory.",
    },
    assumptions: [],
    follow_up_actions: [
      {
        action: "find_experts",
        label: "Find experts",
        prompt: "Who should I call first across the three investment themes?",
      },
      {
        action: "map_targets",
        label: "Map targets",
        prompt: "Which companies are most actionable and which experts validate them?",
      },
      {
        action: "open_graph",
        label: "Relationship graph",
        prompt: "Open the relationship graph to explore warm paths.",
      },
    ],
    grounded: false,
    backend_enriched: false,
    model,
  };
}
