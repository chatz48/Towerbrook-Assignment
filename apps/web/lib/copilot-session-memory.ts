const SUMMARY_KEY = "towerbrook-copilot-conversation-summary";

export function readConversationSummary(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const value = window.sessionStorage.getItem(SUMMARY_KEY);
  return value?.trim() || undefined;
}

export function writeConversationSummary(summary: string | undefined) {
  if (typeof window === "undefined") return;
  if (!summary?.trim()) {
    window.sessionStorage.removeItem(SUMMARY_KEY);
    return;
  }
  window.sessionStorage.setItem(SUMMARY_KEY, summary.trim());
}

export function clearConversationSummary() {
  writeConversationSummary(undefined);
}
