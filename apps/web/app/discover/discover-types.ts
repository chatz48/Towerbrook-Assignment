export interface LiveSearchPreview {
  configured: boolean;
  providers: string[];
  error?: string;
  results: { title: string; url: string; snippet: string; provider?: string }[];
}

export interface ResearchJob {
  id: string;
  job_type: string;
  status: string;
  theme_id?: string;
  query?: string;
  progress_completed: number;
  progress_total: number;
  sources_found: number;
  entities_created: number;
  relationships_created: number;
  error?: string;
}

export type QueueView = "experts" | "companies" | "gaps";
