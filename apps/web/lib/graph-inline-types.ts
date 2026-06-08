export interface GraphExpert {
  id: string;
  name: string;
  type: string;
}

export interface GraphCompany {
  id: string;
  name: string;
  expertCount: number;
}

export interface GraphLink {
  expertId: string;
  companyId: string;
  relationship?: string;
}
