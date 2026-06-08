import {
  buildExpertContext,
  complete,
  hasModel,
  loadExpertOrThrow,
} from "@/lib/llm";
import { sseTextStream, streamComplete } from "@/lib/llm-stream";
import type { ExpertWithCompanies } from "@/lib/types";

const SYSTEM = `You write short, credible cold-outreach emails on behalf of a private equity investor reaching out to a sector expert. The emails are warm but concise, show genuine homework, and make a specific, low-friction ask. You ONLY reference facts provided in the context — never invent shared connections, deals, or flattery you can't support. No buzzwords. 120-160 words max.`;

export async function POST(request: Request) {
  try {
    const { expertId, context, stream } = (await request.json()) as {
      expertId: string;
      context?: string;
      stream?: boolean;
    };
    const expert = loadExpertOrThrow(expertId);
    const ctx = buildExpertContext(expert);

    if (!hasModel()) {
      const text = fallbackEmail(expert, context);
      if (stream) {
        return new Response(sseTextStream((async function* () { yield text; })()), {
          headers: { "Content-Type": "text/event-stream" },
        });
      }
      return Response.json({ text, grounded: false });
    }

    const user = `Draft a cold-outreach email to this expert from an investor at a PE firm.

CONTEXT (the only facts you may reference):
${ctx}

${context ? `The investor's specific reason for reaching out: ${context}\n` : ""}
Requirements:
- Subject line + body.
- Open with a specific, accurate reference to their background (from context).
- One clear, low-friction ask (a 20-30 min call).
- Sign off as "[Your name], TowerBrook".
- No clichés, no overclaiming.`;

    if (stream) {
      return new Response(sseTextStream(streamComplete(SYSTEM, user)), {
        headers: { "Content-Type": "text/event-stream" },
      });
    }

    const text = await complete(SYSTEM, user);
    return Response.json({ text, grounded: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to draft email" },
      { status: 400 },
    );
  }
}

function fallbackEmail(expert: ExpertWithCompanies, angle?: string): string {
  const first = expert.name.split(" ")[0];
  const company = expert.resolvedCompanies[0]?.company.name;
  const reason = company
    ? `Your work around ${company} stood out because we are mapping people and companies in this part of the market.`
    : `Your background as ${expert.headline} stood out as directly relevant to the market map we are building.`;

  return `Subject: Quick perspective on ${expert.themes[0].replaceAll("-", " ")}

Hi ${first},

I am working with TowerBrook on a people-led map of the sector. ${reason}

${angle ? `The immediate diligence angle is: ${angle}. ` : ""}I would value your perspective on where the real opportunity sits, which companies are worth diligence time, and who else has first-hand context.

Would you be open to a 20-30 minute call in the next couple of weeks? Happy to work around your schedule.

Best,
[Your name], TowerBrook`;
}
