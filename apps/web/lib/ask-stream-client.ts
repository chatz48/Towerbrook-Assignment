import type { AskResponse } from "./ask-types";
import { parseSseChunk } from "./sse";

export type AskStreamPhase = {
  phase: string;
  label: string;
  intent?: string;
  model_used?: string;
  tools_completed?: number;
  citations_found?: number;
};

type AskStreamCallbacks = {
  onBaseline: (answer: AskResponse) => void;
  onPhase: (phase: AskStreamPhase) => void;
  onComplete: (answer: AskResponse) => void;
  onError: (message: string) => void;
};

export async function consumeAskStream(
  body: unknown,
  callbacks: AskStreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch("/api/ask?stream=1", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    signal,
    body: JSON.stringify(body),
  });

  if (!response.ok && !response.body) {
    callbacks.onError(`Request failed (${response.status})`);
    return;
  }

  if (!response.body) {
    callbacks.onError("Empty response body");
    return;
  }

  const reader = response.body.getReader();
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
        let data: unknown;
        try {
          data = JSON.parse(event.data);
        } catch {
          continue;
        }

        if (event.event === "baseline") callbacks.onBaseline(data as AskResponse);
        if (event.event === "phase") callbacks.onPhase(data as AskStreamPhase);
        if (event.event === "complete") callbacks.onComplete(data as AskResponse);
        if (event.event === "error") {
          const message =
            typeof data === "object" && data && "message" in data
              ? String((data as { message: string }).message)
              : "Stream error";
          callbacks.onError(message);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function phaseToProgressStep(phase: string): number {
  switch (phase) {
    case "route":
      return 1;
    case "research":
      return 2;
    case "synthesize":
      return 3;
    case "finalize":
      return 4;
    default:
      return 0;
  }
}
