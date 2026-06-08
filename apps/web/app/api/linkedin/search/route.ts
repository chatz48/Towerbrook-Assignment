import { callBackendApi } from "@/lib/backend-api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await callBackendApi("/linkedin/search", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!response) {
      return Response.json(
        {
          error:
            "Live profile search is not connected in this demo. Use the saved public evidence and suggested searches instead.",
          demoMode: true,
        },
        { status: 503 },
      );
    }
    return Response.json(response);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "LinkedIn search failed" },
      { status: 500 },
    );
  }
}
