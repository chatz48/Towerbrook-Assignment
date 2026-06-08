"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { WorkspaceActionButton } from "@/app/components/InvestorWorkspaceTray";
import type { ExpertType, RelationshipType } from "@/lib/types";
import {
  ALL_RELATIONSHIPS,
  computeVisibleGraph,
  DEFAULT_CONFIDENCE_FLOOR,
  filterGraphEdges,
  type GraphViewOptions,
} from "@/lib/graph-visible";
import { RELATIONSHIP_COLOR } from "@/lib/graph-colors";
import { askHref } from "@/lib/links";
import type {
  ExplorerCompanyNode,
  ExplorerDealNode,
  ExplorerEdge,
  ExplorerExpertNode,
  ExplorerNode,
  ExplorerSource,
  ExplorerTheme,
} from "@/lib/graph-types";
import { matchesThemeFocus, type ThemeFocus } from "@/lib/theme-focus";
import styles from "./GraphExplorer.module.css";

export type {
  ExplorerCompanyNode,
  ExplorerDealNode,
  ExplorerEdge,
  ExplorerExpertNode,
  ExplorerSource,
  ExplorerTheme,
} from "@/lib/graph-types";

const RELATIONSHIP_ORDER = ALL_RELATIONSHIPS;

const NODE_KIND_LABEL = {
  expert: "People",
  company: "Companies",
  deal: "Deals",
};

function confidenceText(confidence: number) {
  return `${Math.round(confidence * 100)}%`;
}

function confidenceBand(confidence: number) {
  if (confidence >= 0.85) return "High";
  if (confidence >= 0.75) return "Good";
  return "Indicative";
}

