import { Suspense } from "react";
import { buildGraphModel } from "@/lib/graph-model";
import { resolveGraphFocusKey } from "@/lib/graph-normalize";
import { matchesThemeFocus } from "@/lib/theme-focus";
import { getPageScope } from "@/lib/page-scope";
import { singleParam } from "@/lib/url-params";
import GraphExplorer from "@/app/components/graph/GraphExplorer";
import type {
  ExplorerCompanyNode,
  ExplorerDealNode,
  ExplorerExpertNode,
} from "@/lib/graph-types";

export default async function GraphPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { themeFocus, includeTowerBrookEmployees } = await getPageScope();
  const params = (await searchParams) ?? {};
  const focusParam = singleParam(params.focus);
  const model = await buildGraphModel(includeTowerBrookEmployees);
  const { experts, companies, deals, edges, sources, themes, canonicalMap } = model;

  const requestedSelected =
    focusParam && isValidFocusKey(focusParam, experts, companies, deals, canonicalMap)
      ? resolveGraphFocusKey(focusParam, canonicalMap)
      : undefined;
  const selectedContextNode = requestedSelected
    ? [...experts, ...companies, ...deals].find((node) => node.key === requestedSelected)
    : undefined;

  const defaultSelected =
    requestedSelected ??
    companies
      .filter((company) => matchesThemeFocus(company.themes, themeFocus))
      .map((company) => ({
        company,
        edges: edges.filter(
          (edge) =>
            (edge.from === company.key || edge.to === company.key) &&
            matchesThemeFocus(edge.themes, themeFocus),
        ).length,
      }))
      .sort((a, b) => b.edges - a.edges || b.company.confidence - a.company.confidence)[0]
      ?.company.key ??
    companies[0]?.key ??
    experts[0]?.key;

  return (
    <Suspense fallback={<div className="p-6 text-sm text-ink-soft">Loading relationship graph…</div>}>
      <GraphExplorer
        key={`${themeFocus}:${defaultSelected}`}
        themes={themes}
        experts={experts}
        companies={companies}
        deals={deals}
        edges={edges}
        sources={sources}
        defaultTheme={themeFocus}
        defaultSelected={defaultSelected}
        returnContext={
          selectedContextNode
            ? {
                label: selectedContextNode.name,
                href: selectedContextNode.href,
                detail: selectedContextNode.subtitle,
              }
            : undefined
        }
      />
    </Suspense>
  );
}

function isValidFocusKey(
  value: string,
  experts: ExplorerExpertNode[],
  companies: ExplorerCompanyNode[],
  deals: ExplorerDealNode[],
  canonicalMap: Map<string, string>,
) {
  const resolved = resolveGraphFocusKey(value, canonicalMap);
  return [...experts, ...companies, ...deals].some((node) => node.key === resolved);
}
