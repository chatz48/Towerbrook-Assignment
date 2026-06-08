const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";

/** Wrap token chunks as SSE for call-prep / outreach streaming routes. */
export function sseTextStream(generator: AsyncIterable<string>): ReadableStream<Uint8Array> {
  const iterator = generator[Symbol.asyncIterator]();
  const encoder = new TextEncoder();

  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: value })}\n\n`));
    },
  });
}

/** Stream text tokens from DeepSeek. */
export async function* streamComplete(
  system: string,
  user: string,
  options: { maxTokens?: number; model?: string } = {},
): AsyncGenerator<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("Set DEEPSEEK_API_KEY to use live AI generation.");
  yield* streamDeepSeek(apiKey, system, user, options);
}

async function* streamDeepSeek(
  apiKey: string,
  system: string,
  user: string,
  options: { maxTokens?: number; model?: string },
): AsyncGenerator<string> {
  const response = await fetch(`${DEEPSEEK_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model ?? DEEPSEEK_MODEL,
      stream: true,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: options.maxTokens ?? 1200,
      temperature: 0.2,
    }),
  });
  if (!response.ok || !response.body) {
    throw new Error(`DeepSeek stream failed with HTTP ${response.status}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") return;
      try {
        const parsed = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[];
        };
        const token = parsed.choices?.[0]?.delta?.content;
        if (token) yield token;
      } catch {
        // skip malformed chunks
      }
    }
  }
}
