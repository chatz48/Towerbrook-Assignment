import { callBackendApi } from "@/lib/backend-api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await callBackendApi("/reports", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!response) {
      return Response.json(
        { error: "Live report generation is not connected in this demo. Use the memo workspace with static graph data." },
        { status: 503 },
      );
    }
    return Response.json(response);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Report generation failed" },
      { status: 500 },
    );
  }
}
