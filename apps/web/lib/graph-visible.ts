import type {
  ExplorerCompanyNode,
  ExplorerDealNode,
  ExplorerEdge,
  ExplorerExpertNode,
} from "@/lib/graph-types";
import { matchesThemeFocus, type ThemeFocus } from "@/lib/theme-focus";
import type { ExpertType, RelationshipType } from "@/lib/types";

type ExplorerNode = ExplorerExpertNode | ExplorerCompanyNode | ExplorerDealNode;

export const DEFAULT_CONFIDENCE_FLOOR = 0.72;

export const ALL_RELATIONSHIPS: RelationshipType[] = [
  "founded",
  "co-founded",
  "led",
  "advised",
  "board",
  "invested-in",
  "acquired",
  "banked",
  "legal-counsel",
  "partner",
  "served",
];

export interface GraphViewOptions {
  theme: ThemeFocus;
  selectedKey: string;
  confidenceFloor?: number;
  pathView?: boolean;
  nodeKinds?: Record<ExplorerNode["kind"], boolean>;
  relationships?: Record<RelationshipType, boolean>;
  expertDomain?: ExpertType | "all";
}

export function defaultGraphViewOptions(
  theme: ThemeFocus,
  selectedKey: string,
): GraphViewOptions {
  return {
    theme,
    selectedKey,
    confidenceFloor: DEFAULT_CONFIDENCE_FLOOR,
    pathView: true,
    nodeKinds: { expert: true, company: true, deal: true },
    relationships: Object.fromEntries(
      ALL_RELATIONSHIPS.map((relationship) => [relationship, true]),
    ) as Record<RelationshipType, boolean>,
    expertDomain: "all",
  };
}

function otherNode(edge: ExplorerEdge, key: string) {
  return edge.from === key ? edge.to : edge.from;
}

export function filterGraphEdges(
  edges: ExplorerEdge[],
  nodeByKey: Map<string, ExplorerNode>,
  options: GraphViewOptions,
) {
  const confidenceFloor = options.confidenceFloor ?? DEFAULT_CONFIDENCE_FLOOR;
  const nodeKinds = options.nodeKinds ?? { expert: true, company: true, deal: true };
  const relationships =
    options.relationships ??
    (Object.fromEntries(ALL_RELATIONSHIPS.map((relationship) => [relationship, true])) as Record<
      RelationshipType,
      boolean
    >);
  const expertDomain = options.expertDomain ?? "all";

  return edges.filter((edge) => {
    const from = nodeByKey.get(edge.from);
    const to = nodeByKey.get(edge.to);
    if (!from || !to) return false;
    if (!matchesThemeFocus(edge.themes, options.theme)) return false;
    if (!relationships[edge.relationship]) return false;
    if (edge.confidence < confidenceFloor) return false;
    if (!nodeKinds[from.kind] || !nodeKinds[to.kind]) return false;
    if (expertDomain !== "all") {
      const expertNode = from.kind === "expert" ? from : to.kind === "expert" ? to : null;
      if (expertNode && expertNode.type !== expertDomain) return false;
    }
    return true;
  });
}

export function computeVisibleGraph(
  model: {
    experts: ExplorerExpertNode[];
    companies: ExplorerCompanyNode[];
    deals: ExplorerDealNode[];
    edges: ExplorerEdge[];
  },
  options: GraphViewOptions,
) {
  const allNodes: ExplorerNode[] = [...model.experts, ...model.companies, ...model.deals];
  const nodeByKey = new Map(allNodes.map((node) => [node.key, node]));
  const filteredEdges = filterGraphEdges(model.edges, nodeByKey, options);

  const selectedNode =
    nodeByKey.get(options.selectedKey) ??
    allNodes.find((node) =>
      filteredEdges.some((edge) => edge.from === node.key || edge.to === node.key),
    ) ??
    allNodes[0];

  const selectedKey = selectedNode?.key ?? options.selectedKey;
  const selectedEdges = filteredEdges
    .filter((edge) => edge.from === selectedKey || edge.to === selectedKey)
    .sort((a, b) => b.confidence - a.confidence || b.sourceIds.length - a.sourceIds.length);

  const pathView = options.pathView ?? true;
  const firstHop = selectedEdges.slice(0, pathView ? 6 : 10);
  const visibleEdges = (() => {
    if (!selectedNode) return filteredEdges.slice(0, 10);
    if (!pathView) return firstHop;

    const firstHopKeys = new Set(firstHop.flatMap((edge) => [edge.from, edge.to]));
    const secondHop = filteredEdges
      .filter(
        (edge) =>
          !firstHop.some((first) => first.id === edge.id) &&
          (firstHopKeys.has(edge.from) || firstHopKeys.has(edge.to)),
      )
      .filter((edge) => edge.from !== selectedKey && edge.to !== selectedKey)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);

    return [...firstHop, ...secondHop];
  })();

  const visibleNodeKeys = new Set<string>();
  for (const edge of visibleEdges) {
    visibleNodeKeys.add(edge.from);
    visibleNodeKeys.add(edge.to);
  }
  if (selectedNode) visibleNodeKeys.add(selectedNode.key);

  const visibleNodes = [...visibleNodeKeys]
    .map((key) => nodeByKey.get(key))
    .filter((node): node is ExplorerNode => Boolean(node));

  const usedSourceIds = new Set(visibleEdges.flatMap((edge) => edge.sourceIds));
  for (const node of visibleNodes) {
    for (const sourceId of node.sourceIds) usedSourceIds.add(sourceId);
  }

  return {
    selectedKey,
    selectedNode,
    selectedEdges,
    visibleNodes,
    visibleEdges,
    filteredEdges,
    usedSourceIds,
    directEdgeCount: selectedEdges.length,
    neighborKeys: selectedEdges.map((edge) => otherNode(edge, selectedKey)),
  };
}
