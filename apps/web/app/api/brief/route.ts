import { buildBrief } from "@/lib/brief";
import { getTheme } from "@/lib/themes";
import { complete, hasModel } from "@/lib/llm";
import type { ThemeId } from "@/lib/types";
import { getIncludeTowerBrookEmployees } from "@/lib/employee-scope-server";

const SYSTEM = `You are a private equity analyst writing the "state of play" on an investment theme for a partner. 3-4 sentences, plain and decisive. You ONLY use the facts provided — never invent deals, numbers or names. Lead with where capital is flowing and who is consolidating, then what it implies for sourcing. No buzzwords.`;

export async function POST(request: Request) {
  try {
    const { themeId } = (await request.json()) as { themeId: string };
    const theme = getTheme(themeId);
    if (!theme) return Response.json({ error: "Unknown theme" }, { status: 400 });
    const brief = buildBrief(
      theme.id as ThemeId,
      await getIncludeTowerBrookEmployees(),
    );

    if (!hasModel()) {
      return Response.json({ narrative: brief.narrative, grounded: false });
    }

    const facts = [
      `Theme: ${theme.name}`,
      `Experts mapped: ${brief.stats.experts}; independent (actionable) companies: ${brief.stats.targets}; already acquired: ${brief.stats.exits}.`,
      `Exit comparables: ${brief.exitComps
        .map((e) => `${e.company.name} acquired by ${e.acquirer}${e.date ? ` (${e.date.slice(0, 4)})` : ""}`)
        .join("; ")}`,
      `Activity clusters: ${brief.hotSpecialties.map((s) => `${s.name} (${s.count})`).join(", ")}`,
      `Top people to call: ${brief.callList.map((c) => `${c.expert.name} — ${c.whyNow}`).join("; ")}`,
    ].join("\n");

    const narrative = await complete(
      SYSTEM,
      `Write the state of play using only these facts:\n\n${facts}`,
    );
    return Response.json({ narrative, grounded: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
