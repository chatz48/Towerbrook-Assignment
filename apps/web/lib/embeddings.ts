import { callBackendApi, hasBackendApi } from "./backend-api";

/** Unified 384-d BGE vectors — matches backend pgvector schema. */
const EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5";
const EMBEDDING_DIMENSIONS = 384;

export function hasEmbeddingConfig(): boolean {
  return hasBackendApi() || Boolean(process.env.OPENAI_API_KEY);
}

export async function embedText(input: string): Promise<number[]> {
  if (hasBackendApi()) {
    const result = await callBackendApi<{ embedding: number[] }>("/embeddings", {
      method: "POST",
      body: JSON.stringify({ text: input.slice(0, 24000) }),
    });
    if (result?.embedding?.length) return result.embedding;
  }
  return hashEmbed(input);
}

export async function embedTexts(inputs: string[]): Promise<number[][]> {
  if (hasBackendApi() && inputs.length) {
    const result = await callBackendApi<{ embeddings: number[][] }>("/embeddings", {
      method: "POST",
      body: JSON.stringify({ text: inputs[0] ?? "", texts: inputs.slice(0, 64) }),
    });
    if (result?.embeddings?.length) return result.embeddings;
  }
  return inputs.map((text) => hashEmbed(text));
}

/** Deterministic 384-d fallback — matches backend hash path for local dev without fastembed. */
function hashEmbed(text: string): number[] {
  const dimensions = EMBEDDING_DIMENSIONS;
  const tokens = text.toLowerCase().split(/\s+/).filter(Boolean);
  const vector = new Array<number>(dimensions).fill(0);
  const source = tokens.length ? tokens : [text.slice(0, 64) || "empty"];

  for (const token of source) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
    }
    const index = hash % dimensions;
    const sign = hash % 2 === 0 ? 1 : -1;
    vector[index] += sign;
  }

  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => Math.round((v / norm) * 1e8) / 1e8);
}

export function chunkText(text: string, maxChars = 1800): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const sentences = clean.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (!current) {
      current = sentence;
      continue;
    }
    if (`${current} ${sentence}`.length > maxChars) {
      chunks.push(current);
      current = sentence;
    } else {
      current = `${current} ${sentence}`;
    }
  }

  if (current) chunks.push(current);
  return chunks.length ? chunks : [clean.slice(0, maxChars)];
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS };
