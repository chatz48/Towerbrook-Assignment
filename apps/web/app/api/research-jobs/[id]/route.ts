import { callBackendApi } from "@/lib/backend-api";

type Params = Promise<{ id: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  const { id } = await params;
  try {
    const response = await callBackendApi(`/discovery/jobs/${id}`);
    if (!response) {
      return Response.json(
        { error: "Set BACKEND_API_URL to read research jobs." },
        { status: 503 },
      );
    }
    return Response.json(response);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to read research job" },
      { status: 500 },
    );
  }
}
