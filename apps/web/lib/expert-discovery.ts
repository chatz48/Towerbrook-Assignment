import discoveryRaw from "@/data/expert-first-pe-discovery-candidates.json";
import type { CompanyCategory, ExpertType, ThemeId } from "./types";

interface DiscoverySource {
  title: string;
  publisher?: string;
  url: string;
  evidence: string;
}

export interface ExpertDiscoveryCandidate {
  candidate_id: string;
  name: string;
  expert_type: ExpertType;
  archetypes: string[];
  themes: ThemeId[];
  organizations: string[];
  headline: string;
  why_relevant: string;
  access_path:
    | "direct-towerbrook-dealmaker"
    | "towerbrook-deal-participant"
    | "peer-deal-participant";
  canonical_match: {
    status: "exact_name_match" | "unresolved";
    expert_id: string | null;
  };
  deal_roles: {
    deal_id: string;
    deal_name: string;
    deal_lane: string;
    role: string;
    organization: string;
    target: string;
  }[];
  connected_companies: {
    name: string;
    relationship: string;
    evidence_deal_ids: string[];
  }[];
  sources: DiscoverySource[];
  scores: {
    research_priority: number;
  };
  missing_profile_facts: string[];
}

export interface AdvisorExpertGap {
  gap_id: string;
  organization: string;
  advisor_role: string;
  expert_type_sought: ExpertType;
  themes: ThemeId[];
  coverage_status: "partial-named-coverage" | "no-named-expert";
  named_experts_found: { candidate_id: string; name: string }[];
  deals: { deal_id: string; deal_name: string; target: string; lane: string; priority: number }[];
  search_priority: number;
  search_queries: string[];
  sources?: DiscoverySource[];
}

export interface DerivedCompanyCandidate {
  candidate_id: string;
  name: string;
  category: CompanyCategory;
  themes: ThemeId[];
  ownership_status: string;
  owner: string | null;
  why_interesting: string;
  canonical_match: {
    status: "exact_name_match" | "unresolved";
    company_id: string | null;
  };
  expert_connections: {
    expert_candidate_id: string;
    name: string;
    expert_type: ExpertType;
    expert_priority: number;
  }[];
  deal_connections: { id: string; name: string; lane: string; theme: ThemeId; priority: number }[];
  sources?: DiscoverySource[];
  scores: {
    research_priority: number;
  };
  next_questions?: string[];
}

export interface ExpertDiscoveryCensus {
  operating_principle: string;
  coverage: {
    expert_candidates: number;
    canonical_expert_matches: number;
    towerbrook_connected_experts: number;
    advisor_expert_gaps: number;
    advisor_gaps_with_no_named_expert: number;
    derived_companies: number;
  };
  expert_candidates: ExpertDiscoveryCandidate[];
  advisor_expert_gaps: AdvisorExpertGap[];
  derived_company_candidates: DerivedCompanyCandidate[];
}

const LEGACY_EXPERT_TYPES: Record<string, ExpertType> = {
  "lender-credit": "investor",
};

function normalizeExpertType(value: string): ExpertType {
  return LEGACY_EXPERT_TYPES[value] ?? (value as ExpertType);
}

function normalizeDiscovery(raw: ExpertDiscoveryCensus): ExpertDiscoveryCensus {
  return {
    ...raw,
    expert_candidates: raw.expert_candidates.map((candidate) => ({
      ...candidate,
      expert_type: normalizeExpertType(candidate.expert_type),
      archetypes: candidate.archetypes.map((archetype) =>
        LEGACY_EXPERT_TYPES[archetype] ?? archetype,
      ),
    })),
    advisor_expert_gaps: raw.advisor_expert_gaps.map((gap) => ({
      ...gap,
      expert_type_sought: normalizeExpertType(gap.expert_type_sought),
    })),
    derived_company_candidates: raw.derived_company_candidates.map((company) => ({
      ...company,
      expert_connections: company.expert_connections.map((connection) => ({
        ...connection,
        expert_type: normalizeExpertType(connection.expert_type),
      })),
    })),
  };
}

const DISCOVERY = normalizeDiscovery(discoveryRaw as ExpertDiscoveryCensus);

export function getExpertDiscovery(): ExpertDiscoveryCensus {
  return DISCOVERY;
}

export function getExpertDiscoveryCandidates(): ExpertDiscoveryCandidate[] {
  return DISCOVERY.expert_candidates;
}

export function getAdvisorExpertGaps(): AdvisorExpertGap[] {
  return DISCOVERY.advisor_expert_gaps;
}

export function getDerivedCompanyCandidates(): DerivedCompanyCandidate[] {
  return DISCOVERY.derived_company_candidates;
}
