export type ThemeId =
  | "clean-energy-advisory"
  | "grid-infrastructure"
  | "smart-water";

export interface Theme {
  id: ThemeId;
  name: string;
  shortName: string;
  description: string;
  keywords: string[];
  accent: string;
}

export type ExpertType =
  | "ex-founder"
  | "operator"
  | "advisor"
  | "strategy-consultant"
  | "commercial-dd"
  | "technical-dd"
  | "engineering-consultant"
  | "regulatory-policy"
  | "banker"
  | "lawyer"
  | "service-provider"
  | "investor";

export type RelationshipType =
  | "founded"
  | "co-founded"
  | "led"
  | "partner"
  | "board"
  | "advised"
  | "invested-in"
  | "acquired"
  | "banked"
  | "legal-counsel"
  | "served";

export type DealStatus =
  | "announced"
  | "completed"
  | "rumored"
  | "pending"
  | "failed";

export type DealType =
  | "acquisition"
  | "minority-investment"
  | "growth-equity"
  | "merger"
  | "carve-out"
  | "refinancing"
  | "jv";

export type DealPartyRole =
  | "target"
  | "buyer"
  | "investor"
  | "seller"
  | "existing-shareholder"
  | "co-investor"
  | "management"
  | "board";

export type DealAdvisorRole =
  | "financial-advisor-buyer"
  | "financial-advisor-seller"
  | "legal-counsel-buyer"
  | "legal-counsel-seller"
  | "commercial-diligence"
  | "technical-diligence"
  | "tax-accounting"
  | "other-advisor";

export type DealFactStatus = "verified" | "needs_review" | "missing" | "not_disclosed";

export interface Source {
  title: string;
  url: string;
  publisher?: string;
  /** Distinguishes verified evidence (articles, press releases, company pages)
   *  from contact references (LinkedIn, email finders). Only 'evidence' sources
   *  contribute to confidence scoring. */
  sourceType?: "evidence" | "contact";
}

export interface DealFact {
  id: string;
  dealId: string;
  factType: string;
  factValue: string;
  normalizedValue?: string;
  sourceId?: string;
  evidenceChunkId?: string;
  evidenceText?: string;
  confidence: number;
  extractionMethod: "curated" | "llm" | "heuristic" | "web_search";
  reviewStatus: DealFactStatus;
}

export interface DealParty {
  role: DealPartyRole;
  name: string;
  companyId?: string;
  personId?: string;
  note?: string;
  sourceId?: string;
}

export interface DealAdvisor {
  role: DealAdvisorRole;
  name: string;
  companyId?: string;
  note?: string;
  sourceId?: string;
}

export interface DealConflict {
  factType: string;
  values: string[];
  note: string;
}

export interface Deal {
  id: string;
  name: string;
  theme: ThemeId;
  geography: string;
  status: DealStatus;
  dealType: DealType;
  announcementDate?: string;
  completionDate?: string;
  targetCompanyId?: string;
  buyerCompanyId?: string;
  investorCompanyId?: string;
  sellerCompanyId?: string;
  parties: DealParty[];
  advisors: DealAdvisor[];
  facts: DealFact[];
  sourceIds: string[];
  sources: Source[];
  investmentRelevance: string;
  strategicRationale?: string;
  companiesSurfaced: string[];
  expertsSurfaced: string[];
  comparableDealIds?: string[];
  missingFacts: string[];
  contradictoryFacts?: DealConflict[];
  followUpSearches: string[];
  confidence: number;
}

export interface DealWithScore extends Deal {
  completionScore: number;
  requiredFactsFound: number;
  requiredFactsTotal: number;
  advisorCount: number;
  lawyerCount: number;
}

/**
 * A dated, sourced news item. Kept separate from the qualitative `signals`
 * ("why now" judgment) so this feed can be swapped for a licensed feed
 * (Bloomberg / AlphaSense / a news API) without touching the rest of the model.
 */
export interface Signal {
  headline: string;
  date: string; // ISO yyyy-mm-dd
  url: string;
  source: string; // publisher, e.g. "reNews", "Current±"
}

export interface CompanyLink {
  companyId: string;
  relationship: RelationshipType;
  /** Human context, e.g. "Founded 2015, acquired by Schneider in 2021". */
  note?: string;
}

