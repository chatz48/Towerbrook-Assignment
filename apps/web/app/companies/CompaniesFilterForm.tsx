"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { companiesPageHref } from "@/lib/companies-url";

const SEARCH_DEBOUNCE_MS = 300;

export default function CompaniesFilterForm({
  activeTheme,
  query: initialQuery,
  selectedCategory: initialCategory,
  selectedReadiness: initialReadiness,
  companiesCount,
}: {
  activeTheme: string;
  query: string;
  selectedCategory: string;
  selectedReadiness: string;
  companiesCount: number;
}) {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [readiness, setReadiness] = useState(initialReadiness);
  const [syncedFromUrl, setSyncedFromUrl] = useState({
    initialQuery,
    initialCategory,
    initialReadiness,
  });

  if (
    syncedFromUrl.initialQuery !== initialQuery ||
    syncedFromUrl.initialCategory !== initialCategory ||
    syncedFromUrl.initialReadiness !== initialReadiness
  ) {
    setSyncedFromUrl({ initialQuery, initialCategory, initialReadiness });
    setQuery(initialQuery);
    setCategory(initialCategory);
    setReadiness(initialReadiness);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const navigate = useCallback(
    (overrides: { q?: string; category?: string; readiness?: string }) => {
      const href = companiesPageHref({
        theme: activeTheme !== "all" ? activeTheme : undefined,
        q: overrides.q ?? query,
        category: overrides.category ?? category,
        readiness: overrides.readiness ?? readiness,
      });
      startTransition(() => router.push(href));
    },
    [activeTheme, category, query, readiness, router],
  );

  function onQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate({ q: value }), SEARCH_DEBOUNCE_MS);
  }

  return (
    <div className="ee-panel mb-5 rounded-lg p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_220px_220px_auto] lg:items-end">
        <label className="block">
          <span className="ee-label text-ink-faint">Search companies, experts or angles</span>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="e.g. independent, leak detection, JSM, grid"
            className="mt-1 h-10 w-full rounded-md border border-line-strong bg-white px-3 text-[13px] outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="ee-label text-ink-faint">Company type</span>
          <select
            value={category}
            onChange={(event) => {
              const value = event.target.value;
              setCategory(value);
              navigate({ category: value });
            }}
            className="mt-1 h-10 w-full rounded-md border border-line-strong bg-white px-3 text-[13px] outline-none focus:border-accent"
          >
            <option value="all">All company types</option>
            <option value="target">Targets</option>
            <option value="advisory">Advisory firms</option>
            <option value="service-provider">Service providers</option>
            <option value="investor">Investors</option>
            <option value="incumbent">Incumbents</option>
          </select>
        </label>
        <label className="block">
          <span className="ee-label text-ink-faint">Readiness</span>
          <select
            value={readiness}
            onChange={(event) => {
              const value = event.target.value;
              setReadiness(value);
              navigate({ readiness: value });
            }}
            className="mt-1 h-10 w-full rounded-md border border-line-strong bg-white px-3 text-[13px] outline-none focus:border-accent"
          >
            <option value="all">All readiness states</option>
            <option value="actionable">Actionable diligence</option>
            <option value="target-ready">Target-ready</option>
            <option value="verify-ownership">Verify ownership</option>
            <option value="verify-scale">Verify scale</option>
            <option value="monitor">Monitor / comp</option>
            <option value="research-needed">Research needed</option>
          </select>
        </label>
        <div className="flex gap-2">
          <Link
            href={companiesPageHref({ theme: activeTheme !== "all" ? activeTheme : undefined })}
            className="ee-button ee-button-secondary h-10 px-4"
          >
            Reset
          </Link>
        </div>
      </div>
      <div className="mt-3 border-t border-line pt-3 text-[11px] text-ink-faint">
        <strong className="text-ink">{companiesCount}</strong> mapped companies visible in the current scope.
      </div>
    </div>
  );
}
