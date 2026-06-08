import warmPathData from "@/data/towerbrook-warm-paths.json";
import type { Source } from "./types";

export type WarmPathStatus =
  | "verified"
  | "org_level"
  | "nearest_public_path"
  | "not_found";

export interface TowerBrookWarmPath {
  id: string;
  target_expert_id: string;
  status: WarmPathStatus;
  strength: number;
  path_type: string;
  intro_route: string;
  recommended_intro: string;
  path_nodes: string[];
  evidence: string;
  sources: Source[];
  confidence: number;
}

const paths = warmPathData.paths as TowerBrookWarmPath[];

export function allWarmPaths(): TowerBrookWarmPath[] {
  return [...paths].sort((a, b) => b.strength - a.strength || b.confidence - a.confidence);
}

export function warmPathsForExpert(expertId: string): TowerBrookWarmPath[] {
  return paths
    .filter((path) => path.target_expert_id === expertId)
    .sort((a, b) => b.strength - a.strength || b.confidence - a.confidence);
}

export function bestWarmPathForExpert(expertId: string): TowerBrookWarmPath | null {
  return warmPathsForExpert(expertId)[0] ?? null;
}

export function warmPathStatusLabel(status: WarmPathStatus): string {
  switch (status) {
    case "verified":
      return "Verified warm path";
    case "org_level":
      return "Organization-level path";
    case "nearest_public_path":
      return "Nearest public path";
    case "not_found":
      return "No public path found";
  }
}

export function warmPathTone(status: WarmPathStatus): string {
  switch (status) {
    case "verified":
      return "border-success bg-[#f2fbf6] text-[#166534]";
    case "org_level":
      return "border-accent/30 bg-[#eef6ff] text-[#175cd3]";
    case "nearest_public_path":
      return "border-warn/30 bg-[#fff8eb] text-[#92400e]";
    case "not_found":
      return "border-line bg-[#f7f8fa] text-ink-soft";
  }
}
