import type { ThemeId } from "@/lib/types";

export type ThemeFocus = ThemeId | "all";

export const THEME_FOCUS_COOKIE = "theme-focus";
export const THEME_FOCUS_EVENT = "theme-focus-change";

const THEME_FOCUS_VALUES = new Set<ThemeFocus>([
  "all",
  "clean-energy-advisory",
  "grid-infrastructure",
  "smart-water",
]);

export function isThemeFocus(value: unknown): value is ThemeFocus {
  return typeof value === "string" && THEME_FOCUS_VALUES.has(value as ThemeFocus);
}

export function matchesThemeFocus(themes: ThemeId[], focus: ThemeFocus) {
  return focus === "all" || themes.includes(focus);
}

export function readThemeFocusCookie(): ThemeFocus {
  if (typeof document === "undefined") return "all";
  const value = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${THEME_FOCUS_COOKIE}=`))
    ?.split("=")[1];
  return isThemeFocus(value) ? value : "all";
}

export function writeThemeFocusCookie(focus: ThemeFocus) {
  document.cookie = `${THEME_FOCUS_COOKIE}=${focus}; path=/; max-age=31536000; samesite=lax`;
}

export function publishThemeFocus(focus: ThemeFocus) {
  writeThemeFocusCookie(focus);
  window.dispatchEvent(new CustomEvent(THEME_FOCUS_EVENT, { detail: focus }));
}
