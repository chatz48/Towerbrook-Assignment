import Link from "next/link";
import {
  COMPANY_CATEGORY_LABEL,
  COMPANY_CATEGORY_STYLE,
  OWNERSHIP_LABEL,
  OWNERSHIP_STYLE,
} from "@/lib/labels";
import { askHref } from "@/lib/links";
import { towerBrookCompanyScore } from "@/lib/towerbrook";
import type { CompanyWithLinks } from "@/lib/types";
import { Badge, ConfidenceBars, DataTable } from "@/app/components/ui";
import {
  WorkspaceActionButton,
  WorkspaceSavedBadge,
} from "@/app/components/InvestorWorkspaceTray";

function companyRedTeamPrompt(company: CompanyWithLinks, themeLabel: string): string {
  return `Red-team ${company.name} as a TowerBrook target or comparable in ${themeLabel}. Identify why it may not be actionable, which experts can confirm the risk, and what evidence would change the view.`;
}

function CompanyDirectoryActions({
  company,
  themeLabel,
  includeReviewLink = false,
}: {
  company: CompanyWithLinks;
  themeLabel: string;
  includeReviewLink?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {includeReviewLink ? (
        <Link href={`/companies/${company.id}`} className="ee-button ee-button-secondary min-h-8 px-3">
          Review
        </Link>
      ) : null}
      <WorkspaceActionButton
        item={{
          id: company.id,
          kind: "target",
          name: company.name,
          sub: company.whyInteresting ?? company.description,
          href: `/companies/${company.id}`,
          theme: company.themes[0],
          status: company.category === "target" ? "promoted target" : "watchlist",
        }}
        className="ee-button ee-button-secondary min-h-8 px-3"
      >
        {company.category === "target" ? "Promote" : "Save"}
      </WorkspaceActionButton>
      <Link
        href={askHref(companyRedTeamPrompt(company, themeLabel))}
        className="ee-button ee-button-secondary min-h-8 px-3"
      >
        Red-team
      </Link>
    </div>
  );
}

function CompanyDirectoryDesktopRow({
  company,
  dealCount,
  themeLabel,
}: {
  company: CompanyWithLinks;
  dealCount: number;
  themeLabel: string;
}) {
  const towerBrook = towerBrookCompanyScore(company, company.expertCount);

  return (
    <tr className="hover:bg-[#fbfcff]">
      <td className="min-w-[220px]">
        <Link href={`/companies/${company.id}`} className="ee-link">
          {company.name}
        </Link>
        <WorkspaceSavedBadge id={company.id} kind="target" className="ml-2 align-middle" />
        <div className="mt-0.5 text-[11px] text-ink-soft">
          {company.hq ?? company.website ?? "Mapped company"}
        </div>
      </td>
      <td>
        <Badge className={COMPANY_CATEGORY_STYLE[company.category]}>
          {COMPANY_CATEGORY_LABEL[company.category]}
        </Badge>
      </td>
      <td>
        {company.ownershipStatus ? (
          <Badge className={OWNERSHIP_STYLE[company.ownershipStatus]}>
            {OWNERSHIP_LABEL[company.ownershipStatus]}
          </Badge>
        ) : (
          <span className="text-ink-faint">Review</span>
        )}
      </td>
      <td className="font-semibold tabular-nums">{company.expertCount}</td>
      <td className="font-semibold tabular-nums">{dealCount}</td>
      <td>
        <span className={towerBrook.isDirect ? "text-success" : "text-ink-faint"}>
          {towerBrook.isDirect ? towerBrook.label : "Path not mapped"}
        </span>
      </td>
      <td>
        <div className="font-semibold tabular-nums">{Math.round(company.confidence * 100)}%</div>
        <ConfidenceBars value={company.confidence} />
      </td>
      <td className="max-w-[360px] text-[12px] leading-relaxed text-ink-soft">
        <span className="line-clamp-2">{company.whyInteresting ?? company.description}</span>
      </td>
      <td className="max-w-[240px]">
        <span className="line-clamp-2">
          {company.linkedExperts.map((link) => link.expert.name).join(", ") || "No direct links"}
        </span>
      </td>
      <td>
        {company.sources.slice(0, 4).map((source, i) => (
          <a
            key={`${source.url}-${i}`}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ee-link mr-1"
          >
            [{i + 1}]
          </a>
        ))}
      </td>
      <td className="min-w-[150px]">
        <CompanyDirectoryActions company={company} themeLabel={themeLabel} />
      </td>
    </tr>
  );
}

function CompanyDirectoryMobileCard({
  company,
  dealCount,
  themeLabel,
}: {
  company: CompanyWithLinks;
  dealCount: number;
  themeLabel: string;
}) {
  const towerBrook = towerBrookCompanyScore(company, company.expertCount);

  return (
    <article className="rounded-lg border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href={`/companies/${company.id}`} className="ee-link text-[15px] font-semibold">
            {company.name}
          </Link>
          <WorkspaceSavedBadge id={company.id} kind="target" className="ml-2 align-middle" />
          <p className="mt-1 text-[12px] text-ink-soft">
            {company.hq ?? company.website ?? "Mapped company"}
          </p>
        </div>
        <div className="text-right text-[11px] text-ink-soft">
          <div className="font-semibold tabular-nums text-ink">{company.expertCount} experts</div>
          <div>{dealCount} deals</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge className={COMPANY_CATEGORY_STYLE[company.category]}>
          {COMPANY_CATEGORY_LABEL[company.category]}
        </Badge>
        {company.ownershipStatus ? (
          <Badge className={OWNERSHIP_STYLE[company.ownershipStatus]}>
            {OWNERSHIP_LABEL[company.ownershipStatus]}
          </Badge>
        ) : null}
      </div>
      <p className="mt-3 line-clamp-3 text-[12px] leading-relaxed text-ink-soft">
        {company.whyInteresting ?? company.description}
      </p>
      <p className="mt-2 line-clamp-2 text-[11px] text-ink-faint">
        {towerBrook.isDirect ? towerBrook.label : "Path not mapped"} · {Math.round(company.confidence * 100)}% confidence
      </p>
      <div className="mt-3">
        <CompanyDirectoryActions company={company} themeLabel={themeLabel} includeReviewLink />
      </div>
    </article>
  );
}

export default function CompanyDirectorySection({
  companies,
  dealCounts,
  themeLabel,
}: {
  companies: CompanyWithLinks[];
  dealCounts: Map<string, number>;
  themeLabel: string;
}) {
  return (
    <section className="ee-panel overflow-hidden rounded-lg">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="ee-label text-ink">Company directory ({companies.length})</h2>
        <span className="text-[12px] text-ink-faint">Canonical mapped companies</span>
      </div>
      <div className="hidden lg:block">
        <DataTable minWidth={1200}>
          <thead>
            <tr>
              <th>Company</th>
              <th>Category</th>
              <th>Ownership</th>
              <th>Expert links</th>
              <th>Deals</th>
              <th>Relationship path</th>
              <th>Record confidence</th>
              <th>Investment angle</th>
              <th>Linked experts</th>
              <th>Sources</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <CompanyDirectoryDesktopRow
                key={company.id}
                company={company}
                dealCount={dealCounts.get(company.id) ?? 0}
                themeLabel={themeLabel}
              />
            ))}
          </tbody>
        </DataTable>
      </div>
      <div className="space-y-3 p-4 lg:hidden">
        {companies.map((company) => (
          <CompanyDirectoryMobileCard
            key={company.id}
            company={company}
            dealCount={dealCounts.get(company.id) ?? 0}
            themeLabel={themeLabel}
          />
        ))}
      </div>
    </section>
  );
}