export interface Expert {
  id: string;
  name: string;
  /** Alternate names, former names, or common variations used in sources.
   *  The canonical `id` is the single source of truth; aliases exist only
   *  to aid search and deduplication. Never reference an expert by alias. */
  aliases?: string[];
  type: ExpertType;
  /** "Co-founder & ex-CEO, OpenSolar" — the at-a-glance line. */
  headline: string;
  org?: string;
  location?: string;
  themes: ThemeId[];
  /** Sub-specialty tags within the theme(s), e.g. "Offshore wind", "BESS". */
  specialties?: string[];
  /**
   * Is this a name every analyst already knows, or proprietary/non-obvious
   * access? Drives the "who to call first" priority — non-obvious connectors
   * are worth more to a deal team than famous CEOs.
   */
  access?: "obvious" | "proprietary";
  /** The 1–2 sentence reason an IP should care. */
  whyRelevant: string;
  bio?: string;
  /** Typed edges to companies — the spine of the graph. */
  companies: CompanyLink[];
  /** Qualitative "why now" judgment (editorial, not a news feed). */
  signals?: string[];
  /** Dated, sourced news items (the timeliness layer). */
  news?: Signal[];
  sources: Source[];
  /** 0–1 confidence in the accuracy of this record (shown to the user). */
  confidence: number;
  linkedin?: string;
  email?: string;
  contactFacts?: ExpertContactFact[];
}

export type CompanyCategory =
  | "target" // potential investment target
  | "advisory" // advisory / consultancy firm
  | "service-provider"
  | "investor" // peer fund active in the space
  | "incumbent"; // large strategic / acquirer

export interface Company {
  id: string;
  name: string;
  /** Alternate names, former legal names, or common variations.
   *  The canonical `id` is the single source of truth. Never reference
   *  a company by alias — use the id. */
  aliases?: string[];
  themes: ThemeId[];
  category: CompanyCategory;
  description: string;
  /** Why this surfaced as interesting (often: expert density). */
  whyInteresting?: string;
  /** Sub-specialty tags within the theme(s). */
  specialties?: string[];
  /** Maturity, e.g. "Seed", "Growth", "PE-backed", "Acquired", "Public". */
  stage?: string;
  /** Is it actionable as a target, or already taken? */
  ownershipStatus?: "independent" | "sponsor-owned" | "acquired" | "public";
  /** Who owns / backs it, e.g. "KKR", "bp", "Quinbrook". */
  owner?: string;
  /** Rough scale band, e.g. "<£10m rev", "50–200 staff" — indicative only. */
  sizeBand?: string;
  /** Last known funding / deal context, e.g. "$20m Series B (2024)". */
  funding?: string;
  /** Hand-picked comparable companies (ids) for "more like this". */
  similarCompanyIds?: string[];
  hq?: string;
  website?: string;
  logoUrl?: string;
  materialFacts?: CompanyMaterialFact[];
  /** Dated, sourced news items. */
  news?: Signal[];
  sources: Source[];
  confidence: number;
}

export type CompanyMaterialFactType =
  | "website"
  | "seed_round"
  | "last_funding"
  | "total_funding"
  | "launch_date"
  | "product_live_status"
  | "logo_url"
  | "hq"
  | "ownership"
  | "size";

export type MaterialFactStatus = "verified" | "partial" | "missing" | "not_disclosed" | "needs_review";

export interface CompanyMaterialFact {
  type: CompanyMaterialFactType;
  label: string;
  value?: string;
  status: MaterialFactStatus;
  source?: Source;
  evidence?: string;
  confidence?: number;
  asOfDate?: string;
}

export type ExpertContactFactType = "linkedin" | "email" | "website" | "intro_path";

export interface ExpertContactFact {
  type: ExpertContactFactType;
  value?: string;
  status: MaterialFactStatus;
  source?: Source;
  evidence?: string;
  confidence?: number;
  complianceNote?: string;
}

// ---- Derived view models (computed at load time, never stored) ----

export interface CompanyWithLinks extends Company {
  /** Experts linked to this company, with the edge that connects them. */
  linkedExperts: { expert: Expert; relationship: RelationshipType; note?: string }[];
  /** Expert density = primary ranking signal for "interesting" companies. */
  expertCount: number;
}

export interface ExpertWithCompanies extends Expert {
  resolvedCompanies: { company: Company; relationship: RelationshipType; note?: string }[];
}