function nodeInitials(node: ExplorerNode) {
  return node.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function nodeKindName(node: ExplorerNode) {
  if (node.kind === "expert") return "Person";
  if (node.kind === "company") return "Company";
  return "Deal";
}

function nodeTypeName(node: ExplorerNode) {
  if (node.kind === "expert") return node.typeLabel;
  if (node.kind === "company") return node.categoryLabel;
  return node.typeLabel;
}

function nodeBadgeText(node: ExplorerNode) {
  if (node.kind === "expert") return "P";
  if (node.kind === "company") return "CO";
  return "D";
}

function otherNode(edge: ExplorerEdge, key: string) {
  return edge.from === key ? edge.to : edge.from;
}

function quickJumpNodes(
  allNodes: ExplorerNode[],
  edges: ExplorerEdge[],
  theme: ThemeFocus,
): { node: ExplorerNode; count: number }[] {
  return allNodes
    .filter((node) => matchesThemeFocus(node.themes, theme))
    .map((node) => ({
      node,
      count: edges.filter((edge) => edge.from === node.key || edge.to === node.key).length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
}

function expertTypesForFocus(
  selectedKey: string,
  selectedNode: ExplorerNode | undefined,
  edges: ExplorerEdge[],
  nodeByKey: Map<string, ExplorerNode>,
  options: Omit<GraphViewOptions, "expertDomain" | "selectedKey">,
): { value: ExpertType; label: string }[] {
  if (!selectedNode) return [];

  const connectedEdges = filterGraphEdges(edges, nodeByKey, {
    ...options,
    selectedKey,
    expertDomain: "all",
  }).filter((edge) => edge.from === selectedKey || edge.to === selectedKey);

  const types = new Map<ExpertType, string>();
  const addExpert = (node?: ExplorerNode) => {
    if (node?.kind === "expert") {
      types.set(node.type, node.typeLabel);
    }
  };

  addExpert(selectedNode);

  for (const edge of connectedEdges) {
    addExpert(nodeByKey.get(otherNode(edge, selectedKey)));
  }

  return [...types.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function sortDirectoryNodes(a: ExplorerNode, b: ExplorerNode) {
  if (a.kind !== b.kind) {
    const order: Record<ExplorerNode["kind"], number> = { expert: 0, company: 1, deal: 2 };
    return order[a.kind] - order[b.kind];
  }
  return a.name.localeCompare(b.name);
}

function directoryCountText(nodes: ExplorerNode[]) {
  const counts = nodes.reduce(
    (memo, node) => ({
      ...memo,
      [node.kind]: memo[node.kind] + 1,
    }),
    { expert: 0, company: 0, deal: 0 } as Record<ExplorerNode["kind"], number>,
  );
  return `${counts.expert} experts · ${counts.company} companies · ${counts.deal} deals`;
}

function directoryGroups(nodes: { node: ExplorerNode; connections: number }[]) {
  return (["expert", "company", "deal"] as const)
    .map((kind) => ({
      kind,
      label: NODE_KIND_LABEL[kind],
      items: nodes.filter((item) => item.node.kind === kind).slice(0, 8),
      total: nodes.filter((item) => item.node.kind === kind).length,
    }))
    .filter((group) => group.total > 0);
}

export default function GraphExplorer({
  themes,
  experts,
  companies,
  deals = [],
  edges,
  sources,
  defaultTheme,
  defaultSelected,
  returnContext,
  variant = "full",
}: {
  themes: ExplorerTheme[];
  experts: ExplorerExpertNode[];
  companies: ExplorerCompanyNode[];
  deals?: ExplorerDealNode[];
  edges: ExplorerEdge[];
  sources: ExplorerSource[];
  defaultTheme: ThemeFocus;
  defaultSelected?: string;
  returnContext?: {
    label: string;
    href: string;
    detail: string;
  };
  variant?: "full" | "embed";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [theme, setTheme] = useState<ThemeFocus>(defaultTheme);
  const [prevDefaultTheme, setPrevDefaultTheme] = useState(defaultTheme);
  if (defaultTheme !== prevDefaultTheme) {
    setPrevDefaultTheme(defaultTheme);
    setTheme(defaultTheme);
  }
  const [query, setQuery] = useState("");
  const [highlightedEdgeId, setHighlightedEdgeId] = useState<string | null>(null);
  const [nodeKinds, setNodeKinds] = useState<Record<ExplorerNode["kind"], boolean>>({
    expert: true,
    company: true,
    deal: true,
  });
  const [relationships, setRelationships] = useState<Record<RelationshipType, boolean>>(
    () =>
      Object.fromEntries(
        RELATIONSHIP_ORDER.map((relationship) => [relationship, true]),
      ) as Record<RelationshipType, boolean>,
  );
  const [confidenceFloor, setConfidenceFloor] = useState(DEFAULT_CONFIDENCE_FLOOR);
  const [pathView, setPathView] = useState(true);
  const [expertDomain, setExpertDomain] = useState<ExpertType | "all">("all");
  const [selectedKey, setSelectedKey] = useState(defaultSelected ?? experts[0]?.key ?? companies[0]?.key);
  const [history, setHistory] = useState<string[]>([]);
  const canvasColumnRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (variant !== "full") return;
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;
      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if (event.key === "Escape" && document.activeElement === searchInputRef.current) {
        setQuery("");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [variant]);

  const allNodes = useMemo(() => [...experts, ...companies, ...deals], [companies, deals, experts]);
  const themeLabel = useMemo(
    () => themes.find((item) => item.id === theme)?.name ?? (theme === "all" ? "All themes" : theme),
    [theme, themes],
  );
  const nodeByKey = useMemo(
    () => new Map(allNodes.map((node) => [node.key, node])),
    [allNodes],
  );
  const sourceById = useMemo(
    () => new Map(sources.map((source) => [source.id, source])),
    [sources],
  );
  const relationshipLabels = useMemo(() => {
    const labels = new Map<RelationshipType, string>();
    for (const edge of edges) labels.set(edge.relationship, edge.relationshipLabel);
    return labels;
  }, [edges]);

  const graphViewOptions = useMemo(
    () => ({
      theme,
      selectedKey,
      confidenceFloor,
      pathView,
      nodeKinds,
      relationships,
      expertDomain,
    }),
    [confidenceFloor, expertDomain, nodeKinds, pathView, relationships, selectedKey, theme],
  );

  const filteredEdges = useMemo(
    () => filterGraphEdges(edges, nodeByKey, graphViewOptions),
    [edges, graphViewOptions, nodeByKey],
  );

  const filteredNodeKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const edge of filteredEdges) {
      keys.add(edge.from);
      keys.add(edge.to);
    }
    return keys;
  }, [filteredEdges]);

  const visibleGraph = useMemo(
    () =>
      computeVisibleGraph(
        { experts, companies, deals, edges },
        graphViewOptions,
      ),
    [companies, deals, edges, experts, graphViewOptions],
  );

  const selectedNode = visibleGraph.selectedNode;
  const selectedEdges = visibleGraph.selectedEdges;

  const focusExpertDomainOptions = useMemo(
    () =>
      expertTypesForFocus(selectedKey, selectedNode, edges, nodeByKey, {
        theme,
        confidenceFloor,
        pathView,
        nodeKinds,
        relationships,
      }),
    [
      confidenceFloor,
      edges,
      nodeByKey,
      nodeKinds,
      pathView,
      relationships,
      selectedKey,
      selectedNode,
      theme,
    ],
  );

  const safeExpertDomain =
    expertDomain !== "all" && !focusExpertDomainOptions.some((option) => option.value === expertDomain)
      ? "all"
      : expertDomain;

  useEffect(() => {
    if (safeExpertDomain === expertDomain) return;
    startTransition(() => {
      setExpertDomain(safeExpertDomain);
    });
  }, [expertDomain, safeExpertDomain]);

  const focusMatches = useMemo(() => {
    const searchText = query.trim().toLowerCase();
    if (!searchText) return [];

    return allNodes
      .filter((node) => matchesThemeFocus(node.themes, theme) && nodeKinds[node.kind])
      .filter((node) => `${node.name} ${node.subtitle} ${node.tags.join(" ")}`.toLowerCase().includes(searchText))
      .map((node) => ({
        node,
        connections: filteredEdges.filter((edge) => edge.from === node.key || edge.to === node.key).length,
      }))
      .sort((a, b) => b.connections - a.connections || a.node.name.localeCompare(b.node.name))
      .slice(0, 12);
  }, [allNodes, filteredEdges, nodeKinds, query, theme]);

  const directoryNodes = useMemo(
    () =>
      allNodes
        .filter((node) => matchesThemeFocus(node.themes, theme) && nodeKinds[node.kind])
        .filter((node) => safeExpertDomain === "all" || node.kind !== "expert" || node.type === safeExpertDomain)
        .map((node) => ({
          node,
          connections: filteredEdges.filter((edge) => edge.from === node.key || edge.to === node.key).length,
        }))
        .sort((a, b) => sortDirectoryNodes(a.node, b.node) || b.connections - a.connections),
    [allNodes, filteredEdges, nodeKinds, safeExpertDomain, theme],
  );
  const groupedDirectoryNodes = useMemo(() => directoryGroups(directoryNodes), [directoryNodes]);
  const quickJumpItems = useMemo(
    () =>
      quickJumpNodes(allNodes, filteredEdges, theme).filter((item) => item.node.key !== selectedKey),
    [allNodes, filteredEdges, selectedKey, theme],
  );
  const availableRelationships = useMemo(
    () =>
      RELATIONSHIP_ORDER.filter((relationship) =>
        edges.some((edge) => edge.relationship === relationship),
      ),
    [edges],
  );
  const activeNodeKindCount = useMemo(
    () => (["expert", "company", "deal"] as const).filter((kind) => nodeKinds[kind]).length,
    [nodeKinds],
  );
  const activeRelationshipCount = useMemo(
    () => availableRelationships.filter((relationship) => relationships[relationship]).length,
    [availableRelationships, relationships],
  );
  const visibleEdges = visibleGraph.visibleEdges;
  const visibleNodes = visibleGraph.visibleNodes;
  const hiddenDirectEdges = useMemo(() => {
    const shown = visibleEdges.filter(
      (edge) => edge.from === selectedKey || edge.to === selectedKey,
    ).length;
    return Math.max(0, selectedEdges.length - shown);
  }, [selectedEdges.length, selectedKey, visibleEdges]);

  const starterSuggestions = useMemo(
    () => quickJumpNodes(allNodes, filteredEdges, theme).slice(0, 3),
    [allNodes, filteredEdges, theme],
  );

  const metrics = useMemo(() => {
    const bridgeExperts = experts
      .map((expert) => ({
        expert,
        count: filteredEdges.filter((edge) => edge.from === expert.key || edge.to === expert.key).length,
      }))
      .filter((item) => item.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const denseTargets = companies
      .map((company) => ({
        company,
        count: filteredEdges.filter((edge) => edge.from === company.key || edge.to === company.key).length,
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const repeatedAdvisors = RELATIONSHIP_ORDER.map((relationship) => ({
      relationship,
      label: relationshipLabels.get(relationship) ?? relationship,
      count: filteredEdges.filter((edge) => edge.relationship === relationship).length,
    }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const coveredTags = new Map<string, number>();
    for (const node of visibleNodes) {
      for (const tag of node.tags.slice(0, 3)) coveredTags.set(tag, (coveredTags.get(tag) ?? 0) + 1);
    }

    return {
      bridgeExperts,
      denseTargets,
      repeatedAdvisors,
      weakCoverage: [...coveredTags]
        .filter(([, count]) => count === 1)
        .slice(0, 3)
        .map(([tag]) => tag),
    };
  }, [companies, experts, filteredEdges, relationshipLabels, visibleNodes]);

  const suggestedNext = useMemo(() => {
    const items: { key: string; node: ExplorerNode; reason: string; count?: number }[] = [];
    const seen = new Set<string>();

    function add(node: ExplorerNode, reason: string, count?: number) {
      if (node.key === selectedKey || seen.has(node.key)) return;
      seen.add(node.key);
      items.push({ key: node.key, node, reason, count });
    }

    for (const { expert, count } of metrics.bridgeExperts) {
      add(expert, "Bridge expert", count);
    }
    for (const { company, count } of metrics.denseTargets) {
      add(company, "High-density target", count);
    }
    for (const { node, count } of quickJumpItems) {
      add(node, "Well connected", count);
    }

    return items.slice(0, 6);
  }, [metrics.bridgeExperts, metrics.denseTargets, quickJumpItems, selectedKey]);

  function syncFocusToUrl(key: string) {
    if (variant !== "full") return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("focus", key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function selectNode(key: string) {
    setSelectedKey((current) => {
      if (current && current !== key) setHistory((items) => [...items.slice(-5), current]);
      return key;
    });
    setQuery("");
    setHighlightedEdgeId(null);
    syncFocusToUrl(key);
  }

  function highlightRelationship(edgeId: string) {
    setHighlightedEdgeId(edgeId);
    window.requestAnimationFrame(() => {
      canvasColumnRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function selectNodeAndReveal(key: string) {
    selectNode(key);
    window.requestAnimationFrame(() => {
      canvasColumnRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function stepBack() {
    const previous = history.at(-1);
    if (!previous) return;
    setSelectedKey(previous);
    setHistory((items) => items.slice(0, -1));
    setHighlightedEdgeId(null);
    syncFocusToUrl(previous);
  }

  function resetExplorer() {
    setTheme(defaultTheme);
    setQuery("");
    setNodeKinds({ expert: true, company: true, deal: true });
    setRelationships(
      Object.fromEntries(
        RELATIONSHIP_ORDER.map((relationship) => [relationship, true]),
      ) as Record<RelationshipType, boolean>,
    );
    setConfidenceFloor(DEFAULT_CONFIDENCE_FLOOR);
    setPathView(true);
    setExpertDomain("all");
    const resetKey = defaultSelected ?? experts[0]?.key ?? companies[0]?.key ?? deals[0]?.key;
    setSelectedKey(resetKey);
    setHistory([]);
    setHighlightedEdgeId(null);
    if (resetKey) syncFocusToUrl(resetKey);
  }

  function runQuery() {
    const next = focusMatches[0]?.node;
    if (!next) return;
    setHistory([]);
    setSelectedKey(next.key);
    setQuery("");
    setHighlightedEdgeId(null);
    syncFocusToUrl(next.key);
  }

  const selectedSources =
    selectedNode?.sourceIds
      .map((id) => sourceById.get(id))
      .filter((source): source is ExplorerSource => Boolean(source)) ?? [];

  const path = buildPath(selectedNode, visibleEdges, nodeByKey);
  const graphStats = {
    nodes: filteredNodeKeys.size,
    edges: filteredEdges.length,
    sources: new Set(filteredEdges.flatMap((edge) => edge.sourceIds)).size,
  };

  return (
    <div className={variant === "embed" ? styles.embedShell : styles.shell}>
      <div className={variant === "embed" ? styles.embedWorkspace : styles.workspace}>
        {variant === "full" ? (
        <aside className={styles.queryPanel}>
          <PanelHeader
            title="Relationship Graph"
            caption="Search for a person or company, then follow connection paths on the map."
          />

          <section className={styles.panelSection}>
            <label className={styles.fieldLabel} htmlFor="graph-query">
              Search graph
            </label>
            <input
              ref={searchInputRef}
              id="graph-query"
              className={styles.select}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") runQuery();
              }}
              placeholder="Find a person, company, or deal"
            />
            <p className={styles.searchHint}>Press <kbd>/</kbd> to focus search</p>
            {query.trim() ? (
              <div className={styles.focusMatches}>
                {focusMatches.length ? (
                  focusMatches.map(({ node, connections }) => (
                    <button key={node.key} type="button" onClick={() => selectNode(node.key)}>
                      <span className={styles.focusGlyph} data-kind={node.kind}>
                        {nodeBadgeText(node)}
                      </span>
                      <span>
                        <strong>{node.name}</strong>
                        <small>{connections} relationship{connections === 1 ? "" : "s"} · {node.kind}</small>
                      </span>
                    </button>
                  ))
                ) : (
                  <p>No matching nodes in this theme.</p>
                )}
              </div>
            ) : (
              <div className={styles.starterPrompt}>
                <p>Search for an expert or company, or pick a suggested hub.</p>
                {starterSuggestions.length ? (
                  <div className={styles.quickJumpList}>
                    {starterSuggestions.map(({ node, count }) => (
                      <button key={node.key} type="button" onClick={() => selectNode(node.key)}>
                        <span className={styles.focusGlyph} data-kind={node.kind}>
                          {nodeBadgeText(node)}
                        </span>
                        <span className={styles.quickJumpText}>
                          <strong>{node.name}</strong>
                          <small>
                            {nodeKindName(node)} · {count} relationship{count === 1 ? "" : "s"}
                          </small>
                        </span>
                        <em>{count}</em>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </section>

          <section className={styles.panelSection}>
            {selectedNode ? (
              <div className={styles.currentFocus}>
                <span className={styles.focusGlyph} data-kind={selectedNode.kind}>
                  {nodeBadgeText(selectedNode)}
                </span>
                <div>
                  <small>Current focus</small>
                  <strong>{selectedNode.name}</strong>
                  <span>{selectedEdges.length} direct connection{selectedEdges.length === 1 ? "" : "s"}</span>
                </div>
              </div>
            ) : null}
            <p className={styles.scopeReadout}>
              Scoped to <strong>{themeLabel}</strong>
              <span className={styles.scopeReadoutHint}>Change scope in the header above.</span>
            </p>
          </section>

          <section className={styles.panelSection}>
            <SidebarDetails
              title="Suggested next"
              meta={suggestedNext.length ? `${suggestedNext.length} nodes` : "None"}
              defaultOpen
            >
              <p className={styles.filterHint}>Well-connected hubs and bridge paths worth exploring next.</p>
              {suggestedNext.length ? (
                <div className={styles.quickJumpList}>
                  {suggestedNext.map(({ key, node, reason, count }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => selectNode(node.key)}
                      className={selectedNode?.key === node.key ? styles.activeQuickJump : undefined}
                    >
                      <span className={styles.focusGlyph} data-kind={node.kind}>
                        {nodeBadgeText(node)}
                      </span>
                      <span className={styles.quickJumpText}>
                        <strong>{node.name}</strong>
                        <small>
                          {reason}
                          {count ? ` · ${count} relationship${count === 1 ? "" : "s"}` : ""}
                        </small>
                      </span>
                      {count ? <em>{count}</em> : null}
                    </button>
                  ))}
                </div>
              ) : (
                <p className={styles.filterHint}>No additional suggestions in this theme.</p>
              )}
            </SidebarDetails>
          </section>

          <section className={styles.panelSection}>
            <SidebarDetails
              title="Browse by type"
              meta={directoryCountText(directoryNodes.map(({ node }) => node))}
            >
              <p className={styles.filterHint}>Shortlist by type — search above for the full graph.</p>
              <div className={styles.directoryList} aria-label="Grouped graph node shortlist">
                {groupedDirectoryNodes.map((group) => (
                  <details key={group.kind} open={group.kind === "expert"} className={styles.directoryGroup}>
                    <summary>
                      <span>{group.label}</span>
                      <small>{group.items.length} shown / {group.total}</small>
                    </summary>
                    <div>
                      {group.items.map(({ node, connections }) => (
                        <button
                          key={node.key}
                          type="button"
                          onClick={() => selectNode(node.key)}
                          className={selectedNode?.key === node.key ? styles.activeDirectoryItem : undefined}
                        >
                          <span className={styles.focusGlyph} data-kind={node.kind}>
                            {nodeBadgeText(node)}
                          </span>
                          <span>
                            <strong>{node.name}</strong>
                            <small>{nodeKindName(node)} · {connections} relationship{connections === 1 ? "" : "s"}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </SidebarDetails>
          </section>

          <section className={styles.panelSection}>
            <SidebarDetails
              title="Filters"
              meta={`${activeNodeKindCount}/3 types · ${activeRelationshipCount}/${availableRelationships.length} edges`}
            >
              <div className={styles.filterStack}>
                <div>
                  <div className={styles.filterActions}>
                    <span className={styles.filterGroupLabel}>Node types</span>
                    <button
                      type="button"
                      onClick={() => setNodeKinds({ expert: true, company: true, deal: true })}
                    >
                      Select all
                    </button>
                  </div>
                  {(["expert", "company", "deal"] as const).map((kind) => (
                    <label key={kind} className={styles.checkRow}>
                      <input
                        type="checkbox"
                        checked={nodeKinds[kind]}
                        onChange={(event) =>
                          setNodeKinds((current) => ({
                            ...current,
                            [kind]: event.target.checked,
                          }))
                        }
                      />
                      <span className={styles.nodeGlyph} data-kind={kind}>
                        {kind === "expert" ? "P" : kind === "deal" ? "D" : "CO"}
                      </span>
                      {NODE_KIND_LABEL[kind]}
                    </label>
                  ))}
                </div>
                <div>
                  <div className={styles.filterActions}>
                    <span className={styles.filterGroupLabel}>Relationship types</span>
                    <button
                      type="button"
                      onClick={() =>
                        setRelationships(
                          Object.fromEntries(
                            RELATIONSHIP_ORDER.map((relationship) => [relationship, true]),
                          ) as Record<RelationshipType, boolean>,
                        )
                      }
                    >
                      Select all
                    </button>
                  </div>
                  <div className={styles.filterScroll}>
                    {availableRelationships.map((relationship) => (
                      <label key={relationship} className={styles.checkRow}>
                        <input
                          type="checkbox"
                          checked={relationships[relationship]}
                          onChange={(event) =>
                            setRelationships((current) => ({
                              ...current,
                              [relationship]: event.target.checked,
                            }))
                          }
                        />
                        <span
                          className={styles.edgeLegend}
                          style={{ "--edge-color": RELATIONSHIP_COLOR[relationship] } as CSSProperties}
                        />
                        {relationshipLabels.get(relationship) ?? relationship}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <span className={styles.filterGroupLabel}>Source confidence</span>
                  <input
                    id="confidence"
                    className={styles.range}
                    type="range"
                    min="0.6"
                    max="0.95"
                    step="0.01"
                    value={confidenceFloor}
                    onChange={(event) => setConfidenceFloor(Number(event.target.value))}
                  />
                  <div className={styles.rangeScale}>
                    <span>All</span>
                    <span>Low</span>
                    <span>Medium</span>
                    <span>High</span>
                  </div>
                  <div className={`${styles.statsGrid} mt-3`}>
                    <Metric label="Nodes" value={graphStats.nodes} />
                    <Metric label="Edges" value={graphStats.edges} />
                    <Metric label="Sources" value={graphStats.sources} />
                  </div>
                  <div className={`${styles.panelActions} mt-3`}>
                    <button type="button" className={styles.primaryButton} onClick={runQuery} disabled={!focusMatches.length}>
                      Focus top match
                    </button>
                    <button type="button" className={styles.secondaryButton} onClick={resetExplorer}>
                      Reset map
                    </button>
                  </div>
                </div>
              </div>
            </SidebarDetails>
          </section>
        </aside>
        ) : null}

        <main
          ref={canvasColumnRef}
          className={variant === "embed" ? styles.embedCanvasColumn : styles.canvasColumn}
        >
          {variant === "full" && returnContext ? (
            <div className={styles.returnContext}>
              <Link href={returnContext.href}>← Back to {returnContext.label}</Link>
              <span>{returnContext.detail}</span>
            </div>
          ) : null}

          <div className={variant === "embed" ? styles.embedGraphToolbar : styles.graphToolbar}>
            <GraphLegend compact />
            <div className={styles.toolbarButtons}>
              {variant === "full" && focusExpertDomainOptions.length > 0 ? (
                <select
                  className={`${styles.select} ${styles.toolbarSelect}`}
                  value={safeExpertDomain}
                  onChange={(event) => setExpertDomain(event.target.value as ExpertType | "all")}
                  aria-label="Filter experts shown on the map"
                  title="Filters which expert types appear — does not change your current focus"
                >
                  <option value="all">All expert types</option>
                  {focusExpertDomainOptions.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : null}
              <button
                type="button"
                className={!pathView ? styles.activeToolbarButton : undefined}
                onClick={() => setPathView(false)}
              >
                All connections
              </button>
              <button
                type="button"
                className={pathView ? styles.activeToolbarButton : undefined}
                onClick={() => setPathView(true)}
              >
                By role
              </button>
              <button type="button" onClick={stepBack} disabled={history.length === 0}>
                Previous focus
              </button>
            </div>
          </div>

          {hiddenDirectEdges > 0 ? (
            <div className={styles.graphNotice}>
              <span>
                Showing {visibleEdges.filter((edge) => edge.from === selectedKey || edge.to === selectedKey).length} of{" "}
                {selectedEdges.length} direct connections
                {pathView ? " in by-role view" : ""}.
              </span>
              {pathView ? (
                <button type="button" onClick={() => setPathView(false)}>
                  Show all connections
                </button>
              ) : null}
            </div>
          ) : null}

          <p className={styles.graphCanvasHint}>Click any node on the map to make it the focus.</p>

          <section className={styles.graphCard} aria-label="Interactive graph canvas">
            <div className={styles.graphScroller}>
              <GraphCanvas
                nodes={visibleNodes}
                edges={visibleEdges}
                selectedKey={selectedNode?.key}
                highlightedEdgeId={highlightedEdgeId}
                nodeByKey={nodeByKey}
                onSelect={selectNode}
              />
            </div>
            <PathStrip path={path} selectedNode={selectedNode} onSelect={selectNodeAndReveal} />
          </section>
        </main>

        {variant === "full" ? (
        <aside className={styles.inspector}>
          {selectedNode ? (
            <>
              <div className={styles.inspectorHeader}>
                <div>
                  <span className={styles.kindPill}>
                    {selectedNode.kind === "expert"
                      ? selectedNode.typeLabel
                      : selectedNode.kind === "company"
                        ? selectedNode.categoryLabel
                        : selectedNode.typeLabel}
                  </span>
                  <h2>{selectedNode.name}</h2>
                  <p>{selectedNode.subtitle}</p>
                </div>
                <button type="button" aria-label="Reset map" onClick={resetExplorer}>
                  ×
                </button>
              </div>

              <div className={styles.inspectorQuickActions}>
                <Link href={selectedNode.href} className={styles.primaryButton}>
                  Open profile
                </Link>
                <Link
                  href={askHref(
                    `Use the relationship graph to prepare a concise action plan for ${selectedNode.name}. Include best intro paths, evidence strength, and next diligence steps.`,
                  )}
                  className={styles.secondaryButton}
                >
                  Ask Copilot
                </Link>
                {selectedNode.kind !== "deal" ? (
                  <WorkspaceActionButton
                    item={{
                      id: selectedNode.id,
                      kind: selectedNode.kind === "expert" ? "call" : "target",
                      name: selectedNode.name,
                      sub: selectedNode.subtitle,
                      href: selectedNode.href,
                      theme: selectedNode.themes[0],
                      note: selectedNode.evidence,
                      status: "graph shortlist",
                    }}
                    className={styles.secondaryButton}
                  >
                    Save to basket
                  </WorkspaceActionButton>
                ) : null}
              </div>

              <section className={styles.confidenceBox}>
                <span>Record confidence</span>
                <strong>{confidenceText(selectedNode.confidence)}</strong>
                <em>{confidenceBand(selectedNode.confidence)}</em>
              </section>

              <section className={styles.inspectSection}>
                <div className={styles.sectionLine}>
                  <strong>Connections ({selectedEdges.length})</strong>
                  <button type="button" onClick={() => setPathView(false)}>
                    All connections
                  </button>
                </div>
                <p className={styles.filterHint}>Click a row to highlight it on the map.</p>
                <ul className={styles.relationshipList}>
                  {selectedEdges.slice(0, 8).map((edge) => {
                    const neighbor = nodeByKey.get(otherNode(edge, selectedNode.key));
                    return (
                      <li
                        key={edge.id}
                        className={highlightedEdgeId === edge.id ? styles.activeRelationship : undefined}
                      >
                        <span
                          className={styles.edgeArrow}
                          style={{ "--edge-color": RELATIONSHIP_COLOR[edge.relationship] } as CSSProperties}
                        />
                        <button type="button" onClick={() => highlightRelationship(edge.id)}>
                          <strong>{edge.relationshipLabel}</strong>
                          <small>{neighbor?.name ?? "Unknown node"}</small>
                        </button>
                        <button
                          type="button"
                          className={styles.focusNeighbor}
                          onClick={() => neighbor && selectNodeAndReveal(neighbor.key)}
                        >
                          Focus
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className={styles.inspectSection}>
                <div className={styles.sectionLine}>
                  <strong>Related evidence snapshots</strong>
                </div>
                <ul className={styles.evidenceList}>
                  <li>
                    <span>•</span>
                    <p>
                      {selectedNode.evidence}{" "}
                      {selectedNode.sourceIds[0] ? <SourceMarker id={selectedNode.sourceIds[0]} /> : null}
                    </p>
                  </li>
                  {selectedEdges.slice(0, 3).map((edge) => (
                    <li key={edge.id}>
                      <span>•</span>
                      <p>
                        {edge.note} {edge.sourceIds[0] ? <SourceMarker id={edge.sourceIds[0]} /> : null}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>

              <section className={styles.inspectSection}>
                <strong className={styles.blockTitle}>Top citations</strong>
                <ol className={styles.citationList}>
                  {selectedSources.slice(0, 5).map((source) => (
                    <li key={source.id} id={`source-${source.id}`}>
                      <a href={source.url} target="_blank" rel="noreferrer">
                        [{source.id}] {source.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </section>

            </>
          ) : (
            <div className={styles.emptyInspector}>No mapped node matches this query.</div>
          )}
        </aside>
        ) : null}
      </div>
    </div>
  );
}

function PanelHeader({ title, caption }: { title: string; caption: string }) {
  return (
    <div className={styles.panelHeader}>
      <h1>{title}</h1>
      <p>{caption}</p>
    </div>
  );
}

function SidebarDetails({
  title,
  meta,
  defaultOpen = false,
  children,
}: {
  title: string;
  meta?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className={styles.filterGroup} open={defaultOpen}>
      <summary>
        <span>{title}</span>
        {meta ? <small>{meta}</small> : null}
      </summary>
      <div>{children}</div>
    </details>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span>
      <i style={{ background: color }} />
      {label}
    </span>
  );
}

function GraphLegend({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? styles.legendCompact : styles.legend}>
      <LegendDot color="#075fe4" label="People" />
      <LegendDot color="#10843e" label="Targets" />
      <LegendDot color="#0a8b9b" label="Investors" />
      <LegendDot color="#7248b9" label="Advisors" />
      <LegendDot color="#f26a21" label="Acquirers" />
    </div>
  );
}

function SourceMarker({ id }: { id: string }) {
  return <a className={styles.sourceMarker} href={`#source-${id}`}>[{id}]</a>;
}

function nodeColor(node: ExplorerNode) {
  if (node.kind === "expert") return "#075fe4";
  if (node.kind === "deal") return "#9a4b00";
  if (node.category === "target") return "#10843e";
  if (node.category === "investor") return "#0a8b9b";
  if (node.category === "advisory" || node.category === "service-provider") return "#7248b9";
  return "#f26a21";
}

const LAYOUT_CARD_WIDTH = 204;
const LAYOUT_ROW_HEIGHT = 96;
const LAYOUT_MAX_PER_ROW = 3;
const TARGET_CANVAS_HEIGHT = 820;
const CANVAS_TOP_MARGIN = 92;
const CANVAS_BOTTOM_MARGIN = 150;

function layerSequenceFor(selected?: ExplorerNode) {
  if (selected?.kind === "company") {
    return ["Founder layer", "Operators and board", "Advisors, investors and deals"];
  }
  if (selected?.kind === "expert") {
    return ["Companies they work with", "Connected deals", "Other connected experts"];
  }
  if (selected?.kind === "deal") {
    return ["Buyers and investors", "Companies and advisors", "People and leadership"];
  }
  return ["Companies", "Other people", "Advisors", "Deals"];
}

function focusLayerLabel(selected: ExplorerNode) {
  if (selected.kind === "company") return "Company focus";
  if (selected.kind === "expert") return "Expert focus";
  if (selected.kind === "deal") return "Deal focus";
  return "Selected focus";
}

function layoutNodesInRows(
  nodes: ExplorerNode[],
  startY: number,
  canvasWidth: number,
  positions: Map<string, { x: number; y: number }>,
  rowSpacing = LAYOUT_ROW_HEIGHT,
) {
  if (!nodes.length) return 0;
  const rowCount = Math.ceil(nodes.length / LAYOUT_MAX_PER_ROW);
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const row = nodes.slice(rowIndex * LAYOUT_MAX_PER_ROW, (rowIndex + 1) * LAYOUT_MAX_PER_ROW);
    const rowWidth = row.length <= 1 ? LAYOUT_CARD_WIDTH : (row.length - 1) * LAYOUT_CARD_WIDTH + LAYOUT_CARD_WIDTH;
    const startX = canvasWidth / 2 - rowWidth / 2 + LAYOUT_CARD_WIDTH / 2;
    const y = startY + rowIndex * rowSpacing;
    row.forEach((node, index) => {
      positions.set(node.key, { x: startX + index * LAYOUT_CARD_WIDTH, y });
    });
  }
  return rowCount;
}

function GraphCanvas({
  nodes,
  edges,
  selectedKey,
  highlightedEdgeId,
  nodeByKey,
  onSelect,
}: {
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  selectedKey?: string;
  highlightedEdgeId?: string | null;
  nodeByKey: Map<string, ExplorerNode>;
  onSelect: (key: string) => void;
}) {
  const selected = selectedKey ? nodeByKey.get(selectedKey) : undefined;
  const others = nodes.filter((node) => node.key !== selectedKey);
  const positions = new Map<string, { x: number; y: number }>();

  function edgeBetween(node: ExplorerNode) {
    if (!selected) return undefined;
    return edges.find(
      (edge) =>
        (edge.from === selected.key && edge.to === node.key) ||
        (edge.to === selected.key && edge.from === node.key),
    );
  }

  function layerFor(node: ExplorerNode) {
    const edge = edgeBetween(node);
    if (selected?.kind === "company") {
      if (
        node.kind === "expert" &&
        (node.type === "ex-founder" ||
          edge?.relationship === "founded" ||
          edge?.relationship === "co-founded")
      ) {
        return "Founder layer";
      }
      if (
        node.kind === "expert" &&
        (node.type === "operator" ||
          edge?.relationship === "led" ||
          edge?.relationship === "board" ||
          edge?.relationship === "served")
      ) {
        return "Operators and board";
      }
      return "Advisors, investors and deals";
    }

    if (selected?.kind === "expert") {
      if (node.kind === "company") return "Companies they work with";
      if (node.kind === "deal") return "Connected deals";
      return "Other connected experts";
    }

    if (selected?.kind === "deal") {
      if (node.kind === "company" && edge?.relationship === "acquired") return "Buyers and investors";
      if (node.kind === "company") return "Companies and advisors";
      return "People and leadership";
    }

    if (node.kind === "company") return "Companies";
    if (node.kind === "deal") return "Deals";
    if (node.kind === "expert" && (node.type === "advisor" || node.type === "banker" || node.type === "lawyer")) {
      return "Advisors";
    }
    return "Other people";
  }

  const layers = new Map<string, ExplorerNode[]>();
  for (const node of others) {
    const layer = layerFor(node);
    layers.set(layer, [...(layers.get(layer) ?? []), node]);
  }

  const layerOrder = layerSequenceFor(selected);
  const maxNodesInRow = Math.max(
    1,
    ...layerOrder.map((layerName) => Math.min((layers.get(layerName) ?? []).length, LAYOUT_MAX_PER_ROW)),
  );
  const width = Math.max(960, maxNodesInRow * LAYOUT_CARD_WIDTH + 280);
  const focusY = CANVAS_TOP_MARGIN;

  if (selected) positions.set(selected.key, { x: width / 2, y: focusY });

  const layerLabels: { label: string; y: number }[] = [];
  if (selected) {
    layerLabels.push({ label: focusLayerLabel(selected), y: focusY });
  }

  const activeLayers = layerOrder
    .map((name) => {
      const nodes = layers.get(name) ?? [];
      if (!nodes.length) return null;
      return {
        name,
        nodes: [...nodes].sort((a, b) => a.name.localeCompare(b.name)),
        rowCount: Math.ceil(nodes.length / LAYOUT_MAX_PER_ROW),
      };
    })
    .filter((layer): layer is NonNullable<typeof layer> => Boolean(layer));

  const totalRowsBelowFocus = activeLayers.reduce((sum, layer) => sum + layer.rowCount, 0);
  const spaceBelowFocus = TARGET_CANVAS_HEIGHT - CANVAS_BOTTOM_MARGIN - focusY - 72;
  const rowSpacing =
    totalRowsBelowFocus > 0
      ? Math.min(210, Math.max(112, spaceBelowFocus / totalRowsBelowFocus))
      : LAYOUT_ROW_HEIGHT;

  let yCursor = focusY + rowSpacing * 0.75;
  for (const layer of activeLayers) {
    layoutNodesInRows(layer.nodes, yCursor, width, positions, rowSpacing);
    layerLabels.push({ label: layer.name, y: yCursor });
    yCursor += layer.rowCount * rowSpacing;
  }

  const height = TARGET_CANVAS_HEIGHT;

  return (
    <svg className={styles.graphSvg} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Mapped relationship graph">
      <defs>
        <filter id="graph-node-shadow" x="-20%" y="-30%" width="140%" height="170%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.1" />
        </filter>
        {RELATIONSHIP_ORDER.map((relationship) => (
          <marker
            key={relationship}
            id={`arrow-${relationship}`}
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={RELATIONSHIP_COLOR[relationship]} />
          </marker>
        ))}
      </defs>
      <rect width={width} height={height} rx="0" fill="#ffffff" />
      <g>
        {layerLabels.map((layer) => (
          <g key={layer.label}>
            <line x1="48" y1={layer.y} x2={width - 48} y2={layer.y} stroke="#edf2f7" />
            <rect x="56" y={layer.y - 17} width="154" height="22" rx="11" fill="#f8fafc" stroke="#e4eaf2" />
            <text x="74" y={layer.y - 2} className={styles.layerText}>
              {layer.label}
            </text>
          </g>
        ))}
      </g>
      {edges.map((edge) => {
        const from = positions.get(edge.from);
        const to = positions.get(edge.to);
        if (!from || !to) return null;
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        const color = RELATIONSHIP_COLOR[edge.relationship];
        const verticalSpan = Math.abs(from.y - to.y);
        const bend = Math.max(24, Math.min(verticalSpan * 0.28, 90));
        const isHighlighted = highlightedEdgeId === edge.id;
        const dimOthers = Boolean(highlightedEdgeId && !isHighlighted);
        return (
          <g key={edge.id}>
            <path
              d={`M ${from.x} ${from.y + 34} C ${from.x} ${midY - bend}, ${to.x} ${midY + bend}, ${to.x} ${to.y - 34}`}
              fill="none"
              stroke={color}
              strokeWidth={isHighlighted ? 2.8 : 1.55}
              markerEnd={`url(#arrow-${edge.relationship})`}
              opacity={dimOthers ? 0.16 : edge.confidence >= 0.8 ? 0.92 : 0.58}
            />
            <g transform={`translate(${midX - 36} ${midY - 15})`}>
              <rect width="72" height="21" rx="10.5" fill="#ffffff" stroke="#e4e9f1" />
              <text x="36" y="14" textAnchor="middle" className={styles.edgeText} fill={color}>
                {edge.relationshipLabel}
              </text>
            </g>
          </g>
        );
      })}
      {selected ? (
        <circle
          className={styles.selectedHalo}
          cx={positions.get(selected.key)?.x}
          cy={positions.get(selected.key)?.y}
          r="58"
        />
      ) : null}
      {nodes.map((node) => {
        const point = positions.get(node.key);
        if (!point) return null;
        const isSelected = node.key === selectedKey;
        const color = nodeColor(node);
        const cardWidth = isSelected ? 214 : 180;
        const cardHeight = isSelected ? 80 : 68;
        const kindName = nodeKindName(node);
        const typeName = nodeTypeName(node);
        const displayName =
          node.name.length > (isSelected ? 27 : 22)
            ? `${node.name.slice(0, isSelected ? 25 : 20)}…`
            : node.name;
        return (
          <g
            key={node.key}
            className={`${styles.svgNode} ${isSelected ? styles.selectedSvgNode : ""}`}
            transform={`translate(${point.x} ${point.y})`}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(node.key)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(node.key);
              }
            }}
            aria-label={`${node.name}, ${node.kind}. Select node.`}
          >
            <title>{`${node.name} · ${kindName} · ${typeName}`}</title>
            <rect
              className={styles.nodeCard}
              x={-cardWidth / 2}
              y={-cardHeight / 2}
              width={cardWidth}
              height={cardHeight}
              rx={node.kind === "expert" ? cardHeight / 2 : node.kind === "deal" ? 4 : 9}
              fill={isSelected ? "#f4f8ff" : "#ffffff"}
              stroke={color}
              strokeWidth={isSelected ? 2.4 : 1.4}
              filter={isSelected ? "url(#graph-node-shadow)" : undefined}
            />
            <rect
              x={-cardWidth / 2 + 11}
              y={-16}
              width="32"
              height="32"
              rx={node.kind === "deal" ? 5 : 16}
              fill={color}
            />
            <text
              x={-cardWidth / 2 + 27}
              y="4"
              textAnchor="middle"
              className={styles.nodeBadge}
            >
              {node.kind === "expert" ? nodeInitials(node).slice(0, 2) : node.kind === "company" ? "CO" : "D"}
            </text>
            <text x={-cardWidth / 2 + 52} y="-7" className={styles.nodeTitle}>
              {displayName}
            </text>
            <text x={-cardWidth / 2 + 52} y="12" className={styles.nodeSub}>
              {kindName} · {typeName.length > 18 ? `${typeName.slice(0, 16)}…` : typeName}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function buildPath(
  selectedNode: ExplorerNode | undefined,
  edges: ExplorerEdge[],
  nodeByKey: Map<string, ExplorerNode>,
) {
  if (!selectedNode) return [];
  const direct = edges.find((edge) => edge.from === selectedNode.key || edge.to === selectedNode.key);
  if (!direct) return [selectedNode];
  const first = nodeByKey.get(otherNode(direct, selectedNode.key));
  if (!first) return [selectedNode];
  const secondEdge = edges.find(
    (edge) =>
      edge.id !== direct.id &&
      (edge.from === first.key || edge.to === first.key) &&
      otherNode(edge, first.key) !== selectedNode.key,
  );
  const second = secondEdge ? nodeByKey.get(otherNode(secondEdge, first.key)) : undefined;
  return [selectedNode, first, second].filter((node): node is ExplorerNode => Boolean(node));
}

function PathStrip({
  path,
  selectedNode,
  onSelect,
}: {
  path: ExplorerNode[];
  selectedNode?: ExplorerNode;
  onSelect: (key: string) => void;
}) {
  return (
    <div className={styles.pathStrip}>
      <div>
        <strong>Example relationship path ({Math.max(path.length - 1, 0)} hops)</strong>
        <span>Selected-node evidence: {selectedNode ? confidenceBand(selectedNode.confidence) : "Indicative"}</span>
      </div>
      <ol>
        {path.map((node, index) => (
          <li key={node.key}>
            <button type="button" onClick={() => onSelect(node.key)}>
              <span className={styles.pathNode} data-kind={node.kind}>
                {nodeBadgeText(node)}
              </span>
              <span>{node.name}</span>
            </button>
            {index < path.length - 1 ? <em>→</em> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

