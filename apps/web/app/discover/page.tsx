"use client";

import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type {
  AdvisorExpertGap,
  DerivedCompanyCandidate,
  ExpertDiscoveryCandidate,
} from "@/lib/expert-discovery";
import type { CompanyCategory, ExpertType } from "@/lib/types";
import { matchesThemeFocus } from "@/lib/theme-focus";
import { useThemeFocusClient } from "@/lib/theme-focus-client";
import { readIncludeTowerBrookEmployeesCookie } from "@/lib/employee-scope";
import { DataPageHeader, PageShell } from "@/app/components/ui";
import {
  COMPANIES,
  DISCOVERY,
  EXPERTS,
  GAPS,
  QUEUES,
  THEME_LABEL,
} from "./discover-constants";
import type { LiveSearchPreview, QueueView, ResearchJob } from "./discover-types";
import { buildJobRequest, subscribeIncludeTowerBrookEmployees } from "./discover-utils";
import CompanyQueue from "./CompanyQueue";
import DiscoverSidebar from "./DiscoverSidebar";
import { CompanyDetail, ExpertDetail, GapDetail } from "./DiscoverLeadDetails";
import ExpertQueue from "./ExpertQueue";
import GapQueue from "./GapQueue";

export default function DiscoverPage() {
  return (
    <Suspense fallback={<PageShell />}>
      <DiscoverPageContent />
    </Suspense>
  );
}

