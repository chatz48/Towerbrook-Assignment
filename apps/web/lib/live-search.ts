export interface LiveSearchResult {
  title: string;
  url: string;
  snippet: string;
  provider: "tavily" | "serper" | "brave";
}

export function configuredSearchProviders(): string[] {
  return [
    process.env.TAVILY_API_KEY ? "tavily" : null,
    process.env.SERPER_API_KEY ? "serper" : null,
    process.env.BRAVE_SEARCH_API_KEY ? "brave" : null,
  ].filter((provider): provider is string => Boolean(provider));
}

export async function liveSearch(query: string, maxResults = 5): Promise<LiveSearchResult[]> {
  if (process.env.TAVILY_API_KEY) return searchTavily(query, maxResults);
  if (process.env.SERPER_API_KEY) return searchSerper(query, maxResults);
  if (process.env.BRAVE_SEARCH_API_KEY) return searchBrave(query, maxResults);
  return [];
}

async function searchTavily(query: string, maxResults: number): Promise<LiveSearchResult[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      max_results: maxResults,
      search_depth: "basic",
      include_answer: false,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Tavily search failed with HTTP ${res.status}`);
  return ((data.results ?? []) as { title?: string; url?: string; content?: string }[]).map((item) => ({
    title: item.title ?? "Untitled source",
    url: item.url ?? "",
    snippet: item.content ?? "",
    provider: "tavily" as const,
  })).filter((item) => item.url);
}

async function searchSerper(query: string, maxResults: number): Promise<LiveSearchResult[]> {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": process.env.SERPER_API_KEY ?? "",
    },
    body: JSON.stringify({ q: query, num: maxResults }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? `Serper search failed with HTTP ${res.status}`);
  return ((data.organic ?? []) as { title?: string; link?: string; snippet?: string }[]).map((item) => ({
    title: item.title ?? "Untitled source",
    url: item.link ?? "",
    snippet: item.snippet ?? "",
    provider: "serper" as const,
  })).filter((item) => item.url);
}

async function searchBrave(query: string, maxResults: number): Promise<LiveSearchResult[]> {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(maxResults));
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY ?? "",
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.detail ?? `Brave search failed with HTTP ${res.status}`);
  return ((data.web?.results ?? []) as { title?: string; url?: string; description?: string }[]).map((item) => ({
    title: item.title ?? "Untitled source",
    url: item.url ?? "",
    snippet: item.description ?? "",
    provider: "brave" as const,
  })).filter((item) => item.url);
}
