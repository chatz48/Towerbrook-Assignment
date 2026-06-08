import { handleAskRequest } from "@/lib/ask-service";

export async function POST(request: Request) {
  return handleAskRequest(request);
}
