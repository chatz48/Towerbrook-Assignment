import type { GraphCompany, GraphExpert, GraphLink } from "@/lib/graph-inline-types";
import type { GraphModel } from "@/lib/graph-model";
import {
  computeVisibleGraph,
  defaultGraphViewOptions,
} from "@/lib/graph-visible";
import { resolveGraphFocusKey } from "@/lib/graph-normalize";
import { THEME_BY_ID } from "@/lib/themes";
import type { ThemeFocus } from "@/lib/theme-focus";
import type { ThemeId } from "@/lib/types";
import { uniqueById } from "@/lib/arrays";

export interface EntityGraphModel {
  experts: GraphExpert[];
  companies: GraphCompany[];
  links: GraphLink[];
  accent: string;
  focusKey: string;
  fullGraphHref: string;
}

function expertCompanyLink(edge: {
  from: string;
  to: string;
  relationship: string;
}): GraphLink | null {
  const [fromKind, fromId] = edge.from.split(":");
  const [toKind, toId] = edge.to.split(":");
  if (fromKind === "expert" && toKind === "company" && fromId && toId) {
    return { expertId: fromId, companyId: toId, relationship: edge.relationship };
  }
  if (fromKind === "company" && toKind === "expert" && fromId && toId) {
    return { expertId: toId, companyId: fromId, relationship: edge.relationship };
  }
  return null;
}

/** Build inline graph data using the same neighborhood logic as /graph. */
export function toEntityGraphModel(
  model: GraphModel,
  focusKey: string,
  theme: ThemeFocus,
): EntityGraphModel {
  const selectedKey = resolveGraphFocusKey(focusKey, model.canonicalMap);
  const visible = computeVisibleGraph(model, defaultGraphViewOptions(theme, selectedKey));

  const experts: GraphExpert[] = uniqueById(
    visible.visibleNodes
      .filter((node) => node.kind === "expert")
      .map((node) => ({ id: node.id, name: node.name, type: node.type })),
  );

  const companies: GraphCompany[] = uniqueById(
    visible.visibleNodes
      .filter((node) => node.kind === "company")
      .map((node) => ({
        id: node.id,
        name: node.name,
        expertCount: visible.filteredEdges.filter(
          (edge) => edge.from === node.key || edge.to === node.key,
        ).length,
      })),
  );

  const links: GraphLink[] = visible.visibleEdges
    .map(expertCompanyLink)
    .filter((link): link is GraphLink => link !== null);

  const focusNode = visible.selectedNode;
  const themeId: ThemeId =
    focusNode?.themes[0] ?? (theme !== "all" ? theme : "grid-infrastructure");

  return {
    experts,
    companies,
    links,
    accent: THEME_BY_ID[themeId]?.accent ?? "#0757d3",
    focusKey:
      focusNode?.kind === "expert"
        ? `e:${focusNode.id}`
        : focusNode?.kind === "company"
          ? `c:${focusNode.id}`
          : selectedKey,
    fullGraphHref: `/graph?focus=${encodeURIComponent(selectedKey)}`,
  };
}
