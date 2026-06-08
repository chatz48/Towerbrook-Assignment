import { NextResponse } from "next/server";
import { globalSearch, type ThemeFocus } from "@/lib/investment-readiness";
import { configuredSearchProviders, liveSearch } from "@/lib/live-search";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const theme = (url.searchParams.get("theme") ?? "all") as ThemeFocus;
  const kind = (url.searchParams.get("kind") ?? "all") as "all" | "expert" | "company";
  const readiness = url.searchParams.get("readiness") ?? "all";
  const limit = Number(url.searchParams.get("limit") ?? 20);

  const safeLimit = Number.isFinite(limit) ? limit : 20;
  const live = await safeLiveSearch(query, Math.min(6, safeLimit));
  return NextResponse.json({
    query,
    theme,
    kind,
    readiness,
    results: globalSearch({ query, theme, kind, readiness, limit: safeLimit }),
    liveResults: live.results,
    providers: {
      liveWebSearchConfigured: live.providers.length > 0,
      liveSearchProviders: live.providers,
      liveSearchError: live.error,
      liveLlmConfigured: Boolean(process.env.DEEPSEEK_API_KEY),
    },
  });
}


async function safeLiveSearch(query: string, limit: number) {
  const providers = configuredSearchProviders();
  if (!query.trim() || !providers.length) return { providers, results: [] };
  try {
    return { providers, results: await liveSearch(query, limit) };
  } catch (error) {
    return {
      providers,
      results: [],
      error: error instanceof Error ? error.message : "Live search failed",
    };
  }
}
