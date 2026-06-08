import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type RequestTraceSurface = "web-ask" | "backend-copilot";

export type RequestTraceRecord = {
  request_id: string;
  surface: RequestTraceSurface;
  created_at: string;
  question: string;
  filters?: Record<string, unknown>;
  theme_id?: string;
  intent?: string;
  outcome: "complete" | "baseline_only" | "error";
  backend_enriched?: boolean;
  stream?: boolean;
  durations_ms: Record<string, number>;
  phases?: unknown[];
  tool_calls?: unknown[];
  node_timings_ms?: Record<string, number>;
  errors?: string[];
  summary?: {
    answer_preview?: string;
    expert_count?: number;
    company_count?: number;
    source_count?: number;
    confidence?: number;
  };
};

export function tracesEnabled(): boolean {
  if (process.env.REQUEST_TRACES === "0") return false;
  if (process.env.REQUEST_TRACES === "1") return true;
  return process.env.NODE_ENV === "development";
}

function repoRoot(): string {
  const cwd = process.cwd();
  if (cwd.endsWith(`${path.sep}apps${path.sep}web`)) {
    return path.resolve(cwd, "..", "..");
  }
  return cwd;
}

function traceDir(surface: RequestTraceSurface): string {
  const root = process.env.REQUEST_TRACE_DIR ?? path.join(repoRoot(), ".traces");
  const day = new Date().toISOString().slice(0, 10);
  return path.join(root, surface, day);
}

export async function writeRequestTrace(record: RequestTraceRecord): Promise<string | null> {
  if (!tracesEnabled()) return null;
  const dir = traceDir(record.surface);
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${record.request_id}.json`);
  await writeFile(filePath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return filePath;
}

export class AskTraceCollector {
  private readonly started = Date.now();
  private baselineMs: number | undefined;
  private completeMs: number | undefined;
  private phases: unknown[] = [];
  private errors: string[] = [];
  private outcome: RequestTraceRecord["outcome"] = "complete";
  private backendEnriched = false;
  private intent: string | undefined;
  private toolCalls: unknown[] | undefined;
  private nodeTimings: Record<string, number> | undefined;
  private summary: RequestTraceRecord["summary"];

  constructor(
    readonly requestId: string,
    readonly question: string,
    readonly filters?: Record<string, unknown>,
    readonly stream = false,
  ) {}

  markBaseline(): void {
    if (this.baselineMs === undefined) {
      this.baselineMs = Date.now() - this.started;
    }
  }

  addPhase(phase: unknown): void {
    this.phases.push(phase);
  }

  setError(message: string): void {
    this.outcome = "error";
    this.errors.push(message);
  }

  finishFromResponse(response: {
    intent?: string;
    backend_enriched?: boolean;
    backend_error?: string;
    answer_summary?: string;
    ranked_experts?: unknown[];
    ranked_companies?: unknown[];
    sources_used?: unknown[];
    confidence?: { score?: number };
    tool_calls?: unknown[];
    node_timings_ms?: Record<string, number>;
  }): void {
    this.completeMs = Date.now() - this.started;
    this.intent = response.intent;
    this.backendEnriched = Boolean(response.backend_enriched);
    this.toolCalls = response.tool_calls;
    this.nodeTimings = response.node_timings_ms;
    if (response.backend_error) {
      this.errors.push(response.backend_error);
    }
    if (!response.backend_enriched && !response.backend_error) {
      this.outcome = "baseline_only";
    } else if (this.outcome !== "error") {
      this.outcome = "complete";
    }
    this.summary = {
      answer_preview: response.answer_summary?.slice(0, 280),
      expert_count: response.ranked_experts?.length ?? 0,
      company_count: response.ranked_companies?.length ?? 0,
      source_count: response.sources_used?.length ?? 0,
      confidence: response.confidence?.score,
    };
  }

  async flush(): Promise<string | null> {
    const totalMs = Date.now() - this.started;
    return writeRequestTrace({
      request_id: this.requestId,
      surface: "web-ask",
      created_at: new Date().toISOString(),
      question: this.question,
      filters: this.filters,
      theme_id: typeof this.filters?.theme === "string" ? this.filters.theme : undefined,
      intent: this.intent,
      outcome: this.outcome,
      backend_enriched: this.backendEnriched,
      stream: this.stream,
      durations_ms: {
        ...(this.baselineMs !== undefined ? { baseline: this.baselineMs } : {}),
        ...(this.completeMs !== undefined ? { complete: this.completeMs } : {}),
        total: totalMs,
      },
      phases: this.phases.length ? this.phases : undefined,
      tool_calls: this.toolCalls,
      node_timings_ms: this.nodeTimings,
      errors: this.errors.length ? this.errors : undefined,
      summary: this.summary,
    });
  }
}
