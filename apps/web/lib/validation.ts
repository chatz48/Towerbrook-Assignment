import { z } from "zod";

/**
 * Runtime validation schemas for JSON data imports.
 * Catches schema drift at build time rather than surfacing as runtime render errors.
 *
 * Usage:
 *   import expertsRaw from "@/data/experts.json";
 *   const EXPERTS = z.array(ExpertSchema).parse(expertsRaw);
 */

const SourceSchema = z.object({
  title: z.string(),
  url: z.string(),
  publisher: z.string().optional(),
  sourceType: z.enum(["evidence", "contact"]).optional(),
}).passthrough();

const CompanyLinkSchema = z.object({
  companyId: z.string(),
  relationship: z.string(),
  note: z.string().optional(),
}).passthrough();

const SignalSchema = z.object({
  headline: z.string(),
  date: z.string(),
  url: z.string(),
  source: z.string(),
});

export const ExpertSchema = z.object({
  id: z.string(),
  name: z.string(),
  aliases: z.array(z.string()).optional(),
  type: z.string(),
  headline: z.string(),
  org: z.string().optional(),
  location: z.string().optional(),
  themes: z.array(z.string()),
  specialties: z.array(z.string()).optional(),
  access: z.string().optional(),
  whyRelevant: z.string(),
  bio: z.string().optional(),
  companies: z.array(CompanyLinkSchema),
  signals: z.array(z.string()).optional(),
  news: z.array(SignalSchema).optional(),
  sources: z.array(SourceSchema),
  confidence: z.number().min(0).max(1).optional().default(0.5),
  linkedin: z.string().optional(),
  email: z.string().optional(),
  contactFacts: z.array(z.object({
    type: z.string(),
    value: z.string(),
    confidence: z.number().optional(),
  })).optional(),
}).passthrough();

export const CompanySchema = z.object({
  id: z.string(),
  name: z.string(),
  aliases: z.array(z.string()).optional(),
  themes: z.array(z.string()),
  category: z.string(),
  description: z.string(),
  whyInteresting: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  stage: z.string().optional(),
  ownershipStatus: z.string().optional(),
  owner: z.string().optional(),
  sizeBand: z.string().optional(),
  website: z.string().optional(),
  sources: z.array(SourceSchema),
  confidence: z.number().min(0).max(1).optional().default(0.5),
  news: z.array(SignalSchema).optional(),
  materialFacts: z.array(z.object({
    type: z.string(),
    value: z.string(),
    source: z.string().optional(),
  })).optional(),
  funding: z.string().optional(),
  hq: z.string().optional(),
}).passthrough();
