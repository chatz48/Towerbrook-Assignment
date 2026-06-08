import { COMPANY_CATEGORY_LABEL, EXPERT_TYPE_LABEL } from "@/lib/labels";
import type { CompanyCategory, ExpertType } from "@/lib/types";
import {
  COMPANY_CATEGORY_FILTERS,
  EXPERT_TYPE_FILTERS,
} from "./discover-constants";
import type { LiveSearchPreview, QueueView, ResearchJob } from "./discover-types";
import { researchStatusLabel, researchTypeLabel } from "./discover-utils";
import { LiveSearchPreviewCard } from "./LiveSearchPreview";

export default function DiscoverSidebar({
  view,
  query,
  onQueryChange,
  expertType,
  onExpertTypeChange,
  companyCategory,
  onCompanyCategoryChange,
  onResetFilters,
  jobError,
  liveSearchPreview,
  job,
}: {
  view: QueueView;
  query: string;
  onQueryChange: (value: string) => void;
  expertType: ExpertType | "all";
  onExpertTypeChange: (value: ExpertType | "all") => void;
  companyCategory: CompanyCategory | "all";
  onCompanyCategoryChange: (value: CompanyCategory | "all") => void;
  onResetFilters: () => void;
  jobError: string;
  liveSearchPreview: LiveSearchPreview | null;
  job: ResearchJob | null;
}) {
  return (
    <aside className="space-y-3">
      <section className="ee-panel rounded-lg p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="ee-label text-ink">Find a lead</div>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
              Search names, firms, deal targets, roles and evidence snippets.
            </p>
          </div>
          <button
            type="button"
            onClick={onResetFilters}
            className="text-[12px] font-semibold text-accent"
          >
            Reset
          </button>
        </div>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="e.g. JSM, banker, leak detection"
          className="mt-4 w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[13px] outline-none focus:border-accent"
        />
        {view === "experts" ? (
          <label className="mt-3 block text-[12px] font-medium text-ink-soft">
            Expert type
            <select
              value={expertType}
              onChange={(event) => onExpertTypeChange(event.target.value as ExpertType | "all")}
              className="mt-1 w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[13px] outline-none focus:border-accent"
            >
              <option value="all">All expert types</option>
              {EXPERT_TYPE_FILTERS.map((type) => (
                <option key={type} value={type}>
                  {EXPERT_TYPE_LABEL[type]}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {view === "companies" ? (
          <label className="mt-3 block text-[12px] font-medium text-ink-soft">
            Company type
            <select
              value={companyCategory}
              onChange={(event) =>
                onCompanyCategoryChange(event.target.value as CompanyCategory | "all")
              }
              className="mt-1 w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[13px] outline-none focus:border-accent"
            >
              <option value="all">All company types</option>
              {COMPANY_CATEGORY_FILTERS.map((category) => (
                <option key={category} value={category}>
                  {COMPANY_CATEGORY_LABEL[category]}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </section>

      <section className="ee-panel rounded-lg p-3">
        <div className="ee-label text-ink">Research refresh</div>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
          Refresh uses public sources to find new experts and companies. When live discovery
          is unavailable, you can still review the research queue below.
        </p>
        {jobError ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-[12px] leading-relaxed text-amber-800">
            {jobError}
          </div>
        ) : null}
        {liveSearchPreview ? <LiveSearchPreviewCard preview={liveSearchPreview} /> : null}
        {job ? (
          <div className="mt-4 rounded-md border border-line bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-[13px]">{researchStatusLabel(job.status)}</span>
              <span className="text-[11px] text-ink-faint">{researchTypeLabel(job.job_type)}</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-ink-soft">
              <span>{job.sources_found} sources checked</span>
              <span>{job.entities_created} new leads</span>
              <span>{job.relationships_created} relationship paths</span>
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] font-semibold text-accent">
                Technical details
              </summary>
              <p className="mt-1 break-all text-[11px] text-ink-faint">{job.id}</p>
            </details>
          </div>
        ) : null}
      </section>
    </aside>
  );
}
