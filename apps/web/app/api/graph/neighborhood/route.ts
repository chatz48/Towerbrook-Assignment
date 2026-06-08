import type {
  ExplorerCompanyNode,
  ExplorerDealNode,
  ExplorerExpertNode,
} from "@/lib/graph-types";
import { buildGraphModel } from "@/lib/graph-model";
import {
  computeVisibleGraph,
  defaultGraphViewOptions,
  filterGraphEdges,
} from "@/lib/graph-visible";
import { resolveGraphFocusKey } from "@/lib/graph-normalize";
import { getPageScope } from "@/lib/page-scope";

export async function GET(request: Request) {
  const focus = new URL(request.url).searchParams.get("focus");
  if (!focus) {
    return Response.json({ error: "focus is required" }, { status: 400 });
  }

  const { themeFocus, includeTowerBrookEmployees } = await getPageScope();
  const model = await buildGraphModel(includeTowerBrookEmployees);
  const selectedKey = resolveGraphFocusKey(focus, model.canonicalMap);
  const knownKeys = new Set(
    [...model.experts, ...model.companies, ...model.deals].map((node) => node.key),
  );
  if (!knownKeys.has(selectedKey)) {
    return Response.json({ error: "focus not found" }, { status: 404 });
  }

  const viewOptions = defaultGraphViewOptions(themeFocus, selectedKey);
  const allNodes = [...model.experts, ...model.companies, ...model.deals];
  const nodeByKey = new Map(allNodes.map((node) => [node.key, node]));
  const filteredEdges = filterGraphEdges(model.edges, nodeByKey, viewOptions);
  const visible = computeVisibleGraph(model, viewOptions);
  const neighborhoodKeys = new Set(visible.visibleNodes.map((node) => node.key));
  const neighborhoodEdges = filteredEdges.filter(
    (edge) => neighborhoodKeys.has(edge.from) || neighborhoodKeys.has(edge.to),
  );

  for (const edge of neighborhoodEdges) {
    neighborhoodKeys.add(edge.from);
    neighborhoodKeys.add(edge.to);
  }

  const neighborhoodNodes = [...neighborhoodKeys]
    .map((key) => nodeByKey.get(key))
    .filter((node): node is ExplorerExpertNode | ExplorerCompanyNode | ExplorerDealNode =>
      Boolean(node),
    );

  const usedSourceIds = new Set(neighborhoodEdges.flatMap((edge) => edge.sourceIds));
  for (const node of neighborhoodNodes) {
    for (const sourceId of node.sourceIds) usedSourceIds.add(sourceId);
  }

  return Response.json({
    experts: neighborhoodNodes.filter((node) => node.kind === "expert"),
    companies: neighborhoodNodes.filter((node) => node.kind === "company"),
    deals: neighborhoodNodes.filter((node) => node.kind === "deal"),
    edges: neighborhoodEdges,
    sources: model.sources.filter((source) => usedSourceIds.has(source.id)),
    themes: model.themes,
    defaultTheme: themeFocus,
    defaultSelected: visible.selectedKey,
    directEdgeCount: visible.directEdgeCount,
  });
}
