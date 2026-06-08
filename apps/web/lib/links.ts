export function askHref(prompt: string): string {
  return `/ask?prompt=${encodeURIComponent(prompt)}`;
}

export type GraphFocusKind = "expert" | "company" | "deal";

export function graphHref(kind: GraphFocusKind, id: string): string {
  return `/graph?focus=${encodeURIComponent(`${kind}:${id}`)}`;
}

export function graphHrefForTheme(themeId?: string): string {
  return themeId ? `/graph?theme=${encodeURIComponent(themeId)}` : "/graph";
}
