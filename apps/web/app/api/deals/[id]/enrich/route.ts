import { runDealEnrichment } from "@/lib/deal-enrichment";
import { hasDealDatabase } from "@/lib/deal-db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!hasDealDatabase()) {
      return Response.json(
        { error: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before enrichment." },
        { status: 503 },
      );
    }

    const { id } = await params;
    const result = await runDealEnrichment(id);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Deal enrichment failed" },
      { status: 500 },
    );
  }
}
