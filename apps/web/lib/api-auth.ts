const COPILOT_API_KEY = process.env.COPILOT_API_KEY;
const REQUIRE_AUTH =
  process.env.COPILOT_REQUIRE_AUTH === "true" ||
  (process.env.NODE_ENV === "production" && Boolean(COPILOT_API_KEY));

/** Gate AI routes when COPILOT_API_KEY is configured (or COPILOT_REQUIRE_AUTH=true). */
export function requireCopilotApiAuth(request: Request): Response | null {
  if (!REQUIRE_AUTH || !COPILOT_API_KEY) return null;
  const header = request.headers.get("authorization");
  if (header === `Bearer ${COPILOT_API_KEY}`) return null;
  return Response.json(
    { error: "Unauthorized. Provide Authorization: Bearer <COPILOT_API_KEY>." },
    { status: 401 },
  );
}
