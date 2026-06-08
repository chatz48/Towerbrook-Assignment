import type { AskResponse } from "./ask-types";

export function copilotTrustLabel(
  answer: Pick<AskResponse, "grounded" | "backend_enriched" | "intent">,
): string {
  if (answer.intent === "chitchat") return "Copilot reply";
  if (answer.grounded) return "Sourced from directory";
  if (answer.backend_enriched) return "AI-assisted summary · ranks from directory";
  return "Sourced from directory";
}

export const COPILOT_PROGRESS_LABELS = [
  "Building answer from directory…",
  "Matching your question to the workflow…",
  "Checking directory citations…",
  "Refining answer…",
  "Finalising confidence…",
] as const;

export function copilotProgressLabel(step: number): string {
  return COPILOT_PROGRESS_LABELS[step] ?? "Preparing response…";
}