function DiscoverPageContent() {
  const themeId = useThemeFocusClient();
  const searchParams = useSearchParams();
  const [view, setView] = useState<QueueView>("experts");
  const [query, setQuery] = useState(searchParams.get("gap") ?? searchParams.get("company") ?? "");
  const includeTowerBrookEmployees = useSyncExternalStore(
    subscribeIncludeTowerBrookEmployees,
    readIncludeTowerBrookEmployeesCookie,
    () => false,
  );
  const [expertType, setExpertType] = useState<ExpertType | "all">("all");
  const [companyCategory, setCompanyCategory] = useState<CompanyCategory | "all">("all");
  const [selectedExpertId, setSelectedExpertId] = useState(EXPERTS[0]?.candidate_id ?? "");
  const [selectedCompanyId, setSelectedCompanyId] = useState(COMPANIES[0]?.candidate_id ?? "");
  const [selectedGapId, setSelectedGapId] = useState(GAPS[0]?.gap_id ?? "");
  const [loadingJob, setLoadingJob] = useState(false);
  const [jobError, setJobError] = useState("");
  const [job, setJob] = useState<ResearchJob | null>(null);
  const [liveSearchPreview, setLiveSearchPreview] = useState<LiveSearchPreview | null>(null);

  useEffect(() => {
    if (!job?.id || job.status === "completed" || job.status === "failed") return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/research-jobs/${job.id}`);
        const data = (await res.json()) as ResearchJob & { error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setJobError(data.error ?? "Failed to poll research job");
          return;
        }
        setJob(data);
        if (data.error) setJobError(data.error);
      } catch (error) {
        if (!cancelled) {
          setJobError(error instanceof Error ? error.message : "Failed to poll research job");
        }
      }
    };
    const interval = window.setInterval(poll, 3000);
    poll();
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [job?.id, job?.status]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredExperts = useMemo(
    () =>
      EXPERTS.filter((expert) => matchesThemeFocus(expert.themes, themeId))
        .filter(
          (expert) =>
            includeTowerBrookEmployees ||
            !expert.organizations.some((organization) =>
              organization.toLowerCase().includes("towerbrook"),
            ),
        )
        .filter((expert) => expertType === "all" || expert.expert_type === expertType)
        .filter((expert) => {
          if (!normalizedQuery) return true;
          return [
            expert.name,
            expert.headline,
            expert.why_relevant,
            expert.expert_type,
            expert.organizations.join(" "),
            expert.connected_companies.map((company) => company.name).join(" "),
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);
        })
        .sort((a, b) => b.scores.research_priority - a.scores.research_priority),
    [expertType, includeTowerBrookEmployees, normalizedQuery, themeId],
  );

  const filteredCompanies = useMemo(
    () =>
      COMPANIES.filter((company) => matchesThemeFocus(company.themes, themeId))
        .filter((company) => companyCategory === "all" || company.category === companyCategory)
        .filter((company) => {
          if (!normalizedQuery) return true;
          return [
            company.name,
            company.category,
            company.owner ?? "",
            company.ownership_status,
            company.why_interesting,
            company.expert_connections.map((expert) => expert.name).join(" "),
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);
        })
        .sort((a, b) => b.scores.research_priority - a.scores.research_priority),
    [companyCategory, normalizedQuery, themeId],
  );

  const filteredGaps = useMemo(
    () =>
      GAPS.filter((gap) => matchesThemeFocus(gap.themes, themeId))
        .filter((gap) => {
          if (!normalizedQuery) return true;
          return [
            gap.organization,
            gap.advisor_role,
            gap.expert_type_sought,
            gap.deals.map((deal) => `${deal.deal_name} ${deal.target}`).join(" "),
            gap.search_queries.join(" "),
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);
        })
        .sort((a, b) => b.search_priority - a.search_priority),
    [normalizedQuery, themeId],
  );

  const selectedExpert =
    filteredExperts.find((expert) => expert.candidate_id === selectedExpertId) ??
    filteredExperts[0];
  const selectedCompany =
    filteredCompanies.find((company) => company.candidate_id === selectedCompanyId) ??
    filteredCompanies[0];
  const selectedGap =
    filteredGaps.find((gap) => gap.gap_id === selectedGapId) ?? filteredGaps[0];

  const selectedLead =
    view === "experts" ? selectedExpert : view === "companies" ? selectedCompany : selectedGap;

  const visibleCounts = {
    experts: filteredExperts.length,
    companies: filteredCompanies.length,
    gaps: filteredGaps.length,
  };

  async function createDiscoveryJob(lead?: ExpertDiscoveryCandidate | DerivedCompanyCandidate | AdvisorExpertGap) {
    const request = buildJobRequest(lead, themeId);
    setLoadingJob(true);
    setJobError("");
    setJob(null);
    setLiveSearchPreview(null);
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const data = await res.json();
      if (data.liveSearch) setLiveSearchPreview(data.liveSearch);
      if (!res.ok) throw new Error(data.error ?? "Live enrichment is unavailable.");
      if (data.job) setJob(data.job);
      if (data.demoMode && data.error) setJobError(data.error);
    } catch (error) {
      setJobError(error instanceof Error ? error.message : "Discovery failed");
    } finally {
      setLoadingJob(false);
    }
  }

  return (
    <PageShell innerClassName="mx-auto max-w-[1580px]">
        <section className="ee-panel mb-4 rounded-lg border-l-4 border-l-accent px-4 py-3">
          <p className="text-[13px] leading-relaxed text-ink-soft">
            <strong className="text-ink">Coverage gaps</strong> surfaces experts, companies, and taxonomy holes
            that are missing from the mapped directory. Pick a queue, select a lead, then run targeted research
            or add findings to the{" "}
            <Link href="/experts" className="font-semibold text-accent hover:underline">
              call list
            </Link>
            .
          </p>
        </section>

        <DataPageHeader
          title="Coverage gaps"
          meta={`${visibleCounts[view]} in queue · ${THEME_LABEL[themeId]} · ${DISCOVERY.coverage.advisor_gaps_with_no_named_expert} advisor names missing`}
          actions={
            <>
              <Link href="/experts?readiness=actionable" className="ee-button ee-button-secondary">
                Call list
              </Link>
              <button
                onClick={() => createDiscoveryJob(selectedLead)}
                disabled={loadingJob || !selectedLead}
                className="ee-button ee-button-primary disabled:opacity-50"
              >
                {loadingJob ? "Checking..." : "Refresh"}
              </button>
            </>
          }
        />

        <div className="grid gap-3 xl:grid-cols-[340px_minmax(0,1fr)]">
          <DiscoverSidebar
            view={view}
            query={query}
            onQueryChange={setQuery}
            expertType={expertType}
            onExpertTypeChange={setExpertType}
            companyCategory={companyCategory}
            onCompanyCategoryChange={setCompanyCategory}
            onResetFilters={() => {
              setQuery("");
              setExpertType("all");
              setCompanyCategory("all");
            }}
            jobError={jobError}
            liveSearchPreview={liveSearchPreview}
            job={job}
          />

          <main className="min-w-0 space-y-5">
            <section className="ee-panel overflow-hidden rounded-lg">
              <div className="border-b border-line px-4 py-3">
                <div className="grid gap-2 md:grid-cols-3">
                  {QUEUES.map((queue) => (
                    <button
                      key={queue.id}
                      type="button"
                      onClick={() => setView(queue.id)}
                      className={`rounded-md border p-3 text-left transition ${
                        view === queue.id
                          ? "border-accent bg-[#f4f8ff]"
                          : "border-line bg-white hover:border-line-strong"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[13px] font-semibold">{queue.label}</span>
                        <span className="text-[18px] font-semibold tabular-nums">
                          {visibleCounts[queue.id]}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
                        {queue.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {view === "experts" ? (
                <ExpertQueue
                  experts={filteredExperts}
                  selectedId={selectedExpert?.candidate_id}
                  onSelect={setSelectedExpertId}
                />
              ) : null}
              {view === "companies" ? (
                <CompanyQueue
                  companies={filteredCompanies}
                  selectedId={selectedCompany?.candidate_id}
                  onSelect={setSelectedCompanyId}
                />
              ) : null}
              {view === "gaps" ? (
                <GapQueue
                  gaps={filteredGaps}
                  selectedId={selectedGap?.gap_id}
                  onSelect={setSelectedGapId}
                />
              ) : null}
            </section>

            <section className="ee-panel rounded-lg">
              <div className="flex flex-col gap-3 border-b border-line px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="ee-label text-ink">Selected lead workspace</h2>
                  <p className="mt-1 text-[11px] text-ink-faint">
                    Evidence, call plan, company derivation and next research action.
                  </p>
                </div>
                <button
                  onClick={() => createDiscoveryJob(selectedLead)}
                  disabled={loadingJob || !selectedLead}
                  className="ee-button ee-button-secondary disabled:opacity-50"
                >
                  Run targeted research
                </button>
              </div>
              <div className="p-5">
                {view === "experts" ? <ExpertDetail expert={selectedExpert} /> : null}
                {view === "companies" ? <CompanyDetail company={selectedCompany} /> : null}
                {view === "gaps" ? <GapDetail gap={selectedGap} /> : null}
              </div>
            </section>
          </main>
        </div>
    </PageShell>
  );
}
