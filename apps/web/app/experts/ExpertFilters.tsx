"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EXPERT_TYPE_LABEL } from "@/lib/labels";
import { expertsFilterHref } from "@/lib/experts-url";
import { specialtiesForTheme, THEMES } from "@/lib/themes";
import type { ExpertType, ThemeId } from "@/lib/types";

export const EXPERT_FILTER_TYPES: ExpertType[] = [
  "ex-founder",
  "operator",
  "advisor",
  "banker",
  "lawyer",
  "investor",
  "technical-dd",
];

const SEARCH_DEBOUNCE_MS = 300;

const READINESS_OPTIONS = [
  { value: "all", label: "All readiness states" },
  { value: "actionable", label: "Actionable now" },
  { value: "call-ready", label: "Call-ready" },
  { value: "verify-contact", label: "Find contact path" },
  { value: "verify-identity", label: "Verify identity" },
  { value: "research-needed", label: "Research needed" },
];

export default function ExpertFilters({
  initialTheme,
  initialSpecialty,
  initialType,
  initialReadiness,
  initialQuery,
  compact = false,
  embedded = false,
}: {
  initialTheme: ThemeId | "all";
  initialSpecialty: string;
  initialType: string;
  initialReadiness?: string;
  initialQuery: string;
  compact?: boolean;
  embedded?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pinnedExperts = searchParams.get("experts") ?? undefined;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [theme, setTheme] = useState<ThemeId | "all">(initialTheme);
  const [specialty, setSpecialty] = useState(initialSpecialty);
  const [type, setType] = useState(initialType);
  const [readiness, setReadiness] = useState(initialReadiness ?? "all");
  const [query, setQuery] = useState(initialQuery);
  const [syncedFromUrl, setSyncedFromUrl] = useState({
    initialTheme,
    initialSpecialty,
    initialType,
    initialReadiness: initialReadiness ?? "all",
    initialQuery,
  });

  const specialtyOptions = useMemo(() => specialtiesForTheme(theme), [theme]);
  const safeSpecialty =
    specialty !== "all" && !specialtyOptions.includes(specialty) ? "all" : specialty;

  const resolvedInitialReadiness = initialReadiness ?? "all";
  if (
    syncedFromUrl.initialTheme !== initialTheme ||
    syncedFromUrl.initialSpecialty !== initialSpecialty ||
    syncedFromUrl.initialType !== initialType ||
    syncedFromUrl.initialReadiness !== resolvedInitialReadiness ||
    syncedFromUrl.initialQuery !== initialQuery
  ) {
    setSyncedFromUrl({
      initialTheme,
      initialSpecialty,
      initialType,
      initialReadiness: resolvedInitialReadiness,
      initialQuery,
    });
    setTheme(initialTheme);
    setSpecialty(initialSpecialty);
    setType(initialType);
    setReadiness(resolvedInitialReadiness);
    setQuery(initialQuery);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const navigate = useCallback(
    (overrides: {
      theme?: ThemeId | "all";
      specialty?: string;
      type?: string;
      readiness?: string;
      q?: string;
    }) => {
      const href = expertsFilterHref({
        theme: overrides.theme ?? theme,
        specialty: overrides.specialty ?? safeSpecialty,
        type: overrides.type ?? type,
        readiness: overrides.readiness ?? readiness,
        q: overrides.q ?? query,
        experts: pinnedExperts,
      });
      startTransition(() => {
        router.push(href);
      });
    },
    [pinnedExperts, query, readiness, router, safeSpecialty, theme, type],
  );

  const fieldClass = compact
    ? "mt-0.5 h-8 w-full rounded-md border border-line-strong bg-white px-2.5 text-[12px] outline-none focus:border-accent"
    : "mt-1 h-10 w-full rounded-md border border-line-strong bg-white px-3 text-[13px] outline-none focus:border-accent";
  const buttonClass = compact
    ? "ee-button h-8 px-3 text-[12px]"
    : "ee-button h-10 px-4";

  function onQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      navigate({ q: value });
    }, SEARCH_DEBOUNCE_MS);
  }

  return (
    <div
      className={
        embedded
          ? "border-b border-line bg-[#fbfcff] px-3 py-2"
          : `ee-panel rounded-lg ${compact ? "mb-2 p-2.5" : "mb-5 p-4"}`
      }
    >
      <div
        className={
          embedded && compact
            ? "flex flex-wrap items-end gap-x-2 gap-y-1.5 xl:flex-nowrap"
            : `grid md:grid-cols-[1.1fr_1.15fr_0.9fr_0.95fr_minmax(140px,1fr)_auto] md:items-end ${
                compact ? "gap-2" : "gap-3"
              }`
        }
      >
        <label className={`block min-w-0 ${embedded && compact ? "w-[148px] shrink-0 xl:flex-1 xl:basis-0" : ""}`}>
          <span className="ee-label whitespace-nowrap text-ink-faint">Theme</span>
          <select
            name="theme"
            value={theme}
            onChange={(event) => {
              const nextTheme = event.target.value as ThemeId | "all";
              const nextSpecialties = specialtiesForTheme(nextTheme);
              const nextSpecialty =
                specialty !== "all" && !nextSpecialties.includes(specialty) ? "all" : specialty;
              setTheme(nextTheme);
              setSpecialty(nextSpecialty);
              navigate({ theme: nextTheme, specialty: nextSpecialty });
            }}
            className={fieldClass}
          >
            <option value="all">All three themes</option>
            {THEMES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className={`block min-w-0 ${embedded && compact ? "w-[148px] shrink-0 xl:flex-1 xl:basis-0" : ""}`}>
          <span className="ee-label whitespace-nowrap text-ink-faint">Specialty</span>
          <select
            name="specialty"
            value={safeSpecialty}
            onChange={(event) => {
              const nextSpecialty = event.target.value;
              setSpecialty(nextSpecialty);
              navigate({ specialty: nextSpecialty });
            }}
            className={fieldClass}
          >
            <option value="all">All specialties</option>
            {specialtyOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className={`block min-w-0 ${embedded && compact ? "w-[132px] shrink-0 xl:flex-1 xl:basis-0" : ""}`}>
          <span className="ee-label whitespace-nowrap text-ink-faint">Type</span>
          <select
            name="type"
            value={type}
            onChange={(event) => {
              const nextType = event.target.value;
              setType(nextType);
              navigate({ type: nextType });
            }}
            className={fieldClass}
          >
            <option value="all">All expert types</option>
            {EXPERT_FILTER_TYPES.map((expertType) => (
              <option key={expertType} value={expertType}>
                {EXPERT_TYPE_LABEL[expertType]}
              </option>
            ))}
          </select>
        </label>

        <label className={`block min-w-0 ${embedded && compact ? "w-[132px] shrink-0 xl:flex-1 xl:basis-0" : ""}`}>
          <span className="ee-label whitespace-nowrap text-ink-faint">Readiness</span>
          <select
            name="readiness"
            value={readiness}
            onChange={(event) => {
              const nextReadiness = event.target.value;
              setReadiness(nextReadiness);
              navigate({ readiness: nextReadiness });
            }}
            className={fieldClass}
          >
            {READINESS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className={`block min-w-0 ${embedded && compact ? "min-w-[160px] flex-[1.15] xl:basis-0" : ""}`}>
          <span className="ee-label whitespace-nowrap text-ink-faint">Search experts or companies</span>
          <input
            name="q"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (debounceRef.current) clearTimeout(debounceRef.current);
                navigate({ q: query });
              }
            }}
            placeholder="banker, advisor, founder…"
            className={fieldClass}
          />
        </label>

        <div className={`flex shrink-0 gap-1.5 ${embedded && compact ? "pb-0" : ""}`}>
          <Link href="/experts" className={`${buttonClass} ee-button-secondary`}>
            Reset
          </Link>
        </div>
      </div>
    </div>
  );
}
