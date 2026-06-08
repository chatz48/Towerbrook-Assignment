import discoveryCandidatesRaw from "@/data/expert-first-pe-discovery-candidates.json";
import type { ExpertDiscoveryCandidate } from "@/lib/expert-discovery";

interface DiscoveryData {
  expert_candidates?: ExpertDiscoveryCandidate[];
}

const DATA = discoveryCandidatesRaw as DiscoveryData;

export const EXPERT_DISCOVERY_CANDIDATES = DATA.expert_candidates ?? [];

export function expertDiscoveryCount(): number {
  return EXPERT_DISCOVERY_CANDIDATES.length;
}
