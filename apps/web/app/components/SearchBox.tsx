"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ThemeFocus } from "@/lib/theme-focus";

export interface SearchItem {
  id: string;
  name: string;
  sub: string;
  kind: "expert" | "company";
  href: string;
  keywords: string;
}

interface ApiSearchResult {
  id: string;
  kind: "expert" | "company";
  name: string;
  subtitle: string;
  href: string;
}

export default function SearchBox({
  index,
  scopeLabel = "All experts and companies",
  compact = false,
  theme = "all",
}: {
  index: SearchItem[];
  scopeLabel?: string;
  compact?: boolean;
  theme?: ThemeFocus;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [apiResults, setApiResults] = useState<ApiSearchResult[]>([]);
  const [apiQuery, setApiQuery] = useState("");
  const router = useRouter();

  const localResults = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return index
      .filter((it) => it.keywords.includes(query))
      .slice(0, 8);
  }, [q, index]);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query, theme, limit: "8" });
        const res = await fetch(`/api/search?${params}`);
        const data = (await res.json()) as { results?: ApiSearchResult[] };
        if (!cancelled) {
          setApiQuery(query);
          setApiResults(data.results ?? []);
        }
      } catch {
        if (!cancelled) {
          setApiQuery(query);
          setApiResults([]);
        }
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, theme]);

  const results = useMemo(() => {
    const query = q.trim();
    if (query.length < 2) return localResults;
    if (apiQuery === query && apiResults.length > 0) {
      return apiResults.map((item) => ({
        id: item.id,
        name: item.name,
        sub: item.subtitle,
        kind: item.kind,
        href: item.href,
      }));
    }
    return localResults;
  }, [apiQuery, apiResults, localResults, q]);

  function go(href: string) {
    setOpen(false);
    setQ("");
    router.push(href);
  }

  return (
    <div className="relative min-w-0">
      <div
        className={`flex min-w-0 items-center gap-1.5 overflow-hidden border border-line-strong bg-card shadow-sm transition-colors focus-within:border-accent ${
          compact ? "rounded-lg px-2.5 py-1.5" : "rounded-xl px-4 py-3"
        }`}
      >
        <svg
          className="h-3.5 w-3.5 shrink-0 text-ink-faint"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="8.5" cy="8.5" r="5.75" stroke="currentColor" strokeWidth="1.5" />
          <path d="M13 13l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={
            compact
              ? "Search people or companies"
              : "Search any person or company - e.g. solar, leak detection, Piclo"
          }
          className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-faint ${
            compact ? "text-[12px]" : "text-[15px]"
          }`}
        />
        {q ? (
          <kbd className="shrink-0 whitespace-nowrap text-[10px] text-ink-faint border border-line rounded px-1.5 py-0.5">
            {results.length} match{results.length === 1 ? "" : "es"}
          </kbd>
        ) : compact && index.length > 0 ? (
          <span
            className="shrink-0 whitespace-nowrap text-[10px] tabular-nums text-ink-faint"
            title={`${index.length} searchable records`}
          >
            {index.length}
          </span>
        ) : null}
      </div>
      {!compact ? (
        <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-ink-faint">
          {scopeLabel ? <span>Search scope: {scopeLabel}</span> : <span />}
          <span>{index.length} records</span>
        </div>
      ) : null}

      {open && results.length > 0 ? (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-line bg-card shadow-lg overflow-hidden">
          {results.map((it) => (
            <button
              key={`${it.kind}-${it.id}`}
              onMouseDown={() => go(it.href)}
              className="w-full text-left px-4 py-2.5 hover:bg-paper flex items-center justify-between gap-3 border-b border-line last:border-0"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{it.name}</div>
                <div className="text-xs text-ink-faint truncate">{it.sub}</div>
              </div>
              <span className="text-[10px] uppercase tracking-wide text-ink-faint shrink-0">
                {it.kind}
              </span>
            </button>
          ))}
        </div>
      ) : open && q.trim() ? (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-line bg-card p-4 text-sm text-ink-soft shadow-lg">
          No matches in {scopeLabel}. Try a company, person, technology, advisor, or theme term.
        </div>
      ) : null}
    </div>
  );
}
