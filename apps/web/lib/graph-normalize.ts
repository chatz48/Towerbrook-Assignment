import type { Company, Expert, RelationshipType } from "@/lib/types";
import { canonicalCompanyName, dedupeCompanyLinks } from "@/lib/data";
import { relationshipPriority } from "@/lib/relationship-priority";

function companyScore(company: Company) {
  return company.confidence * 1000 + company.sources.length;
}

/** Map every company id to the canonical representative id for its normalized name. */
export function buildCompanyCanonicalMap(companies: Company[]) {
  const winnerByName = new Map<string, { id: string; score: number }>();

  for (const company of companies) {
    const nameKey = canonicalCompanyName(company.name);
    const score = companyScore(company);
    const current = winnerByName.get(nameKey);
    if (!current || score > current.score) {
      winnerByName.set(nameKey, { id: company.id, score });
    }
  }

  const idMap = new Map<string, string>();
  for (const company of companies) {
    const nameKey = canonicalCompanyName(company.name);
    idMap.set(company.id, winnerByName.get(nameKey)?.id ?? company.id);
  }
  return idMap;
}

export function canonicalCompanyId(id: string, idMap: Map<string, string>) {
  return idMap.get(id) ?? id;
}

export function resolveGraphFocusKey(focus: string, idMap: Map<string, string>) {
  const [kind, id] = focus.split(":");
  if (kind === "company" && id) {
    return `company:${canonicalCompanyId(id, idMap)}`;
  }
  return focus;
}

/** Keep one company record per canonical name (highest-confidence representative). */
export function canonicalCompanyRecords(companies: Company[], idMap: Map<string, string>) {
  const seen = new Set<string>();
  const result: Company[] = [];
  for (const company of companies) {
    const canonicalId = canonicalCompanyId(company.id, idMap);
    if (seen.has(canonicalId)) continue;
    seen.add(canonicalId);
    const representative = companies.find((item) => item.id === canonicalId) ?? company;
    result.push(representative);
  }
  return result;
}

export interface NormalizedGraphLink {
  expertId: string;
  companyId: string;
  relationship: RelationshipType;
  note?: string;
}

/** One best relationship per expert → canonical company pair. */
export function normalizeExpertCompanyLinks(
  experts: Expert[],
  idMap: Map<string, string>,
): NormalizedGraphLink[] {
  const byPair = new Map<string, NormalizedGraphLink>();

  for (const expert of experts) {
    for (const link of dedupeCompanyLinks(expert)) {
      const companyId = canonicalCompanyId(link.companyId, idMap);
      const pairKey = `${expert.id}|${companyId}`;
      const current = byPair.get(pairKey);
      const next: NormalizedGraphLink = {
        expertId: expert.id,
        companyId,
        relationship: link.relationship,
        note: link.note,
      };
      if (!current) {
        byPair.set(pairKey, next);
        continue;
      }
      const currentPriority = relationshipPriority(current.relationship);
      const nextPriority = relationshipPriority(next.relationship);
      if (nextPriority > currentPriority) {
        byPair.set(pairKey, { ...next, note: next.note ?? current.note });
      } else if (!current.note && next.note) {
        byPair.set(pairKey, { ...current, note: next.note });
      }
    }
  }

  return [...byPair.values()];
}

export interface CollapsibleEdge {
  id: string;
  from: string;
  to: string;
  relationship: RelationshipType;
  relationshipLabel: string;
  note: string;
  themes: Expert["themes"];
  confidence: number;
  sourceIds: string[];
}

/** Collapse parallel edges that share the same endpoints (keep strongest relationship). */
export function collapseEndpointEdges<T extends CollapsibleEdge>(edges: T[]): T[] {
  const byEndpoints = new Map<string, T>();

  for (const edge of edges) {
    const [left, right] = edge.from < edge.to ? [edge.from, edge.to] : [edge.to, edge.from];
    const key = `${left}|${right}`;
    const current = byEndpoints.get(key);
    if (!current) {
      byEndpoints.set(key, edge);
      continue;
    }
    const currentPriority = relationshipPriority(current.relationship);
    const nextPriority = relationshipPriority(edge.relationship);
    const winner = nextPriority > currentPriority ? edge : current;
    const loser = winner === edge ? current : edge;
    byEndpoints.set(key, {
      ...winner,
      sourceIds: Array.from(new Set([...winner.sourceIds, ...loser.sourceIds])),
      note: winner.note || loser.note,
      confidence: Math.max(winner.confidence, loser.confidence),
    });
  }

  return [...byEndpoints.values()];
}
