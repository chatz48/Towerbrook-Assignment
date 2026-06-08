import { resolveExpert, getExpert } from "./data";
import { RELATIONSHIP_LABEL } from "./labels";
import type { ExpertWithCompanies } from "./types";

const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
const DEEPSEEK_MODEL = normalizeDeepSeekModel(process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash");
const MODEL = DEEPSEEK_MODEL;

type DeepSeekChatResponse = {
  choices?: {
    message?: {
      content?: string | null;
    };
  }[];
  error?: {
    message?: string;
  };
};

/**
 * Turn an expert record into a compact, factual context block. The model only
 * ever sees what we actually sourced — names, edges, signals, source titles —
 * which keeps generated briefs grounded rather than invented.
 */
export function buildExpertContext(expert: ExpertWithCompanies): string {
  const edges = expert.resolvedCompanies
    .map(
      (rc) =>
        `- ${expert.name} ${RELATIONSHIP_LABEL[rc.relationship]} ${rc.company.name}${
          rc.note ? ` (${rc.note})` : ""
        }. ${rc.company.description}`,
    )
    .join("\n");
  const signals = (expert.signals ?? []).map((s) => `- ${s}`).join("\n");
  const sources = expert.sources.map((s) => `- ${s.title} (${s.publisher ?? s.url})`).join("\n");

  return [
    `Name: ${expert.name}`,
    `Role: ${expert.headline}`,
    expert.org ? `Organisation: ${expert.org}` : "",
    expert.location ? `Location: ${expert.location}` : "",
    `Why relevant: ${expert.whyRelevant}`,
    expert.bio ? `Background: ${expert.bio}` : "",
    edges ? `Company connections:\n${edges}` : "",
    signals ? `Recent signals:\n${signals}` : "",
    sources ? `Sources on file:\n${sources}` : "",
    `Data confidence: ${(expert.confidence * 100).toFixed(0)}%`,
  ]
    .filter(Boolean)
    .join("\n");
}

export interface GenResult {
  text: string;
  model: string;
  grounded: boolean;
}

/** Whether DeepSeek is configured for live generation. */
export function hasModel(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

export async function complete(
  system: string,
  user: string,
  options: { maxTokens?: number; responseFormat?: "json_object"; model?: string } = {},
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("Set DEEPSEEK_API_KEY to use live AI generation.");

  const response = await fetch(`${DEEPSEEK_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model ?? DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: options.maxTokens ?? 1200,
      temperature: 0.2,
      ...(options.responseFormat ? { response_format: { type: options.responseFormat } } : {}),
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as DeepSeekChatResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `DeepSeek request failed with HTTP ${response.status}`);
  }

  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("DeepSeek returned an empty completion.");
  return text;
}

function normalizeDeepSeekModel(model: string): string {
  const aliases: Record<string, string> = {
    "deepseek-chat": "deepseek-v4-flash",
    "deepseek-v4": "deepseek-v4-flash",
  };
  return aliases[model] ?? model;
}

export { MODEL };

/** Resolve an expert by id or throw a clean error for the route. */
export function loadExpertOrThrow(expertId: string): ExpertWithCompanies {
  const base = getExpert(expertId);
  if (!base) throw new Error(`Unknown expert: ${expertId}`);
  return resolveExpert(base);
}
