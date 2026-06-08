import sourceRegister from "@/data/source-register.json";
import warmPathData from "@/data/towerbrook-warm-paths.json";
import candidates from "@/data/candidates.json";
import deals from "@/data/deals.json";
import { ConfidenceBars, PageShell } from "@/app/components/ui";
import { getExperts } from "@/lib/data";
import { getThemeFocus } from "@/lib/theme-focus-server";

type RegisteredSource = (typeof sourceRegister.sources)[number];

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default async function SourcesPage() {
  const themeFocus = await getThemeFocus();
  const expertsById = new Map(getExperts().map((expert) => [expert.id, expert]));
  const warmPathSources = warmPathData.paths.flatMap((path) => {
    const expert = expertsById.get(path.target_expert_id);
    return path.sources.map((source, index): RegisteredSource => ({
      source_id: `warm-path-${path.id}-${index + 1}-${slug(source.publisher ?? source.title)}`,
      theme: expert?.themes[0] ?? "all",
      title: source.title,
      url: source.url,
      source_type: "towerbrook-warm-path",
      source_origin: "public",
      publisher: source.publisher ?? "Source",
      date: "2026-06-06",
      why_useful: `Supports TowerBrook warm-intro path: ${path.intro_route}`,
      expected_entities: ["expert", "advisor", "company"],
      expected_relationships: ["warm_intro_path", path.path_type],
      terminal_lane: "TowerBrook Warm Path",
      priority: path.status === "verified" ? 1 : 2,
      status: path.status === "verified" ? "done" : "needs_review",
      graph_entity_refs: [
        `expert:${path.target_expert_id}`,
        ...(expert?.companies.map((link) => `company:${link.companyId}`) ?? []),
      ],
      mapped_deal_refs: [],
    }));
  });
  const sourcesByUrl = new Map<string, RegisteredSource>();
  for (const source of [...sourceRegister.sources, ...warmPathSources]) {
    sourcesByUrl.set(source.url, source);
  }
  const visibleSources = [...sourcesByUrl.values()].filter(
    (source) => themeFocus === "all" || source.theme === themeFocus || source.theme === "all",
  );
  const candidateBySource = new Map(
    candidates.candidates.map((candidate) => [candidate.source.source_id, candidate]),
  );
  const dealFactsByUrl = new Map<string, { deal: string; facts: string[] }[]>();

  for (const deal of deals) {
    for (const source of deal.sources) {
      const rows = dealFactsByUrl.get(source.url) ?? [];
      rows.push({
        deal: deal.name,
        facts: deal.facts
          .filter((fact) => fact.sourceId && deal.sourceIds.includes(fact.sourceId))
          .slice(0, 4)
          .map((fact) => fact.factType.replaceAll("_", " ")),
      });
      dealFactsByUrl.set(source.url, rows);
    }
  }

  return (
    <PageShell>
        <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight">Source Register</h1>
            <p className="mt-2 max-w-3xl text-[13px] text-ink-soft">
              Audit source quality, extracted entities, evidence snippets and
              candidate review status before any graph mutation.
            </p>
          </div>
          <div className="text-[12px] text-ink-faint">
            Production mutation: {sourceRegister.meta.production_mutation ? "enabled" : "disabled"}
          </div>
        </header>

        <section className="ee-panel overflow-hidden rounded-lg">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="ee-label text-ink">
              Registered sources ({visibleSources.length})
            </h2>
            <span className="text-[12px] text-ink-faint">
              Research jobs: /discover
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="ee-table min-w-[1080px]">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Theme</th>
                  <th>Type</th>
                  <th>Publisher</th>
                  <th>Date</th>
                  <th>Expected entities</th>
                  <th>Review status</th>
                  <th>Confidence</th>
                  <th>Deal facts</th>
                  <th>Why useful</th>
                </tr>
              </thead>
              <tbody>
                {visibleSources.map((source) => {
                  const candidate = candidateBySource.get(source.source_id);
                  return (
                    <tr key={source.source_id} className="hover:bg-[#fbfcff]">
                      <td className="min-w-[260px]">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ee-link"
                        >
                          {source.title}
                        </a>
                        <div className="mt-0.5 text-[11px] text-ink-faint">
                          {source.source_id}
                        </div>
                      </td>
                      <td>{source.theme}</td>
                      <td>{source.source_type}</td>
                      <td>{source.publisher}</td>
                      <td>{source.date}</td>
                      <td className="max-w-[180px]">
                        {source.expected_entities.join(", ")}
                      </td>
                      <td>{(candidate?.review.status ?? source.status ?? "unprocessed").replaceAll("_", " ")}</td>
                      <td>
                        {candidate ? (
                          <>
                            <div className="font-semibold tabular-nums">
                              {Math.round(candidate.confidence * 100)}%
                            </div>
                            <ConfidenceBars value={candidate.confidence} />
                          </>
                        ) : (
                          <span className="text-ink-faint">n/a</span>
                        )}
                      </td>
                      <td className="max-w-[260px] text-[12px] leading-relaxed text-ink-soft">
                        {dealFactsByUrl.get(source.url)?.map((row) => (
                          <span key={row.deal} className="line-clamp-2">
                            {row.deal}: {row.facts.join(", ") || "source evidence"}
                          </span>
                        )) ?? <span className="text-ink-faint">No mapped deal facts</span>}
                      </td>
                      <td className="max-w-[360px] text-[12px] leading-relaxed text-ink-soft">
                        <span className="line-clamp-2">{source.why_useful}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
    </PageShell>
  );
}
