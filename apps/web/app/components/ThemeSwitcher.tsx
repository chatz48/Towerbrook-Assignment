"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import {
  isThemeFocus,
  publishThemeFocus,
  THEME_FOCUS_EVENT,
  type ThemeFocus,
  writeThemeFocusCookie,
} from "@/lib/theme-focus";
import { THEMES } from "@/lib/themes";
import {
  INCLUDE_TOWERBROOK_EMPLOYEES_EVENT,
  publishIncludeTowerBrookEmployees,
} from "@/lib/employee-scope";

const OPTIONS = [
  { id: "all" as const, shortName: "All", accent: "#596579" },
  ...THEMES,
];

export interface ScopeStats {
  experts: number;
  companies: number;
  targets: number;
  gaps: number;
}

export default function ThemeSwitcher({
  scopeLabel,
  initialFocus,
  initialIncludeTowerBrookEmployees,
  scopeStats,
}: {
  scopeLabel: string;
  initialFocus: ThemeFocus;
  initialIncludeTowerBrookEmployees: boolean;
  scopeStats: ScopeStats;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [focus, setFocus] = useState<ThemeFocus>(initialFocus);
  const [includeTowerBrookEmployees, setIncludeTowerBrookEmployees] = useState(
    initialIncludeTowerBrookEmployees,
  );
  const routeValue = pathname.startsWith("/themes/") ? pathname.split("/")[2] : undefined;
  const routeFocus = isThemeFocus(routeValue) && routeValue !== "all" ? routeValue : undefined;
  const activeFocus = routeFocus ?? focus;

  useEffect(() => {
    if (routeFocus && routeFocus !== initialFocus) writeThemeFocusCookie(routeFocus);
  }, [initialFocus, routeFocus]);

  useEffect(() => {
    function syncFocus(event: Event) {
      const nextFocus = (event as CustomEvent<unknown>).detail;
      if (isThemeFocus(nextFocus)) setFocus(nextFocus);
    }
    window.addEventListener(THEME_FOCUS_EVENT, syncFocus);
    return () => window.removeEventListener(THEME_FOCUS_EVENT, syncFocus);
  }, []);

  useEffect(() => {
    function syncEmployeeScope(event: Event) {
      const include = (event as CustomEvent<unknown>).detail;
      if (typeof include === "boolean") setIncludeTowerBrookEmployees(include);
    }
    window.addEventListener(INCLUDE_TOWERBROOK_EMPLOYEES_EVENT, syncEmployeeScope);
    return () =>
      window.removeEventListener(INCLUDE_TOWERBROOK_EMPLOYEES_EVENT, syncEmployeeScope);
  }, []);

  function changeFocus(nextFocus: ThemeFocus) {
    publishThemeFocus(nextFocus);

    startTransition(() => {
      if (pathname.startsWith("/themes/")) {
        router.push(nextFocus === "all" ? "/" : `/?theme=${nextFocus}`);
        return;
      }
      router.refresh();
    });
  }

  function changeEmployeeScope(include: boolean) {
    publishIncludeTowerBrookEmployees(include);
    startTransition(() => router.refresh());
  }

  const gapsHref =
    scopeStats.gaps > 0
      ? `/discover?severity=high`
      : "/discover";

  return (
    <div
      className="border-t border-line bg-[#fbfcff]"
      role="status"
      aria-live="polite"
    >
      <nav
        aria-label="Switch investment theme"
        className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-1.5"
      >
        <span className="shrink-0 text-[11px] text-ink-soft" data-testid="theme-scope-label">
          <span className="font-semibold text-ink">Scope:</span> {scopeLabel}
        </span>
        <span className="hidden h-4 w-px bg-line sm:inline" aria-hidden="true" />
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
          Theme
        </span>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {OPTIONS.map((theme) => {
            const active = activeFocus === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => changeFocus(theme.id)}
                aria-pressed={active}
                className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                  active
                    ? "border-accent bg-[#edf5ff] text-accent"
                    : "border-line bg-white text-ink-soft hover:border-line-strong hover:text-ink"
                }`}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: theme.accent }}
                  aria-hidden="true"
                />
                {theme.shortName}
              </button>
            );
          })}
        </div>

        <span className="hidden h-4 w-px bg-line sm:inline" aria-hidden="true" />

        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-ink-soft">
          <ScopeStat value={scopeStats.experts} label="experts" href="/experts" />
          <ScopeStat value={scopeStats.companies} label="companies" href="/companies" />
          <ScopeStat value={scopeStats.targets} label="targets" href="/companies?category=target" />
          <ScopeStat
            value={scopeStats.gaps}
            label="gaps"
            href={gapsHref}
            highlight={scopeStats.gaps > 0}
          />
          <Link href="/graph" className="font-semibold text-accent hover:underline">
            Relationships
          </Link>
        </div>

        <label className="ml-auto flex shrink-0 cursor-pointer items-center gap-2 text-[12px] font-medium text-ink-soft">
          <input
            type="checkbox"
            checked={includeTowerBrookEmployees}
            onChange={(event) => changeEmployeeScope(event.target.checked)}
            className="h-3.5 w-3.5 accent-accent"
          />
          Include TB employees
        </label>
      </nav>
    </div>
  );
}

function ScopeStat({
  value,
  label,
  href,
  highlight = false,
}: {
  value: number;
  label: string;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`tabular-nums hover:text-accent ${highlight ? "font-semibold text-amber-700" : ""}`}
    >
      <strong className="font-semibold text-ink">{value}</strong> {label}
    </Link>
  );
}
