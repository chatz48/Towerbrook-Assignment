"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { uniqueById } from "@/lib/arrays";
import type { GraphCompany, GraphExpert, GraphLink } from "@/lib/graph-inline-types";

export type { GraphCompany, GraphExpert, GraphLink } from "@/lib/graph-inline-types";

/**
 * Interactive graph explorer: start from the full derivation map, then click
 * any node to bring it to the center and reveal its direct connections. Clicking
 * a revealed node recenters the graph around that node, so users can walk the
 * expert -> company -> expert chain without leaving the page.
 *
 * Deterministic SVG layout (no physics lib) keeps it fast, dependency-free and
 * identical on every render.
 */
export default function ThemeGraph({
  experts,
  companies,
  links,
  accent,
}: {
  experts: GraphExpert[];
  companies: GraphCompany[];
  links: GraphLink[];
  accent: string;
}) {
  const router = useRouter();
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [trail, setTrail] = useState<string[]>([]);

  const graphExperts = useMemo(() => uniqueById(experts), [experts]);
  const graphCompanies = useMemo(() => uniqueById(companies), [companies]);

  const expertById = useMemo(() => new Map(graphExperts.map((e) => [e.id, e])), [graphExperts]);
  const companyById = useMemo(
    () => new Map(graphCompanies.map((c) => [c.id, c])),
    [graphCompanies],
  );

  const selected = focusKey ? getNode(focusKey) : null;
  const selectedNeighbors = focusKey ? neighborsFor(focusKey) : [];

  function expertKey(id: string) {
    return `e:${id}`;
  }

  function companyKey(id: string) {
    return `c:${id}`;
  }

  function isExpertKey(key: string) {
    return key.startsWith("e:");
  }

  function idFromKey(key: string) {
    return key.slice(2);
  }

  function getNode(key: string) {
    if (isExpertKey(key)) {
      const expert = expertById.get(idFromKey(key));
      return expert
        ? {
            key,
            kind: "expert" as const,
            id: expert.id,
            name: expert.name,
            meta: expert.type,
            connectionCount: links.filter((l) => l.expertId === expert.id).length,
          }
        : null;
    }

    const company = companyById.get(idFromKey(key));
    return company
      ? {
          key,
          kind: "company" as const,
          id: company.id,
          name: company.name,
          meta: `${company.expertCount} expert${company.expertCount === 1 ? "" : "s"}`,
          connectionCount: company.expertCount,
        }
      : null;
  }

  function linkedEdges(key: string) {
    const id = idFromKey(key);
    return isExpertKey(key)
      ? links.filter((l) => l.expertId === id)
      : links.filter((l) => l.companyId === id);
  }

  function neighborsFor(key: string) {
    const seen = new Set<string>();
    return linkedEdges(key)
      .map((edge) => {
        const neighborKey = isExpertKey(key)
          ? companyKey(edge.companyId)
          : expertKey(edge.expertId);
        const node = getNode(neighborKey);
        if (!node || seen.has(neighborKey)) return null;
        seen.add(neighborKey);
        return {
          node,
          edge,
          nextCount: Math.max(node.connectionCount - 1, 0),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item != null)
      .sort((a, b) => b.node.connectionCount - a.node.connectionCount);
  }

  function focusNode(key: string) {
    setHoverKey(null);
    setTrail((current) => {
      if (!focusKey || focusKey === key) return current;
      return [...current.slice(-4), focusKey];
    });
    setFocusKey(key);
  }

  function stepBack() {
    const previous = trail.at(-1);
    if (!previous) return;
    setFocusKey(previous);
    setTrail(trail.slice(0, -1));
  }

  function openSelected() {
    if (!selected) return;
    router.push(selected.kind === "expert" ? `/experts/${selected.id}` : `/companies/${selected.id}`);
  }

  function formatRelationship(edge: GraphLink) {
    return edge.relationship ? edge.relationship.replace("-", " ") : "linked";
  }

  function nodeAriaLabel(key: string) {
    const node = getNode(key);
    if (!node) return "Graph node";
    return `${node.name}, ${node.kind}, ${node.connectionCount} connection${
      node.connectionCount === 1 ? "" : "s"
    }. Click to focus this node.`;
  }

  const rowH = 34;
  const pad = 24;
  const overviewHeight = Math.max(graphExperts.length, graphCompanies.length, 1) * rowH + pad * 2;
  const width = 720;
  const xL = 190;
  const xR = width - 190;

  const eY = (i: number) =>
    pad + (overviewHeight - pad * 2) * ((i + 0.5) / Math.max(graphExperts.length, 1));
  const cY = (i: number) =>
    pad + (overviewHeight - pad * 2) * ((i + 0.5) / Math.max(graphCompanies.length, 1));

  const eIndex = new Map(graphExperts.map((e, i) => [e.id, i]));
  const cIndex = new Map(graphCompanies.map((c, i) => [c.id, i]));

  function linkActive(l: GraphLink) {
    if (!hoverKey) return true;
    return isExpertKey(hoverKey)
      ? l.expertId === idFromKey(hoverKey)
      : l.companyId === idFromKey(hoverKey);
  }
  function nodeActive(key: string) {
    if (!hoverKey) return true;
    if (hoverKey === key) return true;
    // other column: active if linked to the hovered node
    return links.some((l) =>
      isExpertKey(hoverKey)
        ? l.expertId === idFromKey(hoverKey) && companyKey(l.companyId) === key
        : l.companyId === idFromKey(hoverKey) && expertKey(l.expertId) === key,
    );
  }

  function NodeButton({
    nodeKey,
    children,
    opacity = 1,
  }: {
    nodeKey: string;
    children: React.ReactNode;
    opacity?: number;
  }) {
    return (
      <g
        role="button"
        tabIndex={0}
        aria-label={nodeAriaLabel(nodeKey)}
        className="cursor-pointer outline-none"
        onMouseEnter={() => setHoverKey(nodeKey)}
        onMouseLeave={() => setHoverKey(null)}
        onFocus={() => setHoverKey(nodeKey)}
        onBlur={() => setHoverKey(null)}
        onClick={() => focusNode(nodeKey)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            focusNode(nodeKey);
          }
        }}
        opacity={opacity}
      >
        {children}
      </g>
    );
  }

  const focusWidth = 760;
  const focusHeight = 430;
  const cx = focusWidth / 2;
  const cy = 205;
  const rx = 285;
  const ry = 140;

  function neighborPoint(i: number, total: number) {
    if (total === 1) return { x: cx + rx, y: cy };
    const start = -Math.PI * 0.82;
    const end = Math.PI * 0.82;
    const angle = start + ((end - start) * i) / (total - 1);
    return {
      x: cx + Math.cos(angle) * rx,
      y: cy + Math.sin(angle) * ry,
    };
  }

  return (
    <div className="rounded-xl border border-line bg-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-paper/40 px-4 py-3">
        <div className="mr-auto">
          <div className="text-sm font-semibold">Interactive relationship map</div>
          <div className="text-xs text-ink-faint">
            Click a node to center it, then keep moving through revealed connections.
          </div>
        </div>
        {focusKey ? (
          <>
            <button
              type="button"
              onClick={stepBack}
              disabled={trail.length === 0}
              className="rounded-md border border-line-strong px-2.5 py-1.5 text-xs text-ink-soft disabled:opacity-40 hover:bg-card"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                setFocusKey(null);
                setTrail([]);
              }}
              className="rounded-md border border-line-strong px-2.5 py-1.5 text-xs text-ink-soft hover:bg-card"
            >
              Show full map
            </button>
          </>
        ) : null}
      </div>

      <div className="grid gap-0 lg:grid-cols-[1fr_280px]">
        <div className="overflow-x-auto p-3">
          {selected ? (
            <svg
              viewBox={`0 0 ${focusWidth} ${focusHeight}`}
              className="w-full"
              style={{ minWidth: 620 }}
              aria-label={`Focused graph around ${selected.name}`}
            >
              <defs>
                <filter id="nodeShadow" x="-40%" y="-40%" width="180%" height="180%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.12" />
                </filter>
              </defs>

              {selectedNeighbors.map(({ node, edge }, i) => {
                const point = neighborPoint(i, selectedNeighbors.length);
                const mx = (cx + point.x) / 2;
                const active = hoverKey ? hoverKey === node.key || hoverKey === selected.key : true;
                return (
                  <g key={`${node.key}-edge`}>
                    <path
                      d={`M ${cx} ${cy} C ${mx} ${cy}, ${mx} ${point.y}, ${point.x} ${point.y}`}
                      fill="none"
                      stroke={accent}
                      strokeWidth={active ? 1.8 : 1}
                      strokeOpacity={active ? 0.58 : 0.16}
                    />
                    <text
                      x={mx}
                      y={(cy + point.y) / 2 - 5}
                      textAnchor="middle"
                      fontSize="10"
                      className="fill-ink-faint"
                    >
                      {formatRelationship(edge)}
                    </text>
                  </g>
                );
              })}

              <g transform={`translate(${cx}, ${cy})`} filter="url(#nodeShadow)">
                <circle
                  cx={0}
                  cy={0}
                  r={selected.kind === "company" ? 34 : 28}
                  fill="white"
                  stroke={accent}
                  strokeWidth={2}
                />
                <circle cx={0} cy={0} r={5} fill={accent} />
                <text y={52} textAnchor="middle" fontSize="13" className="fill-ink" fontWeight={600}>
                  {selected.name}
                </text>
                <text y={68} textAnchor="middle" fontSize="11" className="fill-ink-faint">
                  {selected.meta}
                </text>
              </g>

              {selectedNeighbors.map(({ node, nextCount }, i) => {
                const point = neighborPoint(i, selectedNeighbors.length);
                const labelAnchor = point.x < cx ? "end" : "start";
                const labelX = point.x + (point.x < cx ? -14 : 14);
                const active = !hoverKey || hoverKey === node.key;
                return (
                  <NodeButton
                    key={node.key}
                    nodeKey={node.key}
                    opacity={active ? 1 : 0.38}
                  >
                    <g transform={`translate(${point.x}, ${point.y})`}>
                      <circle
                        cx={0}
                        cy={0}
                        r={node.kind === "company" ? 13 : 10}
                        fill={node.kind === "company" ? "white" : accent}
                        stroke={accent}
                        strokeWidth={1.6}
                      />
                      {node.kind === "company" ? <circle cx={0} cy={0} r={3} fill={accent} /> : null}
                      <text
                        x={labelX - point.x}
                        y={-2}
                        textAnchor={labelAnchor}
                        fontSize="12"
                        className="fill-ink"
                        fontWeight={600}
                      >
                        {node.name}
                      </text>
                      <text
                        x={labelX - point.x}
                        y={13}
                        textAnchor={labelAnchor}
                        fontSize="10"
                        className="fill-ink-faint"
                      >
                        {node.meta}
                        {nextCount > 0 ? ` · ${nextCount} more` : ""}
                      </text>
                    </g>
                  </NodeButton>
                );
              })}
            </svg>
          ) : (
            <svg
              viewBox={`0 0 ${width} ${overviewHeight}`}
              className="w-full"
              style={{ minWidth: 560 }}
              aria-label="Full expert to company relationship map"
            >
              {/* column headers */}
              <text x={xL} y={14} textAnchor="end" className="fill-ink-faint" fontSize="11">
                EXPERTS
              </text>
              <text x={xR} y={14} textAnchor="start" className="fill-ink-faint" fontSize="11">
                COMPANIES
              </text>

              {/* links */}
              {links.map((l, i) => {
                const ei = eIndex.get(l.expertId);
                const ci = cIndex.get(l.companyId);
                if (ei == null || ci == null) return null;
                const y1 = eY(ei);
                const y2 = cY(ci);
                const active = linkActive(l);
                const mx = (xL + xR) / 2;
                return (
                  <path
                    key={i}
                    d={`M ${xL} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${xR} ${y2}`}
                    fill="none"
                    stroke={accent}
                    strokeWidth={active ? 1.6 : 0.8}
                    strokeOpacity={active ? 0.5 : 0.12}
                  />
                );
              })}

              {/* expert nodes */}
              {graphExperts.map((e, i) => {
                const y = eY(i);
                const key = expertKey(e.id);
                const active = nodeActive(key);
                return (
                  <NodeButton key={key} nodeKey={key} opacity={active ? 1 : 0.35}>
                    <g transform={`translate(${xL}, ${y})`}>
                      <circle cx={0} cy={0} r={4} fill={accent} />
                      <text x={-10} y={4} textAnchor="end" fontSize="12" className="fill-ink">
                        {e.name}
                      </text>
                    </g>
                  </NodeButton>
                );
              })}

              {/* company nodes (size = expert density) */}
              {graphCompanies.map((c, i) => {
                const y = cY(i);
                const key = companyKey(c.id);
                const active = nodeActive(key);
                const r = 4 + Math.min(c.expertCount, 4) * 1.6;
                return (
                  <NodeButton key={key} nodeKey={key} opacity={active ? 1 : 0.35}>
                    <g transform={`translate(${xR}, ${y})`}>
                      <circle cx={0} cy={0} r={r} fill="none" stroke={accent} strokeWidth={1.5} />
                      <circle cx={0} cy={0} r={2} fill={accent} />
                      <text x={10} y={4} textAnchor="start" fontSize="12" className="fill-ink">
                        {c.name}
                      </text>
                    </g>
                  </NodeButton>
                );
              })}
            </svg>
          )}
        </div>

        <aside className="border-t border-line bg-paper/40 p-4 lg:border-l lg:border-t-0">
          {selected ? (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                Focused node
              </div>
              <h3 className="mt-1 text-base font-semibold">{selected.name}</h3>
              <p className="mt-1 text-sm capitalize text-ink-soft">{selected.kind} · {selected.meta}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md border border-line bg-card p-2">
                  <div className="text-lg font-semibold tabular-nums">{selected.connectionCount}</div>
                  <div className="text-[10px] uppercase tracking-wide text-ink-faint">connections</div>
                </div>
                <div className="rounded-md border border-line bg-card p-2">
                  <div className="text-lg font-semibold tabular-nums">{trail.length + 1}</div>
                  <div className="text-[10px] uppercase tracking-wide text-ink-faint">hops viewed</div>
                </div>
              </div>
              <button
                type="button"
                onClick={openSelected}
                className="mt-4 w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Open {selected.kind} profile
              </button>
              <div className="mt-5">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  Revealed connections
                </div>
                <ol className="space-y-2">
                  {selectedNeighbors.slice(0, 8).map(({ node, edge, nextCount }) => (
                    <li key={node.key}>
                      <button
                        type="button"
                        onClick={() => focusNode(node.key)}
                        className="w-full rounded-md border border-line bg-card p-2 text-left hover:border-line-strong"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium">{node.name}</span>
                          <span className="text-[10px] text-ink-faint">{nextCount} more</span>
                        </div>
                        <div className="mt-0.5 text-xs text-ink-faint">
                          {formatRelationship(edge)} · {node.meta}
                        </div>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                How to explore
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Start with any expert or company. The graph will center that node,
                reveal direct relationships, and show how many additional links each
                revealed node can open.
              </p>
              <button
                type="button"
                onClick={() => {
                  const firstCompany = graphCompanies[0];
                  const firstExpert = graphExperts[0];
                  if (firstCompany) focusNode(companyKey(firstCompany.id));
                  else if (firstExpert) focusNode(expertKey(firstExpert.id));
                }}
                className="mt-4 w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Start with top company
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
