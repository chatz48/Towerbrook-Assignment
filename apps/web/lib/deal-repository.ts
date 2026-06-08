import {
  dealCoverageByCompany,
  dealsForCompany,
  dealsForExpert,
  getDeal,
  getDeals,
} from "./deals";
import {
  dbDealsForCompany,
  dbDealsForExpert,
  getDbDeal,
  getDbDealCoverageByCompany,
  hasDealDatabase,
  listDbDeals,
} from "./deal-db";
import type { DealWithScore } from "./types";

export async function listDeals(): Promise<DealWithScore[]> {
  return hasDealDatabase() ? listDbDeals() : getDeals();
}

export async function loadDeal(id: string): Promise<DealWithScore | undefined> {
  return hasDealDatabase() ? getDbDeal(id) : getDeal(id);
}

export async function listDealsForCompany(companyId: string): Promise<DealWithScore[]> {
  return hasDealDatabase() ? dbDealsForCompany(companyId) : dealsForCompany(companyId);
}

export async function listDealsForExpert(expertId: string): Promise<DealWithScore[]> {
  return hasDealDatabase() ? dbDealsForExpert(expertId) : dealsForExpert(expertId);
}

export async function dealCoverage(): Promise<Map<string, number>> {
  return hasDealDatabase() ? getDbDealCoverageByCompany() : dealCoverageByCompany();
}
