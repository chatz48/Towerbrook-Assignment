import ResearchWorkspace from "@/app/components/copilot/ResearchWorkspace";
import type { PageContext } from "@/lib/ask-types";
import {
  buildCompanyFocusContext,
  buildExpertFocusContext,
} from "@/lib/copilot-focus";
import { getPageScope } from "@/lib/page-scope";
import { singleParam } from "@/lib/url-params";

export default async function AskPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { themeFocus, includeTowerBrookEmployees } = await getPageScope();
  const params = (await searchParams) ?? {};
  const prompt = singleParam(params.prompt);
  const expertId = singleParam(params.expert);
  const companyId = singleParam(params.company);
  const initialFocusContext: PageContext | undefined = expertId
    ? buildExpertFocusContext(expertId)
    : companyId
      ? buildCompanyFocusContext(companyId)
      : undefined;
  const initialPrompt =
    prompt ??
    (expertId
      ? `Prepare a call brief for ${initialFocusContext?.title ?? "this expert"} and identify companies they can unlock.`
      : undefined) ??
    (companyId
      ? `Build a target memo view for ${initialFocusContext?.title ?? "this company"}, including people to call and evidence gaps.`
      : undefined);

  return (
    <ResearchWorkspace
      key={`${themeFocus}:${includeTowerBrookEmployees}:${expertId ?? ""}:${companyId ?? ""}`}
      initialTheme={themeFocus}
      includeTowerBrookEmployees={includeTowerBrookEmployees}
      initialPrompt={initialPrompt}
      initialFocusContext={initialFocusContext}
      autoRunInitial={Boolean(initialPrompt)}
    />
  );
}
