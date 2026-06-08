/** Map technical/API errors to investment-professional-friendly copy. */
export function userFacingError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");

  if (/BACKEND_API_URL|SUPABASE_URL|DEEPSEEK|environment variable/i.test(raw)) {
    return "Live discovery is not connected in this demo. You can still review the research queue below.";
  }
  if (/fetch failed|network|ECONNREFUSED|Failed to fetch/i.test(raw)) {
    return "Connection issue. Check your network and try again.";
  }
  if (/401|unauthorized|session expired/i.test(raw)) {
    return "Your session expired. Refresh the page and try again.";
  }
  if (/timeout|timed out|taking longer/i.test(raw)) {
    return "This is taking longer than expected. Try a shorter question or try again.";
  }
  if (/503|unavailable|not connected/i.test(raw)) {
    return "This feature is unavailable in the demo. Static research data is still available below.";
  }
  if (/500|internal server/i.test(raw)) {
    return "Something went wrong on our side. Please try again in a moment.";
  }

  return raw.trim() || fallback;
}

export function backendUnavailableMessage(feature = "Live discovery"): string {
  return `${feature} is not connected in this demo. You can still review the existing research queue below.`;
}
