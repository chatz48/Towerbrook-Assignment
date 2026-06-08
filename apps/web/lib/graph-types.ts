import type {
  CompanyCategory,
  ExpertType,
  RelationshipType,
  ThemeId,
} from "@/lib/types";
import type { ThemeFocus } from "@/lib/theme-focus";

export interface ExplorerTheme {
  id: ThemeFocus;
  name: string;
  shortName: string;
}

export interface ExplorerSource {
  id: string;
  title: string;
  url: string;
  publisher?: string;
  label: string;
}

export interface ExplorerExpertNode {
  key: string;
  id: string;
  kind: "expert";
  name: string;
  subtitle: string;
  type: ExpertType;
  typeLabel: string;
  org?: string;
  location?: string;
  themes: ThemeId[];
  tags: string[];
  confidence: number;
  href: string;
  sourceIds: string[];
  evidence: string;
}

export interface ExplorerCompanyNode {
  key: string;
  id: string;
  kind: "company";
  name: string;
  subtitle: string;
  category: CompanyCategory;
  categoryLabel: string;
  themes: ThemeId[];
  tags: string[];
  confidence: number;
  href: string;
  sourceIds: string[];
  evidence: string;
}

export interface ExplorerDealNode {
  key: string;
  id: string;
  kind: "deal";
  name: string;
  subtitle: string;
  typeLabel: string;
  themes: ThemeId[];
  tags: string[];
  confidence: number;
  href: string;
  sourceIds: string[];
  evidence: string;
}

export interface ExplorerEdge {
  id: string;
  from: string;
  to: string;
  relationship: RelationshipType;
  relationshipLabel: string;
  note: string;
  themes: ThemeId[];
  confidence: number;
  sourceIds: string[];
}

export type ExplorerNode = ExplorerExpertNode | ExplorerCompanyNode | ExplorerDealNode;
