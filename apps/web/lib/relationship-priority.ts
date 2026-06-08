import type { RelationshipType } from "@/lib/types";

/** Strongest relationship wins when collapsing duplicate expert→company edges. */
export const RELATIONSHIP_PRIORITY: Record<RelationshipType, number> = {
  founded: 100,
  "co-founded": 95,
  led: 90,
  partner: 80,
  board: 75,
  advised: 70,
  "invested-in": 65,
  acquired: 60,
  banked: 55,
  "legal-counsel": 50,
  served: 20,
};

export function relationshipPriority(relationship: RelationshipType): number {
  return RELATIONSHIP_PRIORITY[relationship] ?? 0;
}
