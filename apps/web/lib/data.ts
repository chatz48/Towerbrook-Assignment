import expertsRaw from "@/data/experts.json";
import companiesRaw from "@/data/companies.json";
import type {
  Company,
  CompanyWithLinks,
  Expert,
  ExpertWithCompanies,
  ThemeId,
} from "./types";
import { filterTowerBrookEmployees } from "./employee-scope";
import { ExpertSchema, CompanySchema } from "./validation";
import { z } from "zod";
import { relationshipPriority } from "./relationship-priority";

function isGeneratedRelationshipNote(note: string | undefined, expertName?: string) {
  if (!note) return true;
  const normalized = note.trim().replace(/\s+/g, " ");
  if (!normalized) return true;
  if (!expertName) return /^.+ is related to .+\.$/i.test(normalized);
  return normalized.toLowerCase() === `${expertName} is related to`.toLowerCase()
    || new RegExp(`^${escapeRegExp(expertName)} is related to .+\\.$`, "i").test(normalized);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function dedupeCompanyLinks(expert: Expert): Expert["companies"] {
  const byCompany = new Map<string, Expert["companies"][number]>();
  for (const link of expert.companies) {
    const current = byCompany.get(link.companyId);
    const next = isGeneratedRelationshipNote(link.note, expert.name)
      ? { ...link, note: undefined }
      : link;
    if (!current) {
      byCompany.set(link.companyId, next);
      continue;
    }
    const currentPriority = relationshipPriority(current.relationship);
    const nextPriority = relationshipPriority(next.relationship);
    if (nextPriority > currentPriority) {
      byCompany.set(link.companyId, {
        ...next,
        note: next.note ?? current.note,
      });
    } else if (!current.note && next.note) {
      byCompany.set(link.companyId, { ...current, note: next.note });
    }
  }
  return [...byCompany.values()];
}

export function canonicalCompanyName(name: string) {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/\blimited\b|\bltd\b|\bplc\b|\binc\b|\bcorp\b/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// JSON is the single source of truth; it's produced by the discovery pipeline
// (scripts/) and hand-verified. Zod validation catches schema drift at build time.
// Uses safeParse during active development (logs warnings); switch to .parse() for
// strict enforcement once data is clean.
function validate<T>(schema: z.ZodType<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.slice(0, 5);
    console.warn(`[validation] ${label}: ${issues.length} issue(s) — first: ${issues[0]?.path.join(".")} ${issues[0]?.message}`);
    if (issues.length > 5) console.warn(`[validation] ${label}: ... and ${result.error.issues.length - 5} more`);
  }
  // Return data as-is (cast) even on validation failure during dev;
  // switch to result.data for strict mode
  return (result.success ? result.data : data) as unknown as T;
}

const EXPERTS = validate(z.array(ExpertSchema), expertsRaw, "experts.json") as Expert[];
const COMPANIES = validate(z.array(CompanySchema), companiesRaw, "companies.json") as Company[];

const EXPERT_BY_ID = new Map(EXPERTS.map((e) => [e.id, e]));
const COMPANY_BY_ID = new Map(COMPANIES.map((c) => [c.id, c]));

export function getExperts(limit?: number, offset = 0): Expert[] {
  const slice = EXPERTS.slice(offset, limit === undefined ? undefined : offset + limit);
  return slice;
}

export function getCompanies(limit?: number, offset = 0): Company[] {
  const slice = COMPANIES.slice(offset, limit === undefined ? undefined : offset + limit);
  return slice;
}

export function getExpert(id: string): Expert | undefined {
  return EXPERT_BY_ID.get(id);
}

export function getCompany(id: string): Company | undefined {
  return COMPANY_BY_ID.get(id);
}

export function expertsForTheme(theme: ThemeId): Expert[] {
  return EXPERTS.filter((e) => e.themes.includes(theme));
}

export function companiesForTheme(theme: ThemeId): Company[] {
  return COMPANIES.filter((c) => c.themes.includes(theme));
}

/** Resolve an expert's edges into full company records (for detail views). */
export function resolveExpert(expert: Expert): ExpertWithCompanies {
  const resolvedCompanies = dedupeCompanyLinks(expert)
    .map((link) => {
      const company = COMPANY_BY_ID.get(link.companyId);
      return company
        ? { company, relationship: link.relationship, note: link.note }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return {
    ...expert,
    companies: dedupeCompanyLinks(expert),
    resolvedCompanies: dedupeResolvedCompanies(resolvedCompanies),
  };
}

function dedupeResolvedCompanies(
  items: ExpertWithCompanies["resolvedCompanies"],
): ExpertWithCompanies["resolvedCompanies"] {
  const byName = new Map<string, ExpertWithCompanies["resolvedCompanies"][number]>();
  for (const item of items) {
    const key = canonicalCompanyName(item.company.name);
    const current = byName.get(key);
    if (!current) {
      byName.set(key, item);
      continue;
    }
    const currentPriority = relationshipPriority(current.relationship);
    const nextPriority = relationshipPriority(item.relationship);
    const keepNext =
      item.company.confidence > current.company.confidence ||
      (item.company.confidence === current.company.confidence && nextPriority > currentPriority);
    byName.set(key, keepNext
      ? { ...item, note: item.note ?? current.note }
      : { ...current, note: current.note ?? item.note });
  }
  return [...byName.values()];
}

/**
 * Build the reverse index: for each company, which experts touch it and how.
 * Expert density is the core "interesting company" signal the brief asks for —
 * a company multiple discovered experts founded / advised / banked is, by
 * construction, where the deal-relevant knowledge concentrates.
 */
export function companiesWithLinks(
  theme?: ThemeId,
  includeTowerBrookEmployees = false,
): CompanyWithLinks[] {
  const pool = theme ? companiesForTheme(theme) : COMPANIES;
  const visibleExperts = filterTowerBrookEmployees(EXPERTS, includeTowerBrookEmployees);
  const result = pool.map((company) => {
    const linkedExperts = visibleExperts.flatMap((expert) =>
      dedupeCompanyLinks(expert)
        .filter((l) => l.companyId === company.id)
        .filter(() => !theme || expert.themes.includes(theme))
        .map((l) => ({ expert, relationship: l.relationship, note: l.note })),
    );
    return { ...company, linkedExperts, expertCount: linkedExperts.length };
  });
  const deduped = new Map<string, CompanyWithLinks>();
  for (const company of result) {
    const key = canonicalCompanyName(company.name);
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, company);
      continue;
    }
    const mergedExperts = [...existing.linkedExperts, ...company.linkedExperts].filter(
      (link, index, links) =>
        links.findIndex(
          (other) =>
            other.expert.id === link.expert.id &&
            other.relationship === link.relationship,
        ) === index,
    );
    const winner =
      company.expertCount > existing.expertCount ||
      (company.expertCount === existing.expertCount && company.confidence > existing.confidence)
        ? company
        : existing;
    deduped.set(key, {
      ...winner,
      linkedExperts: mergedExperts,
      expertCount: mergedExperts.length,
    });
  }
  // Rank: expert density first, then confidence as a tie-breaker.
  return [...deduped.values()].sort(
    (a, b) => b.expertCount - a.expertCount || b.confidence - a.confidence,
  );
}

export function companyWithLinks(
  id: string,
  includeTowerBrookEmployees = false,
): CompanyWithLinks | undefined {
  const company = COMPANY_BY_ID.get(id);
  if (!company) return undefined;
  const linkedExperts = filterTowerBrookEmployees(EXPERTS, includeTowerBrookEmployees).flatMap((expert) =>
    dedupeCompanyLinks(expert)
      .filter((l) => l.companyId === id)
      .map((l) => ({ expert, relationship: l.relationship, note: l.note })),
  );
  return { ...company, linkedExperts, expertCount: linkedExperts.length };
}

export interface ThemeStats {
  expertCount: number;
  companyCount: number;
  byType: Record<string, number>;
}

export function themeStats(theme: ThemeId, includeTowerBrookEmployees = false): ThemeStats {
  const experts = filterTowerBrookEmployees(expertsForTheme(theme), includeTowerBrookEmployees);
  const byType: Record<string, number> = {};
  for (const e of experts) byType[e.type] = (byType[e.type] ?? 0) + 1;
  return {
    expertCount: experts.length,
    companyCount: companiesForTheme(theme).length,
    byType,
  };
}
