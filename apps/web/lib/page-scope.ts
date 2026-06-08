import { getIncludeTowerBrookEmployees } from "@/lib/employee-scope-server";
import { getThemeFocus } from "@/lib/theme-focus-server";
import type { ThemeFocus } from "@/lib/theme-focus";

export interface PageScope {
  themeFocus: ThemeFocus;
  includeTowerBrookEmployees: boolean;
}

/** Server-side page bootstrap: theme cookie + TB employee scope. */
export async function getPageScope(): Promise<PageScope> {
  const [themeFocus, includeTowerBrookEmployees] = await Promise.all([
    getThemeFocus(),
    getIncludeTowerBrookEmployees(),
  ]);
  return { themeFocus, includeTowerBrookEmployees };
}
