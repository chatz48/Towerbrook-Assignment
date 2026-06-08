import { notFound } from "next/navigation";
import Link from "next/link";
import {
  DEAL_ADVISOR_LABEL,
  DEAL_TYPE_LABEL,
  dealDate,
  isRequiredDealFact,
  resolveDealCompanies,
  resolveDealExperts,
} from "@/lib/deals";
import { listDeals, loadDeal } from "@/lib/deal-repository";
import { Badge, BackLink, Confidence, ConfidenceBars, PageShell, SourceLinks, ThemeTag } from "@/app/components/ui";
import DealEnrichmentButton from "@/app/components/DealEnrichmentButton";

export async function generateStaticParams() {
  return (await listDeals()).map((deal) => ({ id: deal.id }));
}

export default async function DealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deal = await loadDeal(id);
  if (!deal) notFound();

  const companies = resolveDealCompanies(deal);
  const experts = resolveDealExperts(deal);
  const missing = deal.missingFacts;
  const requiredMissing = missing.filter(isRequiredDealFact);
  const optionalMissing = missing.filter((fact) => !isRequiredDealFact(fact));
  const conflicts = deal.contradictoryFacts ?? [];

  return (
    <PageShell>
        <BackLink href="/deals">Back to deals</BackLink>

        <header className="ee-panel mt-5 rounded-lg p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[28px] font-semibold tracking-tight">{deal.name}</h1>
                <Badge className="border-blue-200 bg-blue-50 text-blue-700">
                  {DEAL_TYPE_LABEL[deal.dealType]}
                </Badge>
                <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                  {deal.status}
                </Badge>
              </div>
              <p className="mt-4 max-w-4xl text-[13px] leading-relaxed text-ink-soft">
                {deal.investmentRelevance}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <ThemeTag id={deal.theme} small />
                <span className="text-[12px] text-ink-faint">{deal.geography}</span>
                <span className="text-[12px] text-ink-faint">{dealDate(deal) ?? "Date missing"}</span>
              </div>
            </div>
            <div className="grid min-w-[420px] grid-cols-2 overflow-hidden rounded-lg border border-line max-lg:min-w-0">
              <Fact label="Required completion" value={`${Math.round(deal.completionScore * 100)}%`} />
              <Fact label="Confidence" value={`${(deal.confidence * 100).toFixed(0)}%`} />
              <Fact label="Advisors" value={String(deal.advisorCount)} />
              <Fact label="Follow-up gaps" value={String(missing.length)} />
            </div>
          </div>
        </header>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
          <main className="space-y-5">
            <section className="ee-panel overflow-hidden rounded-lg">
              <div className="border-b border-line px-4 py-3">
                <h2 className="ee-label text-ink">Deal fact rubric</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="ee-table min-w-[940px]">
                  <thead>
                    <tr>
                      <th>Fact</th>
                      <th>Value</th>
                      <th>Evidence</th>
                      <th>Source</th>
                      <th>Confidence</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deal.facts.map((fact) => (
                      <tr key={fact.id}>
                        <td className="font-medium">{fact.factType.replaceAll("_", " ")}</td>
                        <td>{fact.factValue}</td>
                        <td className="max-w-[380px] text-[12px] leading-relaxed text-ink-soft">
                          {fact.evidenceText ?? "No evidence captured"}
                        </td>
                        <td>{fact.sourceId ? <a href="#sources" className="ee-link">{fact.sourceId}</a> : "n/a"}</td>
                        <td>
                          <div className="font-semibold tabular-nums">
                            {(fact.confidence * 100).toFixed(0)}%
                          </div>
                          <ConfidenceBars value={fact.confidence} />
                        </td>
                        <td>{fact.reviewStatus.replaceAll("_", " ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <div className="ee-panel rounded-lg p-5">
                <div className="ee-label text-ink">Parties</div>
                <div className="mt-3 space-y-2">
                  {deal.parties.map((party) => (
                    <div key={`${party.role}-${party.name}`} className="rounded-md border border-line bg-paper p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold">{party.name}</span>
                        <span className="text-[11px] text-ink-faint">{party.role.replaceAll("-", " ")}</span>
                      </div>
                      {party.companyId ? (
                        <Link href={`/companies/${party.companyId}`} className="ee-link mt-1 inline-flex text-[12px]">
                          Open company
                        </Link>
                      ) : null}
                      {party.personId ? (
                        <Link href={`/experts/${party.personId}`} className="ee-link mt-1 inline-flex text-[12px]">
                          Open expert
                        </Link>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="ee-panel rounded-lg p-5">
                <div className="ee-label text-ink">Advisors and counsel</div>
                <div className="mt-3 space-y-2">
                  {deal.advisors.length ? (
                    deal.advisors.map((advisor) => (
                      <div key={`${advisor.role}-${advisor.name}`} className="rounded-md border border-line bg-paper p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold">{advisor.name}</span>
                          <span className="text-[11px] text-ink-faint">{DEAL_ADVISOR_LABEL[advisor.role]}</span>
                        </div>
                        {advisor.companyId ? (
                          <Link href={`/companies/${advisor.companyId}`} className="ee-link mt-1 inline-flex text-[12px]">
                            Open firm
                          </Link>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-[13px] leading-relaxed text-ink-soft">
                      No advisor or counsel has been verified. Use the follow-up searches to fill this gap.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="ee-panel rounded-lg p-5">
              <div className="ee-label text-ink">People and companies surfaced</div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <LinkList
                  title="Experts"
                  empty="No people surfaced yet."
                  items={experts.map((expert) => ({
                    href: `/experts/${expert.id}`,
                    label: expert.name,
                    sub: expert.headline,
                  }))}
                />
                <LinkList
                  title="Companies"
                  empty="No companies surfaced yet."
                  items={companies.map((company) => ({
                    href: `/companies/${company.id}`,
                    label: company.name,
                    sub: company.whyInteresting ?? company.description,
                  }))}
                />
              </div>
            </section>
          </main>

          <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start">
            <section className="ee-panel rounded-lg p-5">
              <div className="ee-label text-ink">Evidence completeness</div>
              <div className="mt-4 rounded-lg border border-line bg-paper p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold">Required facts</span>
                  <span className="text-[22px] font-semibold tabular-nums">
                    {deal.requiredFactsFound}/{deal.requiredFactsTotal}
                  </span>
                </div>
                <div className="mt-2"><ConfidenceBars value={deal.completionScore} /></div>
                <div className="mt-3"><Confidence value={deal.confidence} /></div>
              </div>
            </section>

            <section className="ee-panel rounded-lg p-5">
              <div className="ee-label text-ink">Follow-up gaps</div>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
                Required completion measures the core rubric. These are remaining diligence items
                or optional details to verify before relying on the scorecard in Copilot or a partner memo.
              </p>
              <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-ink-soft">
                {(requiredMissing.length ? requiredMissing : []).map((item) => (
                  <li key={item} className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
                    Required: {item.replaceAll("_", " ")}
                  </li>
                ))}
                {(optionalMissing.length ? optionalMissing : missing.length ? [] : ["No required gaps currently flagged"]).map((item) => (
                  <li key={item} className="rounded-md border border-line bg-paper px-3 py-2">
                    {item.replaceAll("_", " ")}
                  </li>
                ))}
              </ul>
            </section>

            {conflicts.length ? (
              <section className="ee-panel rounded-lg p-5">
                <div className="ee-label text-ink">Conflicts</div>
                <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-ink-soft">
                  {conflicts.map((conflict) => (
                    <li key={conflict.factType}>
                      {conflict.factType}: {conflict.note}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="ee-panel rounded-lg p-5">
              <div className="ee-label text-ink">Follow-up searches</div>
              <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-ink-soft">
                {deal.followUpSearches.map((query) => (
                  <li key={query} className="rounded-md border border-line bg-paper px-3 py-2">
                    {query}
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <DealEnrichmentButton dealId={deal.id} label="Run sourced research job" />
              </div>
              <Link href={`/graph?focus=deal:${deal.id}`} className="ee-button ee-button-secondary mt-3 w-full">
                View relationships
              </Link>
            </section>

            <section className="ee-panel rounded-lg p-5" id="sources">
              <div className="mb-3 ee-label text-ink">Sources</div>
              <SourceLinks sources={deal.sources} />
            </section>
          </aside>
        </div>
    </PageShell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-b border-line px-4 py-3 even:border-r-0">
      <dt className="ee-label">{label}</dt>
      <dd className="mt-2 text-[18px] font-semibold">{value}</dd>
    </div>
  );
}

function LinkList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: { href: string; label: string; sub: string }[];
}) {
  return (
    <div>
      <h3 className="ee-label text-ink">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.length ? (
          items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md border border-line bg-paper p-3 hover:border-line-strong"
            >
              <span className="font-semibold text-accent">{item.label}</span>
              <span className="mt-1 block line-clamp-2 text-[12px] leading-relaxed text-ink-soft">
                {item.sub}
              </span>
            </Link>
          ))
        ) : (
          <p className="text-[13px] text-ink-soft">{empty}</p>
        )}
      </div>
    </div>
  );
}
