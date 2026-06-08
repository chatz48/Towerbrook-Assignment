import type { Metadata } from "next";
import Link from "next/link";
import AppShellNav from "@/app/components/AppShellNav";
import SearchBox from "@/app/components/SearchBox";
import InvestorWorkspaceTray from "@/app/components/InvestorWorkspaceTray";
import { buildSearchIndex } from "@/lib/search-index";
import AppErrorBoundary from "@/app/components/AppErrorBoundary";
import ThemeSwitcher from "@/app/components/ThemeSwitcher";
import { companiesWithLinks, getCompanies, getExperts } from "@/lib/data";
import { filterTowerBrookEmployees } from "@/lib/employee-scope";
import { coverageMatrix } from "@/lib/investment-readiness";
import { matchesThemeFocus } from "@/lib/theme-focus";
import { getPageScope } from "@/lib/page-scope";
import { THEME_BY_ID } from "@/lib/themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "Expert Engine — Investment Intelligence",
  description:
    "Expert and company intelligence by investment theme — call lists, targets, and IC memos.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { themeFocus, includeTowerBrookEmployees } = await getPageScope();

  const experts = filterTowerBrookEmployees(
    getExperts().filter((expert) => matchesThemeFocus(expert.themes, themeFocus)),
    includeTowerBrookEmployees,
  );
  const companies = getCompanies().filter((company) =>
    matchesThemeFocus(company.themes, themeFocus),
  );
  const targets = companiesWithLinks(
    themeFocus === "all" ? undefined : themeFocus,
    includeTowerBrookEmployees,
  ).filter(
    (company) => company.category === "target" && company.ownershipStatus !== "acquired",
  ).length;
  const gapCount = coverageMatrix(themeFocus, includeTowerBrookEmployees).filter(
    (row) => row.gapSeverity !== "low",
  ).length;
  const scopeLabel =
    themeFocus === "all" ? "All three themes" : THEME_BY_ID[themeFocus]?.name ?? "Selected theme";
  const searchIndex = buildSearchIndex(themeFocus, includeTowerBrookEmployees);

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-paper text-ink">
        <header className="sticky top-0 z-40 border-b border-line bg-white" role="banner">
          <div className="flex h-12 items-center gap-4 px-4">
            <Link href="/" className="flex min-w-[200px] items-center gap-3 group">
              <span className="flex h-9 w-8 flex-col justify-center gap-1" aria-hidden="true">
                <span className="h-1 w-7 rounded-full bg-accent" />
                <span className="h-1 w-5 rounded-full bg-accent" />
                <span className="h-1 w-7 rounded-full bg-accent" />
              </span>
              <span className="leading-tight">
                <span className="block text-[16px] font-semibold tracking-[0.05em]">
                  EXPERT ENGINE
                </span>
                <span className="block text-[11px] text-ink-soft">
                  Investment intelligence
                </span>
              </span>
            </Link>
            <AppShellNav />
            <div className="ml-auto hidden min-w-[200px] max-w-[400px] flex-1 md:block">
              <SearchBox index={searchIndex} scopeLabel={scopeLabel} theme={themeFocus} compact />
            </div>
          </div>
          <div className="border-t border-line px-3 py-2 md:hidden">
            <SearchBox index={searchIndex} scopeLabel={scopeLabel} theme={themeFocus} compact />
          </div>
          <AppShellNav mobile />
          <ThemeSwitcher
            scopeLabel={scopeLabel}
            initialFocus={themeFocus}
            initialIncludeTowerBrookEmployees={includeTowerBrookEmployees}
            scopeStats={{
              experts: experts.length,
              companies: companies.length,
              targets,
              gaps: gapCount,
            }}
          />
        </header>
        <AppErrorBoundary>
          <main>{children}</main>
        </AppErrorBoundary>
        <InvestorWorkspaceTray />
      </body>
    </html>
  );
}
