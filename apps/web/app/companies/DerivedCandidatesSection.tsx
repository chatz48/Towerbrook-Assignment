import Link from "next/link";
import {
  COMPANY_CATEGORY_LABEL,
  COMPANY_CATEGORY_STYLE,
} from "@/lib/labels";
import { askHref } from "@/lib/links";
import type { DerivedCompanyCandidate } from "@/lib/expert-discovery";
import type { CompanyWithLinks } from "@/lib/types";
import { Badge, DataTable } from "@/app/components/ui";
import {
  WorkspaceActionButton,
  WorkspaceSavedBadge,
} from "@/app/components/InvestorWorkspaceTray";

function derivedCandidateAskPrompt(company: DerivedCompanyCandidate, themeLabel: string): string {
  return `Review company candidate ${company.name} for ${themeLabel}. It surfaced because: ${company.why_interesting}. Named experts: ${company.expert_connections.map((expert) => expert.name).join(", ") || "none"}. PE deal connections: ${company.deal_connections.length}. Recommend verification steps, experts to call, and whether it belongs in the target basket.`;
}

function resolveCanonicalCompany(
  company: DerivedCompanyCandidate,
  companyById: Map<string, CompanyWithLinks>,
): CompanyWithLinks | undefined {
  return company.canonical_match.company_id
    ? companyById.get(company.canonical_match.company_id)
    : undefined;
}

function DerivedCandidateActions({
  company,
  canonicalCompany,
  themeLabel,
}: {
  company: DerivedCompanyCandidate;
  canonicalCompany: CompanyWithLinks | undefined;
  themeLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {canonicalCompany ? (
        <WorkspaceActionButton
          item={{
            id: canonicalCompany.id,
            kind: "target",
            name: canonicalCompany.name,
            sub: company.why_interesting,
            href: `/companies/${canonicalCompany.id}`,
            theme: canonicalCompany.themes[0],
            status: "research candidate",
          }}
          className="ee-button ee-button-secondary min-h-8 px-3"
        >
          Save
        </WorkspaceActionButton>
      ) : (
        <Link href="/discover" className="ee-button ee-button-secondary min-h-8 px-3">
          Verify
        </Link>
      )}
      <Link
        href={askHref(derivedCandidateAskPrompt(company, themeLabel))}
        className="ee-button ee-button-secondary min-h-8 px-3"
      >
        Ask AI
      </Link>
    </div>
  );
}

function DerivedCandidateDesktopRow({
  company,
  canonicalCompany,
  themeLabel,
}: {
  company: DerivedCompanyCandidate;
  canonicalCompany: CompanyWithLinks | undefined;
  themeLabel: string;
}) {
  return (
    <tr className="hover:bg-[#fbfcff]">
      <td className="min-w-[220px]">
        {canonicalCompany ? (
          <Link href={`/companies/${canonicalCompany.id}`} className="ee-link">
            {company.name}
          </Link>
        ) : (
          <span className="font-semibold">{company.name}</span>
        )}
        {canonicalCompany ? (
          <WorkspaceSavedBadge id={canonicalCompany.id} kind="target" className="ml-2 align-middle" />
        ) : null}
        <div className="mt-0.5 text-[11px] text-ink-soft">{company.owner ?? "Ownership to verify"}</div>
      </td>
      <td>
        <Badge className={COMPANY_CATEGORY_STYLE[company.category]}>
          {COMPANY_CATEGORY_LABEL[company.category]}
        </Badge>
      </td>
      <td className="text-[11px] text-ink-soft">{company.ownership_status.replaceAll("-", " ")}</td>
      <td className="max-w-[280px] text-[11px] text-ink-soft">
        <span className="line-clamp-2">
          {company.expert_connections.map((expert) => expert.name).join(", ") || "No named expert yet"}
        </span>
      </td>
      <td className="font-semibold tabular-nums">{company.deal_connections.length}</td>
      <td className="max-w-[360px] text-[11px] text-ink-soft">
        <span className="line-clamp-2">{company.why_interesting}</span>
      </td>
      <td className="min-w-[150px]">
        <DerivedCandidateActions
          company={company}
          canonicalCompany={canonicalCompany}
          themeLabel={themeLabel}
        />
      </td>
    </tr>
  );
}

