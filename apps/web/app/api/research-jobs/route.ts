import { callBackendApi } from "@/lib/backend-api";
import { backendUnavailableMessage } from "@/lib/user-errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await callBackendApi("/discovery/jobs", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!response) {
      return Response.json(
        { error: backendUnavailableMessage("Live enrichment"), demoMode: true },
        { status: 503 },
      );
    }
    return Response.json(response);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to create research job" },
      { status: 500 },
    );
  }
}
