export type SseEvent = {
  event: string;
  data: string;
};

/** Parse a text/event-stream chunk into discrete events. */
export function parseSseChunk(buffer: string): { events: SseEvent[]; remainder: string } {
  const events: SseEvent[] = [];
  const blocks = buffer.split("\n\n");
  const remainder = blocks.pop() ?? "";

  for (const block of blocks) {
    if (!block.trim()) continue;
    let event = "message";
    const dataLines: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length) {
      events.push({ event, data: dataLines.join("\n") });
    }
  }

  return { events, remainder };
}

export async function* readSseStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<SseEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSseChunk(buffer);
      buffer = parsed.remainder;
      for (const event of parsed.events) {
        yield event;
      }
    }
    if (buffer.trim()) {
      const parsed = parseSseChunk(`${buffer}\n\n`);
      for (const event of parsed.events) yield event;
    }
  } finally {
    reader.releaseLock();
  }
}