function DerivedCandidateMobileCard({
  company,
  canonicalCompany,
  themeLabel,
}: {
  company: DerivedCompanyCandidate;
  canonicalCompany: CompanyWithLinks | undefined;
  themeLabel: string;
}) {
  return (
    <article className="rounded-lg border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          {canonicalCompany ? (
            <Link href={`/companies/${canonicalCompany.id}`} className="ee-link text-[15px] font-semibold">
              {company.name}
            </Link>
          ) : (
            <div className="text-[15px] font-semibold text-ink">{company.name}</div>
          )}
          {canonicalCompany ? (
            <WorkspaceSavedBadge id={canonicalCompany.id} kind="target" className="mt-1" />
          ) : null}
          <p className="mt-1 text-[12px] text-ink-soft">{company.owner ?? "Ownership to verify"}</p>
        </div>
        <div className="text-right text-[11px] text-ink-soft">
          <div className="font-semibold tabular-nums text-ink">{company.deal_connections.length} deals</div>
          <div>{company.expert_connections.length} experts</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge className={COMPANY_CATEGORY_STYLE[company.category]}>
          {COMPANY_CATEGORY_LABEL[company.category]}
        </Badge>
        <span className="rounded-full border border-line bg-paper px-2 py-1 text-[11px] text-ink-soft">
          {company.ownership_status.replaceAll("-", " ")}
        </span>
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-ink-soft">{company.why_interesting}</p>
      <p className="mt-3 line-clamp-2 text-[11px] text-ink-faint">
        {company.expert_connections.map((expert) => expert.name).join(", ") || "No named expert yet"}
      </p>
      <div className="mt-3">
        <DerivedCandidateActions
          company={company}
          canonicalCompany={canonicalCompany}
          themeLabel={themeLabel}
        />
      </div>
    </article>
  );
}

export default function DerivedCandidatesSection({
  derivedCandidates,
  companyById,
  themeLabel,
}: {
  derivedCandidates: DerivedCompanyCandidate[];
  companyById: Map<string, CompanyWithLinks>;
  themeLabel: string;
}) {
  return (
    <section className="ee-panel mb-5 overflow-hidden rounded-lg">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <h2 className="ee-label text-ink">
            Research candidates awaiting review ({derivedCandidates.length})
          </h2>
          <p className="mt-1 text-[11px] text-ink-faint">
            Non-canonical companies surfaced from named expert and PE-deal connections.
          </p>
        </div>
        <Link href="/experts" className="ee-link text-[12px]">
          Inspect expert evidence
        </Link>
      </div>
      <div className="hidden lg:block">
        <DataTable minWidth={1080}>
          <thead>
            <tr>
              <th>Company candidate</th>
              <th>Category</th>
              <th>Ownership</th>
              <th>Named experts</th>
              <th>PE deals</th>
              <th>Why surfaced</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {derivedCandidates.slice(0, 40).map((company) => (
              <DerivedCandidateDesktopRow
                key={company.candidate_id}
                company={company}
                canonicalCompany={resolveCanonicalCompany(company, companyById)}
                themeLabel={themeLabel}
              />
            ))}
          </tbody>
        </DataTable>
      </div>
      <div className="space-y-3 p-4 lg:hidden">
        {derivedCandidates.slice(0, 20).map((company) => (
          <DerivedCandidateMobileCard
            key={company.candidate_id}
            company={company}
            canonicalCompany={resolveCanonicalCompany(company, companyById)}
            themeLabel={themeLabel}
          />
        ))}
      </div>
    </section>
  );
}
