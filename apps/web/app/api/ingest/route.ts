import { extractDealWithModel } from "@/lib/deal-ai";
import { hasDealDatabase, persistDealIngestion } from "@/lib/deal-db";
import { runDealEnrichment } from "@/lib/deal-enrichment";
import { callBackendApi, hasBackendApi } from "@/lib/backend-api";
import { hasModel } from "@/lib/llm";

const MAX_INGEST_TEXT_CHARS = 50_000;

export async function POST(request: Request) {
  try {
    if (hasBackendApi()) {
      const graphResult = await forwardToIntelligenceApi(request.clone());
      if (graphResult) return Response.json(graphResult);
    }

    const body = await readIngestRequest(request);

    if (!body.text?.trim()) {
      return Response.json(
        { error: "Paste deal text or extracted source content before ingestion." },
        { status: 400 },
      );
    }
    if (body.text.length > MAX_INGEST_TEXT_CHARS) {
      return Response.json(
        {
          error:
            "Submitted source text is too long. Keep uploads under 50,000 characters and split larger source packs into separate submissions.",
        },
        { status: 413 },
      );
    }

    const extraction = await extractDealWithModel({
      text: body.text,
      title: body.title,
      url: body.url,
    });

    if (!hasDealDatabase()) {
      return Response.json({
        ...extraction,
        mutation: false,
        note:
          "Draft extraction only. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to persist into the deal intelligence database.",
      });
    }

    const persisted = await persistDealIngestion({
      text: body.text,
      title: body.title,
      url: body.url,
      extraction,
    });

    const enrichment = body.enrich && hasModel() ? await runDealEnrichment(persisted.dealId) : null;

    return Response.json({
      ...persisted,
      enrichment,
      mutation: true,
      note: enrichment
        ? "Persisted and enriched. Review low-confidence facts before using in IC material."
        : "Persisted. Run enrichment to fetch missing facts from follow-up sources.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingestion failed";
    return Response.json(
      { error: message },
      { status: message.includes("too long") ? 413 : 500 },
    );
  }
}

async function forwardToIntelligenceApi(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    return callBackendApi("/ingest/source", {
      method: "POST",
      body: form,
    });
  }
  const body = await request.json();
  const text = String(body.text ?? "");
  if (text.length > MAX_INGEST_TEXT_CHARS) {
    throw new Error(
      "Submitted source text is too long. Keep uploads under 50,000 characters and split larger source packs into separate submissions.",
    );
  }
  return callBackendApi("/ingest/json", {
    method: "POST",
    body: JSON.stringify({
      url: body.url,
      title: body.title,
      text,
      source_type: "user_upload",
      theme_id: body.themeId,
      metadata: { enrich: body.enrich },
    }),
  });
}

async function readIngestRequest(request: Request): Promise<{
  url?: string;
  title?: string;
  text: string;
  enrich?: boolean;
}> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    const body = (await request.json()) as {
      url?: string;
      title?: string;
      text?: string;
      enrich?: boolean;
    };
    return { ...body, text: body.text ?? "" };
  }

  const form = await request.formData();
  const file = form.get("file");
  const rawText = String(form.get("text") ?? "");
  const title = String(form.get("title") ?? "");
  const url = String(form.get("url") ?? "");
  const enrich = String(form.get("enrich") ?? "") === "true";

  if (file instanceof File) {
    const fileText = await readUploadedFile(file);
    const text = [rawText, fileText].filter(Boolean).join("\n\n");
    if (text.length > MAX_INGEST_TEXT_CHARS) {
      throw new Error(
        "Submitted source text is too long. Keep uploads under 50,000 characters and split larger source packs into separate submissions.",
      );
    }
    return {
      text,
      title: title || file.name,
      url: url || undefined,
      enrich,
    };
  }

  if (rawText.length > MAX_INGEST_TEXT_CHARS) {
    throw new Error(
      "Submitted source text is too long. Keep uploads under 50,000 characters and split larger source packs into separate submissions.",
    );
  }

  return {
    text: rawText,
    title: title || undefined,
    url: url || undefined,
    enrich,
  };
}

async function readUploadedFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text ?? "";
    } finally {
      await parser.destroy();
    }
  }
  return buffer.toString("utf8");
}
